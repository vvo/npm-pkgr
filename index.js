'use strict';
var util = require('util');

var async = require('async');
var _ = require('lodash');
var fs = require('fs-extra');
var lockfile = require('lockfile');
var path = require('path');
var aws = require('aws-sdk');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var S3 = new aws.S3({
  apiVersion: '2006-03-01'
});

var computeHash = require('./lib/compute-hash');
var lazyCopy = require('./lib/lazy-copy');
var realPath = require('./lib/real-path');
var pruneCache = require('./lib/prune-cache');

var lockOpts = {
  wait: 10 * 1000,
  stale: 3 * 60 * 1000, // 5 minute stale
  retries: 30
};

var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('bower', 'Install bower packages')
  .command('npm', 'Install npm packages')
  .option('cache-directory', {
    describe: 'Local directory to download, build, and store',
    demand: true,
    type: 'string',
    requiresArg: true
  })
  .option('symlink', {
    describe: 'All installed modules will be sym linked into the current directory, rather than copied',
    boolean: true
  })
  .option('s3prefix', {
    describe: 'S3 prefix path that will be used to download/upload from s3',
    type: 'string',
    requiresArg: true
  })
  .option('s3bucket', {
    describe: 'S3 bucket that will hold our zipped packages',
    type: 'string',
    requiresArg: true
  })
  .option('output-directory', {
    describe: 'Path of the directory to output installed modules in.',
    type: 'string',
    default: process.cwd(),
    requiresArg: true
  })
  .option('output-name', {
    describe: 'Name of the directory that will hold the installed dependencies.',
    type: 'string',
    requiresArg: true
  })
  .option('production', {
    describe: 'Install production packages only',
    boolean: true
  })
  .argv;

var NPM_PACKAGE_FILES = ['package.json', 'npm-shrinkwrap.json', '.npmrc'];

function cleanupForceExit(exit) {
  try {

    //// save npm-debug.log before deleting everything
    //if (fs.existsSync(path.join(cachedir, 'npm-debug.log'))) {
    //  fs.writeFileSync(path.join(opts.cwd, 'npm-debug.log'), fs.readFileSync(path.join(cachedir, 'npm-debug.log')));
    //}

    //fs.removeSync(cachedir);

    //lockfile.unlockSync(cachelock);
    //lockfile.unlockSync(copylock);
  } catch (e) {}

  if (exit) {
    process.exit(1);
  }
}

function createDirectoryCopy(src, target, cb) {
  async.series([
    // TODO(rs): is a exclusive lock necessary?
    // The package is fully installed at this point so writes shouldn't occur,
    // and reads shouldn't conflict.
    //_.partial(lockfile.lock, copylock, lockOpts),
    _.partial(fs.remove, target),
    function(cb) {
      if (!argv['symlink']) {
        fs.copy(src, target, { preserveTimestamps: true }, cb);
      } else {
        fs.symlink(src, target, 'dir', cb);
      }
    }
  ], cb);
}

function downloadPackages(commandName, cacheDir, cb) {
  console.log('Downloading ' + commandName + ' packages');
  var execOpts = {
    cwd: cacheDir,
    maxBuffer: 20 * 1024 * 1024
  };
  switch (commandName) {
  case 'bower':
    exec('bower install', execOpts, cb);
    break;
  case 'npm':
    exec('npm install', execOpts, cb);
    break;
  default:
    cb(new Error('Command mismatch'));
  }
}

function buildPackages(commandName, cacheDir, cb) {
  switch (commandName) {
  case 'npm':
    console.log('Building npm packages.');

    var npmRebuildCall = spawn('npm', ['rebuild'], { cwd: cacheDir });
    npmRebuildCall.stdout.on('data', function(data) {
      process.stdout.write('stdout: ' + data);
    });
    npmRebuildCall.stderr.on('data', function(data) {
      process.stderr.write('stderr: ' + data);
    });
    npmRebuildCall.on('close', function() {
      console.log('npm rebuild complete.');
      cb();
    });

    return npmRebuildCall;
  case 'bower':
    return cb();
  default:
    return cb(new Error('Unhandled command for buildPackages: ' + commandName));
  }
}

function uploadToS3(cacheRoot, origFile, zipFilename, cb) {
  var zipFilepath = path.join(cacheRoot, zipFilename);
  console.log('Uploading package to s3: ' + zipFilepath);
  if (!argv.s3prefix) {
    return cb();
  }

  // - tar and gzip the downloaded directory.
  async.series([
    function(cb) {
      exec(util.format('GZIP=-1 tar czf %s %s', zipFilename, origFile), {
        cwd: cacheRoot
      }, cb);
    },
    function(cb) {
      // - upload to s3
      S3.upload({
        Bucket: argv.s3bucket,
        Key: argv.s3prefix + '/' + zipFilename,
        Body: fs.createReadStream(zipFilepath)
      }, cb);
    }
  ], function(err) {
    if (err) {
      console.log('Error occurred while zipping/s3 uploaded: ' + err.message);
    }
    fs.remove(zipFilepath, cb);
  });
}

function touchFile(filepath, cb) {
  // Create the [doneFilePath] to indicate the the install succeeded.
  async.waterfall([
    function(cb) {
      fs.open(filepath, 'w', cb);
    },
    function(fd, cb) {
      fs.close(fd, cb);
    }
  ], cb);
}

function downloadS3File(cacheRoot, zipFilename, cb) {
  var zipFilepath = path.join(cacheRoot, zipFilename);
  async.series([
    function(cb) {
      var params = {
        Bucket: argv.s3bucket,
        Key:  argv.s3prefix + '/' + zipFilename
      };
      console.log('Attempting to pre-packaged version from s3');

      var zipFileStream = fs.createWriteStream(zipFilepath)
        .on('error', cb)
        .on('finish', cb);

      S3.getObject(params)
        .createReadStream()
        .on('error', cb)
        .pipe(zipFileStream);
    },
    function(cb) {
      console.log('Download successful, unzipping.');
      exec(util.format('tar xzf %s', zipFilename), { cwd: cacheRoot }, cb);
    }
  ], function(err) {
    if (err) {
      return cb(err);
    }
    fs.remove(zipFilepath, cb);
  });
}

/**
  * Flow:
  *   - create `[cache-directory]~/.npm-pkgr`
  *   - compute project hash (based on dependencies)
  *   - get cache lock on `~/.npm-pkgr/$hash`
  *     - create `~/.npm-pkgr/$hash`
  *       - dir exists?
  *         - yes
  *           release cache lock
  *           get node_modules/
  *         - no
  *           copy package.json, npm-shrinkwrap.json into `~/.npm-pkgr/$hash`
  *           npm install in `~/.npm-pkgr/$hash`
  *           release cache lock
  *           get node_modules/
  *   - error or interrupt at any moment?
  *     release locks
  *     rm -rf `~/.npm-pkgr/$hash`
  *     call cb
  *   - everything went fine?
  *     call cb with {
  *       dir: opts.cwd,
  *       node_modules: opts.cwd/node_modules
  *       npm: npmUsed // was npm used in the process?
  *     }
  */
function installPackages(opts, cb) {
  var debug = require('debug')('npm-pkgr');
  var npmUsed = false;
  var production = argv.production;
  var cacheRoot = argv['cache-directory'];

  var Config = {
    npm: {
      defaultOutputName: 'node_modules'
    },
    bower: {
      defaultOutputName: 'bower_components'
    }
  };
  var commandName = argv._[0];
  var config = Config[commandName];

  var defaultOutputName = config.defaultOutputName;
  var outputName = argv['output-name'];
  async.waterfall([
    function(cb) {
      async.parallel({
        mkCachePath: _.partial(fs.mkdirp, cacheRoot),
        depHash: function(cb) {
          switch (commandName) {
          case 'npm':
            return computeHash.computeNpmHash(opts.cwd, production, cb);
          case 'bower':
            return computeHash.computeBowerHash(opts.cwd, production, cb);
          default:
            return cb(new Error('hash commnad not supported: ' + commandName));
          }
        }
      }, cb);
    },
    function(res, cb) {
      var hash = res.depHash;
      var zipFilename = res.depHash + '.tar.gz';
      var cachelock = path.join(cacheRoot, hash + '.lock');
      //var copylock = path.join(cacheRoot, hash + '-copy.lock');
      var cachedir = path.join(cacheRoot, hash);
      var doneFilePath = path.join(cachedir, 'finished');

      var cancelAndExit = _.partial(cleanupForceExit, true);
      var src = path.join(cachedir, defaultOutputName);
      var target = path.join(opts.cwd, outputName);
      debug('cachedir: %s, lockfile: %s', cachedir, cachelock);
      async.waterfall([
        function(cb) {
          async.series({
            acquireLock: _.partial(lockfile.lock, cachelock, lockOpts),
            doneFileExists: function(cb) {
              fs.exists(doneFilePath, function(exists) {
                cb(null, exists);
              });
            }
          }, cb);
        },
        function(res, cb) {
          process.once('SIGTERM', cancelAndExit);
          process.once('SIGINT', cancelAndExit);

          if (res.doneFileExists) return cb(null, false);

          console.log('Locally cached package not found.');
          async.series([
            // Ensure that the build directory is cleared to prevent partial installs
            _.partial(fs.remove, cachedir),
            function(cb) {
              downloadS3File(cacheRoot, zipFilename, function(err) {
                if (!err) return cb();
                console.log('S3 download failed, installing packages locally.');

                var files = (function() {
                  if (commandName === 'npm') {
                    return NPM_PACKAGE_FILES.map(realPath(opts.cwd));
                  } else if (commandName === 'bower') {
                    return ['bower.json'];
                  }
                })();

                async.series([
                  _.partial(fs.mkdirp, cachedir),
                  _.partial(lazyCopy, files, cachedir),
                  _.partial(downloadPackages, commandName, cachedir),
                  _.partial(uploadToS3, cacheRoot, hash, zipFilename)
                ], cb);
              });
            },
            _.partial(buildPackages, commandName, cachedir),
            _.partial(touchFile, doneFilePath)
          ], function(err) {
            if (err) {
              return cb(err);
            }
            cb(null, true);
          });
        },
        function(installedPackages, cb) {
          npmUsed = installedPackages;
          async.series([
            _.partial(lockfile.unlock, cachelock),
            _.partial(createDirectoryCopy, src, target)
          ], cb);
        }
      ], function(err) {
        try {
          process.removeListener('SIGTERM', cancelAndExit);
          process.removeListener('SIGINT', cancelAndExit);
        } catch (e) {}

        if (err) {
          cleanupForceExit();
          return cb(err);
        }

        cb(null, {
          dir: opts.cwd,
          output: target,
          npm: npmUsed
        });
      });
    }
  ], cb);
}

function npmPkgr(opts, cb) {
  console.log('starting npm-pkgr with opts: %j', opts);

  var commandName = argv._[0];
  var cacheRoot = argv['cache-directory'];
  /**
    * Intercepts `$ npm-pkgr prune` calls
    * Flow:
    *   - find `~/.npm-pkgr/*` dir older than one month
    *   - remove them
  */
  switch (commandName) {
  case 'prune':
    return pruneCache(cacheRoot, cb);
  case 'npm':
  case 'bower':
    return installPackages(opts, cb);
  default:
    return cb(new Error('Command is not handled: ' + commandName));
  }

}

module.exports = npmPkgr;

module.exports = npmPkgr;

function npmPkgr(opts, cb) {

  var debug = require('debug')('npm-pkgr');

  debug('starting npm-pkgr with opts: %j', opts);

  opts.args = opts.args || [];

  var async = require('contra');
  var fs = require('fs');
  var path = require('path');
  var rimraf = require('rimraf');

  var npmArgs = opts.args.join(' ');

  var npmUsed;

  var files = ['package.json', 'npm-shrinkwrap.json'].map(realPath(opts.cwd));
  var production = opts.args.indexOf('--production') !== -1;

  computeHash(opts.cwd, production, function(err, hash) {
    var mkdirp = require('mkdirp');
    if (err) {
      return cb(err);
    }

    debug('hash was %s', hash);
    var npmPkgrCache = path.join(process.env.HOME, '.npm-pkgr');
    var cacheDir = path.join(process.env.HOME, '.npm-pkgr', hash);

    debug('creating cache dir %s', cacheDir);
    mkdirp(npmPkgrCache, function(err) {
      if (err) {
        return cb(err);
      }

      mkdirp(cacheDir, function(err, made) {
        if (err) {
          return cb(err);
        }

        if (made === null) {
          return fs.exists(path.join(cacheDir, '.npm-pkgr-finished'), function(exists) {
            if (!exists) {
              return setTimeout(npmPkgr, 5000, opts, cb);
            }

            debug('cache dir %s already exists, using it', cacheDir);

            async.series([
              rimraf.bind(null, path.join(opts.cwd, 'node_modules')),
              fs.symlink.bind(fs,
                path.join(cacheDir, 'node_modules'),
                path.join(opts.cwd, 'node_modules'),
                'dir'
              )
            ], end);
          });
        }

        process.on('SIGINT', removeCacheDir);
        process.on('SIGTERM', removeCacheDir);

        debug('finished creating cache dir %s', cacheDir);

        npmUsed = true;
        async.series([
          copyIfExists.bind(null, files, cacheDir),
          startNpm.bind(null, cacheDir, npmArgs),
          fs.open.bind(fs, path.join(cacheDir, '.npm-pkgr-finished'), 'w'),
          rimraf.bind(null, path.join(opts.cwd, 'node_modules')),
          fs.symlink.bind(fs,
            path.join(cacheDir, 'node_modules'),
            path.join(opts.cwd, 'node_modules'),
            'dir'
          )
        ], end);

        function end(err) {
          if (err) {
            removeCacheDir(false);
            return cb(err);
          }

          // process.removeListener('SIGINT', removeCacheDir);
          // process.removeListener('SIGTERM', removeCacheDir);

          cb(null, {
            dir: opts.cwd,
            node_modules: path.join(opts.cwd, 'node_modules'),
            npm: npmUsed
          });
        }

        function removeCacheDir(exit) {
          debug('was interrupted, removing cache dir')
          rimraf.sync(cacheDir);
          if (exit !== false) {
            process.exit(1);
          }
        }

      });
    });
  });
}

function computeHash(dir, production, cb) {
  var json = require('jsonfile');
  var crypto = require('crypto');
  var shasum = crypto.createHash('sha1');

  shasum.update(process.version);

  if (production === true) {
    return readNpmShrinkwrapJson();
  }

  readBoth();

  function readNpmShrinkwrapJson() {
    json.readFile(realPath(dir)('npm-shrinkwrap.json'), gotNpmShrinkwrapJson);

    function gotNpmShrinkwrapJson(err, pkg) {
      if (production) {
        if (err) {
          return cb(err);
        }

        if (!pkg.dependencies) {
          return cb(new Error('No dependencies found in shrinkwrap'));
        }
      }

      if (err) {
        return cb(null, shasum.digest('hex'))
      }

      if (pkg.dependencies) {
        shasum.update(JSON.stringify(pkg.dependencies));
      }

      cb(null, shasum.digest('hex'));
    }
  }

  function readBoth() {
    json.readFile(realPath(dir)('package.json'), gotPackageJson);

    function gotPackageJson(err, pkg) {
      if (err) {
        return cb(err)
      }

      shasum.update(JSON.stringify(pkg.dependencies));
      shasum.update(JSON.stringify(pkg.devDependencies));

      readNpmShrinkwrapJson();
    }
  }
}

function startNpm(dir, npmArgs, cb) {
  var debug = require('debug')('npm-pkgr:npm');

  var exec = require('child_process').exec;

  debug('start `npm install %s`', npmArgs);
  exec('npm install ' + npmArgs, {
    cwd: dir,
    maxBuffer: 20*1024*1024
  }, npmDone);

  function npmDone(err, stdout, stderr) {
    debug('end `npm install %s`', npmArgs);
    cb(err);
  }
}

function copyIfExists(files, to, cb) {
  var debug = require('debug')('npm-pkgr:copy');

  var async = require('contra');
  var path = require('path');

  async.waterfall([
    filter.bind(null, files),
    copyFiltered
  ], cb);

  function filter(files, cb) {
    var fs = require('fs');
    async.filter(files, fileExists, cb);
  }

  function copyFiltered(files) {
    debug('copying %j to %s', files, to);

    async.each(files, function copy(file) {
      cp(file, path.join(to, path.basename(file)), cb);
    }, cb);
  }
}

function fileExists(file, cb) {
  var fs = require('fs');
  fs.exists(file, cb.bind(null, null));
}

function cp(src, dest, callback) {
  var fs = require('fs');
  var reader = fs.createReadStream(src);
  var writer = fs.createWriteStream(dest);

  reader.on('error', callback);
  writer.on('error', callback);

  reader.pipe(writer);

  writer.on('finish', callback);
}

function realPath(dir) {
  var path = require('path');

  return function computeRealPath(file) {
    return path.join(dir, file);
  }
}
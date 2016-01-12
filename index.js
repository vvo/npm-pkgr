module.exports = npmPkgr;

var async = require('contra');
var fs = require('fs');
var lockfile = require('lockfile');
var mkdirp = require('mkdirp');
var path = require('path');
var rimraf = require('rimraf');

var computeHash = require('./lib/compute-hash');
var installNpm = require('./lib/install-npm');
var lazyCopy = require('./lib/lazy-copy');
var realPath = require('./lib/real-path');
var pruneCache = require('./lib/prune-cache');

function npmPkgr(opts, cb) {
  var debug = require('debug')('npm-pkgr');

  console.log('starting npm-pkgr with opts: %j', opts);

  opts.args = opts.args || [];

  var npmArgs = opts.args.join(' ');
  var npmUsed;
  var files = ['package.json', 'npm-shrinkwrap.json', '.npmrc'].map(realPath(opts.cwd));
  var production = opts.args.indexOf('--production') !== -1;
  var npmPkgrCache = path.join(process.env.HOME, '.npm-pkgr');
  var lockOpts = {
    wait: 10 * 1000,
    stale: 3 * 60 * 1000, // 5 minute stale
    retries: 30
  };

  /**
    * Intercepts `$ npm-pkgr prune` calls
    * Flow:
    *   - find `~/.npm-pkgr/*` dir older than one month
    *   - remove them
  */
  if (opts.args[0] === 'prune') return pruneCache(npmPkgrCache, cb);

  /**
   * Flow:
   *   - create `~/.npm-pkgr`
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

  async.series([
    mkdirp.bind(null, npmPkgrCache),
    computeHash.bind(null, opts.cwd, production)
  ], function(err, res) {
    if (err) {
      return end(err);
    }

    var hash = res[1];
    var cachelock = path.join(npmPkgrCache, hash + '.lock');
    var copylock = path.join(npmPkgrCache, hash + '-copy.lock');
    var cachedir = path.join(npmPkgrCache, hash);
    var doneFilePath = path.join(cachedir, 'finished');

    var cancelAndExit = cancel.bind(null, true);
    var destination = path.join(opts.cwd, 'node_modules');

    async.series({
      acquireLock: lockfile.lock.bind(lockfile, cachelock, lockOpts),
      mkdirResults: mkdirp.bind(null, cachedir),
      doneFileExists: function(cb) {
        var exists = fs.existsSync(doneFilePath);
        cb(null, exists);
      }
    }, function(err, res) {
      debug('cachedir: %s, lockfile: %s', cachedir, cachelock);

      if (err) {
        return end(err);
      }

      process.once('SIGTERM', cancelAndExit);
      process.once('SIGINT', cancelAndExit);

      if (res.doneFileExists) {
        return async.series([
          lockfile.unlock.bind(null, cachelock),
          getNodeModules
        ], end);
      }

      npmUsed = true;
      async.series([
        lazyCopy.bind(null, files, cachedir),
        installNpm.bind(null, cachedir, npmArgs),
        function(cb) {
          async.waterfall([
            function(cb) {
              fs.open(doneFilePath, 'w', cb);
            },
            function(fd, cb) {
              fs.close(fd, cb);
            }
          ], cb);
        },
        lockfile.unlock.bind(lockfile, cachelock),
        getNodeModules
      ], end);

    });

    function cancel(exit) {
      try {

        // save npm-debug.log before deleting everything
        if (fs.existsSync(path.join(cachedir, 'npm-debug.log'))) {
          fs.writeFileSync(path.join(opts.cwd, 'npm-debug.log'), fs.readFileSync(path.join(cachedir, 'npm-debug.log')));
        }

        rimraf.sync(cachedir);

        lockfile.unlockSync(cachelock);
        lockfile.unlockSync(copylock);
      } catch (e) {}

      if (exit) {
        process.exit(1);
      }
    }

    function end(err) {
      if (err) {
        console.log('Error occurred:', err);
      }

      try {
        process.removeListener('SIGTERM', cancelAndExit);
        process.removeListener('SIGINT', cancelAndExit);
      } catch (e) {}

      if (err) {
        cancel();
        return cb(err);
      }

      cb(null, {
        dir: opts.cwd,
        node_modules: destination,
        npm: npmUsed
      });
    }

    // externalize
    function getNodeModules(cb) {
      var ncp = require('ncp');
      var get;

      if (opts.strategy === 'copy') {
        get = ncp.bind(null,
          path.join(cachedir, 'node_modules'),
          path.join(opts.cwd, 'node_modules'));
      } else {
        get = fs.symlink.bind(fs,
          path.join(cachedir, 'node_modules'),
          path.join(opts.cwd, 'node_modules'),
          'dir'
        );
      }

      async.series([
        lockfile.lock.bind(lockfile, copylock, lockOpts),
        rimraf.bind(null, path.join(opts.cwd, 'node_modules')),
        // copy or symlink
        get,
        lockfile.unlock.bind(lockfile, copylock)
      ], cb);
    }

  });

}

test('npm version used ', function(t) {
  clean();

  var callcount = 0;
  var proxyquire = require('proxyquire').noPreserveCache();
  var modifiedNpmPkgr = proxyquire('../../', {
    './lib/compute-hash': proxyquire('../../lib/compute-hash', {
      'npm-version': function(cb) {
        callcount++;

        if (callcount === 1) {
          // first call, sends version 1.4.25
          return cb(null, '1.4.25')
        }

        // second call, sends npm version 1.4.26
        cb(null, '1.4.26')
      }
    })
  });

  async.series([
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    modifiedNpmPkgr.bind(null, {cwd: getTmpProject()}),
    modifiedNpmPkgr.bind(null, {cwd: getTmpProject()}),
  ], end);

  function end(err, results) {
    t.error(err);

    t.equal(
      fs.readlinkSync(results[0].node_modules),
      fs.readlinkSync(results[1].node_modules),
      'Symlinks should be identical when same npm version'
    );

    t.notEqual(
      fs.readlinkSync(results[3].node_modules),
      fs.readlinkSync(results[2].node_modules),
      'Symlinks should not be identical when npm version differs'
    );

    t.end();
  }
});

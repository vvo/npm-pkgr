require('../bootstrap');

test('error occurs', function(t) {
  clean();

  var tmpMaster = getTmpProject();

  var pkg = path.join(tmpMaster, 'package.json');

  async.series([
    updateJson(pkg, {
      scripts: {
        preinstall: 'There\'s no way this will work'
      }
    }),
    function(cb) {
      launchNpmPkgr(cb.bind(null, null))
    },
    updateJson(pkg, {
      scripts: {
        preinstall: ""
      }
    }),
    launchNpmPkgr
  ], end);

  function end(err, results) {
    t.equal(packageVersion(results[3].dir, 'lodash'), '0.2.0');
    t.equal(packageVersion(results[3].dir, 'mkdirp'), '0.3.5');

    t.end();
  }

  function launchNpmPkgr(cb) {
    npmPkgr({cwd: getTmpProject(tmpMaster)}, cb);
  }
});
require('../bootstrap');

test('updating versions', function(t) {
  clean();

  var tmpMaster = getTmpProject();

  var pkg = path.join(tmpMaster, 'package.json');
  var shrinkwrap = path.join(tmpMaster, 'npm-shrinkwrap.json');

  async.series([
    launchNpmPkgr,
    updateJson(pkg, {
      dependencies: {
        lodash: '0.4.0'
      }
    }),
    launchNpmPkgr,
    updateJson(shrinkwrap, {
      dependencies: {
        lodash: {
          version: '0.5.0',
          from: 'lodash@0.5.0',
          resolved: 'https://registry.npmjs.org/lodash/-/lodash-0.5.0.tgz'
        }
      }
    }),
    launchNpmPkgr
  ], end);

  function end(err, results) {
    t.equal(packageVersion(results[0][0].dir, 'lodash'), '0.2.0');

    // --production
    t.equal(packageVersion(results[0][1].dir, 'lodash'), '0.2.0');

    // npm install still uses npm-shrinkwrap
    t.equal(packageVersion(results[2][0].dir, 'lodash'), '0.2.0');
    t.equal(packageVersion(results[2][1].dir, 'lodash'), '0.2.0');

    // devDependency now updated
    t.equal(packageVersion(results[4][0].dir, 'lodash'), '0.2.0');

    // shrinkwrap now updated
    t.equal(packageVersion(results[6][0].dir, 'lodash'), '0.5.0');
    t.equal(packageVersion(results[6][1].dir, 'lodash'), '0.5.0');

    t.end();
  }

  function launchNpmPkgr(cb) {
    async.series([
      npmPkgr.bind(null, {cwd: getTmpProject(tmpMaster)}),
      npmPkgr.bind(null, {cwd: getTmpProject(tmpMaster), args: ['--production']})
    ], cb);
  }
});

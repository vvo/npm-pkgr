require('../bootstrap');

test('npm-debug.log is saved when npm install fails', function(t) {
  clean();

  var successFolder = getTmpProject();
  var erroredFolder = getTmpProject();
  var shrinkwrap = path.join(erroredFolder, 'npm-shrinkwrap.json');

  async.series([
    npmPkgr.bind(null, {cwd: successFolder}),
    updateJson(shrinkwrap, {
      dependencies: {
        // this should fail npm install
        dslakdslakdas: 'foiwqufwoqiufqw'
      }
    }),
    npmPkgr.bind(null, {cwd: erroredFolder}),
  ], end);

  function end(err, results) {
    t.notOk(shell.test('-e', path.join(successFolder, 'npm-debug.log')), 'npm-debug.log must not exists first');
    t.ok(shell.test('-e', path.join(erroredFolder, 'npm-debug.log')), 'npm-debug.log must exists');

    t.end();
  }
});
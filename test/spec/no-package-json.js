require('../bootstrap');

test('no package.json found', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();
  var pkgJson = path.join(tmpProjectDir, 'package.json');
  shell.exec('rm ' + pkgJson);

  t.notOk(shell.test('-e', pkgJson), 'package.json should have been deleted');

  npmPkgr({
    cwd: tmpProjectDir
  }, end);

  function end(err, result) {
    t.equal(err.code, 'ENOENT');
    t.notOk(result);
    t.end();
  }
});
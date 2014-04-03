require('../bootstrap');

test('--production usage without an npm-shrinkwrap.json file', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();
  var shrinkwrapJson = path.join(tmpProjectDir, 'npm-shrinkwrap.json');
  shell.exec('rm ' + shrinkwrapJson);

  t.notOk(shell.test('-e', shrinkwrapJson), 'npm-shrinkwrap.json should have been deleted');

  npmPkgr({
    cwd: tmpProjectDir,
    args: ['--production']
  }, end);

  function end(err, result) {
    t.equal(err.code, 'ENOENT');
    t.ok(err.message.indexOf('npm-shrinkwrap.json') !== -1);
    t.notOk(result);
    t.end();
  }
});
require('../bootstrap');

test('simple usage', function(t) {
  clean();

  // baseProject has existant node_modules/lodash@0.3.0
  t.equal(packageVersion(baseProject, 'lodash'), '0.3.0');

  var tmpProjectDir = getTmpProject();
  npmPkgr({
    cwd: tmpProjectDir
  }, end);

  function end(err, result) {
    t.error(err);
    t.ok(result.npm, 'npm should have been used');
    t.equal(packageVersion(tmpProjectDir, 'lodash'), '0.2.0');
    t.equal(result.node_modules, path.join(tmpProjectDir, 'node_modules'));
    t.ok(shell.test('-L', result.node_modules), 'it should have created a symbolic link');
    t.end();
  }
});
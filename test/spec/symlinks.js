var mock = require('mock-fs');

test('--symlinks path1,path2', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();
  
  shell.mkdir(path.join(tmpProjectDir, 'path1'));
  shell.mkdir(path.join(tmpProjectDir, 'path2'));

  npmPkgr({
    cwd: tmpProjectDir,
    symlinks: ['path1', 'path2']
  }, end);

  function end(err, result) {
    t.error(err);
    
    t.ok(shell.test('-L', path.join(result.cachedir, 'path1')), 'it should have created a symbolic link for path1');
    t.ok(shell.test('-L', path.join(result.cachedir, 'path2')), 'it should have created a symbolic link for path2');

    t.end();
  }
});

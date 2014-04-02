var shell = require('shelljs');
var test = require('prova');
var npmPkgr = require('../');
var tmp = require('tmp');

test('simple usage', function(t) {
  tmp.dir({
    unsafeCleanup: true
  }, firstUse);

  function firstUse(err, tmpDir) {
    var path = require('path');
    shell.exec('rm -rf ~/.npm-pkgr');
    shell.exec('npm cache clean');
    shell.cp('-R', __dirname + '/example-project/*', tmpDir);

    t.equal(require(path.join(__dirname, 'example-project', 'node_modules', 'lodash', 'package.json')).version, '0.3.0');
    t.error(err);

    npmPkgr({
      cwd: tmpDir
    }, end);

    function end(err, modulesPath, npmUsed) {
      t.error(err);
      t.ok(npmUsed, 'npm should have been used');
      t.equal(modulesPath, path.join(tmpDir, 'node_modules'));
      t.ok(shell.test('-L', modulesPath), 'it should have created a symbolic link');
      t.equal(require(path.join(modulesPath, 'lodash', 'package.json')).version, '0.2.0');

      tmp.dir({
        unsafeCleanup: true
      }, secondUse);
    }

    function secondUse(err, tmpDir) {
      shell.exec('npm cache clean');
      shell.cp('-R', __dirname + '/example-project/*', tmpDir);

      npmPkgr({
        cwd: tmpDir
      }, end);

      function end(err, modulesPath, npmUsed) {
        t.error(err);
        t.notOk(npmUsed, 'npm should not have been used');
        t.equal(modulesPath, path.join(tmpDir, 'node_modules'));
        t.ok(shell.test('-L', modulesPath), 'it should have created a symbolic link');
        t.equal(require(path.join(modulesPath, 'lodash', 'package.json')).version, '0.2.0');
        t.end();
      }
    }
  }
});

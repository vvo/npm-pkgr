var fs = require('fs');
var path = require('path');
require('../bootstrap');

test('npmrc should be copied', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();
  npmPkgr({
    cwd: tmpProjectDir
  }, end);

  function end(err, result) {
    t.error(err);
    console.log('ok');
    var npmrc = fs.readFileSync(path.join(tmpProjectDir, '.npmrc'), 'utf8');
    t.equal(npmrc, '# npmrc\n');
    t.end();
  }
});

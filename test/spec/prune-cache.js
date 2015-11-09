require('../bootstrap');

var mock = require('mock-fs');

test('prune cache older than a month', function(t) {
  clean();

  var npmPkgrCache = path.join(process.env.HOME, '.npm-pkgr');

  var today = new Date();
  var twoMonthAgo = new Date();
  var tmpProjectDir = getTmpProject();

  twoMonthAgo.setMonth(twoMonthAgo.getMonth() - 2);

  // mock fs with fake cache dirs
  mock({
    [path.join(npmPkgrCache, 'a')]: mock
      .directory({ birthtime: today }),
    [path.join(npmPkgrCache, 'b')]: mock
      .directory({ birthtime: twoMonthAgo }),
    [tmpProjectDir]: mock.directory()
  });

  var cacheFolders = fs.readdirSync(npmPkgrCache);

  npmPkgr({ cwd: tmpProjectDir, args: ['prune'] }, end);

  function end(err, result) {
    t.error(err);

    // folder b should have been remove
    t.equal(result.old.length, 1);
    t.equal(result.old[0], path.join(npmPkgrCache, 'b'));

    mock.restore();
    t.end();
  }
});

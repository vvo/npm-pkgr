require('../bootstrap');

var mock = require('mock-fs');

test('prune cache older than a month', function(t) {
  clean();

  var npmPkgrCache = path.join(process.env.HOME, '.npm-pkgr');

  var today = new Date();
  var twoMonthAgo = new Date();
  twoMonthAgo.setMonth(today.getMonth() - 2);

  var tmpProjectDir = getTmpProject();

  // mock fs with fake cache dirs
  mock({
    [path.join(npmPkgrCache, 'a')]:
       mock.directory({ birthtime: today }),
    [path.join(npmPkgrCache, 'b')]:
       mock.directory({ birthtime: twoMonthAgo }),
    // all OS don't have stats.birthtime, emulate that :
    [path.join(npmPkgrCache, 'c')]:
       mock.directory({ birthtime:null, mtime: today }),
    [path.join(npmPkgrCache, 'd')]:
       mock.directory({ birthtime:null, mtime: twoMonthAgo }),
    [tmpProjectDir]:
       mock.directory()
  });

  var cacheFolders = fs.readdirSync(npmPkgrCache);

  npmPkgr({ cwd: tmpProjectDir, args: ['prune'] }, end);

  function end(err, result) {
    t.error(err);

    // folder b and d should have been removed
    t.equal(result.old.length, 2);
    t.equal(result.old[0], path.join(npmPkgrCache, 'b'));
    t.equal(result.old[1], path.join(npmPkgrCache, 'd'));

    mock.restore();
    t.end();
  }
});

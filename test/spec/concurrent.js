require('../bootstrap');

test('concurrent installs', function(t) {
  clean();
  var tasks = [];
  for (var i = 0; i < 50; i++) {
    tasks.push(npmPkgr.bind(null, {cwd: getTmpProject()}))
  }

  async.concurrent(tasks, end);

  function end(err, results) {
    if (err) {
      t.error(err);
      t.end();
      return;
    }

    var npmUsed = 0;
    results.forEach(function(res) {
      if (res.npm === true) {
        npmUsed += 1;
      }
    });

    t.equal(npmUsed, 1, 'we should have used only one npm install');

    results.forEach(function(res) {
      t.equal(packageVersion(res.dir, 'lodash'), '0.2.0');
    });

    t.end();
  }
});

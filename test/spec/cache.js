require('../bootstrap');

test('caches npm install results', function(t) {
  clean();

  async.series([
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    npmPkgr.bind(null, {cwd: getTmpProject()})
  ], end);

  function end(err, results) {
    t.error(err);
    t.equal(
      fs.readlinkSync(results[0].node_modules),
      fs.readlinkSync(results[1].node_modules),
      'Symlinks should be identical'
    );
    t.ok(results[0].npm, 'npm was used the first time');
    t.notOk(results[1].npm, 'npm was not used the second time');
    t.end();
  }
});
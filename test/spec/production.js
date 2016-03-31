test('--production results in different link', function(t) {
  clean();

  async.series([
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    npmPkgr.bind(null, {cwd: getTmpProject(), args: ['--production']}),
    npmPkgr.bind(null, {cwd: getTmpProject(), args: ['--production']})
  ], end);

  function end(err, results) {
    t.error(err);

    t.notEqual(
      fs.readlinkSync(results[0].node_modules),
      fs.readlinkSync(results[1].node_modules),
      'Symlinks should not be identical'
    );

    t.equal(
      fs.readlinkSync(results[1].node_modules),
      fs.readlinkSync(results[2].node_modules),
      'Production symlinks should be identical'
    );

    // --production
    t.notOk(fs.existsSync(path.join(results[1].node_modules, 'mkdiro')), 'devDependency was not installed');

    t.ok(results[0].npm, 'npm was used the first time');
    t.ok(results[1].npm, 'npm was used the second time');
    t.notOk(results[2].npm, 'npm was not used the third time');
    t.end();
  }
});

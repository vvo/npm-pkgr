test('node version is different', function(t) {
  clean();

  async.series([
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    npmPkgr.bind(null, {cwd: getTmpProject(), args: ['--production']}),
    updateNodeVersion('0.11.0'),
    npmPkgr.bind(null, {cwd: getTmpProject()}),
    npmPkgr.bind(null, {cwd: getTmpProject(), args: ['--production']}),
  ], end);

  function end(err, results) {
    t.error(err);

    t.notEqual(
      fs.readlinkSync(results[0].node_modules),
      fs.readlinkSync(results[3].node_modules),
      'Symlinks should not be identical'
    );

    t.notEqual(
      fs.readlinkSync(results[1].node_modules),
      fs.readlinkSync(results[4].node_modules),
      'Symlinks should not be identical'
    );

    t.end();
  }
});

function updateNodeVersion(version) {
  return function(cb) {
    Object.defineProperty(process, 'version', {value: version});
    process.nextTick(cb);
  }
}

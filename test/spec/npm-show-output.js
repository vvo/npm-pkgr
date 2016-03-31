test('Capture npm output', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();

  // The `npmIo` option is passed to child_process.spawn, which needs a file descriptor, so use a
  // tmp file. In this test we don't care if npm writes to stdout or stderr, that is up to npm to
  // decide.
  var npmOutPath = path.join(tmpProjectDir, 'npm-out.log');
  var enc = 'utf8';
  var npmOut = fs.createWriteStream(npmOutPath, enc);

  npmPkgr({
    cwd: tmpProjectDir,
    npmIo: [null, npmOut, npmOut] // no need for stdin
  }, end);

  function end(err, result) {
    t.error(err);
    t.ok(result.npm, 'npm should have been used');

    var npmOutText = fs.readFileSync(npmOutPath, enc);

    t.assert(npmOutText.length > 0, 'Some npm output should have been written');
    t.end();
  }
});

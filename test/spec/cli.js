var process = require('process');
var spawn = require('child_process').spawn;

test('cli: clean run', function(t) {
  clean();

  var tmpProjectDir = getTmpProject();

  run(tmpProjectDir, [], function(err) {
    t.end(err);
  });
});

test('cli: failing run', testWithFailure);

test('cli: failing run with npm output', function(t) {
  testWithFailure(t, ['--show-npm-output'])
});

function testWithFailure(t, args) {
  args = args || [];

  clean();

  var tmpProjectDir = getTmpProject();

  async.series([
    setupNpmFailure.bind(null, tmpProjectDir),
    run.bind(null, tmpProjectDir, args)
  ], function(err) {
    t.ok(err, 'there should be an error from calling npm-pkgr');
    t.equal(err.message, '1', 'the process should have exited with code 1');
    t.end();
  });
}

function setupNpmFailure(projectDir, callback) {
  var pkg = path.join(projectDir, 'package.json');

  updateJson(pkg, {
    scripts: {
      preinstall: 'There\'s no way this will work'
    }
  })(callback);
}

function run(projectDir, args, callback) {
  var npmPkgrCli = path.join(__dirname, '..', '..', 'cli.js');
  var nodeCmd = process.argv[0];

  var child = spawn(nodeCmd, [npmPkgrCli].concat(args), {stdio: 'inherit', cwd: projectDir});

  child.on('close', function(code) {
    callback(code ? new Error(code) : null);
  });
}

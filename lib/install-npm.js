module.exports = installNpm;

/**
 * `npm install` in a dir, using cp.spawn
 */

var spawn = require('child_process').spawn;

function installNpm(to, options, cb) {
  var npmArgs = ['install'].concat(options.args);
  console.log('start `npm %s`', npmArgs.join(' '));
  var npmInstall = spawn('npm', npmArgs, {
    cwd: to,
    stdio: options.showNpmOutput ? 'inherit' : 'ignore'
  });

  npmInstall.on('close', function(code) {
    if (options.showNpmOutput) {
      console.log('end `npm %s`, exit code: %d', npmArgs.join(' '), code);
    } else {
      console.log('end `npm %s`', npmArgs.join(' '));
    }
    cb(code ? new Error('Error running npm: ' + code) : null);
  });
}

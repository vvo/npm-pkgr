module.exports = installNpm;

/**
 * `npm install` in a dir, using cp.spawn
 */

var spawn = require('child_process').spawn;

function installNpm(to, options, cb) {
  var npmCmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
  var npmArgs = ['install'].concat(options.args);
  console.log('start `npm %s`', npmArgs.join(' '));
  var npmInstall = spawn(npmCmd, npmArgs, {
    cwd: to,
    stdio: options.npmIo ? options.npmIo : 'ignore'
  });

  npmInstall.on('close', function(code) {
    console.log('end `npm %s`', npmArgs.join(' '));
    cb(code ? new Error('Error running npm: ' + code) : null);
  });
}

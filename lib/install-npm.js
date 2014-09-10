module.exports = installNpm;

/**
 * `npm install` in a dir, using cp.exec
 */

var exec = require('child_process').exec;

function installNpm(to, args, cb) {
  console.log('start `npm install %s`', args);
  exec('npm install ' + args, {
    cwd: to,
    maxBuffer: 20*1024*1024
  }, done);

  function done(err, stdout, stderr) {
    console.log('end `npm install %s`', args);
    cb(err);
  }
}
module.exports = installNpm;

/**
 * `npm install` in a dir, using cp.exec
 */


function installNpm(destFilePath, cb) {
  console.log('start `npm install %s`', args);

  function done(err, stdout, stderr) {
    console.log('end `npm install %s`', args);
    cb(err);
  }
}

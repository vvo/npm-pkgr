module.exports = realPath;

/**
 * get realPath function to be used like arr.map(realPath(a dir))
 */

function realPath(dir) {
  var path = require('path');

  return function computeRealPath(file) {
    return path.join(dir, file);
  }
}
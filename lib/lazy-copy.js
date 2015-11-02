module.exports = lazyCopy;

/**
 * Copy files whether or not they exists
 */

function lazyCopy(files, to, cb) {
  var debug = require('debug')('npm-pkgr:copy');

  var async = require('contra');
  var path = require('path');

  async.waterfall([
    filter.bind(null, files),
    copyFiltered
  ], cb);

  function filter(files, cb) {
    var fs = require('fs');
    async.filter(files, fileExists, cb);
  }

  function copyFiltered(files) {
    debug('copying %j to %s', files, to);

    async.each(files, function copy(file) {
      cp(file, path.join(to, path.basename(file)), cb);
    }, cb);
  }
}

function fileExists(file, cb) {
  var fs = require('fs');
  fs.exists(file, cb.bind(null, null));
}

function cp(src, dest, callback) {
  var fs = require('fs');
  var reader = fs.createReadStream(src);
  var writer = fs.createWriteStream(dest);

  reader.on('error', callback);
  writer.on('error', callback);

  reader.pipe(writer);

  writer.on('finish', callback);
}

module.exports = symlink;

function symlink(files, to, cb) {
  var debug = require('debug')('npm-pkgr:symlink');

  var async = require('contra');
  var path = require('path');

  async.waterfall([
    filter.bind(null, files),
    symlinkFiltered
  ], cb);

  function filter(files, cb) {
    var fs = require('fs');
    async.filter(files, fileExists, cb);
  }

  function symlinkFiltered(files) {
    debug('symlinking %j to %s', files, to);

    async.each(files, function createSymlink(file) {
      var fs = require('fs');
      fs.symlink(file, path.join(to, path.basename(file)), cb);
    }, cb);
  }
}

function fileExists(file, cb) {
  var fs = require('fs');
  fs.exists(file, cb.bind(null, null));
}

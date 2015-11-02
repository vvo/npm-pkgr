module.exports = pruneCache;

function pruneCache(npmPkgrCache) {
  var fs = require('fs');
  var rimraf = require('rimraf');
  var path = require('path');
  var async = require('contra');

  var realPath = require('./real-path');

  if (fs.existsSync(npmPkgrCache)) {
    var cacheFolders = fs
      .readdirSync(npmPkgrCache)
      .map(realPath(npmPkgrCache));

    if (!cacheFolders.length)
      return console.log('no cache folders found, run `$ npm-pkgr` first');

    async.map(cacheFolders, fs.stat, function(err, results) {
      var monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      var oldCache = results.reduce(function (res, curr, idx) {
        return (curr.birthtime.getTime() - monthAgo < 0) ?
          res.concat([ cacheFolders[idx] ]) : res;
      }, []);

      if (!oldCache.length)
        return console.log('√ nothing older than a month to remove');

      // Had to wrap `rimraf` into fn to work with `contra`
      async.map(oldCache, function(a, b) { rimraf(a, function() { b() }) }, function(err) {
        if (err) return console.warn(err);
        return console.log('√ %s cache folders older than a month cleaned', oldCache.length);
      });
    });
  }
}

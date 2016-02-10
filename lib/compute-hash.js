'use strict';
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var crypto = require('crypto');
var path = require('path');

var json = require('jsonfile');
var npmVersion = require('npm-version');

/**
 * compute a hash based on:
 *   - package.json
 *   - npm-shrinkwrap.json
 *   - node version
 */
function computeHash(components) {
  var shasum = crypto.createHash('sha1');
  _.each(components, function(component) {
    shasum.update(component);
  });
  return shasum.digest('hex');
}

function computeNpmHash(dir, isProduction, cb) {
  async.parallel({
    npmVersionNumber: npmVersion,
    shrinkwrapJson: function(cb) {
      var shrinkwrapFilename = path.join(dir, 'npm-shrinkwrap.json');
      fs.exists(shrinkwrapFilename, function(exists) {
        if (!exists) return cb(null, null);
        json.readFile(shrinkwrapFilename, cb);
      });
    },
    packageJson: function(cb) {
      json.readFile(path.join(dir, 'package.json'), cb);
    }
  }, function(err, results) {
    if (err) return cb(err);
    var shrinkwrapJson = results.shrinkwrapJson;

    var components = [
      process.version,
      results.npmVersionNumber
    ];

    var pkg = results.packageJson;
    if (!isProduction) {
      pkg.dependencies = pkg.dependencies || {};
      pkg.devDependencies = pkg.devDependencies || {};

      components.push(JSON.stringify(pkg.dependencies || {}));
      components.push(JSON.stringify(pkg.devDependencies || {}));
    }

    if (shrinkwrapJson) {
      if (!shrinkwrapJson.dependencies) {
        return cb(new Error('No dependencies found in shrinkwrap'));
      }
      components.push(JSON.stringify(shrinkwrapJson.dependencies));
    }
    cb(null, computeHash(components));
  });
}

function computeBowerHash(dir, isProduction, cb) {
  async.parallel({
    bowerJson: function(cb) {
      json.readFile(path.join(dir, 'bower.json'), cb);
    }
  }, function(err, results) {
    if (err) return cb(err);
    var components = [
    ];

    var pkg = results.bowerJson;
    if (!isProduction) {
      pkg.dependencies = pkg.dependencies || {};
      pkg.devDependencies = pkg.devDependencies || {};
      pkg.resolutions = pkg.resolutions || {};

      components.push(JSON.stringify(pkg.dependencies || {}));
      components.push(JSON.stringify(pkg.devDependencies || {}));
      components.push(JSON.stringify(pkg.resolutions || {}));
    }

    cb(null, computeHash(components));
  });
}

module.exports = {
  computeNpmHash: computeNpmHash,
  computeBowerHash: computeBowerHash
};

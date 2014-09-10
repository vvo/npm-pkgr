module.exports = computeHash;

/**
 * compute a hash based on:
 *   - package.json
 *   - npm-shrinkwrap.json
 *   - node version
 */

function computeHash(dir, useShrinkwrap, cb) {
  var crypto = require('crypto');
  var fs = require('fs');
  var path = require('path');

  var json = require('jsonfile');
  var npmVersion = require('npm-version');
  var shasum = crypto.createHash('sha1');

  shasum.update(process.version);

  npmVersion(useNpmVersion);

  function useNpmVersion(err, version) {
    if (err) {
      return cb(err);
    }

    shasum.update(version);

    if (useShrinkwrap === true) {
      return readNpmShrinkwrapJson();
    }

    readBoth();
  }

  function readNpmShrinkwrapJson() {
    json.readFile(path.join(dir, 'npm-shrinkwrap.json'), gotNpmShrinkwrapJson);

    function gotNpmShrinkwrapJson(err, pkg) {
      if (useShrinkwrap) {

        // npm-shrinkwrap does not exists and we were asked to use it (--production flags)
        // fallback to using package.json
        if (err !== null) {
          if (err.code === 'ENOENT') {
            useShrinkwrap = false;
            console.log('WARNING! Using `--production` without an `npm-shrinkwrap.json` file.');
            return readBoth();
          }

          return cb(err);
        }

        if (!pkg.dependencies) {
          return cb(new Error('No dependencies found in shrinkwrap'));
        }
      }

      if (err) {
        return cb(null, shasum.digest('hex'))
      }

      if (pkg.dependencies) {
        shasum.update(JSON.stringify(pkg.dependencies));
      }

      cb(null, shasum.digest('hex'));
    }
  }

  function readBoth() {
    json.readFile(path.join(dir, 'package.json'), gotPackageJson);

    function gotPackageJson(err, pkg) {
      if (err) {
        return cb(err)
      }

      pkg.dependencies = pkg.dependencies || {};
      pkg.devDependencies = pkg.devDependencies || {};

      shasum.update(JSON.stringify(pkg.dependencies));
      shasum.update(JSON.stringify(pkg.devDependencies));

      readNpmShrinkwrapJson();
    }
  }
}
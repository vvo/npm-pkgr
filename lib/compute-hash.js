module.exports = computeHash;

/**
 * compute a hash based on:
 *   - package.json
 *   - npm-shrinkwrap.json
 *   - node version
 */

function computeHash(dir, production, cb) {
  var crypto = require('crypto');
  var json = require('jsonfile');
  var path = require('path');
  var shasum = crypto.createHash('sha1');

  shasum.update(process.version);

  if (production === true) {
    return readNpmShrinkwrapJson();
  }

  readBoth();

  function readNpmShrinkwrapJson() {
    json.readFile(path.join(dir, 'npm-shrinkwrap.json'), gotNpmShrinkwrapJson);

    function gotNpmShrinkwrapJson(err, pkg) {
      if (production) {
        if (err) {
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
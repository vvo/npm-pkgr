// Yup, I export some globals for tests
// BOOM! Break the rules

async = require('contra');
fs = require('fs');
path = require('path');
shell = require('shelljs');
test = require('prova');

baseProject = path.join(__dirname, 'example-project');
npmPkgr = require('../');

clean = function clean() {
  shell.exec('rm -rf ~/.npm-pkgr');
  shell.exec('npm cache clean');
};

getTmpProject = function getTmpProject(from) {
  var path = require('path');
  var uuid = require('uuid');

  var tmpDir = path.join(shell.tempdir(), uuid.v4());

  from = from || baseProject;
  shell.cp('-R', from + '/', tmpDir);
  shell.cp(from + '/.npmrc', tmpDir);

  return tmpDir;
};

// get ($directory/node_modules/lodash/package.json).version
packageVersion = function packageVersion(directory, packageName) {
  var path = require('path');
  var json = require('jsonfile');

  return json.readFileSync(path.join(directory, 'node_modules', packageName, 'package.json')).version;
};


updateJson = function updateJson(file, props) {
  var json = require('jsonfile');

  return function(cb) {
    var merge = require('lodash').merge;
    var actualJSON = json.readFileSync(file);
    var newJSON = merge(actualJSON, props);
    json.writeFile(file, newJSON, cb);
  }
};

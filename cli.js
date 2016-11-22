#!/usr/bin/env node
var npmPkgr = require('./');
var argv = require('minimist')(process.argv.slice(2));

if (argv.version) {
  console.log(require('./package.json').version);
  process.exit(0);
}

npmPkgr({
  cwd: process.cwd(),
  args: process.argv.slice(2).filter(removeArgs.bind(null, {
    '--strategy': { expectsValue: false },
    '--show-npm-output': { expectsValue: false },
    '--symlinks': { expectsValue: true },
	'--cachepath': { expectsValue: true }
  })),
  strategy: argv.strategy,
  npmIo: argv['show-npm-output'] ? 'inherit' : null,
  symlinks: argv.symlinks ? argv.symlinks.split(',') : null,
  cachepath: argv.cachepath ? argv.cachepath.split(',') : null
}, end);


function removeArgs(argsToRemove, argName, argIndex, argsArr) {
  var removeCurrentArg = typeof argsToRemove[argName] !== 'undefined';
  var removePreviousArg = (
    argIndex > 0 &&
    argName.indexOf('--') !== 0 &&
    typeof argsToRemove[argsArr[argIndex - 1]] !== 'undefined' &&
    argsToRemove[argsArr[argIndex - 1]].expectsValue === true
  );
  return !(removeCurrentArg || removePreviousArg);
}

function end(err, res) {
  if (err) {
    console.error(err);

    console.log();
    console.error('An error occured while `npm-pkgr` ran.')
    console.error('You will find an `npm-debug.log` in `%s` if `npm install` failed', process.cwd());

    process.exit(1);
  }

  console.log('Packages installed in %s', res.node_modules);

  if (!res.npm) {
    console.log('`npm install` was not used');
  }
}

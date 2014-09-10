#!/usr/bin/env node
var npmPkgr = require('./');

npmPkgr({
  cwd: process.cwd(),
  args: process.argv.slice(2),
  strategy: require('minimist')(process.argv.slice(2)).strategy
}, end);

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
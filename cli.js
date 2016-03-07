#!/usr/bin/env node
var npmPkgr = require('./');
var argv = require('minimist')(process.argv.slice(2));

if (argv.version) {
  console.log(require('./package.json').version);
  process.exit(0);
}

npmPkgr({
  cwd: process.cwd(),
  args: process.argv.slice(2),
  strategy: argv.strategy,
  showNpmOutput: argv['show-npm-output']
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

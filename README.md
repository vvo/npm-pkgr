# npm-pkgr

[![Build Status](https://travis-ci.org/vvo/npm-pkgr.svg?branch=master)](https://travis-ci.org/vvo/npm-pkgr)
[![Dependency Status](https://david-dm.org/vvo/npm-pkgr.svg?theme=shields.io)](https://david-dm.org/vvo/npm-pkgr)
[![devDependency Status](https://david-dm.org/vvo/npm-pkgr/dev-status.svg?theme=shields.io)](https://david-dm.org/vvo/npm-pkgr#info=devDependencies)

Work in progress, eyes only.

```shell
npm-pkgr
```

## features

* concurrent builds
* package node modules / production node modules

```
npm-pkgr --production
```

--production? shrinkwrap deps
otherwise shrinkwrap deps + package deps
var dir = tmp/md5(flags/options + package.json + shrinkwrap.json - version)

rm -rf node_modules

0 - create dir
  dir exists?
    yes
      has a .finished?
        no
          setTimeout goto 0 1000
        yes
          ln -s dir ./node_modules
          finished
    no
        cd dir
        create .lock
          npm install --flags
          touch .finished
          finished
      if error()
        remove_cache_directory
        finished

tests
  do no use a global npm-pkgr shell command, use index.js
  launch npm cache clean before each test
  example project
    package.json
      dependencies
      devDependencies
    shrinkwrap.json
    node_modules/lodash

  each test duplicates example-project to a temp folder
  when tests ends, remove temp folder

  no-package.json
  simple
    launch => has node_modules linked
    in debug mode, find tmp dir, test existence, compare to link
    check lodash version
  cache
    launch => has node_modules linked
    npm-cache clean
    rm node_modules
    launch => same link did not changed
    check lodash version
    output has no npm install
  update-version
    launch => has node_modules linked
    update version in package
    launch => no change
    launch --production => has node_modules linked
    update version in shrinkwrap
    launch => no change
  update-shrinkwrapjson
    launch --production => has node_modules linked
    update package version in package/shrinkwrap
    launch --production => link changed
    check lodash version
  update-packagejson
    launch => has node_modules linked
    update package version in shrinkwrap
    launch => link changed
  concurrent
    launch
    launch
    launch
    launch => has node_modules linked
  errors
    add failing postinstall script
    launch => error
    node_modules unchanged
    tmp_folder (found from output) removed


if error()
  remove_directory




npm-pkgr

# npm-pkgr

[![Build Status](http://img.shields.io/travis/vvo/npm-pkgr/master.svg?style=flat-square)](https://travis-ci.org/vvo/npm-pkgr)
[![Dependency Status](http://img.shields.io/david/vvo/npm-pkgr.svg?style=flat-square)](https://david-dm.org/vvo/npm-pkgr)
[![devDependency Status](http://img.shields.io/david/dev/vvo/npm-pkgr.svg?style=flat-square)](https://david-dm.org/vvo/npm-pkgr#info=devDependencies)

`npm-pkgr` caches `npm install` results by hashing dependencies from `package.json`
and `npm-shrinkwrap.json`.

If your `package.json` did not change from last build, then you will immediately get
either:
- a symlink `node_modules`..
- a full `node_modules` copy..

.. to the latest build result located in `~/.npm-pkgr`

`npm-pkgr` frees your deployments from npm network issues and will make your
deploys run fast.

## Usage

```shell
npm install -g npm-pkgr
```

Use `npm-pkgr` instead of `npm install` and you are done.

```shell
npm-pkgr
```

Hashes and finds the latest build corresponding to `package.json` and `npm-shrinkwrap.json`.

```shell
npm-pkgr --production
```

Hashes and finds the latest build corresponding to `npm-shrinkwrap.json`.

```shell
npm-pkgr --show-npm-output
```

Displays `npm`'s output, if `npm install` is run.

Every other flag passed to `npm-pkgr` is passed down to the `npm install` command.

## Cache folder

The cache folder used by `npm-pkgr` is `~/.npm-pkgr` for the current user.

```shell
npm-pkgr prune
```

Removes cache folders older than a month (in your `~/.npm-pkgr` folder)

## Debug

```shell
DEBUG=npm-pkgr* npm-pkgr
```

Will give you some debug information.

### strategy

Default strategy is to symlink `$CWD/node_modules -> ~/.npm-pkgr/$hash/node_modules`.

You can also get a full copy of the `~/.npm-pkgr/$hash/node_modules`.

```shell
npm-pkgr --strategy=copy
```

Careful, if you `--strategy copy`, you will end up installing the `copy package`

## features

* insanely fast `npm install` if already done
* `npm install` once in your CI server, deploy everywhere
* solves shrinkwrap inconsistencies/problems
* solves devDependencies updates even when you use a shrinkwrap
* concurrent builds
* get symlinks or copy to cached `node_modules`

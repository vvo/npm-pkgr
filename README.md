# npm-pkgr

[![Build Status](https://travis-ci.org/vvo/npm-pkgr.svg?branch=master)](https://travis-ci.org/vvo/npm-pkgr)
[![Dependency Status](https://david-dm.org/vvo/npm-pkgr.svg?theme=shields.io)](https://david-dm.org/vvo/npm-pkgr)
[![devDependency Status](https://david-dm.org/vvo/npm-pkgr/dev-status.svg?theme=shields.io)](https://david-dm.org/vvo/npm-pkgr#info=devDependencies)

npm-pkgr caches `npm install` results by hashing dependencies from `package.json`
and `npm-shrinkwrap.json`.

If your `package.json` did not change from last build, then you will immediately get
a symbolic `node_modules` link to the latest build result.

npm-pkgr frees your CI server from npm dependency and will make your builds or
deploys run fast.

## Usage

```shell
npm install -g npm-pkgr
```

Use `npm-pkgr` instead of `npm install` and you are done.

```shell
npm-pkgr
```

Hashes and find the latest build corresponding to `package.json` and `npm-shrinkwrap.json`.

```shell
npm-pkgr --production
```

Hashes and fin the latest build corresponding to `npm-shrinkwrap.json`.

## features

* insanely fast `npm install` if already done
* `npm install` once in your CI server, deploy everywhere
* solves shrinkwrap inconsistencies/problems
* solves devDependencies updates even when you use a shrinkwrap
* concurrent builds
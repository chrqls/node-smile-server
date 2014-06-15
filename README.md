Application
===========

 * Pre-requisites:
  - NodeJS >= 0.8.16 (haven't tested on 0.10.x yet)
  - NPM >= 1.0

 * Run application
  $ sudo node smileplug.js (sudo only if you run on port 80)

Bundled Client Applications
===========================

* SMILE Student Web 1.0.4
* SMILE IQManager 1.0.4
* SMILE Teacher for Android 0.9.9b3
* Plugmin 0.5.1 for Android

Tests
=====

 * Install test dependencies:
  $ npm install -d

 * Run unit tests
  $ ./run_unit_tests 

 * Run functional tests
  $ ./run_functional_tests 

Making the Docs
===============

* Install https://github.com/truedat101/gitchanges
* Use Hugo ... so install it
* rm -rf docs/public (only do this if you are knowing what you do and why you would do this, it should only need to be done once and it's done so don't touch it)
* git subtree add --prefix docs/public git@github.com:RazortoothRTC/node-smile-server.git gh-pages --squash
* git subtree pull --prefix=docs/public
* Run hugo from docs dir
* git commit -a
* git subtree push  --prefix=docs/public git@github.com:RazortoothRTC/node-smile-server.git gh-pages

Updating the Docs
================

* git subtree pull --prefix=docs/public
* Update the docs
* If you are making a release, run < node-smile-server >/docs/tools/genreleasenotes.sh > currentrelease.txt , and put these notes into meta/release-notes.md
* Run hugo from docs dir (to generate the new doc changes)
* git commit -a
* git subtree push  --prefix=docs/public git@github.com:RazortoothRTC/node-smile-server.git gh-pages


Attributions
============

* Flickr: https://www.flickr.com/photos/testrunbomber842/10053155455
* Hugo (for Docs):
* Jquery: for everything else
* Node.js: Also, for making everything a little bit easier

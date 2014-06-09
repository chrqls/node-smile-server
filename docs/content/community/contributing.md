---
title: "Contributing to Epoch SMILE"
date: "2014-05-27"
aliases: ["/doc/contributing/", "/meta/contributing/"]
groups: ["community"]
groups_weight: 30
---

We welcome all contributions. Feel free to pick something from the roadmap
or contact [@dkords](http://twitter.com/dkords) about what may make sense
to do next. Go ahead and fork the project and make your changes.  *We encourage pull requests to discuss code changes.*

When you're ready to create a pull request, be sure to:

  * Have test cases for the new code.  If you have questions about how to do it, please ask in your pull request.
  * A Contributor Agreement will be made available shortly, designed as a protection for all parties.  It is needed to ensure that all code is free and clear for contribution and distribution.

## Contribution Overview

1. Fork Epoch SMILE from https://github.com/RazortoothRTC/node-smile-server
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Commit passing tests to validate changes.
5. Squash commits into a single (or logically grouped) commits (`git rebase -i`)
6. Push to the branch (`git push origin my-new-feature`)
7. Create new Pull Request
(Thanks SPF13 for this workflow)

# Building from source

## Clone locally (for contributors):

    git clone https://github.com/RazortoothRTC/node-smile-server
    cd node-smile-server

## Running Epoch SMILE

    cd <YOUR REPO>
    node smileplug.js

## Building Epoch SMILE

   It's Javascript!  It doesn't build.  However, there are some things to do to prepare the environment.

   * cd <YOUR REPO>
   * npm install .
   * In the future, we will implement packaging, and probably make this into an NPM module.


require('babel-polyfill');

global.assert = require('assert');
global.sinon = require('sinon');
global.decache = require('decache');

require('../module-loader.js');
loader.prefix('modules', './test/');

global.containsModule = (modules, name) => modules.some(
  module => module.name === name);

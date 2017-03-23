require('babel-polyfill');

global.assert = require('assert');
global.sinon = require('sinon');

global.loader = require('../module-loader.js');

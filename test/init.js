global.assert = require('assert');
global.sinon = require('sinon');
global.decache = require('decache');

global.sleep = millis => new Promise(resolve => setTimeout(resolve, millis));

require('../loader.js');

const Loader = loader.constructor;
global.createLoader = () => {
  loader = new Loader();
  loader.use({
    path(key) {
      if (key.startsWith('modules')) {
        return `./test/${super.path(key)}`;
      }
      return super.path(key);
    },
  });
  return loader;
};

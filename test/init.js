global.assert = require('assert');
global.sinon = require('sinon');
global.decache = require('decache');

require('../loader.js');

const Loader = loader.constructor;
global.createLoader = () => {
  loader = new Loader();
  loader.use({
    path(key) {
      if (key.startsWith('modules')) {
        return `./test/${this.next.path(key)}`;
      }
      return this.next.path(key);
    },
  });
  return loader;
};

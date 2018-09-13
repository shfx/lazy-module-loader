global.assert = require('assert');
global.sinon = require('sinon');
global.decache = require('decache');

require('../loader.js');

const Loader = loader.constructor;
global.createLoader = () => {
  loader = new Loader();
  loader.use({
    getPath(key) {
      if (key.startsWith('modules')) {
        return `./test/${this.next.getPath(key)}`;
      }
      return this.next.getPath(key);
    },
  });
  return loader;
};

const fs = require('fs');
const path = require('path');

require('./loader.js');

const Bundler = {

  /*
   * Bundles specified modules' content into a single module.
   */
  bundle(modules, name, header) {
    const define = id => `loader.define('${id}', module.exports);`;
    return `${header}

${modules.map(module => `${module.content}\n${define(module.id)}\n`).join('\n')}
{
  module.exports = {
    name: '${name}',
    init: () => Promise.all([
      ${
        modules.filter(module => module.exports.init)
            .map(module => `loader.get('${module.id}').init(),`)
            .join('\n      ')
      }
    ]),
  };
}
`;
  },

  /*
   * Generates a bundle for module with given id including all its dependencies.
   */
  async generate(id, name, {prefix = './', filter = null, header = ''}) {

    loader.use({
      path(id) {
        return super.path(`${prefix}${id}`);
      },
      async load(module) {
        module.content = fs.readFileSync(this.path(module.id), 'utf8');
        return await super.load(module);
      },
    });

    await loader.preload(id);
    const module = loader.registry.get(id);
    let modules = [module, ...module.deepDependencies];
    if (typeof filter === 'function') {
      modules = modules.filter(filter);
    }
    const content = this.bundle(modules, name, header);
    return content.replace(/await\s+loader\.require/g, 'loader.get');
  },
};

global.bundler = Bundler;

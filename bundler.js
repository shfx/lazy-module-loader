const fs = require('fs');
const path = require("path");

require('./loader.js');

const Bundler = {

  /*
   * Bundles modules into a single bundle file with specified name and header.
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
  async generate(id, name, options) {

    const config = {
      prefix: options.prefix || './',
      filter: options.filter || (() => true),
      header: options.header || '',
    };

    loader.use({
      path(id) {
        return super.path(`${config.prefix}${id}`);
      },
      async load(module) {
        const filePath = path.resolve(__dirname, this.path(module.id));
        module.content = fs.readFileSync(filePath, 'utf8');
        return await super.load(module);
      },
    });

    await loader.preload(id);
    const module = loader.registry.get(id);
    const modules = [module, ...module.deepDependencies].filter(
        module => config.filter(module));
    const content = this.bundle(modules, name, config.header);
    return content.replace(/await\s+loader\.require/g, 'loader.get');
  },
};

global.bundler = Bundler;

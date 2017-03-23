{
  /** Path => module mapping. */
  const registry = new Map();

  /** Path => module dependency symbols mapping */
  const dependencySymbols = new Map();

  const prefixes = new Map();

  const getScriptPath = path => {
    for (let [name, prefix] of prefixes) {
      if (path.startsWith(name)) {
        return `/${prefix}${path}.js`;
      }
    }
    return `/${path}.js`;
  }

  const loadModule = async path => {
    if ('object' === typeof window) {
      return await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = getScriptPath(path);
        script.onload = () => {
          registry.set(path, module.exports);
          resolve(module.exports);
        };
        document.head.appendChild(script);
      });
    }
    return require('./test/' + path + '.js');
  };

  const getPath = symbol => String(symbol).slice(7, -1);

  let currentPath = null;

  const ModuleLoader = class {

    static prefix(name, prefix) {
      prefixes.set(name, prefix);
    };

    static symbol(path, modulePath = currentPath) {
      const symbol = Symbol.for(path);
      let moduleSymbols = dependencySymbols.get(modulePath);
      if (!moduleSymbols) {
        moduleSymbols = [];
        dependencySymbols.set(currentPath, moduleSymbols);
      }
      moduleSymbols.push(symbol);
      return symbol;
    }

    static define(path, module) {
      registry.set(path, module);
    }

    static get(path) {
      if ('symbol' === typeof path) {
        path = getPath(path);
      }
      const module = registry.get(path);
      if (module) {
        return module;
      }
      throw new Error(`No module found for path '${path}'`);
    }

    static async require(path) {
      let module = registry.get(path);
      if (module) {
        return module;
      }
      currentPath = path;
      module = await loadModule(path);
      if (module.init) {
        const result = module.init();
        if ('object' === typeof result && 'function' === typeof result.then) {
          await result;
        }
      }
      registry.set(path, module);
      return module;
    }

    static async resolve(symbol) {
      const path = getPath(symbol);
      return this.require(path);
    }

    static async preload(symbol) {
      const path = getPath(symbol);
      const module = await this.require(path);
      const symbols = dependencySymbols.get(path) || [];
      for (const symbol of symbols) {
        await this.preload(symbol);
      }
      return module;
    }

    static get data_() {
      return {
        getSymbols: path => dependencySymbols.get(path) || [],
        getModules: () => Array.from(registry.entries()),
      }
    }
  };

  if ('object' === typeof window) {
    window.loader = ModuleLoader;
    window.module = {};
  } else {
    module.exports = ModuleLoader;
  }
}
{
  /** Path => module mapping. */
  const registry = new Map();

  /** Path => module dependency symbols mapping */
  const dependencySymbols = new Map();

  const prefixes = new Map();

  const getResourcePath = path => {
    for (let [name, prefix] of prefixes) {
      if (path.startsWith(name)) {
        return `${prefix}${path}.js`;
      }
    }
    return `${path}.js`;
  }

  const appendScriptToHead = async path => {
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = getResourcePath(path);
      script.onload = () => {
        registry.set(path, module.exports);
        resolve(module.exports);
      };
      document.head.appendChild(script);
    });
  };

  const requireUncached = path => {
    const resourcePath = getResourcePath(path);
    decache(resourcePath);
    return require(resourcePath);
  }

  const loadModule = async path => {
    if ('object' === typeof window) {
      return appendScriptToHead(path);
    }
    return requireUncached(path);
  };

  const getPath = symbol => String(symbol).slice(7, -1);

  let context = null;

  const ModuleLoader = class {

    static prefix(name, prefix) {
      prefixes.set(name, prefix);
      return this;
    };

    static symbol(path, ctx = context) {
      const symbol = Symbol.for(path);
      let moduleSymbols = dependencySymbols.get(ctx);
      if (!moduleSymbols) {
        moduleSymbols = [];
        dependencySymbols.set(ctx, moduleSymbols);
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
      context = path;
      module = await loadModule(path);
      if (module.init) {
        const result = module.init();
        if (result instanceof Promise) {
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
      let module = registry.get(path);
      if (module) {
        return module;
      }
      module = await this.require(path);
      const symbols = dependencySymbols.get(path) || [];
      for (const symbol of symbols) {
        await this.preload(symbol);
      }
      return module;
    }

    static get debug_() {
      return {
        getSymbols: path => dependencySymbols.get(path) || [],
        getModules: () => Array.from(registry.entries()),
        reset: () => {
          registry.clear();
          dependencySymbols.clear();
        }
      }
    }
  };

  const isBrowser = 'object' === typeof window;

  if (isBrowser) {
    window.loader = ModuleLoader;
    window.module = {};
  } else {
    global.loader = ModuleLoader;
  }
}

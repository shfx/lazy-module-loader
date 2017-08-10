{
  const isBrowser = 'object' === typeof window;

  /** Path => module mapping. */
  const registry = new Map();

  /** Path => module dependency symbols mapping */
  const dependencySymbols = new Map();

  const prefixes = new Map();

  const concatenatePaths = (...paths) => paths
      .map(path => path.replace(/(^\/)/g, ''))
      .join('/')
      .replace(/\/+/g, '/');

  const getResourcePath = path => {
    const getRealPath = path => {
      if (path.endsWith('/')) {
        return `${path}main.js`;
      }
      return `${path}.js`;
    };
    for (let [name, prefix] of prefixes) {
      if (path.startsWith(name)) {
        return getRealPath(concatenatePaths(prefix, path));
      }
    }
    return getRealPath(path);
  };

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
    if (isBrowser) {
      return appendScriptToHead(path);
    }
    return requireUncached(path);
  };

  const getPath = path =>
      typeof path === 'symbol' ? String(path).slice(7, -1) : path;

  let context = null;

  let readyPromise = Promise.resolve();

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
      if (!registry.get(path)) {
        registry.set(path, module);
      }
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

    static detectDependencies(method) {
      const str = method.toString();
      const args = str.substring(str.indexOf('(') + 1, str.indexOf(')'));
      if (!args) {
        return [];
      }
      return args.split(',').map(
          arg => arg.trim().match(/(\/\*\=.*\*\/)/)[0].slice(3, -2).trim());
    }

    static async require(path) {
      return this.resolve(path, loadModule);
    }

    static async resolve(path, loader = loadModule) {
      path = getPath(path);
      let module = registry.get(path);
      if (module) {
        return module;
      }
      context = path;
      if (!loader) {
        loader = this.loadModule(path);
      }
      module = await loader(path);
      if (module.init) {
        const paths = this.detectDependencies(module.init);
        const deps = await Promise.all(
          paths.map(key => (
            path === key ? module : this.resolve(key, loader)
          ))
        );
        const result = module.init(...deps);
        if (result instanceof Promise) {
          await result;
        }
      }
      registry.set(path, module);
      return module;
    }

    static async foreload(symbol) {

      let done;
      const currentReadyPromise = readyPromise;
      readyPromise = new Promise(resolve => { done = resolve; });
      await currentReadyPromise;

      const module = await this.preload(symbol);
      done();
      return module;
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

    static getPath(module) {
      return getResourcePath(module);
    }

    static get $debug() {
      return {
        getSymbols: path => dependencySymbols.get(path) || [],
        getModules: () => Array.from(registry.entries()),
        reset: () => {
          readyPromise = Promise.resolve();
          registry.clear();
          dependencySymbols.clear();
        }
      }
    }
  };

  if (isBrowser) {
    window.loader = ModuleLoader;
    window.module = {};
  } else {
    global.loader = ModuleLoader;
  }
}

{
  const isBrowser = 'object' === typeof window;

  if (isBrowser) {
    window.global = window;
  }

  class Module {

    constructor(id, isRequired) {
      this.id = id;
      this.isRequired = isRequired;

      this.exports = null;
      this.dependencies = new Set();
      this.clients = new Set();
    }

    get deepDependencies() {
      const deps = new Set();
      const collect = module => {
        for (const dependency of module.dependencies) {
          if (!deps.has(dependency)) {
            deps.add(dependency);
            collect(dependency);
          }
        }
      };
      collect(this);
      return deps;
    }
  }

  class Context {

    constructor() {
      this.stack = [];
    }

    save(module) {
      this.stack.push(module);
    }

    restore(module) {
      const currentModule = this.stack.pop();
      if (currentModule !== module) {
        throw new Error(
            `Invalid context detected: '${
                                          currentModule.id
                                        }', expecting: ${module.id}`);
      }
    }

    get module() {
      return this.stack[this.stack.length - 1] || null;
    }

    registerDependencyTo(dependency, required = false) {
      if (this.module) {
        this.module.dependencies.add(dependency);
        dependency.clients.add(this.module);
      }
    }
  }

  /* Mapping of ids to promises of exported values. */
  const exportPromises = new Map();

  /* Mapping of ids to promises of loaded modules. */
  const preloadPromises = new Map();

  /* Creates an instance of a module with given id and registers it. */
  const registerModule = (id, isRequired = false) => {
    const module = new Module(id, isRequired);
    loader.registry.set(id, module);
    return module;
  };

  class Loader {

    constructor() {
      this.ready = Promise.resolve(null);
      this.context = new Context();
      this.registry = new Map();
    }

    /*
     * Makes the loader use the specified plugin.
     */
    use(plugin) {
      return global.loader = new Proxy(loader, {
        get(target, prop) {
          if (prop === 'next') {
            return target;
          }
          if (plugin.hasOwnProperty(prop)) {
            const value = plugin[prop];
            if (typeof value === 'function') {
              return value.bind(global.loader);
            }
            return value;
          }
          return target[prop];
        },
      });
    }

    /*
     * Declares that module resolved by given id
     * is an optional dependency.
     *
     * Returns a symbol for the specified id.
     */
    symbol(id) {
      let module = loader.registry.get(id);
      if (!module) {
        module = registerModule(id);
      }
      this.context.registerDependencyTo(module);
      return Symbol.for(id);
    }

    /*
     * Finds a module by the specified id and declares it
     * to be a required dependency.
     *
     * Returns a reference to the module's exported value.
     */
    async require(id) {
      let module = loader.registry.get(id);
      if (module) {
        if (!module.isRequired) {
          module.isRequired = true;
        }
      } else {
        module = registerModule(id, true);
      }
      this.context.registerDependencyTo(module);
      return await this.resolve(id);
    }

    /*
     * Finds a module by the specified id.
     *
     * Returns module's exported value.
     */
    async resolve(id) {
      let module = loader.registry.get(id);
      if (module) {
        if (module.exports) {
          return module.exports;
        }
        if (module.isPending) {
          return exportPromises.get(id);
        }
      } else {
        module = registerModule(id);
      }
      return await this.load(module);
    }

    /*
     * Defines the exported value for the module identified
     * by the specified id. If the module does not exist, creates a new one.
     */
    define(id, exported) {
      const module = loader.registry.get(id) || registerModule(id);
      if (!module.exports) {
        module.exports = exported;
        loader.registry.set(id, module);
      }
      return module;
    }

    /*
     * Gets the module from the cache and returns its exported value.
     * Returns null if the module is not found.
     */
    get(id) {
      const module = loader.registry.get(id);
      return module ? module.exports : null;
    }

    /*
     * Preloads the module with given id and preloads recursively
     * all the dependencies. Returns module's exported value.
     */
    async preload(id) {

      let preloadPromise = preloadPromises.get(id);
      if (preloadPromise) {
        return preloadPromise;
      }

      const done = await this.waitForLoader(id);

      const module = loader.registry.get(id);
      if (module && module.isLoaded) {
        return module.exports;
      }

      preloadPromise = this.loadWithDependencies(id);
      preloadPromises.set(id, preloadPromise);

      const exported = await preloadPromise;
      done();
      return exported;
    }

    /*
     * Waits for the loader to be ready to process requests with given token.
     */
    async waitForLoader(id) {
      const loaderReady = this.ready;
      let done;
      const donePromise = new Promise(resolve => {
        done = resolve;
      });
      this.ready = donePromise;

      await loaderReady;
      return done;
    }

    /*
     * Loads the module with given id with all its dependencies.
     * Returns module's exported value.
     */
    async loadWithDependencies(id) {
      const exported = await this.resolve(id);
      const module = loader.registry.get(id);
      for (const dependency of module.dependencies) {
        if (!dependency.exports) {
          await this.loadWithDependencies(dependency.id);
        }
      }
      module.isLoaded = true;
      return exported;
    }

    /*
     * Loads and initializes the module. Returns its exported value.
     */
    async load(module) {

      const id = module.id;
      const path = this.path(id);

      try {

        this.context.save(module);

        module.isPending = true;

        const exportPromise =
            isBrowser ? this.loadInBrowser(path) : this.loadInNode(path);
        exportPromises.set(id, exportPromise);

        const exported = await exportPromise;
        delete module.isPending;

        if (!exported) {
          throw new Error(`No "module.exports" found in module with id: ${id}`);
        }
        module.exports = exported;

        if (typeof module.exports.init === 'function') {
          await module.exports.init();
        }

        this.context.restore(module);

        return exported;

      } catch (error) {
        this.report({
          id,
          error,
        });
        failed(error);
      }
    }

    /*
     * Returns the resource path for the specified id.
     */
    path(id) {
      if (id.endsWith('/')) {
        return `${id}main.js`;
      }
      if (/^(.*)\.([a-z0-9]{1,4})$/.test(id)) {
        return id;
      }
      return `${id}.js`;
    }

    /*
     * Loads the script in the browser environment.
     */
    loadInBrowser(path) {
      return new Promise((resolve, reject) => {
        window.module = {
          exports: null,
        };
        const script = document.createElement('script');
        script.src = path;
        script.onload = () => {
          const exported = module.exports;
          delete window.module;
          resolve(exported);
        };
        script.onerror = error => {
          reject(error);
        };
        document.head.appendChild(script);
      });
    }

    /*
     * Loads the script in the node.js environment.
     */
    loadInNode(path) {
      decache(path);
      return require(path);
    }

    /*
     * Reports the error provided by the error message.
     */
    report(message) {
      console.error('Error loading module:', message.id);
      throw message.error;
    }

    reset() {
      preloadPromises.clear();
      exportPromises.clear();
    }
  }

  global.loader = new Loader();
}

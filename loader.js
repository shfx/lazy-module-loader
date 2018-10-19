{
  const isBrowser = 'object' === typeof window;
  const $global = isBrowser ? window : global;

  class Module {

    constructor(id, isRequired) {
      this.id = id;
      this.isRequired = isRequired;

      this.exports = null;
      this.dependencies = new Set();
      this.clients = new Set();
    }

    /*
     * Returns a set of all module's dependencies.
     */
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

    /*
     * Pushes the module onto the stack.
     */
    save(module) {
      this.stack.push(module);
    }

    /*
     * Restores the stack to the previous state.
     */
    restore(module) {
      const lastModule = this.stack.pop();
      if (lastModule !== module) {
        throw new Error(
            `Invalid context detected: '${
                                          lastModule.id
                                        }', expecting: ${module.id}`);
      }
    }

    /*
     * Returns the last module from the stack.
     */
    get module() {
      return this.stack[this.stack.length - 1] || null;
    }

    /*
     * Adds the specified dependency to the current module.
     */
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
  const loadPromises = new Map();

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
      console.assert(
          plugin.constructor === Object, 'Plugin must be a plain object!');
      Object.setPrototypeOf(plugin, loader);
      return $global.loader = plugin;
    }

    /*
     * Declares that module resolved by given id
     * is an optional dependency.
     *
     * Returns a symbol for the specified id.
     */
    symbol(id) {
      let module = this.registry.get(id);
      if (!module) {
        module = this.registerModule(id);
      }
      this.context.registerDependencyTo(module);
      return Symbol.for(id);
    }

    /*
     * Finds a module by the specified id and declares it
     * to be a required dependency.
     *
     * Returns module's exported value.
     */
    async require(id) {
      let module = this.registry.get(id);
      if (module) {
        if (!module.isRequired) {
          module.isRequired = true;
        }
      } else {
        module = this.registerModule(id, true);
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
      let module = this.registry.get(id);
      if (module) {
        if (module.exports) {
          return module.exports;
        }
        if (module.isPending) {
          return exportPromises.get(id);
        }
      } else {
        module = this.registerModule(id);
      }
      return await this.load(module);
    }

    /*
     * Defines the exported value for the module with the specified id.
     * If the module does not exist, creates a new one.
     */
    define(id, exported) {
      const module = this.registry.get(id) || this.registerModule(id);
      if (!module.exports) {
        module.exports = exported;
        this.registry.set(id, module);
      }
      return module;
    }

    /*
     * Gets the module from the cache and returns its exported value.
     * Returns null if the module is not found.
     */
    get(id) {
      const module = this.registry.get(id);
      return module ? module.exports : null;
    }

    /*
     * Preloads the module with given id and preloads recursively
     * all the dependencies. Returns module's exported value.
     */
    async preload(id) {

      let loadPromise = loadPromises.get(id);
      if (loadPromise) {
        return loadPromise;
      }

      const done = await this.waitForLoader();

      const module = this.registry.get(id);
      if (module && module.isLoaded) {
        return module.exports;
      }

      loadPromise = this.loadWithDependencies(id);
      loadPromises.set(id, loadPromise);

      const exported = await loadPromise;
      done();
      return exported;
    }

    /*
     * Waits for the loader to be ready.
     * Returns the "done" function to release loader for the subsequent calls.
     */
    async waitForLoader() {
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
      const module = this.registry.get(id);
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
        delete module.isPending;

        const exported = await exportPromise;
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
      if ($global.decache) {
        decache(path);
      }
      return require(path);
    }

    /*
     * Reports the error provided by the error message.
     */
    report(message) {
      console.error('Error loading module:', message.id);
      throw message.error;
    }

    /*
     * Creates an instance of a module with given id and registers it.
     */
    registerModule(id, isRequired = false) {
      const module = new Module(id, isRequired);
      this.registry.set(id, module);
      return module;
    }

    /*
     * Resets loader state.
     */
    reset() {
      this.ready = Promise.resolve(null);
      this.registry.clear();
      exportPromises.clear();
      loadPromises.clear();
    }
  }

  $global.loader = new Loader();
}

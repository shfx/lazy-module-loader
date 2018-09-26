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

    get isPreloaded() {
      if (!this.exports) {
        return false;
      }
      return [...this.deepDependencies].every(module => module.exports);
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

  class Loader {

    constructor() {
      this.ready = Promise.resolve(null);
      this.context = new Context();
      this.registry = new Map();
      this.modulePromises = new Map();
      this.preloadPromises = new Map();
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
      let module = this.registry.get(id);
      if (!module) {
        module =  this.registerModule_(id);
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

      let module = this.registry.get(id);
      if (module) {
        if (!module.isRequired) {
          module.isRequired = true;
        }
      } else {
        module = this.registerModule_(id, true);
      }
      this.context.registerDependencyTo(module);

      return await this.resolve(id);
    }

    /*
     * Finds a module by the specified id.
     *
     * Returns a reference to the module's exported value.
     */
    async resolve(id) {

      let module = this.registry.get(id);

      if (module) {
        if (module.exports) {
          return module.exports;
        }
        if (module.isPending) {
          return this.modulePromise_(id);
        }

      } else {
        module = this.registerModule_(id);
      }

      return await this.load(module);
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
     * Defines the exported value for the module identified
     * by the specified id. If the module does not exist, creates a new one.
     */
    define(id, exported) {
      const module = this.registry.get(id) || this.registerModule_(id);
      if (!module.exports) {
        module.exports = exported;
        this.registry.set(id, module);
        this.modulePromise_(id).resolve(exported);
      }
      return module;
    }

    /*
     * Loads and initializes the module. Returns its exported value.
     */
    async load(module) {

      module.isPending = true;

      const id = module.id;
      const path = this.path(id);

      try {

        this.context.save(module);

        const exported = isBrowser ? await this.loadInBrowser(path) :
                                     await this.loadInNode(path);
        delete module.isPending;

        if (!exported) {
          throw new Error(`No "module.exports" found in module with id: ${id}`);
        }

        module.exports = exported;

        if (typeof module.exports.init === 'function') {
          await module.exports.init();
        }

        this.modulePromise_(id).resolve(exported);

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
     * Waits for the loader to be ready to process requests with given token.
     */
    async waitForLoader(token) {

      if (this.isInitial_(token)) {

        const loaderReady = this.ready;

        let done;
        const preloadedPromise = new Promise(resolve => {
          done = resolve;
        });

        this.ready = preloadedPromise;
        await loaderReady;
        return done;
      }

      return () => null;
    }

    /*
     * Preloads the module and resolves recursively all the dependencies.
     *
     * Returns the module's exported value.
     */
    async preload(id, token = Symbol(id)) {

      const done = await this.waitForLoader(token);

      const preloadPromise = this.preloadPromise_(token);
      const exported = await this.resolve(id);
      const module = this.registry.get(id);
      for (const dependency of module.dependencies) {
        if (!dependency.exports) {
          await this.preload(dependency.id, token);
        }
      }
      done(exported);
      preloadPromise.resolve(exported);
      return exported;
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

    isInitial_(token) {
      return !this.preloadPromises.get(token);
    }

    registerModule_(id, isRequired = false) {
      const module = new Module(id, isRequired);
      this.registry.set(id, module);
      return module
    }

    modulePromise_(id, create = true) {
      let modulePromise = this.modulePromises.get(id);
      if (modulePromise) {
        return modulePromise;
      }
      if (!create) {
        return null;
      }
      let promiseResolve, promiseReject;
      modulePromise = new Promise((resolve, reject) => {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      modulePromise.resolve = promiseResolve;
      modulePromise.reject = promiseReject;
      this.modulePromises.set(id, modulePromise);
      return modulePromise;
    }

    preloadPromise_(token) {
      let preloadPromise = this.preloadPromises.get(token);
      if (preloadPromise) {
        return preloadPromise;
      }
      let promiseResolve, promiseReject;
      preloadPromise = new Promise((resolve, reject) => {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      preloadPromise.resolve = promiseResolve;
      preloadPromise.reject = promiseReject;
      this.preloadPromises.set(token, preloadPromise);
      return preloadPromise;
    }
  }

  global.loader = new Loader();
}

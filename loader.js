{
  const isBrowser = 'object' === typeof window;

  if (isBrowser) {
    window.global = window;
  }

  class Module {

    constructor(key, isRequired = false) {

      this.key = key;
      this.isRequired = isRequired;

      this.exports = null;
      this.dependencies = new Set();
      this.clients = new Set();
    }

    get ref() {
      return this.exports;
    }

    set ref(ref) {
      this.exports = ref;
    }

    get modules() {
      const modules = new Set();
      const collect = module => {
        for (const dependency of module.dependencies) {
          const target = dependency.target;
          if (!modules.has(target)) {
            modules.add(target);
            collect(target);
          }
        }
      };
      collect(this);
      return modules;
    }

    get isPreloaded() {
      if (!this.ref) {
        return false;
      }
      return [...this.modules].every(module => module.ref);
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
                                          currentModule.key
                                        }', expecting: ${module.key}`);
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
     * Declares that module resolved by given key
     * is an optional dependency.
     *
     * Returns a symbol for the specified key.
     */
    symbol(key) {
      let module = this.registry.get(key);
      if (!module) {
        module = new Module(key, false);
        this.registry.set(key, module);
      }
      this.context.registerDependencyTo(module);
      return Symbol.for(key);
    }

    /*
     * Finds a module by the specified key and declares it
     * to be a required dependency.
     *
     * Returns a reference to the module's exported value.
     */
    async require(key) {

      let module = this.registry.get(key);
      if (module) {
        if (!module.isRequired) {
          module.isRequired = true;
        }
      } else {
        module = new Module(key, true);
        this.registry.set(key, module);
      }
      this.context.registerDependencyTo(module);

      return await this.resolve(key);
    }

    /*
     * Finds a module by the specified key.
     *
     * Returns a reference to the module's exported value.
     */
    async resolve(key) {

      let module = this.registry.get(key);

      if (module) {
        if (module.ref) {
          return module.ref;
        }
        if (module.isPending) {
          return this.modulePromise_(key);
        }

      } else {
        module = new Module(key, false);
        this.registry.set(key, module);
      }

      return await this.load(module);
    }

    /*
     * Gets the module from the cache and returns its exported value.
     * Returns null if the module is not found.
     */
    get(key) {
      const module = this.registry.get(key);
      return module ? module.ref : null;
    }

    /*
     * Defines the exported value for the module identified
     * by the specified key. If the module does not exist, creates a new one.
     */
    define(key, exported) {
      const module = this.registry.get(key) || new Module(key);
      if (!module.ref) {
        module.ref = exported;
        this.registry.set(key, module);
        this.modulePromise_(key).resolve(exported);
      }
      return module;
    }

    /*
     * Loads and initializes the module. Returns its exported value.
     */
    async load(module) {

      module.isPending = true;

      const key = module.key;
      const path = this.path(key);

      try {

        this.context.save(module);

        const exported = isBrowser ? await this.loadInBrowser(path) :
                                     await this.loadInNode(path);
        delete module.isPending;

        module.ref = exported;

        if (typeof module.ref.init === 'function') {
          await module.ref.init();
        }

        this.modulePromise_(key).resolve(exported);

        this.context.restore(module);
        return exported;

      } catch (error) {
        this.report({
          key,
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
    async preload(key, token = Symbol(key)) {

      const done = await this.waitForLoader(token);

      const preloadPromise = this.preloadPromise_(token);
      const exported = await this.resolve(key);
      const module = this.registry.get(key);
      for (const dependency of module.dependencies) {
        if (!dependency.ref) {
          await this.preload(dependency.key, token);
        }
      }
      done(exported);
      preloadPromise.resolve(exported);
      return exported;
    }

    /*
     * Returns the resource path for the specified key.
     */
    path(key) {
      if (key.endsWith('/')) {
        return `${key}main.js`;
      }
      if (/^(.*)\.([a-z0-9]{1,4})$/.test(key)) {
        return key;
      }
      return `${key}.js`;
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
      console.error('Error loading module:', message.key);
      throw message.error;
    }

    isInitial_(token) {
      return !this.preloadPromises.get(token);
    }

    modulePromise_(key, create = true) {
      let modulePromise = this.modulePromises.get(key);
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
      this.modulePromises.set(key, modulePromise);
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

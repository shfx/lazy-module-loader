{
  const isBrowser = 'object' === typeof window;

  if (isBrowser) {
    window.global = window;
  }

  class Module {

    constructor(key) {
      this.key = key;
      this.ref = null;
      this.dependencies = [];
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

  class Dependency {

    constructor(source, target, isRequired = false) {
      this.description = `${source.key} => ${target.key}`;
      this.source = source;
      this.target = target;
      this.isRequired = isRequired;
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
      console.assert(this.stack.pop() === module, 'Invalid context detected');
    }

    get module() {
      return this.stack[this.stack.length - 1] || null;
    }

    registerDependencyTo(target, required = false) {
      if (this.module) {
        const dependency = new Dependency(this.module, target, required);
        this.module.dependencies.push(dependency);
      }
    }
  }

  class Loader {

    constructor() {
      this.ready = Promise.resolve(true);
      this.context = new Context();
      this.registry = new Map();
      this.modulePromises = new Map();
    }

    symbol(key) {
      let module = this.registry.get(key);
      if (!module) {
        module = new Module(key);
        this.registry.set(key, module)
      }
      this.context.registerDependencyTo(module, false);
      return Symbol.for(key);
    }

    async require(key) {
      let module = this.registry.get(key);
      if (module) {
        if (module.ref) {
          return module.ref;
        }
        if (module.isPending) {
          return this.modulePromise(key);
        }
      } else {
        module = new Module(key);
        this.registry.set(key, module);
      }
      this.context.registerDependencyTo(module, true);
      this.context.save(module);
      module.ref = await this.load(module);
      if (typeof module.ref.init === 'function') {
        await module.ref.init();
      }
      this.context.restore(module);
      return module.ref;
    }

    get(key) {
      const module = this.registry.get(key);
      return module ? module.ref : null;
    }

    define(key, exported) {
      const module = this.registry.get(key) || new Module(key);
      console.assert(!this.ref, 'Module already resolved for:', key);
      module.ref = exported;
      this.registry.set(key, module);
      this.modulePromise(key).resolve(exported);
      return module;
    }

    async load(module) {
      const key = module.key;
      const path = this.getPath(key);
      try {
        module.isPending = true;
        const exported =
            isBrowser ? await this.loadInBrowser(path) : this.loadInNode(path);
        delete module.isPending;
        this.modulePromise(key).resolve(exported);
        return exported;
      } catch (error) {
        this.report({
          key,
          error,
        });
      }
    }

    async preload(key) {
      const exported = await this.require(key);
      const module = this.registry.get(key);
      for (const dependency of module.dependencies) {
        if (!dependency.target.ref) {
          await this.preload(dependency.target.key);
        }
      }
      return exported;
    }

    getPath(key) {
      if (key.endsWith('/')) {
        return `${key}main.js`;
      }
      if (/^(.*)\.([a-z0-9]{1,4})$/.test(key)) {
        return key;
      }
      return `${key}.js`;
    }

    loadInBrowser(path) {
      const createLoadPromise = () => new Promise((resolve, reject) => {
        window.module = {
          exports: null,
        };
        const script = document.createElement('script');
        script.src = path;
        script.onload = () => {
          const exported = module.exports;
          module.exports = null;
          resolve(exported);
        };
        script.onerror = error => {
          reject(error);
        };
        document.head.appendChild(script);
      });
      return this.ready = this.ready.then(createLoadPromise);
    }

    loadInNode(path) {
      decache(path);
      return require(path);
    }

    modulePromise(key, create = true) {
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

    report(message) {
      console.error('Error loading module:', message.key);
      throw message.error;
    }

    use(plugin) {
      global.loader = new Proxy(loader, {
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
  }

  global.loader = new Loader();
}

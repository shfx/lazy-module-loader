{
  class ModuleWithDependency {

    static async init() {
      this.dependency = await loader.require('modules/dependency');
    }
  };

  module.exports = ModuleWithDependency;
}

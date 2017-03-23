{
  const ModuleWithNestedDependencies = class {

    static async init() {
      this.dependency = await loader.require('modules/nested-dependency');
    }
  };

  module.exports = ModuleWithNestedDependencies;
}

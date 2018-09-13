{
  const circular = loader.symbol('modules/circular');

  class ModuleWithNestedDependencies {

    static async init() {
      this.dependency = await loader.require('modules/nested-dependency');
    }
  };

  module.exports = ModuleWithNestedDependencies;
}

describe('Module Loader', () => {

  describe('=> require', () => {

    it('returns the module', async() => {

      // given
      const path = 'modules/module';

      // when
      const module = await loader.require(path);

      // then
      assert(module);
      assert.equal(module.name, 'Module');
      assert.equal(loader.data_.getSymbols(path).length, 0);
    });

    it('returns the module with dependency symbols', async() => {

      // given
      const path = 'modules/module-with-symbols';

      // when
      const module = await loader.require(path);

      // then
      assert(module);
      assert.equal(module.name, 'ModuleWithSymbols');
      assert.equal(loader.data_.getSymbols(path).length, 2);
    });

    it('returns the module with resolved dependency', async() => {

      // given
      const path = 'modules/module-with-dependency';

      // when
      const module = await loader.require(path);

      // then
      assert(module);
      assert.equal(module.name, 'ModuleWithDependency');
      assert.equal(loader.data_.getSymbols(path).length, 0);

      assert(module.dependency);
      assert.equal(module.dependency.name, 'Dependency');
    });

    it('returns the module with resolved nested dependencies', async() => {

      // given
      const path = 'modules/module-with-nested-dependencies';

      // when
      const module = await loader.require(path);

      // then
      assert(module);
      assert.equal(module.name, 'ModuleWithNestedDependencies');
      assert.equal(loader.data_.getSymbols(path).length, 0);

      assert(module.dependency);
      assert.equal(module.dependency.name, 'NestedDependency');

      assert(module.dependency.dependency);
      assert.equal(module.dependency.dependency.name, 'Dependency');
    });
  });
});
describe('loader.preload(symbol)', () => {

  afterEach(() => {
    loader.$debug.reset();
  });

  it('preloads multiple modules', async () => {

    // given
    const firstModuleSymbol =
        loader.symbol('modules/module-with-nested-dependencies');
    const secondModuleSymbol = loader.symbol('modules/module-with-dependency');
    const thirdModuleSymbol = loader.symbol('modules/module-with-symbols');

    // when
    const [firstModule, secondModule, thirdModule] = await Promise.all([
      loader.preload(firstModuleSymbol, true),
      loader.preload(secondModuleSymbol, true),
      loader.preload(thirdModuleSymbol, true),
    ]);

    // then
    assert(firstModule);
    assert.equal(firstModule.name, 'ModuleWithNestedDependencies');

    assert(secondModule);
    assert.equal(secondModule.name, 'ModuleWithDependency');

    assert(thirdModule);
    assert.equal(thirdModule.name, 'ModuleWithSymbols');

    assert.equal(loader.$debug.getModules().length, 8);
  });

  it('preloads the module', async () => {

    // given
    const symbol = loader.symbol('modules/module');

    // when
    const module = await loader.preload(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'Module');

    assert.equal(loader.$debug.getSymbols(symbol).length, 0);
    assert.equal(loader.$debug.getModules().length, 1);
  });

  it('preloads the module with dependency symbols', async () => {

    // given
    const symbol = loader.symbol('modules/module-with-symbols');

    // when
    const module = await loader.preload(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithSymbols');

    assert(loader.get('modules/component'));
    assert.equal(loader.get('modules/component').name, 'Component');

    assert(loader.get('modules/subcomponent'));
    assert.equal(loader.get('modules/subcomponent').name, 'Subcomponent');
  });

  it('preloads the module with resolved dependency', async () => {

    // given
    const symbol = loader.symbol('modules/module-with-dependency');

    // when
    const module = await loader.preload(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithDependency');
    assert.equal(loader.$debug.getModules().length, 2);

    assert(module.dependency);
    assert.equal(module.dependency.name, 'Dependency');
  });

  it('preloads the module with resolved nested dependencies', async () => {

    // given
    const symbol = loader.symbol('modules/module-with-nested-dependencies');

    // when
    const module = await loader.preload(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithNestedDependencies');

    assert.equal(loader.$debug.getModules().length, 4);

    assert(module.dependency);
    assert.equal(module.dependency.name, 'NestedDependency');

    assert(module.dependency.dependency);
    assert.equal(module.dependency.dependency.name, 'Dependency');

    assert(loader.get('modules/circular'));
    assert.equal(loader.get('modules/circular').name, 'Circular');
  });
});

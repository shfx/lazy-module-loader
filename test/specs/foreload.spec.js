describe('loader.foreload(symbol)', () => {

  afterEach(() => {
    loader.$debug.reset();
  });

  it('foreloads multiple modules serially', async () => {

    // given
    const firstModuleSymbol =
        loader.symbol('modules/module-with-nested-dependencies');
    const secondModuleSymbol = loader.symbol('modules/module-with-dependency');
    const thirdModuleSymbol = loader.symbol('modules/module-with-symbols');

    // when
    const [firstModule, secondModule, thirdModule] = await Promise.all([
      loader.foreload(firstModuleSymbol),
      loader.foreload(secondModuleSymbol),
      loader.foreload(thirdModuleSymbol),
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
});

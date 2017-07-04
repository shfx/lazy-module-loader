describe('loader.resolve(symbol)', () => {

  afterEach(() => {
    loader.$debug.reset();
  });

  it('resolves the module', async () => {

    // given
    const path = 'modules/module';
    const symbol = loader.symbol(path);

    // when
    const module = await loader.resolve(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'Module');
    
    assert.equal(loader.$debug.getSymbols(path).length, 0);
    assert.equal(loader.$debug.getModules().length, 1);

    assert.equal(loader.get(path), module);
    assert.equal(loader.get(symbol), module);
  });

  it('resolves the module with dependency symbols', async () => {

    // given
    const path = 'modules/module-with-symbols';
    const symbol = loader.symbol(path);

    // when
    const module = await loader.resolve(symbol);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithSymbols');

    assert.equal(loader.$debug.getSymbols(path).length, 2);
    assert.equal(loader.$debug.getModules().length, 1);

    assert.equal(loader.get(path), module);
    assert.equal(loader.get(symbol), module);
  });
});

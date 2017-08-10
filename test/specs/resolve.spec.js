describe('loader.resolve(symbol)', () => {

  afterEach(() => {
    loader.$debug.reset();
  });

  it('resolves the module', async () => {

    // given
    const path = 'modules/module';

    // when
    const module = await loader.resolve(path);

    // then
    assert(module);
    assert.equal(module.name, 'Module');
    
    assert.equal(loader.$debug.getSymbols(path).length, 0);
    assert.equal(loader.$debug.getModules().length, 1);

    assert.equal(loader.get(path), module);
  });

  it('resolves the module with dependency symbols', async () => {

    // given
    const path = 'modules/module-with-symbols';

    // when
    const module = await loader.resolve(path);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithSymbols');

    assert.equal(loader.$debug.getSymbols(path).length, 2);
    assert.equal(loader.$debug.getModules().length, 1);

    assert.equal(loader.get(path), module);
  });
});

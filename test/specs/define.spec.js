describe('loader.define(path, module)', () => {

  afterEach(() => {
    loader.$debug.reset();
  });

  it('defines the module', async () => {

    // given
    const path = 'modules/module';
    const module = class Module {};

    // when
    loader.define(path, module);
    
    // then
    assert.equal(loader.get(path), module);
  });

  it('defines the module with dependency symbols', async () => {

    // given
    const path = 'modules/module';  
    const module = class Module {};

    // when
    const component = loader.symbol('modules/component', path);
    const subcomponent = loader.symbol('modules/subcomponent', path);
    loader.define(path, module);
    
    // then
    assert.equal(loader.get(path), module);
    assert.equal(loader.$debug.getSymbols(path).length, 2);
  });
});

describe('loader.define(key, module)', () => {

  beforeEach(() => {
    global.loader = new loader.constructor();
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
});

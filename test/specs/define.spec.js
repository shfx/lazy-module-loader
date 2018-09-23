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

  it('ignores excess calls', async () => {

    // given
    const path = 'modules/module';
    const moduleOne = class Module {};
    const moduleTwo = class Module {};

    // when
    loader.define(path, moduleOne);
    loader.define(path, moduleTwo);

    // then
    assert.equal(loader.get(path), moduleOne);
  });
});

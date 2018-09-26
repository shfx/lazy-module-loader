describe('loader.define(id, module)', () => {

  beforeEach(() => {
    global.loader = new loader.constructor();
  });

  it('defines the module', async () => {

    // given
    const id = 'modules/module';
    const module = class Module {};

    // when
    loader.define(id, module);

    // then
    assert.equal(loader.get(id), module);
  });

  it('ignores excess calls', async () => {

    // given
    const id = 'modules/module';
    const moduleOne = class Module {};
    const moduleTwo = class Module {};

    // when
    loader.define(id, moduleOne);
    loader.define(id, moduleTwo);

    // then
    assert.equal(loader.get(id), moduleOne);
  });
});

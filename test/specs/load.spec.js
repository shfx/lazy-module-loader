describe('loader.load(module)', () => {

  beforeEach(() => {
    sinon.stub(console, 'error').returns(null);
    global.loader = createLoader();
  });

  afterEach(() => {
    console.error.restore();
  });

  it('loads the module', async () => {

    // given
    const key = 'modules/module';

    // when
    const module = loader.registerModule_(key);
    await loader.load(module);

    // then
    assert(module.exports);
    assert.equal(module.exports.name, 'Module');

    assert.equal(loader.registry.size, 1);
  });

  it('reports invalid "module.exports" value', async () => {

    // given
    const key = 'modules/invalid';

    // when
    const module = loader.registerModule_(key);
    let msg = null;
    try {
      await loader.load(module);
    } catch (e) {
      msg = e.message;
    }

    // then
    assert(console.error.called);
    assert.equal(msg, `No "module.exports" value found in module: ${key}`);
  });
});

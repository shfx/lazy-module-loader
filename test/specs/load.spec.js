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
    const id = 'modules/module';
    loader.symbol(id);

    // when
    const module = loader.registry.get(id);
    await loader.load(module);

    // then
    assert(module.exports);
    assert.equal(module.exports.name, 'Module');

    assert.equal(loader.registry.size, 1);
  });

  it('reports invalid "module.exports" value', async () => {

    // given
    const id = 'modules/invalid';
    loader.symbol(id);

    // when
    const module = loader.registry.get(id);
    let msg = null;
    try {
      await loader.load(module);
    } catch (e) {
      msg = e.message;
    }

    // then
    assert(console.error.called);
    assert.equal(msg, `No "module.exports" found in module with id: ${id}`);
  });
});

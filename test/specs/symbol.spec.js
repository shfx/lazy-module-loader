describe('loader.symbol(id)', () => {

  beforeEach(() => {
    global.loader = createLoader();
  });

  it('returns correct symbol', async () => {

    // given
    const id = 'my/module';

    // when
    const symbol = loader.symbol(id);

    // then
    assert.equal(symbol, Symbol.for(id));
  });

  it('registers optional dependency', async () => {

    // given
    const id = 'foo/bar';
    sinon.spy(loader.context, 'registerDependencyTo');

    // when
    loader.symbol(id);

    // then
    assert(loader.context.registerDependencyTo.calledOnce);
    
    const module = loader.context.registerDependencyTo.firstCall.args[0];    
    assert.equal(module.id, id);
    assert.equal(module.isRequired, false);
  });
});

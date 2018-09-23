describe('loader.symbol(key)', () => {

  beforeEach(() => {
    global.loader = createLoader();
  });

  it('returns correct symbol', async () => {

    // given
    const key = 'my/module';

    // when
    const symbol = loader.symbol(key);

    // then
    assert.equal(symbol, Symbol.for(key));
  });

  it('registers optional dependency', async () => {

    // given
    const key = 'foo/bar';
    sinon.spy(loader.context, 'registerDependencyTo');

    // when
    loader.symbol(key);

    // then
    assert(loader.context.registerDependencyTo.calledOnce);
    
    const module = loader.context.registerDependencyTo.firstCall.args[0];    
    assert.equal(module.key, key);
    assert.equal(module.isRequired, false);
  });
});

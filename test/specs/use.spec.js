describe('loader.use(plugin)', () => {

  beforeEach(() => {
    global.loader = createLoader();
  });

  it('overrides methods', async () => {

    // given
    const key = 'some/module';
    loader.use({
      path(key) {
        return `${key}.ejs`;
      },
    })

    // when
    const path = await loader.path(key);

    // then
    assert.equal(path, 'some/module.ejs');
  });

  it('can be chained', async () => {

    // given
    const key = 'foo/bar';
    const loaderWithPlugins = loader.use({
      async resolve(key) {
        return {
          key,
          path: this.path(key),
        };
      },
    }).use({
      path(key) {
        return `core/${key}.js`;
      },
    });

    // when
    const module = await loader.resolve(key);

    // then
    assert.equal(loader, loaderWithPlugins);
    assert.deepEqual(module, {
      key: 'foo/bar',
      path: 'core/foo/bar.js',
    });
  });
});

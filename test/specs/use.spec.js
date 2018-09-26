describe('loader.use(plugin)', () => {

  beforeEach(() => {
    global.loader = createLoader();
  });

  it('overrides methods', async () => {

    // given
    const id = 'some/module';
    loader.use({
      path(id) {
        return `${id}.ejs`;
      },
    })

    // when
    const path = await loader.path(id);

    // then
    assert.equal(path, 'some/module.ejs');
  });

  it('can be chained', async () => {

    // given
    const id = 'foo/bar';
    const loaderWithPlugins = loader.use({
      async resolve(id) {
        return {
          id,
          path: this.path(id),
        };
      },
    }).use({
      path(id) {
        return `core/${id}.js`;
      },
    });

    // when
    const module = await loader.resolve(id);

    // then
    assert.equal(loader, loaderWithPlugins);
    assert.deepEqual(module, {
      id: 'foo/bar',
      path: 'core/foo/bar.js',
    });
  });
});

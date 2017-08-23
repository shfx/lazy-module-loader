describe('loader.prefix(name, prefix)', () => {

  it('allows to define a prefix for given name', async () => {

    // given
    const prefix = 'prefix/';
    const id = 'foo/bar';

    // when
    loader.prefix('foo', prefix);
    const path = loader.getPath(id);

    // then
    assert.equal(path, `prefix/${id}.js`);
  });
});

describe('loader.getPath(module)', () => {

  it('resolves the file-like path', async () => {

    // given
    const id = 'path/to/some/file';

    // when
    const path = loader.getPath(id);

    // then
    assert.equal(path, `${id}.js`);
  });

  it('resolves the directory-like path', async () => {

    // given
    const id = 'path/to/some/dir/';

    // when
    const path = loader.getPath(id);

    // then
    assert.equal(path, `${id}main.js`);
  });
});

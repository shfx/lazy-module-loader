describe('loader.path(module)', () => {

  it('resolves the file-like path', async () => {

    // given
    const key = 'path/to/some/file';

    // when
    const path = loader.path(key);

    // then
    assert.equal(path, `${key}.js`);
  });

  it('resolves the directory-like path', async () => {

    // given
    const key = 'path/to/some/dir/';

    // when
    const path = loader.path(key);

    // then
    assert.equal(path, `${key}main.js`);
  });

  it('resolves the CSS path', async () => {

    // given
    const key = 'path/to/some/style.css';

    // when
    const path = loader.path(key);

    // then
    assert.equal(path, key);
  });
});

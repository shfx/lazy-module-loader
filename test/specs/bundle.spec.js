require('../../bundler.js');

describe('bundler.generate()', () => {

  it.only('generates the bundle', async () => {

    // given
    const id = 'modules/module-with-nested-dependencies';

    // when
    const bundle = bundler.generate(id, 'Bundle', {
      prefix: 'test/',
    });

    // then
    assert(bundle);
  });
});

require('../../bundler.js');

describe('bundler.generate()', () => {

  it('generates the bundle', async () => {

    // given
    const id = 'modules/module-with-nested-dependencies';

    // when
    const bundle = await bundler.generate(id, 'Bundle', {
      prefix: 'test/',
    });

    // then
    assert(bundle);
    assert(bundle.includes('class ModuleWithNestedDependencies'));
    assert(bundle.includes('class NestedDependency'));
    assert(bundle.includes('class Dependency'));
    assert(bundle.includes('class Circular'));
  });
});

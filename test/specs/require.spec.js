describe('loader.require(key)', () => {

  beforeEach(() => {
    global.loader = createLoader();
  });

  it('loads the module', async () => {

    // given
    const path = 'modules/module';

    // when
    const module = await loader.require(path);

    // then
    assert(module);
    assert.equal(module.name, 'Module');

    assert.equal(loader.registry.size, 1);
    assert.equal(await loader.require(path), module);
  });

  it('loads the module with dependency symbols', async () => {

    // given
    const path = 'modules/module-with-symbols';

    // when
    const module = await loader.require(path);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithSymbols');
    assert.equal(loader.registry.size, 3);
  });

  it('loads the module with resolved dependency', async () => {

    // given
    const path = 'modules/module-with-dependency';

    // when
    const module = await loader.require(path);

    // then
    assert.equal(loader.registry.size, 2);

    assert(module);
    assert.equal(module.name, 'ModuleWithDependency');

    assert(module.dependency);
    assert.equal(module.dependency.name, 'Dependency');
  });

  it('loads the module with resolved nested dependencies', async () => {

    // given
    const path = 'modules/module-with-nested-dependencies';

    // when
    const module = await loader.require(path);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithNestedDependencies');

    assert.equal(loader.registry.size, 4);

    assert(module.dependency);
    assert.equal(module.dependency.name, 'NestedDependency');

    assert(module.dependency.dependency);
    assert.equal(module.dependency.dependency.name, 'Dependency');
  });
});

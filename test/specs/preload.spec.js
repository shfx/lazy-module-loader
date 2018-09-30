describe('loader.preload(id)', () => {

  beforeEach(() => {
    loader.reset();
    global.loader = createLoader();
  });

  it('preloads the module with no dependencies', async () => {

    // given
    const id = 'modules/module';

    // when
    const module = await loader.preload(id);

    // then
    assert(module);
    assert.equal(module.name, 'Module');

    assert.equal(loader.registry.size, 1);
  });

  it('preloads the module with optional dependencies', async () => {

    // given
    const id = 'modules/module-with-symbols';

    // when
    const module = await loader.preload(id);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithSymbols');

    assert.equal(loader.registry.get(id).dependencies.size, 2);

    assert(loader.registry.get('modules/component'));
    assert.equal(loader.get('modules/component').name, 'Component');

    assert(loader.registry.get('modules/subcomponent'));
    assert.equal(loader.get('modules/subcomponent').name, 'Subcomponent');
  });

  it('preloads the module with required dependency', async () => {

    // given
    const id = 'modules/module-with-dependency';

    // when
    const module = await loader.preload(id);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithDependency');
    assert.equal(loader.registry.size, 2);

    assert(module.dependency);
    assert.equal(module.dependency.name, 'Dependency');
  });

  it('preloads the module with required nested dependencies', async () => {

    // given
    const id = 'modules/module-with-nested-dependencies';

    // when
    const module = await loader.preload(id);

    // then
    assert(module);
    assert.equal(module.name, 'ModuleWithNestedDependencies');

    assert.equal(loader.registry.size, 4);

    assert(module.dependency);
    assert.equal(module.dependency.name, 'NestedDependency');

    assert(module.dependency.dependency);
    assert.equal(module.dependency.dependency.name, 'Dependency');

    assert(loader.get('modules/circular'));
    assert.equal(loader.get('modules/circular').name, 'Circular');
  });

  it('preloads multiple modules serially', async () => {

    // given
    const firstModuleKey = 'modules/module-with-nested-dependencies';
    const secondModuleKey = 'modules/module-with-dependency';
    const thirdModuleKey = 'modules/module-with-symbols';

    // when
    const [firstExport, secondExport, thirdExport] = await Promise.all([
      loader.preload(firstModuleKey),
      loader.preload(secondModuleKey),
      loader.preload(thirdModuleKey),
    ]);

    // then
    assert(firstExport);
    assert.equal(firstExport.name, 'ModuleWithNestedDependencies');

    const firstModule = loader.registry.get(firstModuleKey);
    assert(firstModule);

    const firstModuleDependencies = [...firstModule.dependencies];
    assert.equal(firstModuleDependencies.length, 2);

    assert.equal(
        [...firstModuleDependencies][0],
        loader.registry.get('modules/circular'));
    assert(firstModuleDependencies[0].exports);

    assert.equal(
        firstModuleDependencies[1],
        loader.registry.get('modules/nested-dependency'));
    assert(firstModuleDependencies[1].exports);

    assert(secondExport);
    assert.equal(secondExport.name, 'ModuleWithDependency');

    const secondModule = loader.registry.get(secondModuleKey);
    assert(secondModule);

    const secondModuleDependencies = [...secondModule.dependencies];
    assert.equal(secondModuleDependencies.length, 1);

    assert.equal(
        secondModuleDependencies[0], loader.registry.get('modules/dependency'));
    assert(secondModuleDependencies[0].exports);

    assert(thirdExport);
    assert.equal(thirdExport.name, 'ModuleWithSymbols');

    const thirdModule = loader.registry.get(thirdModuleKey);
    assert(thirdModule);

    const thirdModuleDependencies = [...thirdModule.dependencies];
    assert.equal(thirdModuleDependencies.length, 2);

    assert.equal(
        thirdModuleDependencies[0], loader.registry.get('modules/component'));
    assert(thirdModuleDependencies[0].exports);

    assert.equal(
        thirdModuleDependencies[1],
        loader.registry.get('modules/subcomponent'));
    assert(thirdModuleDependencies[1].exports);

    assert.equal(loader.registry.size, 8);
  });

  it('preloads multiple modules with delays', async () => {

    // given
    const A = 'modules/nested/a';
    const B = 'modules/nested/b';
    const C = 'modules/nested/c';
    const D = 'modules/nested/d';

    // when
    const [a, b, c] = await Promise.all([
      loader.preload(A),
      loader.preload(B),
      loader.preload(C),
      loader.preload(A),
    ]);

    const ModuleA = loader.registry.get(A);
    const ModuleB = loader.registry.get(B);
    const ModuleC = loader.registry.get(C);
    const ModuleD = loader.registry.get(D);

    // then
    assert.equal(loader.registry.size, 4);

    assert(a);
    assert.equal(a.name, 'A');
    assert.equal(ModuleA.dependencies.size, 2);

    assert(b);
    assert.equal(b.name, 'B');
    assert.equal(ModuleB.dependencies.size, 1);

    assert(c);
    assert.equal(c.name, 'C');
    assert.equal(ModuleC.dependencies.size, 1);

    assert.equal(ModuleD.dependencies.size, 0);
  });
});

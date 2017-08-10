describe('loader.detectDependencies(module)', () => {

  it('detects zero dependencies from the method String (Chromium)', async() => {

    // given
    const method = {
      toString: () => `() => {}`
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, []);
  });

  it('detects zero dependencies from the method', async() => {

    // given
    const method = () => {
      console.info;
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, []);
  });

  it('detects one dependency from the method String (Chromium)', async() => {

    // given
    const method = {
      toString: () => `(/*= foo/bar */foobar) => console.log('Other curly braces);`
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['foo/bar']);
  });

  it('detects one dependency from the method', async() => {

    // given
    const method = (/*= foo/bar */foobar) => {
      console.info;
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['foo/bar']);
  });

  it('detects single-line dependencies from the method String (Chromium)', async() => {

    // given
    const method = {
      toString: () => '(/*= core/dom */dom, /*= core/diff */diff) => (((null)))'
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['core/dom', 'core/diff']);
  });

  it('detects single-line dependencies from the method', async() => {

    // given
    const method = (/*= core/dom */dom, /*= core/diff */diff) => {};

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['core/dom', 'core/diff']);
  });

  it('detects multi-line dependencies from the method String (Chromium)', async() => {

    // given
    const method = {
      toString: () => `(/*= service/navigation */navigation,
             /*= utils/validator */validator) => {
                console.log('Line 1);
                // comment in Line 2
                console.info('Line 3);
                return null;
            }`
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['service/navigation', 'utils/validator']);
  });

  it('detects multi-line dependencies from the method', async() => {

    // given
    const method = (/*= service/navigation */navigation,
             /*= utils/validator */validator) => {
      console.log;
      // comment
      console.info;
    };

    // when
    const deps = loader.detectDependencies(method);

    // then
    assert.deepEqual(deps, ['service/navigation', 'utils/validator']);
  });
});
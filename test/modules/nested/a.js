{
  let B;
  let C;

  class A {
    static async init() {
      await sleep(40);
      B = await loader.require('modules/nested/b');
      C = await loader.require('modules/nested/c');
    }
  }

  module.exports = A;
}

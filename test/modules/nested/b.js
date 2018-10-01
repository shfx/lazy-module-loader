{
  let C;

  class B {
    static async init() {
      await sleep(25);
      C = await loader.require('modules/nested/c');
    }
  }

  module.exports = B;
}

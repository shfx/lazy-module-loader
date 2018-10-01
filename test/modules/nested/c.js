{
  let D;

  class C {
    static async init() {
      await sleep(15);
      D = await loader.require('modules/nested/d');
    }
  }

  module.exports = C;
}

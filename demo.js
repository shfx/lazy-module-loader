{
  class Service {
    static helloWorld() {
      return 'Hello world!';
    }
  }

  loader.define('demo/service', Service);

  class Component {
    static async init(/*= demo/service */ service) {
      console.log(service.helloWorld());
    }
  }

  loader.resolve('demo/component', async () => Component);

  const Foobar = {
    init: (/*= demo/foobar */ foobar) => {
      console.log(foobar.itWorks());
    },
    itWorks: () => 'It works!',
  };

  loader.resolve('demo/foobar', async () => Foobar);
}

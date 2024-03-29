import fastify from 'fastify';

export class FastifyAdapter {
  app = fastify({ignoreTrailingSlash: true});

  init() {
    // this.app = fastify({ignoreTrailingSlash: true});
    const {app} =  this;
    app.register(import("@marko/fastify"));
    // TODO: Grab this value from the config
    if (process.env.NODE_ENV === "production") {
      app.register(import("fastify-compress"), {
        zlibOptions: {
          flush: zlib.constants.Z_SYNC_FLUSH,
        },
        brotliOptions: {
          flush: zlib.constants.BROTLI_OPERATION_FLUSH,
        },
      });
    
      app.register(import("fastify-static"), {
        root: path.resolve("dist/assets"), // TODO: Make this root relative
        prefix: "/assets",
      });
    }
  }

  register({handler, prefix} = {}) {
    this.app.register(handler, {prefix});
  }

  /**
   * Registers an endpoint
   * @param {*} route 
   * @param {*} handler 
   * @param {*} options 
   */
  registerRoute(route, handler, options = {}) {
    if(!Array.isArray(handler)) {
      handler = [handler];
    }
    if(Object.keys(options).length) {
      handler.unshift(options);
    }
    this.app.register(route, ...handler);
  }

  /**
   * Registers a marko page template
   * @param {import('../server').Page} page 
   * @param {string} route 
   */
  registerPage(page, route) {
    this.app.register((instance, options, done) => {
      async function addSerializedData(req, reply) {
        const {params, query, url, routerPath} = req;
        reply.locals._meta = {
          actionsUrl: routerPath, // may modify this later
          params,
          query,
          url,
          routerPath,
        }
        Object.assign(reply.locals, await page.getLocals());
        Object.assign(reply.locals.serializedGlobals, page.serializedProperties);
      }

      async function render(req, reply) {
        reply.locals._stack = page.stack;
        const context = {req, reply};

        await addSerializedData(req, reply);

        if(!(await page.match(context, reply.locals._meta))) {
          reply.callNotFound();
          return;
        }
        reply.locals._data = await page.getStaticData(context, reply.locals._meta);
        reply.marko(await page.getRoot(), reply.locals._data);
        return reply;
      }

      instance
        .get('/', render)
        // Handle page actions
        .post('/', (req) => {
          const {body: {name, args = []} = {}} = req;
          return page.function(name, args);
        });
      
      if(page.hasFallbackTemplate()) {
        instance.setNotFoundHandler(async function (req, reply) {
          await addSerializedData(req, reply);
          reply.marko(await page.fallbackTemplate.load());
        });
      }
      instance.setErrorHandler(async function (error, req, reply) {
        console.error(error); // TODO: Replace this with whatever logger is set up
        if(page.hasErrorTemplate()) {
          // Handle not found request without preValidation and preHandler hooks
          await addSerializedData(req, reply);
          reply.marko(await page.errorTemplate.load());
        } else {
          // TODO: in production fallback to a generic error page
          reply.status(500);
          reply.send(`<pre>${error.stack}</pre>`)
        }
      });
      done();
    }, {prefix: route.endsWith('/*') ? route.replace(/\/\*$/, '*') : route});
  }

  listen({port = 3000} = {}) {
    return this.app.listen({port});
  }

  ready() {
    return this.app.ready();
  }

  // TODO: Move the devServer setup to the adapter as well
  handle(...args) {
    return this.app.routing(...args);
  }
}
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

  registerRoute(route, handler, options = {}) {
    if(!Array.isArray(handler)) {
      handler = [handler];
    }
    if(Object.keys(options).length) {
      handler.unshift(options);
    }
    this.app.register(route, ...handler);
  }

  registerPage(page, route, {slots, markoTemplate, errorTemplate, fallbackTemplate} = {}) {
    this.app.register((instance, options, done) => {
      async function render(req, reply) {
        const {match, load} = markoTemplate;
        const {params, query, url, routerPath} = req;
        reply.locals.slots = slots;
        reply.locals._fns = {};
        reply.locals._meta = {
          actionsUrl: routerPath, // may modify this later
          params,
          query,
          url,
          routerPath,
        }
        reply.locals.serializedGlobals._fns = true;
        reply.locals.serializedGlobals._meta = true;
        reply.locals.serializedGlobals._data = true;
        if(typeof match === 'function' && !match()) {
          reply.callNotFound();
          return;
        }
        if(typeof load === 'function') {
          reply.locals._data = await load.call({req, reply}, reply.locals._meta);
        }
        reply.marko(page);
        return reply;
      }

      instance
        .get('/', render)
        .post('/', async (req) => {
          const {body: {name, args = []} = {}} = req;
          const fn = markoTemplate[name];
          if(typeof fn !== 'function') {
            return null;
          }
          return fn(...args) ?? null;
        });
      
      if(fallbackTemplate) {
        instance.setNotFoundHandler(function (req, reply) {
          const {params, query, body, url, routerPath} = req;
          reply.marko(
            fallbackTemplate, 
            {
              params,
              query,
              url,
              routerPath,
              body,
            }
          );
        });
      }
      if(errorTemplate) {
        instance.setErrorHandler(function (error, req, reply) {
          // Handle not found request without preValidation and preHandler hooks
          console.error(error); // TODO: Replace this with whatever logger is set up
          const {params, query, body, url, routerPath} = req;
          reply.marko(
            errorTemplate, 
            {
              params,
              query,
              url,
              routerPath,
              body,
            }
          );
        });
      }
      done();
    }, {prefix: route.endsWith('/*') ? route.replace(/\/\*$/, '*') : route});
  }

  listen({port = 3000} = {}) {
    return this.app.listen({port});
  }

  ready() {
    return this.app.ready();
  }

  // TODO: Move the devserver setup to the adapter as well
  handle(...args) {
    return this.app.routing(...args);
  }
}
import fastify from 'fastify';
import zlib from "zlib";
import path from "node:path";

import {setupDirectory} from './loader.js';
import { closestFile } from '../utils/index.js';

function normalizeRoute(path) {
  path = path
    .replace(/\[\.\.\.[^\]]+\]/g, '*') // replace [...name] with *
    .replace(/\[([^\]]+)\]/g, ':$1') // replace [name] with :name
    .replace(/\/@/g, '/'); // replace /@ with / (for forcing components folder)
  return path;
}

export default class Server {
  app = fastify({ignoreTrailingSlash: true});
  loaded = false;
  imports = {};

  config({imports} = {}) {
    this.imports = imports;
  }

  async init(dir, config) {
    if(this.loaded) return this;
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
    await setupDirectory(dir, this);
    this.loaded = true;
    return this;
  }

  async registerJSHandler(module, route = '/') {
    route = normalizeRoute(route);
    const routes = ['get', 'post', 'patch', 'put', 'del', 'options', 'head', 'all'];
    
    // Default and register are treated as the same thing b/c haven't decided where to go with this yet
    let {default: handler, register = handler} = module;
    if(register) {
      this.app.register(handler, {prefix: route});
    }
    
    routes.forEach(method => {
      if(!module[method]) {
        return;
      }
      let handler = module[method];
      if(!Array.isArray(handler)) {
        handler = [handler];
      }
      if(module[`${method}Options`]) {
        handler.unshift(module[`${method}Options`]);
      }
      this.app[method === 'del' ? 'delete' : method](route, ...handler);
    });
  }

  async registerTemplateHandler(markoTemplate, route = '/', file) {
    route = normalizeRoute(route);
    let rootTemplate = markoTemplate?.default;
    let slots = {};
    let errorTemplate;
    let fallbackTemplate;
    // TODO: End at root directory lmao
    const layoutTemplatePath = await closestFile('_layout.marko', file);
    const errorTemplatePath = await closestFile('_error.marko', file);
    const fallbackTemplatePath = await closestFile('_fallback.marko', file);

    // For now only one template is loaded but thinking of refactoring to support multiple nested templates
    if(layoutTemplatePath) {
      rootTemplate = (await this.imports[layoutTemplatePath]()).default;
      slots.root = this.imports[file];
    }
    
    if(errorTemplatePath) {
      errorTemplate = (await this.imports[errorTemplatePath]()).default;
    }

    if(fallbackTemplatePath) {
      fallbackTemplate = (await this.imports[fallbackTemplatePath]()).default;
    }

    this.app.register((instance, options, done) => {
      async function render(req, reply) {
        const {match, load} = markoTemplate;
        if(typeof match === 'function' && !match()) {
          reply.callNotFound();
          return;
        }
        if(typeof load === 'function') {
          reply.locals._data = await load();
        }
        const {params, query, body, url, routerPath} = req;
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
        reply.marko(
          rootTemplate, 
          {
            body,
          }
        );
        return reply;
      }

      instance
        .get('/', render)
        .post('/', async (req, reply) => {
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

  handle(req, res) {
    return this.app.routing(req, res);
  }
}
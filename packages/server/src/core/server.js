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
    let layoutTemplate;
    let errorTemplate;
    let fallbackTemplate;
    // TODO: End at root directory lmao
    const layoutTemplatePath = await closestFile('_layout.marko', file);
    const errorTemplatePath = await closestFile('_error.marko', file);
    const fallbackTemplatePath = await closestFile('_fallback.marko', file);

    if(layoutTemplatePath) {
      layoutTemplate = (await import(layoutTemplatePath)).default;
    }
    if(errorTemplatePath) {
      errorTemplate = (await import(errorTemplatePath)).default;
    }

    if(fallbackTemplatePath) {
      fallbackTemplate = (await import(fallbackTemplatePath)).default;
    }

    this.app.register((instance, options, done) => {
      async function render(req, reply) {
        const {default: template, match, load} = markoTemplate;
        if(typeof match === 'function' && !match()) {
          reply.callNotFound();
          return;
        }
        if(typeof load === 'function') {
          reply.locals._data = await load();
        }
        const {params, query, body, url, routerPath} = req;
        reply.locals.slots = {root: template};
        reply.marko(
          layoutTemplate ? layoutTemplate : template, 
          {
            params,
            query,
            url,
            routerPath,
            body,
            renderBody: layoutTemplate ? template : null,
          }
        );
      }
      instance.get('/', render);
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
          // to URLs that begin with '/v1'
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
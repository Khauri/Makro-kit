import fastify from 'fastify';
import zlib from "zlib";
import path from "node:path";

import {setupDirectory} from './loader.js';

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

  async load(dir, config) {
    if(this.loaded) return this;
    const {app} =  this;
    app.register(await import("@marko/fastify"));
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
        root: path.resolve("dist/assets"),
        prefix: "/assets",
      });
    }
    await setupDirectory(dir, this);
    this.loaded = true;
    return this;
  }

  registerJSHandler(module, route = '/') {
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

  registerTemplateHandler(module, route = '/') {
    route = normalizeRoute(route);
    console.log(route)
    function render(req, reply) {
      const {default: template} = module;
      const {params, query, body, url, routerPath} = req;
      reply.marko(template, {params, query, url, routerPath, body});
    }
    // Not entirely sure how to fix this with fastify but navigating to /route and /route/ 
    // are apparently two different things even when ignoreTrailingSlash is true.
    if(route.endsWith('/*') && route.length > 2) {
      this.app.get(route.replace(/\/\*$/, ''), render);
    }
    this.app.get(route, render);
  }
}
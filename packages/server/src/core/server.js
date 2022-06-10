import fastify from 'fastify';
import zlib from "zlib";
import path from "node:path";

import {setupDirectory} from './loader.js';

function normalizeRoute(path) {
  path = path.replace(/\[([^]+)\]/g, ':$1').replace(/\/@/g, '/');
  return path;
}

export default class Server {
  app = fastify();
  loaded = false;

  async load(dir, config) {
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
    this.app.get(route, (req, reply) => {
      const {default: template} = module;
      const {params, query, body} = req;
      reply.marko(template, {params, query, body});
    });
  }
}
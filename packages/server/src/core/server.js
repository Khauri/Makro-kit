import fastify from 'fastify';
import zlib from "zlib";
import path from "node:path";

import {setupDirectory} from './loader.js';
import {closestFile} from '../utils/index.js';

function normalizeRoute(path) {
  path = path
    .replace(/\[\.\.\.[^\]]+\]/g, '*') // replace [...name] with *
    .replace(/\[([^\]]+)\]/g, ':$1') // replace [name] with :name
    .replace(/\/@/g, '/'); // replace /@ with / (for forcing components folder)
  return path;
}

export default class Server {
  adapter = null;
  initialized = false;
  imports = {};

  constructor({adapter} = {}) {
    this.adapter = adapter;
  }

  config({imports} = {}) {
    this.imports = imports;
  }

  async init(config) {
    if(this.initialized) return this;
    this.initialized = true;
    await this.adapter?.init(config);
    await setupDirectory(this, config);
    await this.ready();
    return this;
  }

  async registerJSHandler(module, route = '/') {
    route = normalizeRoute(route);
    const routes = ['get', 'post', 'patch', 'put', 'del', 'delete', 'options', 'head', 'all'];
    
    // Default and register are treated as the same thing b/c haven't decided where to go with this yet
    let {default: handler, register = handler} = module;
    if(register) {
      this.adapter.register?.({handler, prefix: route});
    }

    routes
      .filter(method => module[method])
      .forEach(method => {
        let options = {};
        let handler = module[method];
        if(module[`${method}Options`]) {
          options = module[`${method}Options`];
        }
        method = method === 'del' ? 'delete' : method;
        this.adapter.registerRoute?.(route, method, handler, options);
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

    this.adapter.registerPage(rootTemplate, route, {slots, markoTemplate, errorTemplate, fallbackTemplate});
  }

  listen(...args) {
    return this.adapter.listen(...args);
  }

  ready(...args) {
    return this.adapter.ready(...args);
  }

  // TODO: Move devServer stuff to the adapter
  handle(...args) {
    return this.adapter.handle(...args);
  }
}
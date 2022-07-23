import {setupDirectory} from './loader.js';
import {closestFile} from '../utils/index.js';
import {EventEmitter} from 'events';
import { getTemplateStack } from './files/index.js';

function normalizeRoute(path) {
  path = path
    .replace(/\[\.\.\.[^\]]+\]/g, '*') // replace [...name] with *
    .replace(/\[([^\]]+)\]/g, ':$1') // replace [name] with :name
    .replace(/\/@/g, '/'); // replace /@ with / (for forcing components folder)
  return path;
}

export class Template {
  constructor({loader} = {}) {
    this.loader = loader;
  }

  async load() {
    if(!this.template) {
      const {default: template, ...rest} = (await this.loader());
      this.template = template;
      this.functions = Object.entries(rest).reduce((acc, [name, fn]) => {
        if(typeof fn === 'function') {
          acc[name] = fn;
        }
        return acc;
      }, {});
    }
    return this.template;
  }

  getStaticData(context, ...args) {
    if(!this.template) {
      throw new Error('Template must be loaded before calling getStaticData');
    }
    return this.functions.load?.call(context, ...args) ?? null;  
  }
  
  hasFunction(name) {
    if(!this.template) {
      throw new Error('Template must be loaded before calling hasFunction');
    }
    return this.functions[name];
  }
}

export class Page {
  /** @type {Template[]} */
  _stack = [];

  /** @type {Template} */
  errorTemplate = null;

  /** @type {Template} */
  fallbackTemplate = null;

  constructor({stack, errorTemplate, fallbackTemplate} = []) {
    this._stack = stack;
    this.errorTemplate = errorTemplate;
    this.fallbackTemplate = fallbackTemplate;
  }

  getRoot() {
    return this._stack[0].load();
  }

  async match(context, ...args) {
    for(const template of this.stack) {
      await template.load();
      if(template.hasFunction('match') && !template.match.call(context, ...args)) {
        return false;
      }
    }
    return true;
  }

  async getStaticData(context, ...args) {
    const data = [];
    for(const template of this.stack) {
      await template.load();
      const loaded = await template.getStaticData(context, ...args);
      data.push(loaded);
    }
    return data;
  }

  get stack() {
    return this._stack.slice(1);
  }

  hasErrorTemplate() {
    return !!this.errorTemplate;
  }

  hasFallbackTemplate() {
    return !!this.fallbackTemplate;
  }
}

export default class Server extends EventEmitter {
  adapter = null;
  initializing = false;
  initialized = false;
  imports = {};
  rootDir = '/';

  constructor({adapter} = {}) {
    super();
    this.adapter = adapter;
  }

  config({imports} = {}) {
    this.imports = imports;
  }

  async init(config = {}) {
    if(this.initialized) {
      return this;
    }
    // If some requests are made before the server is ready then buffer them
    if(this.initializing) {
      return new Promise(resolve => {
        this.once('ready', () => resolve(this));
      });
    }
    this.rootDir = config.rootDir;
    this.initializing = true;

    await this.adapter?.init(config);
    await setupDirectory(this, config);
    await this.ready();

    this.initialized = true;
    this.initializing = false;
    return this;
  }

  async registerEndpoint(module, route = '/') {
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

  async registerPage(route = '/', file) {
    route = normalizeRoute(route);
    let errorTemplate;
    let fallbackTemplate;

    const stack = getTemplateStack(file, this.rootDir)
      .map(p => new Template({path: p, loader: this.imports[p]}));

    const errorTemplatePath = await closestFile('_error.marko', file, this.rootDir);
    const fallbackTemplatePath = await closestFile('_fallback.marko', file, this.rootDir);

    if(errorTemplatePath) {
      errorTemplate = new Template({path: errorTemplatePath, loader: this.imports[errorTemplatePath]});
    }

    if(fallbackTemplatePath) {
      fallbackTemplate = new Template({path: fallbackTemplatePath, loader: this.imports[fallbackTemplatePath]});
    }

    const page = new Page({stack, errorTemplate, fallbackTemplate});

    return this.adapter.registerPage(page, route);
  }

  listen(...args) {
    return this.adapter.listen(...args);
  }

  async ready(...args) {
    await this.adapter.ready?.(...args);
    this.emit('ready');
  }

  // TODO: Move devServer stuff to the adapter
  handle(...args) {
    return this.adapter.handle(...args);
  }
}
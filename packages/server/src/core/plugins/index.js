// Plugins hook into the lifecycle of the build process and the server using some hooks

export function resolvePlugins(plugins = []) {
  return Promise.all(plugins.map(plugin => {
    if(typeof plugin === 'function') {
      return plugin();
    }
    if(typeof plugin === 'string') {
      return import(plugin).then(m => m.default ?? m);
    }
    if(typeof plugin === 'object') {
      return plugin;
    }
  }));
}
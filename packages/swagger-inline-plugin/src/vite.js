import getDoc from './core.js';

// TODO: Maybe support importing sections as well
export default function viteSwaggerInline({importName = '@api', ...options} = {}) {
  let cache = null;
  let root = null;
  return {
    name: 'vite-swagger-inline',
    configResolved(resolvedConfig) {
      root = resolvedConfig.root;
    },
    resolveId(id) {
      if(id === importName) {
        return id;
      }
    },
    async load(id) {
      if(id === importName) {
        // TODO: add the swaggerJSON file to the watcher
        cache ??= `export default ${await getDoc({root, ...options})}`;
        return cache;
      }
    }
  }
}
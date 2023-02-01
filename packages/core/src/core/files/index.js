import path from 'node:path';
import {fs, vol} from 'memfs';
import {dirname} from '../../utils/index.js';

export function addFiles(fileMap, root) {
  const virtualFS = Object.keys(fileMap).reduce((acc, key) => {
    fs.mkdirSync(path.dirname(key), {recursive: true});
    acc[key] = 'module.exports = "virtual module"';
    return acc;
  }, {});
  vol.fromJSON(virtualFS, root);
}

export function getTemplateStack(pagePath, rootPath) {
  const stack = [pagePath];
  let from = path.dirname(pagePath);
  do {
    // look for a _layout.marko file
    const layoutPath = path.join(from, '_layout.marko');
    if(fs.existsSync(layoutPath)) {
      stack.unshift(layoutPath);
    }
    from = path.dirname(from);
  } while (from !== rootPath && from !== '/');
  return stack;
}

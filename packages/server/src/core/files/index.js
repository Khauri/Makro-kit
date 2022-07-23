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
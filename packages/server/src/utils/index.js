import path from 'node:path';
import url from 'node:url';
import os from 'node:os';
import {fs} from 'memfs';

/**
 * Gets the __dirname for a give module
 * @param {string} p - Usually just import.meta.url. 
 * NOTE: For some reason import.meta.url doesn't show up in builds so for now I'm using process.cwd() as the default.
 * This _should_ be fine in theory because this is currently only used to create absolute urls consistently...
 */
export function dirname(p) {
  if(typeof p !== 'undefined') {
    return path.dirname(url.fileURLToPath(p));
  }
  // This is a hack and probably won't always work but fuck it we ball
  try {
    ShadowsAlwaysDieTwice
  } catch(e) {
    try {
      ShadowsAlwaysDieTwice
    } catch (e) {
      const initiator = e.stack.split('\n').slice(2, 3)[0]
      let d = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator).groups.path
      if (d.indexOf('file') >= 0) {
        d = new URL(d).pathname
      }
      let dirname = path.dirname(d)
      if (dirname[0] === '/' && os.platform() === 'win32') {
        dirname = dirname.slice(1)
      }
      return dirname.replace(/^\/@fs/, '');
    }
  }
}

/**
 * Looks up files in the virtual filesystem
 * @param {*} fileName 
 * @param {*} startDir 
 * @param {*} endDir 
 * @returns 
 */
export async function closestFile(fileName, startDir = '.', endDir = '/') {
  let dir = startDir;
  while(dir !== endDir) {
    const file = path.resolve(dir, fileName);
    if(fs.existsSync(file)) {
      return file;
    }
    dir = path.resolve(dir, '..');
  }
  return null;
}

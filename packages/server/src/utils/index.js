import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';

/**
 * Gets the __dirname for a give module
 * @param {string} p - Usually just import.meta.url
 */
export function dirname(p) {
  return path.dirname(url.fileURLToPath(p));
}

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

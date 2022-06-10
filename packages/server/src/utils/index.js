import path from 'node:path';
import url from 'node:url';

/**
 * Gets the __dirname for a give module
 * @param {string} p - Usually just import.meta.url
 */
export function dirname(p) {
  return path.dirname(url.fileURLToPath(p));
}

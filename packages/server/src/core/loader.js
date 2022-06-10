// Loads the modules into a tree
import path from 'node:path';
import fs from 'node:fs';
import {dirname} from '../utils/index.js';

const __dirname = dirname(import.meta.url);

let imports;

function markIndex(dir, candidates) {
  const basename = path.basename(dir);
  // The order here is important
  const paths = [
    path.join(dir, "index.marko"),
    path.join(dir, `${basename}.marko`),
    path.join(dir, "index.js"),
    path.join(dir, `${basename}.js`),
  ];
  const index = candidates.find(c => paths.some(p => p === c.path))
  if(!index) {
    return;
  }
  index.isIndex = true;
}

/**
 * Registers the routes in a directory and returns a list of directories to continue checking
 * @param {*} dir 
 * @param {*} rootDir 
 * @param {*} server 
 * @returns 
 */
async function registerDirectory(dir, rootDir, server) {
  const files = await fs.promises.readdir(dir, {withFileTypes: true});
  const directories = files.filter(f => f.isDirectory() && f.name !== 'components');
  const candidates = files
    .filter(f => f.isFile() && /.((m?j|t)s|marko)$/.test(f.name))
    .map(candidate => ({
      type: candidate.name.endsWith('.marko') ? 'marko' : 'js',
      path: path.join(dir, candidate.name),
      filename: path.basename(path.join(dir, candidate.name)).split('.').shift(),
    }));
  markIndex(dir, candidates);
  await Promise.all(
    candidates.map(async candidate => {
      const importFn = imports[candidate.path];
      const module = await importFn();
      // Get the router path
      const routePath = candidate.isIndex 
        ? `/${path.relative(rootDir, dir)}`
        : `/${path.relative(rootDir, dir)}/${candidate.filename}`;
      if(candidate.type === 'js') {
        server.registerJSHandler(module, routePath);
      } else {
        server.registerTemplateHandler(module, routePath);
      }
  
    })
  );

  return directories;
}

async function walk(dir, root = dir, server) {
  const directories = await registerDirectory(dir, root, server);
  await Promise.all(directories.map(async file => {
    const filePath = path.join(dir, file.name);
    return walk(filePath, root, server);
  }));
}

export async function setupDirectory(dir, server) {
  const absDir = path.resolve(dir);
  // ~ should refer to the passed in directory. This is configured via vite config and `createServer`.
  // Used because only static imports and aliases (~) are allowed here. Works fine but may need to be improved.
  // May or may not change it to another alias a `~` is sometimes aliased to 'node_modules'.
  // Also should probably make this lazy instead of eager?
  const paths = import.meta.glob('~/**/*.{mjs,js,ts,marko}');

  // Make each path absolute for lookup later
  imports = Object.entries(paths).reduce((acc, [key, value]) => {
    key = path.resolve(__dirname, key);
    acc[key] = value;
    return acc;
  }, {});

  const routesDir = path.join(absDir, "routes");
  // Walk the directory tree
  await walk(routesDir, routesDir, server);
}
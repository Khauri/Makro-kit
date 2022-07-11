// Loads the modules into a tree
import path from 'node:path';
// import fs from 'node:fs';
import {fs, vol} from 'memfs';
import {dirname} from '../utils/index.js';

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
    .filter(f => f.isFile() && /.((m?j|t)s|marko)$/.test(f.name) && !/^[_.]/.test(f.name))
    .map(candidate => ({
      type: candidate.name.endsWith('.marko') ? 'marko' : 'js',
      path: path.join(dir, candidate.name),
      filename: path  
        .basename(path.join(dir, candidate.name))
        .replace(/\.((m?j|t)s|(ts\.)?marko)$/, ''),
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
        await server.registerJSHandler(module, routePath, candidate.path);
      } else {
        await server.registerTemplateHandler(module, routePath, candidate.path);
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
  const rootDir = path.resolve(dir);
  // ~ should refer to the passed in directory. This is configured via vite config and `createServer`.
  // Used because only static imports and aliases (~) are allowed here. Works fine but may need to be improved.
  // May or may not change it to another alias a `~` is sometimes aliased to 'node_modules'.
  const paths = import.meta.glob('~/**/*.{mjs,js,ts,marko}');
  
  // Make each path absolute for lookup later
  imports = Object.entries(paths).reduce((acc, [key, value]) => {
    // Get path relative to rootDir
    // HACK ALERT: not sure how to fix this but for some reason extra path segments are needed when serving...
    const newKey = process.env.SERVE ? path.resolve(rootDir, 'node_modules', key) : path.resolve(rootDir, 'node_modules', 'routes', key);
    acc[newKey] = value;
    return acc;
  }, {});

  // This sets up a virtual filesystem which is useful for the final build
  const virtualFS = Object.keys(imports).reduce((acc, key) => {
    fs.mkdirSync(path.dirname(key), {recursive: true});
    acc[key] = 'module.exports = "virtual module"';
    return acc;
  }, {});
  vol.fromJSON(virtualFS, rootDir);
  // console.log(virtualFS, vol.toJSON());
  server.config({imports});

  let routesDir = rootDir;
  // If not in the routes direcory, go to routes 
  if(fs.existsSync(path.join(rootDir, 'routes'))) {
    routesDir = path.join(rootDir, "routes");
  }
  fs.mkdirSync(routesDir, {recursive: true});
  console.log(routesDir);
  // Walk the directory tree
  await walk(routesDir, routesDir, server);
}
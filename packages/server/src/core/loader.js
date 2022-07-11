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

export async function setupDirectory(server, config) {
  const routesDir = path.resolve(config.rootDir, config.routesDir);
  fs.mkdirSync(routesDir, {recursive: true});
  // ~ refers to config.rootDir. This is configured through the vite config and gets replaced statically during builds.
  // Used because only static imports and aliases (~) are allowed here.
  // May or may not change it to another alias a `~` is sometimes aliased to 'node_modules'.
  const paths = import.meta.glob('~/**/*.{mjs,js,ts,marko}');
  
  // Make each path absolute for lookup later
  imports = Object.entries(paths).reduce((acc, [key, value]) => {
    // This is super scuffed, but import.meta.url doesn't seem to work? Kind of a pain in the ass right now...
    key = `${key.replace(/^(\.\.\/)+/, '')}`; // remove leading relative path
    key = `${routesDir.slice(0, routesDir.indexOf(key.split(/(\/[^\/]+)/).at(1)))}/${key.split(/(\/.+)/).at(1)}`;
    key = path.resolve(routesDir, key);
    acc[key] = value;
    return acc;
  }, {});

  // This sets up a virtual filesystem which is useful for the final build
  const virtualFS = Object.keys(imports).reduce((acc, key) => {
    fs.mkdirSync(path.dirname(key), {recursive: true});
    acc[key] = 'module.exports = "virtual module"';
    return acc;
  }, {});
  vol.fromJSON(virtualFS, config.rootDir);
  // console.log(virtualFS, vol.toJSON());
  server.config({imports});
  // Walk the directory tree
  await walk(routesDir, routesDir, server);
}
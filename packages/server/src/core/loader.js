// Loads the modules into a tree
import path from 'node:path';
import fs from 'node:fs';
import {dirname} from '../utils/index.js';

const __dirname = dirname(import.meta.url);

let imports;

async function findIndex(dir, type) {
  const basename = path.basename(dir);
  // The order here is important
  const paths = [
    {type: 'marko', path: path.join(dir, "index.marko")},
    {type: 'marko', path: path.join(dir, `${basename}.marko`)},
    {type: 'js', path: path.join(dir, "index.js")},
    {type: 'js', path: path.join(dir, `${basename}.js`)},
  ].filter(({type: t}) => !type || t === type);
  return paths.find(p => fs.existsSync(p.path));
}

// Directory walker
async function parseDirectory(dir, rootDir, server) {
  const index = await findIndex(dir);
  // TODO: Find and register any non-index paths first
  // Get all .marko and .js files in the current directory excluding the index file
  if(!index) {
    return;
  }
  const dynamicImport = imports[index.path];
  const module = await dynamicImport();
  // Get the router path
  const routePath = `/${path.relative(rootDir, dir)}`;
  if(index.type === 'js') {
    server.registerJSHandler(module, routePath);
  } else {
    server.registerTemplateHandler(module, routePath);
  }
}

async function walk(dir, root = dir, server) {
  await parseDirectory(dir, root, server);
  const files = await fs.promises.readdir(dir, {withFileTypes: true});
  const directories = files.filter(f => f.isDirectory() && f.name !== 'components');
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
  const paths = import.meta.glob('~/**/*.{js,ts,marko}');

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
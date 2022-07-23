import fs from 'node:fs';
import path from 'node:path';
import z from 'zod';

export const Modes = z.enum(['development', 'production']).default('development');

export const Config = z.object({
  mode: Modes,
  outDir: z.string().default('./dist'),
  routePrefix: z.string().optional(),
  rootDir: z.string().optional(),
  routesDir: z.string().default('./routes'),
  viteConfig: z.union([z.object({}).passthrough(), z.string()]).optional(),
  port: z.union([z.number(), z.string()]).default('3000'),
  plugins: z.array().default([]),
}).strict();

// Walk upwards from the cwd to find a package.json
export function findPackageJSON(from = process.cwd()) {
  do {
    const packageJSON = path.join(from, 'package.json');
    if(fs.existsSync(packageJSON)) {
      const packageJSONContent = fs.readFileSync(packageJSON, 'utf8');
      return JSON.parse(packageJSONContent);
    }
    from = path.dirname(from);
  } while (from !== '/');
}

// Walks upwards from the cwd to find a polo config
export function findConfigFile(from = process.cwd()) {
  const filetypes = [
    {type: 'ts', value: `polo.config.ts`},
    {type: 'esm', value: `polo.config.js`},
    {type: 'cjs', value: `polo.config.cjs`},
    {type: 'esm', value: `polo.config.mjs`},
    {type: 'json', value: `polo.config.json`},
  ];
  do {
    for (const filetype of filetypes) {
      const file = path.join(from, filetype.value);
      if(fs.existsSync(file)) {
        return file;
      }
    }
    from = path.dirname(from);
  } while (from !== '/');
}

// Reads the config file
export async function resolveConfig(from, inlineConfigOptions = {}) {
  const configPath = findConfigFile(from);
  const packageJSON = findPackageJSON(from);
  const result = configPath ? await import(configPath) : {};
  if(packageJSON) {
    const dependencies = {...packageJSON.dependencies, ...packageJSON.devDependencies};
    const plugins = Object.keys(dependencies).filter(k => /polo-plugin-/.test(k));
    // Maybe merge this a little better in the future?
    inlineConfigOptions.plugins = [...inlineConfigOptions.plugins ?? plugins, ...plugins];
  }
  // Merge inline config with config file. Inline takes precedence.
  return {...result.default ?? result, ...inlineConfigOptions};
}

export async function getConfig(from, inlineConfigOptions = {}) {
  const userConf = await resolveConfig(from, inlineConfigOptions);
  return Config.parse(userConf);
}
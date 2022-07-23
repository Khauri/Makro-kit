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
}).strict();

// Walks upwards from the cwd to find a markoconfig.js
export function findConfigFile(from = process.cwd()) {
  let last = from;
  const filetypes = [
    {type: 'ts', value: `polo.config.ts`},
    {type: 'esm', value: `polo.config.js`},
    {type: 'cjs', value: `polo.config.cjs`},
    {type: 'esm', value: `polo.config.mjs`},
    {type: 'json', value: `polo.config.json`},
  ];
  do {
    for (const filetype of filetypes) {
      const file = path.join(last, filetype.value);
      if(fs.existsSync(file)) {
        return file;
      }
    }
    last = from;
    from = path.resolve(from, '..');
  } while (from !== last); // may or may not prevent an infinite loop
}

// Reads the config file
export async function resolveConfig(from, inlineConfigOptions = {}) {
  const configPath = findConfigFile(from);
  const result = configPath ? await import(configPath) : {};
  // Merge inline config with config file. Inline takes precedence.
  return {...result.default ?? result, ...inlineConfigOptions};
}

export async function getConfig(from, inlineConfigOptions = {}) {
  const userConf = await resolveConfig(from, inlineConfigOptions);
  return Config.parse(userConf);
}
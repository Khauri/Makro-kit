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
  do {
    const config = `${last}/polo.js`;
    if(fs.existsSync(config)){
      return config;
    }
    last = from;
    from = path.resolve(from, '..');
  } while (from !== last); // may or may not prevent an infinite loop
}

// Reads the config file
export async function getConfigFile(from, inlineConfigOptions = {}) {
  const configPath = findConfigFile(from);
  const result = configPath ? await import(configPath) : {};
  // Merge inline config with config file. Inline takes precedence.
  return {...result.default ?? result, ...inlineConfigOptions};
}

export async function getConfig(from, inlineConfigOptions = {}) {
  const userConf = await getConfigFile(from, inlineConfigOptions);
  console.log(userConf);
  return Config.parse(userConf);
}
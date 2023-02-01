import path from 'node:path';
import url from 'node:url';
import marko from '@marko/vite';

import {getConfig} from './src/core/config.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const {
  NODE_ENV = 'development',
  PORT = 3000
} = process.env;

// This should most likely go in src/config?
async function getConfigs({root, ...rest}) {
  // TODO: const root = searchForWorkspaceRoot(root);
  const config = await getConfig(root, {rootDir: root, ...rest});
  /** @type {import('vite').InlineConfig} */
  const viteConfig = {
    // ...config,
    ...config.viteConfig,
    plugins: [marko(), ...config.viteConfig?.plugins ?? []],
    // configFile: path.join(__dirname, "vite.config.js"),
    appType: 'custom',
    server: {
      port: config.port ?? PORT,
      base: '/',
      strictPort: true,
      middlewareMode: true,
      ...config.viteConfig?.server,
    },
    build: {
      ...config.viteConfig?.build,
      outDir: config.outDir,
      emptyOutDir: false,
      rollupOptions: {
        output: {format: "es"},
        input: path.resolve(__dirname, './src/index.js'),
      },
		},
    resolve: {
      alias: {
        '~': config.rootDir,
      },
    },
    root: config.rootDir,
    optimizeDeps: {include: ['fastify', 'fastify-plugin']},
  };

  // TODO: This should go in a far more logical place
  const prebuilders = config.plugins
    .filter(p => p.preBuild)
    .map(({preBuild}) => {
      return preBuild(config);;
    });
  await Promise.all(prebuilders);
  return {viteConfig, poloConfig: config};
}

export async function dev(dir, options) {
  const { once } = await import('events');
  const { createServer } = await import('vite');
  const {viteConfig, poloConfig} = await getConfigs({...options, root: dir});
  // const root = vite.searchForWorkspaceRoot(dir);
  const devServer = await createServer(viteConfig);
  const server = devServer
    .middlewares
    .use(async (req, res, next) => {
      try {
        const {server} = await devServer.ssrLoadModule(path.resolve(__dirname, './src/index.js'));
        await server.init(poloConfig);
        await server.handle(req, res);
      } catch (err) {
        if (err) devServer.ssrFixStacktrace(err);
        return next(err);
      }
    })
    .listen(PORT);

  await once(server, 'listening');
  const address = `http://localhost:${server.address().port}`;
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
  return {env: NODE_ENV, address, viteConfig, poloConfig};
}

export async function build(dir, options) {
  const vite = await import('vite');
  const {default: rimraf} = await import('rimraf');
  const {poloConfig, viteConfig} = await getConfigs({root: dir, ...options});
  await new Promise((res, rej) => {
    const outputDir = path.resolve(poloConfig.rootDir, poloConfig.outDir);
    rimraf(outputDir, (err) => {err ? rej(err) : res()});
  });
  // Server build
  await vite.build({...viteConfig, build: {...viteConfig.build, ssr: true}});
  // // Client build
  await vite.build(viteConfig);

}

export async function serve(dir, options) {
  process.env.SERVE = 'true';
  const {poloConfig} = await getConfigs({...options, root: dir});
  const file = path.resolve(poloConfig.rootDir, poloConfig.outDir, 'index.js');
  let server;
  try {
    ({ server } = await import(file));
  } catch(err) {
    console.error(`\nOops! Something went wrong loading the built bundle from "${file}".\n\tDid you forget to run polo build?\n`);
    process.exit(1);
  }
  // console.log(poloConfig, file);
  await server.init(poloConfig);
  const address = await server.listen({port: PORT});
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
}

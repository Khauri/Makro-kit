import path from 'node:path';
import url from 'node:url';
import marko from '@marko/vite';

import {getConfig} from './src/core/config.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const {
  NODE_ENV = 'development',
  PORT = 3000
} = process.env;

async function getViteConfig({root, ssr = undefined}) {
  const config = await getConfig(root);
  // const root = vite.searchForWorkspaceRoot(dir);
  /** @type {import('vite').InlineConfig} */
  return {
    // ...config,
    ...config.viteConfig,
    plugins: [marko(), ...config.viteConfig?.plugins ?? []],
    // configFile: path.join(__dirname, "vite.config.js"),
    server: {
      port: config.port ?? PORT,
      base: '/',
      strictPort: true,
      middlewareMode: 'ssr',
      ...config.viteConfig?.server,
    },
    build: {
      ...config.viteConfig?.build,
      ssr,
      outDir: "dist", // Server and client builds should output assets to the same folder.
      emptyOutDir: false, // Avoid server / client deleting files from each other.
      rollupOptions: {
        output: {
          // Output ESM for the server build also.
          // Remove when https://github.com/vitejs/vite/issues/2152 is resolved.
          format: "es",
        },
        // Vite dependency crawler needs an explicit JS entry point
        input: path.resolve(__dirname, './src/index.js'),
      },
		},
    resolve: {
      alias: {
        '~': root,
      },
    },
    root,
    optimizeDeps: {include: ['fastify', 'fastify-plugin']},
  };
}

export async function dev(dir) {
  const { once } = await import('events');
  const { createServer } = await import('vite');
  const devServerConfig = await getViteConfig({root: dir});
  // const root = vite.searchForWorkspaceRoot(dir);
  const devServer = await createServer(devServerConfig);
  const server = devServer
    .middlewares
    .use(async (req, res, next) => {
      try {
        const {server} = await devServer.ssrLoadModule(path.resolve(__dirname, './src/index.js'));
        await server.init(dir);
        await server.ready();
        await server.handle(req, res);
      } catch (err) {
        return next(err);
      }
    })
    .listen(PORT);

  await once(server, 'listening');
  const address = `http://localhost:${server.address().port}`;
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
}

export async function build(dir, options) {
  const {build} = await import('vite');
  const {default: rimraf} = await import('rimraf');
  await new Promise((res, rej) => {
    rimraf('./dist', (err) => {err ? rej(err) : res()});
  });
  // Server build
  await build(await getViteConfig({root: dir, ssr: true}));
  // Client build
  await build(await getViteConfig({root: dir}));
}

export async function serve(file, {root} = {}) {
  process.env.SERVE = 'true';
  const { server } = await import(file);
  await server.init(root);
  const address = await server.listen({port: PORT});
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
}

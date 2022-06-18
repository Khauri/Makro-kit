import path from "node:path";
import url from 'node:url';
import vite from 'vite';
import {getConfig} from './src/core/config.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const { NODE_ENV = "development", PORT = 3000 } = process.env;

export async function dev(dir) {
  const { once } = await import("events");
  const { createServer } = await import("vite");
  const config = await getConfig(dir);
  console.log({config});
  // const root = vite.searchForWorkspaceRoot(dir);
  const root = dir;
  const devServer = await createServer({
    // ...config,
    configFile: path.join(__dirname, "vite.config.js"),
    server: { 
      middlewareMode: "ssr",
      base: '/',
      // fs: {
      //   allow: [
      //     path.join(__dirname),
      //     dir,
      //     path.join(root, 'node_modules'),
      //     path.join(__dirname, 'node_modules'),
      //   ]
      // },
      port: 3000,
      strictPort: true,
    },
    build: {
			rollupOptions: {
				// Vite dependency crawler needs an explicit JS entry point
				// eventhough server otherwise works without it
				input: `${root}/index.js`
			}
		},
    resolve: {
      alias: {
        '~': root,
      },
    },
    // optimizeDeps: {include: ['makro']},
    root,
  });
  // console.log(devServer.config.build);
  const server = devServer.middlewares
    .use(async (req, res, next) => {
      try {
        const {server} = await devServer.ssrLoadModule(path.resolve(__dirname, './src/index.js'));
        // console.log(server);
        await server.load(dir);
        await server.app.ready();
        server.app.routing(req, res);
        next();
      } catch (err) {
        return next(err);
      }
    })
    .listen(PORT);

  await once(server, "listening");
  const address = `http://localhost:${server.address().port}`;
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
}

export async function serve() {
  // In production, simply start up the fastify server.
  // const { app } = await import("./dist/index.js");
  const address = await app.listen(PORT);
  console.log(`Env: ${NODE_ENV}`);
  console.log(`Address: ${address}`);
}

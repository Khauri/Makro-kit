import {plugin as mdPlugin, Mode} from 'vite-plugin-markdown';
export default {
  "routesDir": "./routes",
  viteConfig: {
    plugins: [mdPlugin({mode: [Mode.HTML, Mode.TOC]})],
  },
};
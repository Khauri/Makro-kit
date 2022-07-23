import {plugin as mdPlugin, Mode} from 'vite-plugin-markdown';
export default {
  viteConfig: {
    plugins: [mdPlugin({mode: [Mode.HTML, Mode.TOC]})],
  },
};
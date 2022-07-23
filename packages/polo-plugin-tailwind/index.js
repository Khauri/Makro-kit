const tailwindConfigBase = `{
  content: [
    "./routes/**/*.marko",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`

const postCSSConfigBase = `{
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
};`


export default {
  name: 'polo-plugin-tailwind',
  preBuild({root} = {}) {
    const tailwindConfig = path.join(root, 'tailwind.config.cjs');
    if(!fs.existsSync(tailwindConfig)) {
      // create a default tailwind config
      fs.writeFileSync(tailwindConfig, `module.exports = ${tailwindConfigBase};`);
      console.warn('Created a default tailwind config at tailwind.config.cjs');
    }
    const postCSSConfig = path.join(root, 'postcss.config.cjs');
    if(!fs.existsSync(postCSSConfig)) {
      // create a default postcss config
      fs.writeFileSync(postCSSConfig, `module.exports = ${postCSSConfigBase};`);
      console.warn('Created a default postcss config at tailwind.config.cjs');
    }
  }
}

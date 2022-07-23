# Polo-plugin-tailwind

Super basic tailwind setup.

Usage:

```sh
yarn add @polojs/polo-plugin-tailwind
```

Running or building the server will automatically create the necessary config files if they don't already exist.

To use tailwind import the tailwind css file somewhere in your page or layouts.

```js
import '@polojs/polo-plugin-tailwind/tailwind.css';
```

If you want to do something custom feel free to import tailwind yourself:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
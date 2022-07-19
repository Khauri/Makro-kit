# Swagger-Inline-Plugin

EXPERIMENTAL

This plugin uses [swagger-inline](https://www.npmjs.com/package/swagger-inline) to parse your source code looking for inline OAS schema definitions.
This is then compiled into a single JSON that you can import into your project and use at runtime to, for example, automatically generate an SDK.

This plugin works with Vite and maybe webpack in the future.

## Setup

### Vite

In your vite config
```js
import swaggerInlinePlugin from '@polojs/swagger-inline-plugin';

export default defineConfig({
  plugins: [swaggerInlinePlugin()]
});
```

### Polojs/Svelte

If you are using PoloJS or Svelte add the plugins under the `viteConfig.plugins[]` section of the `polo.config.json` or `svelte.config.json` respectively.

### Webpack

COMING SOON

## Usage

Create a base file, usually called `swaggerBase.json` or `swaggerBase.yaml`.

Example:

```yml
swagger: "3.1"
host: "petstore.swagger.io"
basePath: "/api"
schemes: ['http']
```

In your code add some jsdoc comments 

```js
/**
 * @api [get] /pets
 * bodyContentType: "application/json"
 * description: "Returns all pets from the system that the user has access to"
 * responses:
 *   "200":
 *     description: "A list of pets."
 *     schema:
 *       type: "String"
 */

/**
 * @schema Pet
 * required:
 *   - id
 *   - name
 * properties:
 *   id:
 *     type: integer
 *     format: int64
 *   name:
 *     type: string
 *   tag:
 *     type: string
 */
```

Now simply import the `@api` file like any regular package.

```js
import apiSpec from '@api';

console.log(apiSpec);
```
WARNING:

I give no guarantees that this will work on your machine. See the Development section for some known issues and workarounds.

# Polo.js

Polo JS is a zero-config [Marko](https://markojs.com/) meta framework with a super fast dev environment powered by vite and a file-system based router powered by fastify. 

Other goodies include:
  - SCSS Support (planned)
  - Skypack/ESM URL import support (planned)
  - [Snapshot testing](https://github.com/Khauri/mikro-ui/tree/master/packages/mikro-test) (planned)
  - Edge Worker support. (planned)
  - Route splitting. (planned)
  - Built-in components: transitions, stores, etc. (planned)
  - A11y auditing
  - 

## Documentation

The documentation website is itself created using polo.

## Routes

Like many file-system based routers, the directory structure of the project maps nearly 1:1 with the routing layout of the server.
Currently all pages and endpoints go into a `routes` folder at the root of the project. This can be configured through command line arguments or by providing a `poloconfig.json`.

### Endpoints

Endpoints are easier to talk about so let's go over them first.

And endpoint is just a `.js` file that exports functions, such as `get`, `post`, `pacth`, `del`, etc., which will map directly to the appropriate method for a request.

Fastify is used under the hood and so each route will receive the request and reply object in which you can send back any data you want.

```js
export function get(request, reply) {
  reply.send({ hello: 'world' });
}
```

This can be useful for separating API routes from your templates and generally decouple template rendering from api functionality.

Each method also has an optional `[method]Options` you an supply in order to provide fastify schemas or other functionality.

The `default`/`register` export can also be used to receive the fastify app instance itself, allowing you to pretty much do whatever you want, ie adding external packages.

### Hooks

Hooks are js files that export functions that get run before a template is loaded. This can be used to pass data into the template or redirect the user.
Hooks can be used to create authenticated routes, for instance, by authenticating a user prior to rendering the template.

Hooks are created by prefixing a js file prefixed with `_` that is named after the route it plans to hook into.
If you name a hook `_index.js` or `_[folder_name].js` it will apply to all nested routes as well whereas.

Certain data that a hook returns may be passed as input to the component.

### Pages/Templates

Any `.marko` file is automatically rendered as a template.

Example:
```
/routes/items/:id/index.marko
```

Now any `GET` requests to the route `/items/:id` will render the template.

In the future other file extensions such a `.md` may also be supported for generating marko pages from markdown.

### Private Modules

Any module prefixed with `__` (two underscores) or `.` (a single dot) will be private modules and will not create a route or a template.

#### Params

Route params and query params are passed as input to the component.

#### Input data

While it's preferable to use Marko's async streaming you can also have data passed along the traditional way by creating a `.js` file with the same template name
and then exporting a `data` function. The function will receive the same `request` and `reply` object that all other routes have, but should return/resolve to an object that 
you would like to be passed as input.

#### component folders

In Marko the `components` folder is traditionally used to specify a set of tags that aren't normally rendered as pages.

Therefor that any folder name `components` will be ignored by default.
To include the components folder as a template you may prefix the folder name with `@`.

Example:
```
/routes/items/:id/@components/:component_id
```

This will result in a route of `/items/:id/components/:component_id`

#### layouts

Unlike in sveltekit, layouts are not automatically inferred from the filestystem. Instead you should create a components folder and put the layout there.

### Mixing Templates and Endpoints

Templates and endpoints may occupy the same route with one caveat:
If you supply a `get` route it will take precedence over rendering the template.

## Development

Requires node 16+ and yarn 2+. I would personally recommend using [volta](https://volta.sh/).

Also uses yarn workspaces.

At the root of the project run `yarn` to install all the packages.

Then `cd website` and `yarn dev` to start the server.

### Known Development Issues

The development goal is to create a documentation website (located in the `website` folder) that would help to bootstrap some features of the server.

However, currently all `node_modules` need to be hoisted into a single `node_modules` directory in order for vite to properly resolve the dependencies for reasons that I have not figured out yet, so it doesn't exactly work as expected in all cases.

It also seemed to be required to install `@marko/tags-api-preview` in the `website` folder even though it exists in the `packages/server` folder. I have no clue why that was needed, but that makes it harder for just serve any random folder on my machine that wasn't necessarily already a marko project (ie the cli probably doesn't work if installed globally).

I believe having an `index.js` file also seemed to be required for some reason due to vite's dependency crawling.

Editing markdown files doesn't seem to trigger a page reload.

## Plans/Ides

Currently this works well for MPAs but maybe with some clever routing tricks this may be able to support a hybrid SSR/MPA app.

Currently there is no way to create a build/bundle.
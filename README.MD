WARNING:

I give no guarantees that this will work on your machine. See the Development section for some known issues and workarounds.

# Makro

Experimental file-system based router based loosely on svelekit, n[e/u]xtjs, remix, and @marko/serve.

Uses:
  - marko
  - vite
  - fastify

This is still in very early stages but the end goal is a complete, zero-config, production ready  

## Routes

Like many file-system based routers, the directory structure of the project maps nearly 1:1 with the routing layout of the server.
Currently all pages and endpoints go into a `routes` folder at the root of the project (not yet configurable).

### Endpoints

Endpoints are easier to talk about so let's go over them first.

And endpoint is just a `.js` file that exports functions, such as `get`, `post`, `pacth`, `del`, etc., which will map directly to the appropriate method for a request.

Fastify is used under the hood and so each route will receive the request and reply object in which you can send back any data you want.

```js
export function get(request, reply) {
  reply.send({ hello: 'world' });
}
```

This can be useful for separating API routes from your templates and generally decouple rendering from.

Each method also has an optional `[method]Options` you an supply in order to provide fastify schemas or other functionality.

The default/register export can also be used to receive the fastify app instance itself, allowing you to pretty much do whatever you want.

### Pages/Templates

Any `.marko` file is automatically rendered as a template.

Example:
```
/routes/items/[id].marko
```

Now any `GET` requests to the route will render the template.

In the future other file extensions such a .md may also be supported for generating marko pages from markdown.

#### Params

Route params and query params are passed as input to the component.

#### Input data

While it's preferable to use Marko's async streaming you can also have data passed along the traditional way by creating a `.js` file with the same template name
and then exporting a `data` function. The function will receive the same `request` and `reply` object that all other routes have, but should return/resolve to an object that 
you would like to be passed as input.

#### component folders

In Marko the `components` folder

Note that any folder name `components` will be ignored by default.
To include the components folder as a template you may prefix the folder name with `@`.

Example:
```
/routes/items/[id]/@components/[component_id]
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
Makro (`packages/server`) is intended to be a cli script that can be used to host any folder even if that folder 

However, currently all `node_modules` need to be hoisted into a single `node_modules` directory in order for vite to properly resolve the dependencies for reasons that I have not figured out yet, so it doesn't exactly work as expected in all cases.

It also seemed to be required to install `@marko/tags-api-preview` in the `website` folder even though it exists in the `packages/server` folder. I have no clue why that was needed, but that makes it harder for just serve any random folder on my machine that wasn't necessarily already a marko project (ie the cli probably doesn't work if installed globally).

I believe having an `index.js` file also seemed to be required for some reason due to vite's dependency crawling.

Also if you add a components folder somewhere you have to restart the entire vite server or it won't be able to find the tag. And in some cases when using custom components an error is thrown but it's not clear what the error is at all.

Specifically if you use 

```marko
<link-to="/">Go Back</link-to>
```

Instead of 

```marko
<link-to href="/">Go Back</link-to>
```

## Plans/Ides

Currently this works well for MPAs but maybe with some clever routing tricks this may be able to support a hybrid SSR/MPA app.

Currently there is no way to create a build/bundle.
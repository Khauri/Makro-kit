WARNING:

I give no guarantees that this will work on your machine. See the Development section for some known issues and workarounds.

# Polo.js

Polo JS is a zero-config [Marko](https://markojs.com/) meta framework with a super fast dev environment powered by vite and a file-system based router powered by fastify. 

Other goodies include:
  - SCSS Support (planned)
  - Skypack/ESM URL import support (planned, but maybe not possible)
  - [Snapshot testing](https://github.com/Khauri/mikro-ui/tree/master/packages/mikro-test) (planned)
  - Edge Worker support. (planned)
  - Route splitting. (planned)
  - Built-in suite of helpful components: transitions, stores, etc. (planned)
  - A11y auditing (planned)
  - multi-language build support (planned)
  - Optional database adapters w/ migrations and realtime listener support (planned)
    - [Postgres](https://github.com/supabase/realtime) and SQLite adapters (planned)
  - Live Views/Quick websocket interactions and libraries (planned)
    - Supabase-type Database subscriptions (out of scope?)

## Documentation

The documentation website will eventually be fully generated using Polojs, however this README serves as temporary documentation as well as an ideas page.

## Quick Start

```sh
yarn create @polojs ./my-project
cd my-project
yarn
yarn dev
```

These steps will download the examples/default folder to your machine and then start the dev server.

## Routes

Like many file-system based routers, the directory structure of the project maps nearly 1:1 with the routing layout of the server.
All pages and endpoints go into a `routes` folder at the root of the project. This can be configured through command line arguments or by specifying it in a `polo.js` file.

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

The `default`/`register` export can also be used to receive the fastify app instance, allowing you to pretty much do whatever you want, ie adding external packages and plugins.

### Pages/Templates

Any `.marko` file is automatically rendered as a template.

Example:
```
/routes/items/:id/index.marko
```

Now any `GET` requests to the route `/items/:id` will render the template at `/routes/items/:id/index.marko`.

Currently the routing supports:

- Index files - can be named `index.marko` or named after the folder it's in. `index.marko` takes precedence.
- url params - `/routes/blog/articles/:article_id` will match routes like `/blog/articles/123` and `/blog/articles/321`
- wildcard routes - `/routes/blog/articles/[...article].marko` will match `/blog/articles/*`

#### Private

Any directory or file prefixed with `__` (two underscores) or `.` (a single dot) will be considered a private module and will not create a route or a template.
Additionally any folder named `components` _will not_ create a route either. If you _do_ want a route named `components`, name the folder `@components`.

#### Special templates

There are currently 3 special templates that can be used in any folder. Polojs will, currently, resolve the closest one to the route itself when determining which to use. This behavior may change in the future.

- `_error.marko` - A page to render when an error occurs. Note that due to Marko's async streaming, this may sometimes get rendered in the middle of your template.
- `_fallback.marko` - A page to render if the `match` function returns false or a page is otherwise not found.
- `_layout.marko` - Experimental but allows you to wrap all your pages in a common template automatically. Use the `<slot>` component to specify where your page will render. The functionality of _layout is subject to great change.

### Custom matching

If your page exports a `match` function then a 404 will be rendered instead of the usual template when the function returns `false`.
Currently the match function runs before the `load` function. A `matchAfterLoad` function could potentially be used to 404 based on whether or not any data was loaded. 

```marko
// /routes/params/:test/index.marko
export async function match({params:{test}}) {
  if(test !== '123') {
    return false;
  }
}
```

### Loading data

If your marko template exports a `load` function it will be used to load data for the template.
The load function is passed in the `request` and `reply` objects from fastify.

Then simply use the `<load>` tag to get whatever data is returend from the `load` function itself from within your template.

```marko
// /routes/params/:test/index.marko
export async function load({params: {test} = {}}) {
  // The data returned here must be JSON serializable
  return `The param "test" was ${test}`;
}

<load/{value} />
<p>${value}</p>
```

Note: Currently these functions _are not_ culled from the browser bundle, in the future we may rely on tree shaking or a custom transformer to handle this.
In the meantime, if you want to avoid polluting the browser with server-only packages, use dynamic imports like so:

```marko
import hljs from 'highlight.js'; // loads on the server AND on the browser

export async function load() {
  const marked = await import('marked'); // never loads in the browser
  const fs = await import('node:fs'); // would throw an error if loaded in the browser
  const markdown = await fs.promises.readFile('./test.md');

  marked.setOptions({
    highlight: function (code, language) {
      return hljs.highlight(code, { language }).value;
    },
  });

  // Whatever you return here MUST be JSON serializable
  return marked.parse(markdown);
}

<load/{value: html} />
<div>
  $!{html}
</div>
```

### Calling server functions

You can export more than just a `load` function in your template, you can also export variables and even other functions.

When you export other functions you can use the `<functions>` tag to run a function _on the server_ from the client. For now these functions are called server functions.

```marko
export let clicksCounter = 0;

export function load() {
  return clicksCounter;
}

export function increment(by = 1) {
  clicksCounter += 1;
}

<load/{value: clicks} />
<functions/fns />

<let/counter=clicks/>

<button 
  onClick(){
    clicks++;
    fns.increment(1)
      .then(result => console.log(result));
  }
>
  Clicked ${clicks} times
</button>
```

Since these exports are never used by the browser bundle, in theory they should be tree shaken out.

Note that similar to the `load` function, the data needs to be JSON serializable.

This is an experimental feature and the API is subject to change, including considerations around making debouncing and adding middleware easier.

#### Params, Query, Data

Route params, query params, and some other data can be obtained using the `<match>` tag from anywhere on the page.

```
<match/{
  url,
  params,
  query,
} />
```

### Mixing Templates and Endpoints

Templates and endpoints may occupy the same route with one caveat:
If you supply a `get` route while also having a template you _may_ see an error.

## Development

The current development goal is to finish building all planned features and create a documentation website (located in the `website` folder).


Requires node 16+ and yarn 2+. I would personally recommend using [volta](https://volta.sh/).

Also uses yarn workspaces.

At the root of the project run `yarn` to install all the packages.

Then `cd website` and `yarn dev` to develop the documentaiton.

### Known Issues

- When adding new components you have to completely restart the server. Haven't figured out if this is due to @marko/vite or something else.
- import.meta.url isn't being populated correctly when you create a build. A workaround is in place but it's not very good.

## Plans/Ides

- Rewrite in ts before it's too late and the whole world burns
- Currently this works well for MPAs but maybe with some clever routing tricks this may be able to support a hybrid SSR/MPA app.

### Publishing

1. Add a changeset and bump the appropriate packages

```sh
yarn changeset
```

2. Update package versions

```sh
yarn changeset version
```

3. Publish to NPM

```sh
yarn changeset publish
```
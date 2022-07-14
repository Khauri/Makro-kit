## Query

A query client using `@tanstack/react-query` (formally `react-query@4.0.0-beta.23`).

## Instructions

In a nutshell you use the component like this:

```marko
import { getTodos, postTodo } from './_api'

<query-client-config>
  <query-client/queryClient />
  <query/query=getTodos keys=['todos']  />
  <mutation/mutation=postTodo onSuccess(){queryClient().invalidateQueries(['todos'])}/>

  <div>
    <ul>
      <if=query.data>
        <for|todo| of=query.data by=(todo => todo.id)>
          <li>${todo.title}</li>
        </for>
      </if>
    </ul>

    <button
      onClick=() => {
        mutation.mutate({
          id: Date.now(),
          title: 'Do Laundry',
        })
      }
    >
      Add Todo
    </button>
  </div>
</query-client-config>
```

This pretty much encapsulates the functionality of the component.

### query tag

The `<query>` tag accepts a default argument of a query function and returns information about the current state of the query.
This can return any object however you may 

### mutate tag

The `<mutate>` tag allows you to perform mutations.
Mutations may return data and that data can be used to update the UI.
Or alternatively you can call `queryClient.invalidateQuery` to trigger certain queries to refresh.

### query client config

The `<query-client-config>` tag allows you to configure a query client and pass data into it.

### query client

The `<query-client>` returns a function that returns an instance of QueryClient. This is useful for performing actions such as invalidating queries.

## TODO

- External query cache sync
- Marko 5 support?
- The rest of the react-query api (ie InfiniteQuery, isFetching, isMutating, isRestoring, etc)
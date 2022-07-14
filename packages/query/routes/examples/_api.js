let todos = [];

export async function postTodo(todo) {
  todos = [...todos, todo];
  return todos;
}

export async function getTodos() {
  return todos;
}
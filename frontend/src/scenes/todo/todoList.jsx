import SectionQuickAdd from "../../components/SectionQuickAdd";

// Quick-add page for Todo Task, reached from the bottom-nav "+" button
// (see scenes/global/BottomNav.jsx) at /todo-task/new. All the actual
// form logic (fields, validation, submit) lives in the generic
// SectionForm/SectionQuickAdd pair, driven by the `todo_task` entry in
// config/sectionFields.js — this file just wires that generic component
// to the todo_task section and sends the user back to the dashboard
// once the task is saved.
const TodoList = () => <SectionQuickAdd sectionKey="todo_task" redirectTo="/" />;

export default TodoList;
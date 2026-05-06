export type Priority = "high" | "medium" | "low" | "none";
export type Category = "work" | "personal" | "shopping" | "star" | "";
export type FilterType = "all" | "active" | "completed";
export type SortType = "manual" | "created" | "due" | "priority";

export interface Todo {
  id: string;
  title: string;
  note: string;
  done: boolean;
  priority: Priority;
  cat: Category;
  due: string | null;
  ord: number;
  createdAt: number;
}

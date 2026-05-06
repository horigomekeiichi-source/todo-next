"use client";

import {
  useState, useEffect, useRef,
  type DragEvent, type KeyboardEvent, type ChangeEvent,
} from "react";
import type { Todo, Priority, Category, FilterType, SortType } from "@/types/todo";

// ── Constants ────────────────────────────────────────────────
const SK = "todo_v3";

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

const CAT_INFO: Record<string, { label: string; color: string; bg: string }> = {
  work:     { label: "仕事",   color: "#6366f1", bg: "#eef2ff" },
  personal: { label: "個人",   color: "#16a34a", bg: "#f0fdf4" },
  shopping: { label: "買い物", color: "#d97706", bg: "#fffbeb" },
  star:     { label: "重要",   color: "#dc2626", bg: "#fef2f2" },
};

// ── Utilities ────────────────────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmtDue(s: string | null): { t: string; late: boolean } | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { t: `${Math.abs(diff)}日超過`, late: true };
  if (diff === 0) return { t: "今日", late: false };
  if (diff === 1) return { t: "明日", late: false };
  if (diff < 7)  return { t: `${diff}日後`, late: false };
  return { t: `${d.getMonth() + 1}/${d.getDate()}`, late: false };
}

// ── SVG Icons ────────────────────────────────────────────────
const Icons = {
  logo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  search: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  sun: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  edit: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  grip: (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7"  cy="5"  r="1.5"/><circle cx="7"  cy="10" r="1.5"/><circle cx="7"  cy="15" r="1.5"/>
      <circle cx="13" cy="5"  r="1.5"/><circle cx="13" cy="10" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
    </svg>
  ),
};

// ── TaskItem ─────────────────────────────────────────────────
interface TaskItemProps {
  todo: Todo;
  isEditing: boolean;
  editTitle: string;
  editNote: string;
  onEditTitleChange: (v: string) => void;
  onEditNoteChange: (v: string) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function TaskItem({
  todo, isEditing, editTitle, editNote,
  onEditTitleChange, onEditNoteChange,
  onToggle, onStartEdit, onCommitEdit, onCancelEdit, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
  isDragging, isDragOver,
}: TaskItemProps) {
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const due = fmtDue(todo.due);
  const cat = todo.cat ? CAT_INFO[todo.cat] : null;

  const cls = [
    "task",
    todo.done   ? "done"      : "",
    isEditing   ? "editing"   : "",
    isDragging  ? "dragging"  : "",
    isDragOver  ? "drag-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={`pstripe ps-${todo.priority}`} />
      <div className="grip">{Icons.grip}</div>
      <div className="chk" onClick={onToggle}><div className="chk-mark" /></div>

      <div className="task-body" onDoubleClick={() => !isEditing && onStartEdit()}>
        {isEditing ? (
          <>
            <input
              ref={editInputRef}
              className="et"
              value={editTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onEditTitleChange(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) onCommitEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={() => setTimeout(onCommitEdit, 160)}
            />
            <textarea
              className="en"
              rows={2}
              placeholder="メモ"
              value={editNote}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onEditNoteChange(e.target.value)}
            />
          </>
        ) : (
          <>
            <div className="task-title-row">
              <span className="task-title">{todo.title}</span>
              {cat && (
                <span className="cat-tag" style={{ background: cat.bg, color: cat.color }}>
                  {cat.label}
                </span>
              )}
            </div>
            <div className="task-sub">
              {todo.note && <span className="task-note">{todo.note}</span>}
              {due && (
                <span className={`task-due${due.late ? " late" : ""}`}>📅 {due.t}</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="task-acts">
        {isEditing ? (
          <>
            <button className="ib ok" onClick={onCommitEdit} title="保存">{Icons.check}</button>
            <button className="ib"    onClick={onCancelEdit} title="キャンセル">{Icons.x}</button>
          </>
        ) : (
          <>
            <button className="ib"    onClick={onStartEdit} title="編集">{Icons.edit}</button>
            <button className="ib rm" onClick={onDelete}    title="削除">{Icons.trash}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── TodoApp (main) ───────────────────────────────────────────
export default function TodoApp() {
  const [todos,     setTodos]     = useState<Todo[]>([]);
  const [filter,    setFilter]    = useState<FilterType>("all");
  const [catFilter, setCatFilter] = useState<Category>("");
  const [sortBy,    setSortBy]    = useState<SortType>("manual");
  const [search,    setSearch]    = useState("");
  const [theme,     setTheme]     = useState<"light" | "dark">("light");

  // add-form fields
  const [addTitle, setAddTitle] = useState("");
  const [addNote,  setAddNote]  = useState("");
  const [addCat,   setAddCat]   = useState<Category>("");
  const [addPrio,  setAddPrio]  = useState<Priority>("none");
  const [addDue,   setAddDue]   = useState("");

  // edit state – ref mirrors state to fix onBlur/setTimeout stale-closure issue
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote,  setEditNote]  = useState("");
  const editIdRef = useRef<string | null>(null);

  // drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef   = useRef<string | null>(null);
  const orderCtrRef = useRef(0);
  const addTitleRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(SK) || "null");
      if (d) {
        setTodos(d.todos || []);
        setTheme(d.theme || "light");
        orderCtrRef.current =
          (d.todos || []).reduce((m: number, t: Todo) => Math.max(m, t.ord ?? 0), -1) + 1;
      }
    } catch { /* ignore */ }
    addTitleRef.current?.focus();
  }, []);

  // ── Persist ───────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(SK, JSON.stringify({ todos, theme }));
  }, [todos, theme]);

  // ── Theme ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // ── Add ───────────────────────────────────────────────────
  function addTodo() {
    const title = addTitle.trim();
    if (!title) { addTitleRef.current?.focus(); return; }
    const t: Todo = {
      id: uid(), title,
      note: addNote.trim(),
      done: false,
      priority: addPrio,
      cat: addCat,
      due: addDue || null,
      ord: orderCtrRef.current++,
      createdAt: Date.now(),
    };
    setTodos(prev => [t, ...prev]);
    setAddTitle(""); setAddNote(""); setAddDue("");
    setAddPrio("none"); setAddCat("");
    addTitleRef.current?.focus();
  }

  // ── Toggle / Delete ───────────────────────────────────────
  function toggle(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (editIdRef.current === id) { editIdRef.current = null; setEditId(null); }
  }

  // ── Edit ──────────────────────────────────────────────────
  function startEdit(todo: Todo) {
    editIdRef.current = todo.id;
    setEditId(todo.id);
    setEditTitle(todo.title);
    setEditNote(todo.note);
  }

  function commitEdit() {
    const id = editIdRef.current;
    if (!id) return;
    const title = editTitle.trim();
    if (title) {
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, title, note: editNote.trim() } : t)
      );
    }
    editIdRef.current = null;
    setEditId(null);
  }

  function cancelEdit() {
    editIdRef.current = null;
    setEditId(null);
  }

  // ── Clear completed ───────────────────────────────────────
  function clearDone() {
    setTodos(prev => prev.filter(t => !t.done));
  }

  // ── Drag & Drop ───────────────────────────────────────────
  function handleDragStart(e: DragEvent, id: string) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => setDraggingId(id), 0);
  }

  function handleDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (id !== dragIdRef.current) setDragOverId(id);
  }

  function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverId(null);
    setDraggingId(null);
    const fromId = dragIdRef.current;
    dragIdRef.current = null;
    if (!fromId || fromId === targetId) return;
    setTodos(prev => {
      const next = [...prev];
      const si = next.findIndex(t => t.id === fromId);
      const ti = next.findIndex(t => t.id === targetId);
      if (si < 0 || ti < 0) return prev;
      const [moved] = next.splice(si, 1);
      next.splice(ti, 0, moved);
      next.forEach((t, i) => { t.ord = i; });
      orderCtrRef.current = next.length;
      return next;
    });
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    dragIdRef.current = null;
  }

  // ── Filtered & Sorted list ────────────────────────────────
  const filteredList = (() => {
    const q = search.trim().toLowerCase();
    let list = todos;
    if (catFilter)             list = list.filter(t => t.cat === catFilter);
    if (filter === "active")   list = list.filter(t => !t.done);
    if (filter === "completed") list = list.filter(t => t.done);
    if (q) list = list.filter(t =>
      t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === "due") {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1; if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      }
      if (sortBy === "created") return b.createdAt - a.createdAt;
      return (a.ord ?? 0) - (b.ord ?? 0);
    });
  })();

  const total  = todos.length;
  const done   = todos.filter(t => t.done).length;
  const remain = total - done;
  const pct    = total ? Math.round(done / total * 100) : 0;

  const EMPTY: Record<FilterType, [string, string]> = {
    all:       ["✅", search ? `「${search}」に一致するタスクはありません` : "タスクはありません"],
    active:    ["🎉", "未完了タスクはありません！"],
    completed: ["📭", "完了済みタスクはありません"],
  };

  const CATS: { c: Category; label: string; color?: string }[] = [
    { c: "",         label: "すべて" },
    { c: "work",     label: "仕事",   color: "#6366f1" },
    { c: "personal", label: "個人",   color: "#22c55e" },
    { c: "shopping", label: "買い物", color: "#f59e0b" },
    { c: "star",     label: "重要",   color: "#ef4444" },
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {/* Top Bar */}
      <header className="topbar">
        <div className="logo">{Icons.logo} TODO</div>

        <div className="search-box">
          {Icons.search}
          <input
            className="search-input"
            type="text"
            placeholder="検索..."
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="topbar-right">
          <div className="progress-pill">
            <div className="pill-track">
              <div className="pill-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="pill-label"><strong>{done}</strong> / {total}</span>
          </div>
          <button className="icon-btn-sm" onClick={toggleTheme} title="ダーク / ライト">
            {theme === "dark" ? Icons.moon : Icons.sun}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Add Card */}
        <div className="add-card">
          <div className="add-main">
            <span className="add-icon">{Icons.plus}</span>
            <input
              ref={addTitleRef}
              className="add-title-input"
              type="text"
              placeholder="新しいタスクを追加... (Enter)"
              autoComplete="off"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) addTodo();
              }}
            />
            <button className="btn-add" onClick={addTodo}>追加</button>
          </div>
          <div className="add-sep" />
          <div className="add-meta">
            <select className="sel" value={addCat} onChange={e => setAddCat(e.target.value as Category)}>
              <option value="">カテゴリなし</option>
              <option value="work">📝 仕事</option>
              <option value="personal">🏠 個人</option>
              <option value="shopping">🛒 買い物</option>
              <option value="star">⭐ 重要</option>
            </select>
            <select className="sel" value={addPrio} onChange={e => setAddPrio(e.target.value as Priority)}>
              <option value="none">優先度なし</option>
              <option value="high">🔴 高</option>
              <option value="medium">🟡 中</option>
              <option value="low">🟢 低</option>
            </select>
            <input className="date-in" type="date" value={addDue} onChange={e => setAddDue(e.target.value)} />
            <input className="note-in" type="text" placeholder="メモ（任意）" value={addNote} onChange={e => setAddNote(e.target.value)} />
          </div>
        </div>

        {/* Category Chips */}
        <div className="cat-strip">
          {CATS.map(({ c, label, color }) => (
            <button
              key={c}
              className={`chip${catFilter === c ? " on" : ""}`}
              onClick={() => setCatFilter(c)}
            >
              {color && <span className="dot" style={{ background: color }} />}
              {label}
            </button>
          ))}
        </div>

        {/* Filter + Sort */}
        <div className="filter-bar">
          <div className="tabs">
            {(["all", "active", "completed"] as FilterType[]).map(f => (
              <button
                key={f}
                className={`tab${filter === f ? " on" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "すべて" : f === "active" ? "未完了" : "完了済み"}
              </button>
            ))}
          </div>
          <select className="sort-sel ml" value={sortBy} onChange={e => setSortBy(e.target.value as SortType)}>
            <option value="manual">手動順</option>
            <option value="created">作成日</option>
            <option value="due">期限日</option>
            <option value="priority">優先度</option>
          </select>
        </div>

        {/* Task List */}
        <div className="task-list">
          {filteredList.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">{EMPTY[filter][0]}</div>
              <p>{EMPTY[filter][1]}</p>
            </div>
          ) : (
            filteredList.map(todo => (
              <TaskItem
                key={todo.id}
                todo={todo}
                isEditing={editId === todo.id}
                editTitle={editTitle}
                editNote={editNote}
                onEditTitleChange={setEditTitle}
                onEditNoteChange={setEditNote}
                onToggle={() => toggle(todo.id)}
                onStartEdit={() => startEdit(todo)}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onDelete={() => remove(todo.id)}
                onDragStart={e => handleDragStart(e, todo.id)}
                onDragOver={e => handleDragOver(e, todo.id)}
                onDrop={e => handleDrop(e, todo.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggingId === todo.id}
                isDragOver={dragOverId === todo.id}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="foot">
          <span className="foot-count">{remain} 件残り · {filteredList.length} 件表示</span>
          <button className="btn-ghost" onClick={clearDone}>完了済みを削除</button>
        </div>
      </main>
    </>
  );
}

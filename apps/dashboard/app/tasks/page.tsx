"use client";
import React, { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status: "todo" | "in-progress" | "done";
  created_at?: number;
  updated_at?: number;
};

const PriorityColors: Record<string, string> = {
  Low: "bg-blue-900 text-blue-200",
  Medium: "bg-yellow-900 text-yellow-200",
  High: "bg-red-900 text-red-200",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDrop(status: Task["status"]) {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function allow(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle }),
    });
    if (res.ok) {
      setNewTaskTitle("");
      setShowNewForm(false);
      fetchTasks();
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setSelected(null);
    fetchTasks();
  }

  async function saveSelected(patch: Partial<Task>) {
    if (!selected) return;
    await fetch(`/api/tasks/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSelected(null);
    fetchTasks();
  }

  const columns: { key: Task["status"]; label: string; color: string }[] = [
    { key: "todo", label: "To Do", color: "bg-slate-800" },
    { key: "in-progress", label: "In Progress", color: "bg-slate-800" },
    { key: "done", label: "Done", color: "bg-slate-800" },
  ];

  const getTaskCount = (status: Task["status"]) =>
    tasks.filter((t) => t.status === status).length;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Tasks</h1>
          <p className="text-slate-400">Manage work across columns</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition"
        >
          + New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex flex-col rounded-lg border border-slate-700 overflow-hidden bg-slate-900"
          >
            {/* Column Header */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{col.label}</h3>
                <span className="bg-slate-700 text-xs px-2 py-1 rounded">
                  {getTaskCount(col.key)}
                </span>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={allow}
              onDrop={() => onDrop(col.key)}
              className="flex-1 p-3 space-y-3 bg-gradient-to-b from-slate-900 to-slate-950 min-h-[500px]"
            >
              {tasks
                .filter((t) => t.status === col.key)
                .map((t) => {
                  const priority = t.priority || "Medium";
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onClick={() => setSelected(t)}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 hover:bg-slate-750 transition group"
                    >
                      <div className="font-semibold text-sm text-white mb-2 break-words">
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-xs text-slate-400 mb-3 line-clamp-2">
                          {t.description}
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            PriorityColors[priority] || PriorityColors.Medium
                          }`}
                        >
                          {priority}
                        </span>
                        <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">
                          Edit
                        </span>
                      </div>
                    </div>
                  );
                })}
              {tasks.filter((t) => t.status === col.key).length === 0 && (
                <div className="text-slate-500 text-sm text-center py-12">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {showNewForm && (
        <div className="fixed left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <input
              autoFocus
              type="text"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {selected && (
        <div
          className="fixed left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  defaultValue={selected.title}
                  id="task-title"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  defaultValue={selected.description}
                  id="task-desc"
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Priority
                </label>
                <select
                  defaultValue={selected.priority || "Medium"}
                  id="task-priority"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                <button
                  onClick={() => deleteTask(selected.id)}
                  className="px-4 py-2 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-300 transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const title = (
                      document.getElementById("task-title") as HTMLInputElement
                    ).value;
                    const desc = (
                      document.getElementById(
                        "task-desc",
                      ) as HTMLTextAreaElement
                    ).value;
                    const priority = (
                      document.getElementById(
                        "task-priority",
                      ) as HTMLSelectElement
                    ).value;
                    await saveSelected({ title, description: desc, priority });
                  }}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

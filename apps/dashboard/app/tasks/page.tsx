"use client";
import React, { useState, useEffect } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          setTasks(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
        <p className="text-zinc-500">Manage security remediation tasks</p>
      </div>

      {/* Kanban Board */}
      <div className="grid md:grid-cols-3 gap-6">
        <TaskColumn
          title="To Do"
          tasks={todoTasks}
          count={todoTasks.length}
          color="zinc"
          delay={75}
        />
        <TaskColumn
          title="In Progress"
          tasks={inProgressTasks}
          count={inProgressTasks.length}
          color="blue"
          delay={150}
        />
        <TaskColumn
          title="Done"
          tasks={doneTasks}
          count={doneTasks.length}
          color="emerald"
          delay={225}
        />
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  count,
  color,
  delay,
}: {
  title: string;
  tasks: Task[];
  count: number;
  color: string;
  delay: number;
}) {
  const colors: Record<string, { bg: string; border: string; dot: string }> = {
    zinc: {
      bg: "var(--color-bg-secondary)",
      border: "var(--color-border)",
      dot: "#71717a",
    },
    blue: {
      bg: "var(--color-bg-secondary)",
      border: "var(--color-border)",
      dot: "#3b82f6",
    },
    emerald: {
      bg: "var(--color-bg-secondary)",
      border: "var(--color-border)",
      dot: "#22c55e",
    },
  };

  const c = colors[color] || colors.zinc;

  return (
    <div
      className="rounded-xl border opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "var(--color-border-muted)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: c.dot }}
          />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-xs font-medium"
          style={{ backgroundColor: `${c.dot}20`, color: c.dot }}
        >
          {count}
        </span>
      </div>

      <div className="p-3 space-y-3 min-h-[200px]">
        {tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} delay={delay + i * 50} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">No tasks</div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, delay }: { task: Task; delay: number }) {
  const priorityColors: Record<string, { color: string; bg: string }> = {
    critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
    high: { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
    medium: { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
    low: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  };

  const pc = priorityColors[task.priority] || priorityColors.low;

  return (
    <div
      className="rounded-lg border p-4 card-hover cursor-pointer opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        borderColor: "var(--color-border)",
        borderLeftWidth: "3px",
        borderLeftColor: pc.color,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-zinc-200">{task.title}</h4>
      </div>
      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
        {task.description}
      </p>
      <div className="flex items-center justify-between">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium capitalize"
          style={{ backgroundColor: pc.bg, color: pc.color }}
        >
          {task.priority}
        </span>
        <span className="text-xs text-zinc-600">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

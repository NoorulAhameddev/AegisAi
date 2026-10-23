/**
 * Project Selector Component
 * Dropdown to select/create projects for document organization
 */

"use client";

import { useState, useEffect } from "react";
import { FolderIcon, PlusIcon, XIcon } from "lucide-react";
import { logger } from "@/lib/logger";

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onSelectProject: (projectId: string | undefined) => void;
}

export default function ProjectSelector({
  selectedProjectId,
  onSelectProject,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      logger.error("Failed to fetch projects:", error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects([...projects, data.project]);
        onSelectProject(data.project.id);
        setShowCreateForm(false);
        setNewProjectName("");
        setNewProjectDescription("");
      }
    } catch (error) {
      logger.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-ink-900 border border-hair hover:bg-ink-800 transition-colors"
      >
        <FolderIcon size={18} />
        <span>{selectedProject ? selectedProject.name : "All Documents"}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-ink-900 border border-hair z-50">
          <div className="p-2 border-b border-hair">
            <button
              onClick={() => {
                onSelectProject(undefined);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-ink-800"
            >
              All Documents
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-ink-800 ${
                  selectedProjectId === project.id
                    ? "bg-brand/15"
                    : ""
                }`}
              >
                <div className="font-medium">{project.name}</div>
                {project.description && (
                  <div className="text-sm text-ink-500 truncate">
                    {project.description}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-hair">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-brand hover:bg-ink-800"
              >
                <PlusIcon size={18} />
                New Project
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-hair bg-ink-950 text-ink-100 text-sm"
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-hair bg-ink-950 text-ink-100 text-sm resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createProject}
                    disabled={loading || !newProjectName.trim()}
                    className="flex-1 px-3 py-2 bg-brand text-ink-950 hover:bg-brand-dim disabled:opacity-50 font-medium"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName("");
                      setNewProjectDescription("");
                    }}
                    className="px-3 py-2 border border-hair hover:bg-ink-800"
                    title="Close form"
                    aria-label="Close form"
                  >
                    <XIcon size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

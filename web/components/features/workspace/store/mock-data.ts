/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

// Legacy transitional store:
// keep existing screens working, but avoid adding new product behavior here.

// --- Advanced Kanban Types ---

export interface CustomFieldConfig {
  id: string;
  projectId: string;
  name: string;
  type: "text" | "number" | "select" | "multi-select" | "date" | "person";
  options?: string[];
}

export interface TaskFieldValue {
  fieldId: string;
  value: any;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export type TaskStatus = string;

export interface Priority {
  id: string;
  name: string;
  color: string; // TailWind Class or Hex
  order: number;
}

export interface Task {
  id: string;
  projectId: string;
  columnId?: string; // Added for Kanban
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  assigneeId?: string | null;
  assigneeProfile?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  priorityId?: string;
  dueDate?: string;
  docRef?: string;
  customFieldValues: TaskFieldValue[];
  comments: Comment[];
  history: ActivityLog[];
  tags?: string[];
  subtasks?: { id: string; title: string; completed: boolean }[];
  order?: number; // Added for ordering
}
// ...

// --- Chat & System Messages (New) ---

export interface ChannelMessage {
  id: string;
  channelId: string; // 'general', 'dev', etc.
  senderId: string; // 'system' for automated messages
  type: "user" | "system";
  content: string;
  timestamp: string;
  metadata?: any; // For rich links (e.g., { linkType: 'task', linkId: 't-1' })
}

// --- Personal Zone Types ---

export interface Notification {
  id: string;
  userId: string;
  type: "mention" | "assignment" | "update";
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface PrivateDoc {
  id: string;
  userId: string;
  title: string;
  content: any[];
  updatedAt: string;
}

// --- Basic Project Types ---

export type ProjectType = "hackathon" | "study" | "side-project";
export type ProjectStatus = "live" | "completed" | "archived";

export interface ProjectMember {
  id: string;
  name: string;
  avatar: string;
  role: "leader" | "member" | "viewer";
  online: boolean;
}

// --- Board View Types (New) ---

export interface ViewColumn {
  id: string; // Unique ID for the column in this view
  title: string; // Display title
  statusId: string; // Maps to Task.status
  color?: string;
  category?: "todo" | "in-progress" | "done"; // View System 3.0: Strict Status Categorization
}

export interface BoardView {
  id: string;
  projectId: string;
  name: string;
  type: "kanban" | "list" | "calendar";
  groupBy: "status" | "assignee" | "priority" | "dueDate" | "tag";
  icon?: string;
  color?: string;
  columns: ViewColumn[]; // Only relevant if groupBy === 'status'
  cardProperties?: string[]; // Order of visible properties e.g. ['badges', 'title', 'tags', 'assignee', 'dueDate']
  filter?: {
    tags?: string[];
    assignee?: string[];
    hiddenColumns?: string[];
    hiddenStatusCategories?: Array<"todo" | "in-progress" | "done">;
  };
  isSystem?: boolean;
  showEmptyGroups?: boolean;
  columnOrder?: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  lastActive: string;
  members: ProjectMember[];
  dDay?: string;
  externalLink?: { title: string; url: string };
  customFields: CustomFieldConfig[];
  // columns: { id: string; title: string }[]; // DEPRECATED -> moved to BoardView
  views: BoardView[];
}

export interface Doc {
  id: string;
  projectId: string;
  title: string;
  content: any[];
  linkedTaskIds?: string[];
  updatedAt: string;
}

// --- Mock Data ---

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p-2",
    title: "Dibut 사이드 프로젝트",
    description: "개발자 커리어 플랫폼 클론 코딩",
    type: "side-project",
    status: "live",
    lastActive: "방금 전",
    members: [
      { id: "u1", name: "Junghwan", avatar: "J", role: "leader", online: true },
      { id: "u2", name: "Frontend", avatar: "F", role: "member", online: false },
    ],
    customFields: [],
    views: [
      {
        id: "v-2",
        projectId: "p-2",
        name: "Task Board",
        type: "kanban",
        groupBy: "status",
        columns: [
          { id: "col-1", title: "To Do", statusId: "todo", category: "todo" },
          { id: "col-2", title: "In Progress", statusId: "in-progress", category: "in-progress" },
          { id: "col-3", title: "Done", statusId: "done", category: "done" },
        ],
        isSystem: true,
      },
      {
        id: "v-2-team",
        projectId: "p-2",
        name: "Team View",
        type: "kanban",
        groupBy: "assignee",
        columns: [],
        isSystem: true,
      },
      {
        id: "v-2-priority",
        projectId: "p-2",
        name: "Priority View",
        type: "kanban",
        groupBy: "priority",
        columns: [],
        isSystem: true,
      },
      {
        id: "v-2-tag",
        projectId: "p-2",
        name: "Tag View",
        type: "kanban",
        groupBy: "tag",
        columns: [],
        isSystem: true,
      },
    ],
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: "t-demo-1",
    projectId: "p-2",
    title: "프로젝트 구조 정리",
    status: "in-progress",
    assignee: "Junghwan",
    dueDate: "2026-03-01",
    customFieldValues: [],
    comments: [],
    history: [],
    tags: ["tag-2"],
    priorityId: "high",
  },
  {
    id: "t-demo-2",
    projectId: "p-2",
    title: "워크스페이스 대시보드 개선",
    status: "todo",
    assignee: "Frontend",
    dueDate: "2026-03-05",
    customFieldValues: [],
    comments: [],
    history: [],
    tags: ["tag-3"],
    priorityId: "medium",
  },
];

export const INITIAL_DOCS: Doc[] = [
  {
    id: "d-demo-1",
    projectId: "p-2",
    title: "프로젝트 개요",
    updatedAt: "2026-02-26",
    content: [
      { type: "heading", content: "Dibut Workspace" },
      { type: "paragraph", content: "실시간 협업 문서입니다." },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const INITIAL_PRIVATE_DOCS: PrivateDoc[] = [];

export const INITIAL_MESSAGES: ChannelMessage[] = [];

// --- Template Generators ---

export const generateTemplates = (projectId: string): Doc[] => [
  {
    id: `d-${Date.now()}-1`,
    projectId,
    title: "📝 Product Requirements Document (PRD)",
    updatedAt: new Date().toISOString(),
    content: [
      { type: "heading", content: "Product Requirements Document" },
      { type: "paragraph", content: "프로젝트의 핵심 목표와 기능을 정리하세요." },
    ],
  },
  {
    id: `d-${Date.now()}-2`,
    projectId,
    title: "📅 Project Roadmap",
    updatedAt: new Date().toISOString(),
    content: [
      { type: "heading", content: "Project Roadmap" },
      { type: "paragraph", content: "주차별 목표와 마일스톤을 작성하세요." },
    ],
  },
];

// --- Store ---

export interface Tag {
  id: string;
  name: string;
  color: string; // Hex or Tailwind class
}

// Base colors for tags
export const INITIAL_TAGS: Tag[] = [
  { id: "tag-1", name: "긴급", color: "red" },
  { id: "tag-2", name: "디자인", color: "purple" },
  { id: "tag-3", name: "버그", color: "orange" },
];

export const INITIAL_PRIORITIES: Priority[] = [
  {
    id: "urgent",
    name: "긴급",
    color: "bg-red-100 text-red-700 hover:bg-red-200",
    order: 0,
  },
  {
    id: "high",
    name: "높음",
    color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    order: 1,
  },
  {
    id: "medium",
    name: "중간",
    color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    order: 2,
  },
  {
    id: "low",
    name: "낮음",
    color: "bg-green-100 text-green-700 hover:bg-green-200",
    order: 3,
  },
];

export interface WorkspaceStore {
  projects: Project[];
  tasks: Task[];
  docs: Doc[];
  notifications: Notification[];
  privateDocs: PrivateDoc[];
  messages: ChannelMessage[];
  tags: Tag[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  // Actions
  createProject: (
    project: Omit<Project, "id" | "lastActive" | "customFields" | "views">,
  ) => void;
  syncProjectData: (
    projectId: string,
    data: {
      columns?: any[];
      tasks?: any[];
      members?: any[];
      views?: any[];
      tags?: any[];
    },
  ) => void;

  // Task Actions (with Side-Effects)
  createTask: (
    task: Omit<Task, "id" | "comments" | "history" | "subtasks">,
  ) => string | null;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addComment: (taskId: string, content: string) => void;

  // Doc Actions
  createDoc: (doc: Omit<Doc, "id" | "updatedAt">) => void;
  updateDoc: (docId: string, content: any[]) => void;

  // Notification Actions
  markNotificationRead: (id: string) => void;
  addNotification: (
    noti: Omit<Notification, "id" | "timestamp" | "read">,
  ) => void;

  // Chat Actions
  sendMessage: (
    channelId: string,
    content: string,
    senderId?: string,
    type?: "user" | "system",
  ) => void;

  // Tag Actions
  createTag: (name: string, color: string) => void;
  deleteTag: (tagId: string) => void;
  updateTag: (tagId: string, updates: Partial<Tag>) => void;
  reorderTags: (newOrder: Tag[]) => void;

  // Priority Actions
  priorities: Priority[];
  createPriority: (name: string, color: string) => void;
  deletePriority: (priorityId: string) => void;
  updatePriority: (priorityId: string, updates: Partial<Priority>) => void;
  reorderPriorities: (newOrder: Priority[]) => void;

  // View & Column Actions
  addView: (projectId: string, view: BoardView) => void;
  updateView: (
    projectId: string,
    viewId: string,
    updates: Partial<BoardView>,
  ) => void;
  deleteView: (projectId: string, viewId: string) => void;
  addColumnToView: (
    projectId: string,
    viewId: string,
    title: string,
    category?: "todo" | "in-progress" | "done",
  ) => void;
  updateColumnInView: (
    viewId: string,
    columnId: string,
    updates: { title?: string; color?: string },
  ) => void;
  deleteColumnFromView: (viewId: string, columnId: string) => void;
  renameColumnInView: (
    viewId: string,
    columnId: string,
    newTitle: string,
  ) => void;
  moveColumnInView: (
    viewId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  updateViewCardProperties: (viewId: string, properties: string[]) => void;

  addTagToTask: (taskId: string, tagId: string) => void;
  removeTagFromTask: (taskId: string, tagId: string) => void;
  deleteTask: (taskId: string) => void;
  reorderTask: (
    taskId: string,
    newStatus: TaskStatus,
    newIndex: number,
  ) => void;

  addSubTask: (taskId: string, title: string) => void;
  toggleSubTask: (taskId: string, subtaskId: string) => void;

  // New: Active Document Selection
  activeDocId: string | null;
  setActiveDocId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  projects: MOCK_PROJECTS,
  tasks: INITIAL_TASKS,
  docs: INITIAL_DOCS,
  notifications: INITIAL_NOTIFICATIONS,
  privateDocs: INITIAL_PRIVATE_DOCS,
  messages: INITIAL_MESSAGES,
  tags: INITIAL_TAGS,
  priorities: INITIAL_PRIORITIES,
  activeTaskId: null,
  activeDocId: null, // Start with no doc selected

  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setActiveDocId: (id) => set({ activeDocId: id }),

  syncProjectData: (projectId, data) =>
    set((state) => {
      // 1. Ensure Project Exists (Virtual or Real)
      const existingProject = state.projects.find((p) => p.id === projectId);
      let updatedProjects = state.projects;

      if (!existingProject) {
        // Create a shell project if not found (will be populated below)
        updatedProjects = [
          ...state.projects,
          {
            id: projectId,
            title: "Loaded Project",
            description: "",
            type: "side-project",
            status: "live",
            lastActive: "Now",
            members: [],
            customFields: [],
            views: [],
          },
        ];
      }

      // 2. Update Project Data
      updatedProjects = updatedProjects.map((p) => {
        if (p.id !== projectId) return p;

        // Merge Views
        let mergedViews = p.views;
        if (data.views && data.views.length > 0) {
          // If server provides views, use them (or merge if we want to keep local state?)
          // For now, overwrite to ensure server sync
          mergedViews = data.views.map((v: any) => {
            // Ensure columns are attached to view if 'status' mode
            // Fix: Check for empty array as well
            if (
              v.groupBy === "status" &&
              (!v.columns || v.columns.length === 0) &&
              data.columns
            ) {
              return { ...v, columns: data.columns };
            }
            return v;
          });
        } else if (data.columns) {
          // If no views provided (legacy), create default view with columns
          if (mergedViews.length === 0) {
            mergedViews = [
              {
                id: "view-default",
                projectId,
                name: "메인 보드",
                type: "kanban",
                groupBy: "status",
                columns: data.columns,
                isSystem: true,
              },
            ];
          } else {
            // Update existing default view
            mergedViews = mergedViews.map((v) =>
              v.groupBy === "status" ? { ...v, columns: (data.columns ?? []) as ViewColumn[] } : v,
            );
          }
        }

        return {
          ...p,
          members: data.members || p.members,
          views: mergedViews,
        };
      });

      // 3. Update Tasks (Filter out old tasks for this project, add new ones)
      let updatedTasks = state.tasks;
      if (data.tasks) {
        // Inject projectId and ensure fields
        const newTasks = data.tasks.map((t: any) => ({
          ...t,
          projectId: projectId,
          // Ensure required fields if missing from API partial
          customFieldValues: t.customFieldValues || [],
          comments: t.comments || [],
          history: t.history || [],
          columnId: t.columnId, // Map API columnId
        }));

        updatedTasks = [
          ...state.tasks.filter((t) => t.projectId !== projectId),
          ...newTasks,
        ];
      }

      // 4. Update Tags
      // Note: Global tags vs Project tags? Currently tags have workspace_id.
      // If we assume global tags list, we might append or replace.
      // Let's replace for now if provided.
      let updatedTags = state.tags;
      if (data.tags) {
        updatedTags = data.tags;
      }

      return {
        projects: updatedProjects,
        tasks: updatedTasks,
        tags: updatedTags,
      };
    }),

  // ... (Full implementation of actions would go here, copying generic logic from previous version)
  // Re-implementing actions to match the interface:

  createProject: (projectData) =>
    set((state) => ({
      projects: [
        ...state.projects,
        {
          ...projectData,
          id: `p-${Date.now()}`,
          lastActive: "Just now",
          customFields: [],
          views: [
            {
              id: `v-${Date.now()}`,
              projectId: `p-${Date.now()}`, // Note: this ID logic is slightly flawed in mock but ok for demo
              name: "Main Board",
              type: "kanban",
              groupBy: "status",
              columns: [
                {
                  id: "col-1",
                  title: "To Do",
                  statusId: "todo",
                  category: "todo",
                },
                {
                  id: "col-2",
                  title: "In Progress",
                  statusId: "in-progress",
                  category: "in-progress",
                },
                {
                  id: "col-3",
                  title: "Done",
                  statusId: "done",
                  category: "done",
                },
              ],
              isSystem: true,
            },
            {
              id: `v-${Date.now()}-team`,
              projectId: `p-${Date.now()}`,
              name: "Team View",
              type: "kanban",
              groupBy: "assignee",
              color: "green",
              icon: "👥",
              columns: [],
              isSystem: true,
            },
            {
              id: `v-${Date.now()}-priority`,
              projectId: `p-${Date.now()}`,
              name: "Priority View",
              type: "kanban",
              groupBy: "priority",
              color: "red",
              icon: "🚨",
              columns: [],
              isSystem: true,
            },
            {
              id: `v-${Date.now()}-tag`,
              projectId: `p-${Date.now()}`,
              name: "Tag View",
              type: "kanban",
              groupBy: "tag",
              color: "yellow",
              icon: "🏷️",
              columns: [],
              isSystem: true,
            },
          ],
        },
      ],
    })),

  createTask: (taskData) => {
    const newId = `t-${Date.now()}`;
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...taskData,
          id: newId,
          comments: [],
          history: [],
          subtasks: [],
        },
      ],
    }));
    return newId;
  },

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    })),

  addComment: (taskId, content) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: [
                ...t.comments,
                {
                  id: `c-${Date.now()}`,
                  authorId: "u1", // Default current user
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t,
      ),
    })),

  createDoc: (docData) =>
    set((state) => ({
      docs: [
        ...state.docs,
        {
          ...docData,
          id: `d-${Date.now()}`,
          updatedAt: "Just now",
        },
      ],
    })),

  updateDoc: (docId, content) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.id === docId ? { ...d, content, updatedAt: "Just now" } : d,
      ),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  addNotification: (noti) =>
    set((state) => ({
      notifications: [
        { ...noti, id: `n-${Date.now()}`, timestamp: "Just now", read: false },
        ...state.notifications,
      ],
    })),

  sendMessage: (channelId, content, senderId = "u1", type = "user") =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `m-${Date.now()}`,
          channelId,
          content,
          senderId,
          type,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    })),

  // Tag Actions
  createTag: (name, color) =>
    set((state) => ({
      tags: [...state.tags, { id: `tag-${Date.now()}`, name, color }],
    })),

  deleteTag: (tagId) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== tagId),
      tasks: state.tasks.map((t) => ({
        ...t,
        tags: t.tags?.filter((id) => id !== tagId),
      })),
    })),

  updateTag: (tagId, updates) =>
    set((state) => ({
      tags: state.tags.map((t) => (t.id === tagId ? { ...t, ...updates } : t)),
    })),

  reorderTags: (newOrder) => set({ tags: newOrder }),

  // Priority Actions (Implementation)
  createPriority: (name, color) =>
    set((state) => ({
      priorities: [
        ...state.priorities,
        { id: `p-${Date.now()}`, name, color, order: state.priorities.length },
      ],
    })),

  deletePriority: (priorityId) =>
    set((state) => ({
      priorities: state.priorities.filter((p) => p.id !== priorityId),
      tasks: state.tasks.map((t) =>
        t.priorityId === priorityId ? { ...t, priorityId: undefined } : t,
      ),
    })),

  updatePriority: (priorityId, updates) =>
    set((state) => ({
      priorities: state.priorities.map((p) =>
        p.id === priorityId ? { ...p, ...updates } : p,
      ),
    })),

  reorderPriorities: (newOrder) => set({ priorities: newOrder }),

  // View Actions
  addView: (projectId, view) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, views: [...p.views, view] } : p,
      ),
    })),

  updateView: (projectId, viewId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              views: p.views.map((v) =>
                v.id === viewId ? { ...v, ...updates } : v,
              ),
            }
          : p,
      ),
    })),

  deleteView: (projectId, viewId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              views: p.views.filter((v) => v.id !== viewId),
            }
          : p,
      ),
    })),

  addColumnToView: (projectId, viewId, title, category = "todo") =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              views: p.views.map((v) =>
                v.id === viewId
                  ? {
                      ...v,
                      columns: [
                        ...v.columns,
                        {
                          id: `col-${Date.now()}`,
                          title: title || "New Column",
                          statusId: (title || "new-column")
                            .toLowerCase()
                            .replace(/\s+/g, "-"),
                          color:
                            category === "todo"
                              ? "bg-gray-500"
                              : category === "in-progress"
                                ? "bg-blue-500"
                                : "bg-green-500",
                          category,
                        },
                      ],
                    }
                  : v,
              ),
            }
          : p,
      ),
    })),

  updateColumnInView: (viewId, columnId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        views: p.views.map((v) =>
          v.id === viewId
            ? {
                ...v,
                columns: v.columns.map((c) =>
                  c.id === columnId ? { ...c, ...updates } : c,
                ),
              }
            : v,
        ),
      })),
    })),

  deleteColumnFromView: (viewId, columnId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        views: p.views.map((v) =>
          v.id === viewId
            ? {
                ...v,
                columns: v.columns.filter((c) => c.id !== columnId),
              }
            : v,
        ),
      })),
    })),

  renameColumnInView: (viewId, columnId, newTitle) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        views: p.views.map((v) =>
          v.id === viewId
            ? {
                ...v,
                columns: v.columns.map((c) =>
                  c.id === columnId ? { ...c, title: newTitle } : c,
                ),
              }
            : v,
        ),
      })),
    })),

  moveColumnInView: (viewId, fromIndex, toIndex) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        views: p.views.map((v) => {
          if (v.id !== viewId) return v;
          const newColumns = [...v.columns];
          const [movedColumn] = newColumns.splice(fromIndex, 1);
          newColumns.splice(toIndex, 0, movedColumn);
          return { ...v, columns: newColumns };
        }),
      })),
    })),

  updateViewCardProperties: (viewId, properties) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        views: p.views.map((v) =>
          v.id === viewId
            ? {
                ...v,
                cardProperties: properties,
              }
            : v,
        ),
      })),
    })),

  addTagToTask: (taskId, tagId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              tags: [...(t.tags || []), tagId],
            }
          : t,
      ),
    })),

  removeTagFromTask: (taskId, tagId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              tags: t.tags?.filter((id) => id !== tagId),
            }
          : t,
      ),
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  reorderTask: (taskId, newStatus, newIndex) =>
    set((state) => {
      // Simple reorder implementation mock
      // In a real app, this would recalculate orders
      void newIndex;
      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t,
        ),
      };
    }),

  addSubTask: (taskId, title) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...(t.subtasks || []),
                {
                  id: `st-${Date.now()}`,
                  title,
                  completed: false,
                },
              ],
            }
          : t,
      ),
    })),

  toggleSubTask: (taskId, subtaskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks?.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st,
              ),
            }
          : t,
      ),
    })),
}));

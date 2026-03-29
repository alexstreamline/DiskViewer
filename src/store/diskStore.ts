import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  DiskStats,
  FileFilter,
  FileNode,
  FlatFile,
  ScanProgress,
} from "../types";

const PER_PAGE = 100;

interface DiskStore {
  // Scan slice
  isScanning: boolean;
  progress: ScanProgress | null;
  error: string | null;

  // Data slice
  tree: FileNode | null;
  stats: DiskStats | null;
  scanPath: string | null;

  // UI slice
  currentPath: string | null;
  filter: FileFilter;
  sortBy: "size" | "name" | "modified";
  sortDesc: boolean;

  // Files slice
  files: FlatFile[];
  totalFiles: number;
  page: number;
  isLoadingFiles: boolean;

  // Actions
  startScan: () => Promise<void>;
  cancelScan: () => void;
  setCurrentPath: (path: string | null) => void;
  setFilter: (filter: Partial<FileFilter>) => void;
  resetFilter: () => void;
  setSortBy: (col: "size" | "name" | "modified", desc: boolean) => void;
  loadFiles: (page: number) => Promise<void>;
}

const emptyFilter: FileFilter = {};

export const useDiskStore = create<DiskStore>((set, get) => ({
  isScanning: false,
  progress: null,
  error: null,

  tree: null,
  stats: null,
  scanPath: null,

  currentPath: null,
  filter: emptyFilter,
  sortBy: "size",
  sortDesc: true,

  files: [],
  totalFiles: 0,
  page: 0,
  isLoadingFiles: false,

  startScan: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;

    set({
      isScanning: true,
      progress: null,
      error: null,
      tree: null,
      stats: null,
      scanPath: selected,
      currentPath: null,
      filter: emptyFilter,
      files: [],
      totalFiles: 0,
      page: 0,
    });

    let unlistenProgress: UnlistenFn | null = null;
    let unlistenComplete: UnlistenFn | null = null;
    let unlistenCancelled: UnlistenFn | null = null;

    try {
      unlistenProgress = await listen<ScanProgress>("scan_progress", (e) => {
        set({ progress: e.payload });
      });

      unlistenComplete = await listen("scan_complete", async () => {
        const [tree, stats] = await Promise.all([
          invoke<FileNode>("get_tree"),
          invoke<DiskStats>("get_stats"),
        ]);
        set({ tree, stats, isScanning: false, progress: null });
        await get().loadFiles(0);
      });

      unlistenCancelled = await listen("scan_cancelled", () => {
        set({ isScanning: false, progress: null });
      });

      await invoke("start_scan", { path: selected });
    } catch (e) {
      set({ isScanning: false, error: String(e) });
    } finally {
      unlistenProgress?.();
      unlistenComplete?.();
      unlistenCancelled?.();
    }
  },

  cancelScan: () => {
    invoke("cancel_scan");
  },

  setCurrentPath: (path) => {
    set({ currentPath: path });
  },

  setFilter: (partial) => {
    const filter = { ...get().filter, ...partial };
    // Remove undefined keys
    Object.keys(filter).forEach((k) => {
      if ((filter as Record<string, unknown>)[k] === undefined) {
        delete (filter as Record<string, unknown>)[k];
      }
    });
    set({ filter, files: [], page: 0 });
    get().loadFiles(0);
  },

  resetFilter: () => {
    set({ filter: emptyFilter, files: [], page: 0 });
    get().loadFiles(0);
  },

  setSortBy: (col, desc) => {
    set({ sortBy: col, sortDesc: desc, files: [], page: 0 });
    get().loadFiles(0);
  },

  loadFiles: async (page) => {
    const { filter, sortBy, sortDesc } = get();
    set({ isLoadingFiles: true });
    try {
      const [newFiles, total] = await invoke<[FlatFile[], number]>("get_files", {
        filter,
        page,
        perPage: PER_PAGE,
        sortBy,
        sortDesc,
      });
      set((s) => ({
        files: page === 0 ? newFiles : [...s.files, ...newFiles],
        totalFiles: total,
        page,
        isLoadingFiles: false,
      }));
    } catch (e) {
      set({ isLoadingFiles: false });
    }
  },
}));

// Selectors
export function useCurrentNode(): FileNode | null {
  const { tree, currentPath } = useDiskStore();
  if (!tree) return null;
  if (!currentPath) return tree;
  return findNode(tree, currentPath);
}

function findNode(node: FileNode, path: string): FileNode | null {
  if (node.path === path) return node;
  for (const child of node.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

export function useBreadcrumb(): FileNode[] {
  const { tree, currentPath } = useDiskStore();
  if (!tree) return [];
  if (!currentPath) return [tree];
  const crumbs: FileNode[] = [];
  buildCrumbs(tree, currentPath, crumbs);
  return crumbs;
}

function buildCrumbs(node: FileNode, targetPath: string, acc: FileNode[]): boolean {
  acc.push(node);
  if (node.path === targetPath) return true;
  for (const child of node.children) {
    if (buildCrumbs(child, targetPath, acc)) return true;
  }
  acc.pop();
  return false;
}

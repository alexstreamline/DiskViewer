import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  AgeBucket,
  DiskStats,
  DuplicateGroup,
  DuplicateProgress,
  FileFilter,
  FileNode,
  FlatFile,
  FolderScanComplete,
  FolderShallow,
  JunkItem,
  Screen,
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
  histogram: AgeBucket[];
  scanPath: string | null;

  // TopLevel slice — обновляется постепенно по событиям scan_folder_complete
  folders: Map<string, FolderShallow>;
  setFolderComplete: (data: FolderScanComplete) => void;

  // UI slice
  currentPath: string | null;
  activeScreen: Screen;
  theme: "light" | "dark";
  filter: FileFilter;
  sortBy: "size" | "name" | "modified";
  sortDesc: boolean;

  // Files slice
  files: FlatFile[];
  totalFiles: number;
  page: number;
  isLoadingFiles: boolean;

  // Duplicates slice
  groups: DuplicateGroup[];
  isSearchingDuplicates: boolean;
  dupProgress: DuplicateProgress | null;

  // Junk slice
  junkItems: JunkItem[];
  isDetectingJunk: boolean;
  selectedJunkPaths: Set<string>;

  // Actions
  startScan: () => Promise<void>;
  cancelScan: () => void;
  setCurrentPath: (path: string | null) => void;
  setActiveScreen: (screen: Screen) => void;
  setTheme: (theme: "light" | "dark") => void;
  setFilter: (filter: Partial<FileFilter>) => void;
  resetFilter: () => void;
  setSortBy: (col: "size" | "name" | "modified", desc: boolean) => void;
  loadFiles: (page: number) => Promise<void>;
  findDuplicates: () => Promise<void>;
  detectJunk: () => Promise<void>;
  toggleJunkPath: (path: string) => void;
  clearJunkSelection: () => void;
}

const emptyFilter: FileFilter = {};

export const useDiskStore = create<DiskStore>((set, get) => ({
  isScanning: false,
  progress: null,
  error: null,

  tree: null,
  stats: null,
  histogram: [],
  scanPath: null,

  folders: new Map(),
  setFolderComplete: (data) => {
    set((state) => {
      const folders = new Map(state.folders);
      const existing = folders.get(data.path);
      folders.set(data.path, {
        name: existing?.name ?? data.path.split(/[\\/]/).pop() ?? data.path,
        path: data.path,
        size: data.size,
        file_count: data.file_count,
        by_category: data.by_category,
        scan_state: "done",
      });
      return { folders };
    });
  },

  currentPath: null,
  activeScreen: "map",
  theme: "dark",
  filter: emptyFilter,
  sortBy: "size",
  sortDesc: true,

  files: [],
  totalFiles: 0,
  page: 0,
  isLoadingFiles: false,

  groups: [],
  isSearchingDuplicates: false,
  dupProgress: null,

  junkItems: [],
  isDetectingJunk: false,
  selectedJunkPaths: new Set(),

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
      histogram: [],
      scanPath: selected,
      currentPath: null,
      filter: emptyFilter,
      files: [],
      totalFiles: 0,
      page: 0,
      folders: new Map(),
      groups: [],
      junkItems: [],
    });

    // Фаза 0: мгновенно показываем папки верхнего уровня
    try {
      const topLevel = await invoke<FolderShallow[]>("scan_top_level_cmd", { path: selected });
      const folderMap = new Map(topLevel.map((f) => [f.path, f]));
      set({ folders: folderMap });
    } catch {
      // не критично — продолжаем сканирование
    }

    const unlisteners: UnlistenFn[] = [];

    try {
      // Подписываемся на обновления по папкам
      unlisteners.push(
        await listen<FolderScanComplete>("scan_folder_complete", (e) => {
          get().setFolderComplete(e.payload);
        })
      );

      unlisteners.push(
        await listen<ScanProgress>("scan_progress", (e) => {
          set({ progress: e.payload });
        })
      );

      // Фаза 1: полное сканирование
      await invoke("start_scan", { path: selected });

      const [tree, stats, histogram] = await Promise.all([
        invoke<FileNode>("get_tree"),
        invoke<DiskStats>("get_stats"),
        invoke<AgeBucket[]>("get_age_histogram"),
      ]);

      set({ tree, stats, histogram, isScanning: false, progress: null });
      await get().loadFiles(0);
    } catch (e) {
      set({ isScanning: false, error: String(e) });
    } finally {
      unlisteners.forEach((u) => u());
    }
  },

  cancelScan: () => {
    invoke("cancel_scan");
  },

  setCurrentPath: (path) => {
    set({ currentPath: path });
  },

  setActiveScreen: (screen) => {
    set({ activeScreen: screen });
  },

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
  },

  setFilter: (partial) => {
    const filter = { ...get().filter, ...partial };
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
    } catch {
      set({ isLoadingFiles: false });
    }
  },

  findDuplicates: async () => {
    set({ isSearchingDuplicates: true, dupProgress: null, groups: [] });

    const unlisteners: UnlistenFn[] = [];
    try {
      unlisteners.push(
        await listen<DuplicateProgress>("duplicate_progress", (e) => {
          set({ dupProgress: e.payload });
        })
      );
      const groups = await invoke<DuplicateGroup[]>("find_duplicates_cmd");
      set({ groups, isSearchingDuplicates: false, dupProgress: null });
    } catch (e) {
      set({ isSearchingDuplicates: false, error: String(e) });
    } finally {
      unlisteners.forEach((u) => u());
    }
  },

  detectJunk: async () => {
    set({ isDetectingJunk: true, junkItems: [] });
    try {
      const items = await invoke<JunkItem[]>("detect_junk_cmd");
      set({ junkItems: items, isDetectingJunk: false });
    } catch (e) {
      set({ isDetectingJunk: false, error: String(e) });
    }
  },

  toggleJunkPath: (path) => {
    set((state) => {
      const next = new Set(state.selectedJunkPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { selectedJunkPaths: next };
    });
  },

  clearJunkSelection: () => {
    set({ selectedJunkPaths: new Set() });
  },
}));

// ── Selectors ────────────────────────────────────────────────────

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

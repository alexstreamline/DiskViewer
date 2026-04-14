export type FileCategory =
  | "image" | "video" | "audio" | "document"
  | "code"  | "archive" | "executable" | "data" | "other";

export type FolderScanState = "pending" | "scanning" | "priority" | "done";

export type JunkCategory =
  | "temp_files" | "log_files" | "app_cache"
  | "node_modules" | "python_venv" | "orphaned_app"
  | "old_downloads" | "build_artifacts";

export type Screen = "map" | "analytics" | "files" | "duplicates" | "junk";

export interface CategorySize {
  category: FileCategory;
  size: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  last_modified: number;
  created_at: number;
  extension: string;
  category: FileCategory;
  children: FileNode[];
  depth: number;
  file_count: number;
  by_category: CategorySize[];
}

export interface FolderShallow {
  name: string;
  path: string;
  size: number | null;
  file_count: number | null;
  by_category: CategorySize[] | null;
  scan_state: FolderScanState;
}

export interface FolderScanComplete {
  path: string;
  size: number;
  file_count: number;
  by_category: CategorySize[];
}

export interface FlatFile {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  last_modified: number;
  created_at: number;
  extension: string;
  category: FileCategory;
}

export interface ScanProgress {
  files_scanned: number;
  bytes_scanned: number;
  current_path: string;
}

export interface AgeBucket {
  label: string;
  max_days: number;
  count: number;
  size: number;
}

export interface DiskStats {
  total_files: number;
  total_dirs: number;
  total_size: number;
  by_category: CategoryStat[];
  by_extension: ExtensionStat[];
  largest_files: FlatFile[];
  oldest_files: FlatFile[];
  newest_files: FlatFile[];
}

export interface CategoryStat {
  category: FileCategory;
  label: string;
  size: number;
  count: number;
}

export interface ExtensionStat {
  extension: string;
  size: number;
  count: number;
}

export interface DuplicateGroup {
  hash: string;
  file_size: number;
  savings: number;
  files: FlatFile[];
}

export interface DuplicateProgress {
  files_hashed: number;
  total_files: number;
  bytes_hashed: number;
}

export interface JunkItem {
  path: string;
  name: string;
  category: JunkCategory;
  size: number;
  confidence: number;
  is_safe: boolean;
  reason: string;
}

export interface FileFilter {
  category?: FileCategory;
  min_size?: number;
  max_size?: number;
  older_than_days?: number;
  newer_than_days?: number;
  extension?: string;
  name_contains?: string;
}

export type FilesResponse = [FlatFile[], number];

// ── Константы ────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<FileCategory, string> = {
  image:      "#1D9E75",
  video:      "#378ADD",
  audio:      "#7F77DD",
  document:   "#EF9F27",
  code:       "#5DCAA5",
  archive:    "#D85A30",
  executable: "#E24B4A",
  data:       "#888780",
  other:      "#B4B2A9",
};

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  image:      "Изображения",
  video:      "Видео",
  audio:      "Аудио",
  document:   "Документы",
  code:       "Код",
  archive:    "Архивы",
  executable: "Программы",
  data:       "Данные",
  other:      "Прочее",
};

export const JUNK_CATEGORY_LABELS: Record<JunkCategory, string> = {
  temp_files:      "Временные файлы",
  log_files:       "Логи",
  app_cache:       "Кэш приложений",
  node_modules:    "node_modules",
  python_venv:     "Python venv",
  orphaned_app:    "Остатки программ",
  old_downloads:   "Старые загрузки",
  build_artifacts: "Артефакты сборки",
};

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive"
  | "executable"
  | "data"
  | "other";

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

export interface FileFilter {
  category?: FileCategory;
  min_size?: number;
  max_size?: number;
  older_than_days?: number;
  newer_than_days?: number;
  extension?: string;
  name_contains?: string;
}

export interface ScanResult {
  root: FileNode;
  flat_files: FlatFile[];
  stats: DiskStats;
  scan_path: string;
}

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

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum FileCategory {
    Image,
    Video,
    Audio,
    Document,
    Code,
    Archive,
    Executable,
    Data,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySize {
    pub category: FileCategory,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub last_modified: i64,
    pub created_at: i64,
    pub extension: String,
    pub category: FileCategory,
    pub children: Vec<FileNode>,
    pub depth: usize,
    pub file_count: u64,
    pub by_category: Vec<CategorySize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FolderScanState {
    Pending,
    Scanning,
    Priority,
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderShallow {
    pub name: String,
    pub path: String,
    pub size: Option<u64>,
    pub file_count: Option<u64>,
    pub by_category: Option<Vec<CategorySize>>,
    pub scan_state: FolderScanState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlatFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub last_modified: i64,
    pub created_at: i64,
    pub extension: String,
    pub category: FileCategory,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanProgress {
    pub files_scanned: u64,
    pub bytes_scanned: u64,
    pub current_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FolderScanComplete {
    pub path: String,
    pub size: u64,
    pub file_count: u64,
    pub by_category: Vec<CategorySize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryStat {
    pub category: FileCategory,
    pub label: String,
    pub size: u64,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionStat {
    pub extension: String,
    pub size: u64,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiskStats {
    pub total_files: u64,
    pub total_dirs: u64,
    pub total_size: u64,
    pub by_category: Vec<CategoryStat>,
    pub by_extension: Vec<ExtensionStat>,
    pub largest_files: Vec<FlatFile>,
    pub oldest_files: Vec<FlatFile>,
    pub newest_files: Vec<FlatFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgeBucket {
    pub label: String,
    pub max_days: u32,
    pub count: u64,
    pub size: u64,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct FileFilter {
    pub category: Option<FileCategory>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub older_than_days: Option<i64>,
    pub newer_than_days: Option<i64>,
    pub extension: Option<String>,
    pub name_contains: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JunkCategory {
    TempFiles,
    LogFiles,
    AppCache,
    NodeModules,
    PythonVenv,
    OrphanedApp,
    OldDownloads,
    BuildArtifacts,
}

#[derive(Debug, Clone, Serialize)]
pub struct JunkItem {
    pub path: String,
    pub name: String,
    pub category: JunkCategory,
    pub size: u64,
    pub confidence: u8,
    pub is_safe: bool,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub file_size: u64,
    pub savings: u64,
    pub files: Vec<FlatFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DuplicateProgress {
    pub files_hashed: u64,
    pub total_files: u64,
    pub bytes_hashed: u64,
}

pub struct ScanResult {
    pub root: FileNode,
    pub flat_files: Vec<FlatFile>,
    pub stats: DiskStats,
    pub scan_path: String,
}

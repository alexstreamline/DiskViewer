use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub files_scanned: u64,
    pub bytes_scanned: u64,
    pub current_path: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileFilter {
    pub category: Option<FileCategory>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub older_than_days: Option<i64>,
    pub newer_than_days: Option<i64>,
    pub extension: Option<String>,
    pub name_contains: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub root: FileNode,
    pub flat_files: Vec<FlatFile>,
    pub stats: DiskStats,
    pub scan_path: String,
}

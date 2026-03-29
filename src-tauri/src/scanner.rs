use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use rayon::prelude::*;
use walkdir::WalkDir;

use crate::classifier::classify;
use crate::models::{
    CategoryStat, DiskStats, ExtensionStat, FileCategory, FileNode, FlatFile, ScanResult,
};

pub fn scan(
    path: &str,
    cancel_flag: Arc<AtomicBool>,
    on_progress: impl Fn(u64, u64, &str) + Send + Sync,
) -> Result<ScanResult, String> {
    let files_counter = Arc::new(AtomicU64::new(0));
    let bytes_counter = Arc::new(AtomicU64::new(0));

    // Collect all entries first
    let entries: Vec<_> = WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect();

    let files_counter_clone = files_counter.clone();
    let bytes_counter_clone = bytes_counter.clone();
    let cancel_clone = cancel_flag.clone();

    // Process in parallel
    let flat_files: Vec<FlatFile> = entries
        .par_iter()
        .filter_map(|entry| {
            if cancel_clone.load(Ordering::Relaxed) {
                return None;
            }

            let metadata = entry.metadata().ok()?;
            let file_path = entry.path();
            let is_dir = metadata.is_dir();

            let size = if is_dir { 0 } else { metadata.len() };

            let last_modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let created_at = metadata
                .created()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let name = file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let extension = if is_dir {
                String::new()
            } else {
                file_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default()
            };

            let category = if is_dir {
                FileCategory::Other
            } else {
                classify(&extension)
            };

            let count = files_counter_clone.fetch_add(1, Ordering::Relaxed) + 1;
            if !is_dir {
                bytes_counter_clone.fetch_add(size, Ordering::Relaxed);
            }

            if count % 500 == 0 {
                let bytes = bytes_counter_clone.load(Ordering::Relaxed);
                on_progress(count, bytes, &file_path.to_string_lossy());
            }

            Some(FlatFile {
                name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
                size,
                last_modified,
                created_at,
                extension,
                category,
            })
        })
        .collect();

    if cancel_flag.load(Ordering::Relaxed) {
        return Err("cancelled".to_string());
    }

    let stats = compute_stats(&flat_files);
    let root = build_tree(path, &flat_files, 0);

    Ok(ScanResult {
        root,
        flat_files,
        stats,
        scan_path: path.to_string(),
    })
}

fn build_tree(dir_path: &str, flat_files: &[FlatFile], depth: usize) -> FileNode {
    let dir = Path::new(dir_path);

    let mut children: Vec<FileNode> = flat_files
        .iter()
        .filter(|f| {
            Path::new(&f.path)
                .parent()
                .map(|p| p == dir)
                .unwrap_or(false)
        })
        .map(|f| {
            if f.is_dir {
                build_tree(&f.path, flat_files, depth + 1)
            } else {
                FileNode {
                    name: f.name.clone(),
                    path: f.path.clone(),
                    is_dir: false,
                    size: f.size,
                    last_modified: f.last_modified,
                    created_at: f.created_at,
                    extension: f.extension.clone(),
                    category: f.category.clone(),
                    children: vec![],
                    depth,
                    file_count: 1,
                }
            }
        })
        .collect();

    children.sort_by(|a, b| b.size.cmp(&a.size));

    let size: u64 = children.iter().map(|c| c.size).sum();
    let file_count: u64 = children.iter().map(|c| c.file_count).sum();

    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir_path.to_string());

    // Get metadata for the directory itself
    let (last_modified, created_at) = std::fs::metadata(dir_path)
        .ok()
        .map(|m| {
            let lm = m
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            let ca = m
                .created()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            (lm, ca)
        })
        .unwrap_or((0, 0));

    FileNode {
        name,
        path: dir_path.to_string(),
        is_dir: true,
        size,
        last_modified,
        created_at,
        extension: String::new(),
        category: FileCategory::Other,
        children,
        depth,
        file_count,
    }
}

fn compute_stats(flat_files: &[FlatFile]) -> DiskStats {
    let mut total_files = 0u64;
    let mut total_dirs = 0u64;
    let mut total_size = 0u64;
    let mut category_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut extension_map: HashMap<String, (u64, u64)> = HashMap::new();

    for f in flat_files {
        if f.is_dir {
            total_dirs += 1;
        } else {
            total_files += 1;
            total_size += f.size;

            let cat_key = format!("{:?}", f.category).to_lowercase();
            let cat_entry = category_map.entry(cat_key).or_insert((0, 0));
            cat_entry.0 += f.size;
            cat_entry.1 += 1;

            if !f.extension.is_empty() {
                let ext_entry = extension_map.entry(f.extension.clone()).or_insert((0, 0));
                ext_entry.0 += f.size;
                ext_entry.1 += 1;
            }
        }
    }

    let category_label = |cat: &FileCategory| -> String {
        match cat {
            FileCategory::Image => "Изображения",
            FileCategory::Video => "Видео",
            FileCategory::Audio => "Аудио",
            FileCategory::Document => "Документы",
            FileCategory::Code => "Код",
            FileCategory::Archive => "Архивы",
            FileCategory::Executable => "Программы",
            FileCategory::Data => "Данные",
            FileCategory::Other => "Прочее",
        }
        .to_string()
    };

    let all_categories = [
        FileCategory::Image,
        FileCategory::Video,
        FileCategory::Audio,
        FileCategory::Document,
        FileCategory::Code,
        FileCategory::Archive,
        FileCategory::Executable,
        FileCategory::Data,
        FileCategory::Other,
    ];

    let mut by_category: Vec<CategoryStat> = all_categories
        .iter()
        .filter_map(|cat| {
            let key = format!("{:?}", cat).to_lowercase();
            category_map.get(&key).map(|(size, count)| CategoryStat {
                label: category_label(cat),
                category: cat.clone(),
                size: *size,
                count: *count,
            })
        })
        .collect();
    by_category.sort_by(|a, b| b.size.cmp(&a.size));

    let mut by_extension: Vec<ExtensionStat> = extension_map
        .into_iter()
        .map(|(ext, (size, count))| ExtensionStat {
            extension: ext,
            size,
            count,
        })
        .collect();
    by_extension.sort_by(|a, b| b.size.cmp(&a.size));
    by_extension.truncate(30);

    let mut files_only: Vec<&FlatFile> = flat_files.iter().filter(|f| !f.is_dir).collect();

    let mut largest_files: Vec<FlatFile> = {
        files_only.sort_by(|a, b| b.size.cmp(&a.size));
        files_only.iter().take(20).map(|f| (*f).clone()).collect()
    };
    let _ = largest_files; // suppress unused warning

    let mut sorted_by_size = files_only.clone();
    sorted_by_size.sort_by(|a, b| b.size.cmp(&a.size));
    let largest_files: Vec<FlatFile> = sorted_by_size.iter().take(20).map(|f| (*f).clone()).collect();

    let mut sorted_by_oldest = files_only.clone();
    sorted_by_oldest.sort_by(|a, b| a.last_modified.cmp(&b.last_modified));
    let oldest_files: Vec<FlatFile> = sorted_by_oldest.iter().take(20).map(|f| (*f).clone()).collect();

    let mut sorted_by_newest = files_only.clone();
    sorted_by_newest.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    let newest_files: Vec<FlatFile> = sorted_by_newest.iter().take(20).map(|f| (*f).clone()).collect();

    DiskStats {
        total_files,
        total_dirs,
        total_size,
        by_category,
        by_extension,
        largest_files,
        oldest_files,
        newest_files,
    }
}

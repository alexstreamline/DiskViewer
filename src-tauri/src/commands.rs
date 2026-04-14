use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State};

use crate::aggregator;
use crate::duplicate;
use crate::junk_detector;
use crate::models::{
    AgeBucket, DiskStats, DuplicateGroup, FileFilter, FileNode, FlatFile,
    FolderShallow, JunkItem,
};
use crate::scanner;
use crate::state::{AppState, ScanTask, PRIORITY_HIGH, PRIORITY_NORMAL};

// ── Фаза 0: мгновенный список папок ─────────────────────────────

#[tauri::command]
pub async fn scan_top_level_cmd(
    path: String,
    _state: State<'_, AppState>,
) -> Result<Vec<FolderShallow>, String> {
    scanner::scan_top_level(&path).map_err(|e| e.to_string())
}

// ── Фаза 1: полное параллельное сканирование ─────────────────────

#[tauri::command]
pub async fn start_scan(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.cancel_flag.store(false, Ordering::Relaxed);
    *state.scan_result.lock().unwrap() = None;

    // Список папок верхнего уровня
    let top_dirs: Vec<String> = std::fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();

    // Создаём задачи сканирования
    let tasks: Vec<ScanTask> = top_dirs
        .iter()
        .map(|p| ScanTask {
            path: p.clone(),
            priority: std::sync::Arc::new(std::sync::atomic::AtomicU8::new(PRIORITY_NORMAL)),
        })
        .collect();

    {
        *state.scan_tasks.lock().unwrap() = tasks;
    }

    let cancel = state.cancel_flag.clone();
    let tasks_ref: Vec<(String, std::sync::Arc<std::sync::atomic::AtomicU8>)> = state
        .scan_tasks
        .lock()
        .unwrap()
        .iter()
        .map(|t| (t.path.clone(), t.priority.clone()))
        .collect();

    let scan_path = path.clone();
    let app_c = app.clone();

    let result = tokio::task::spawn_blocking(move || {
        use rayon::prelude::*;

        let results: Vec<(FileNode, Vec<crate::models::FlatFile>)> = tasks_ref
            .par_iter()
            .filter_map(|(p, prio)| {
                scanner::scan_folder(p, &app_c, cancel.clone(), prio.clone()).ok()
            })
            .collect();

        // Объединяем flat_files и stats из всех дочерних папок
        let mut all_flat: Vec<crate::models::FlatFile> = results
            .iter()
            .flat_map(|(_, files)| files.clone())
            .collect();

        // Добавляем файлы непосредственно в корне (не в подпапках)
        if let Ok(entries) = std::fs::read_dir(&scan_path) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            for entry in entries.filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.is_file() {
                    if let Ok(meta) = p.metadata() {
                        let ext = p.extension()
                            .map(|e| e.to_string_lossy().to_lowercase())
                            .unwrap_or_default();
                        let category = crate::classifier::classify(&ext);
                        let lm = meta.modified().ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs() as i64).unwrap_or(0);
                        let ca = meta.created().ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs() as i64).unwrap_or(0);
                        let _ = now; // suppress unused warning
                        all_flat.push(crate::models::FlatFile {
                            name: p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
                            path: p.to_string_lossy().to_string(),
                            is_dir: false,
                            size: meta.len(),
                            last_modified: lm,
                            created_at: ca,
                            extension: ext,
                            category,
                        });
                    }
                }
            }
        }

        // Строим корневой узел из результатов
        let root_children: Vec<FileNode> = results.into_iter().map(|(node, _)| node).collect();
        let root_size: u64 = root_children.iter().map(|n| n.size).sum();
        let root_file_count: u64 = root_children.iter().map(|n| n.file_count).sum();
        let root_by_category = scanner::compute_by_category(&all_flat);

        let root = FileNode {
            name: std::path::Path::new(&scan_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| scan_path.clone()),
            path: scan_path.clone(),
            is_dir: true,
            size: root_size,
            last_modified: 0,
            created_at: 0,
            extension: String::new(),
            category: crate::models::FileCategory::Other,
            children: root_children,
            depth: 0,
            file_count: root_file_count,
            by_category: root_by_category,
        };

        let stats = scanner::compute_stats_pub(&all_flat);

        crate::models::ScanResult {
            root,
            flat_files: all_flat,
            stats,
            scan_path,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    let _ = app.emit("scan_complete", ());
    *state.scan_result.lock().unwrap() = Some(result);
    Ok(())
}

// ── Приоритизация папки ──────────────────────────────────────────

#[tauri::command]
pub fn prioritize_folder(path: String, state: State<'_, AppState>) {
    let tasks = state.scan_tasks.lock().unwrap();
    for task in tasks.iter() {
        if task.path == path {
            task.priority.store(PRIORITY_HIGH, Ordering::SeqCst);
        } else if task.priority.load(Ordering::Relaxed) == PRIORITY_HIGH {
            task.priority.store(PRIORITY_NORMAL, Ordering::SeqCst);
        }
    }
}

// ── Отмена ───────────────────────────────────────────────────────

#[tauri::command]
pub fn cancel_scan(state: State<'_, AppState>) {
    state.cancel_flag.store(true, Ordering::Relaxed);
}

// ── Геттеры данных ───────────────────────────────────────────────

#[tauri::command]
pub fn get_stats(state: State<'_, AppState>) -> Result<DiskStats, String> {
    let lock = state.scan_result.lock().unwrap();
    match lock.as_ref() {
        Some(r) => Ok(r.stats.clone()),
        None => Err("No scan result available".to_string()),
    }
}

#[tauri::command]
pub fn get_tree(state: State<'_, AppState>) -> Result<FileNode, String> {
    let lock = state.scan_result.lock().unwrap();
    match lock.as_ref() {
        Some(r) => Ok(r.root.clone()),
        None => Err("No scan result available".to_string()),
    }
}

#[tauri::command]
pub fn get_folder_children(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileNode>, String> {
    let lock = state.scan_result.lock().unwrap();
    let root = &lock.as_ref().ok_or("No scan result available")?.root;
    let node = find_node(root, &path).ok_or("Папка не найдена")?;
    Ok(node.children.clone())
}

#[tauri::command]
pub async fn get_age_histogram(
    state: State<'_, AppState>,
) -> Result<Vec<AgeBucket>, String> {
    let guard = state.scan_result.lock().unwrap();
    let result = guard.as_ref().ok_or("No scan result available")?;
    Ok(aggregator::compute_age_histogram(&result.flat_files))
}

#[tauri::command]
pub fn get_files(
    filter: FileFilter,
    page: u32,
    per_page: u32,
    sort_by: Option<String>,
    sort_desc: Option<bool>,
    state: State<'_, AppState>,
) -> Result<(Vec<FlatFile>, u64), String> {
    let lock = state.scan_result.lock().unwrap();
    let scan = lock.as_ref().ok_or("No scan result available")?;

    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let mut filtered: Vec<&FlatFile> = scan
        .flat_files
        .iter()
        .filter(|f| !f.is_dir)
        .filter(|f| {
            if let Some(ref cat) = filter.category {
                if &f.category != cat { return false; }
            }
            if let Some(min_size) = filter.min_size {
                if f.size < min_size { return false; }
            }
            if let Some(max_size) = filter.max_size {
                if f.size > max_size { return false; }
            }
            if let Some(older_days) = filter.older_than_days {
                let threshold = now_secs - older_days * 86400;
                if f.last_modified > threshold { return false; }
            }
            if let Some(newer_days) = filter.newer_than_days {
                let threshold = now_secs - newer_days * 86400;
                if f.last_modified < threshold { return false; }
            }
            if let Some(ref ext) = filter.extension {
                if &f.extension != ext { return false; }
            }
            if let Some(ref name_contains) = filter.name_contains {
                if !f.name.to_lowercase().contains(&name_contains.to_lowercase()) {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len() as u64;

    let desc = sort_desc.unwrap_or(true);
    match sort_by.as_deref().unwrap_or("size") {
        "name" => {
            if desc { filtered.sort_by(|a, b| b.name.cmp(&a.name)); }
            else    { filtered.sort_by(|a, b| a.name.cmp(&b.name)); }
        }
        "modified" => {
            if desc { filtered.sort_by(|a, b| b.last_modified.cmp(&a.last_modified)); }
            else    { filtered.sort_by(|a, b| a.last_modified.cmp(&b.last_modified)); }
        }
        _ => {
            if desc { filtered.sort_by(|a, b| b.size.cmp(&a.size)); }
            else    { filtered.sort_by(|a, b| a.size.cmp(&b.size)); }
        }
    }

    let start = (page * per_page) as usize;
    let page_files: Vec<FlatFile> = filtered
        .iter()
        .skip(start)
        .take(per_page as usize)
        .map(|f| (*f).clone())
        .collect();

    Ok((page_files, total))
}

// ── Дубликаты ────────────────────────────────────────────────────

#[tauri::command]
pub async fn find_duplicates_cmd(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<DuplicateGroup>, String> {
    let flat_files = {
        let guard = state.scan_result.lock().unwrap();
        guard.as_ref().ok_or("No scan result available")?.flat_files.clone()
    };
    let cancel = state.cancel_flag.clone();
    tokio::task::spawn_blocking(move || {
        duplicate::find_duplicates(&flat_files, &app, cancel)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

// ── Мусор ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn detect_junk_cmd(
    state: State<'_, AppState>,
) -> Result<Vec<JunkItem>, String> {
    let flat_files = {
        let guard = state.scan_result.lock().unwrap();
        guard.as_ref().ok_or("No scan result available")?.flat_files.clone()
    };
    tokio::task::spawn_blocking(move || junk_detector::detect_junk(&flat_files))
        .await
        .map_err(|e| e.to_string())
}

// ── Проводник ────────────────────────────────────────────────────

#[tauri::command]
pub async fn open_in_explorer(path: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    let _parent = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(path.clone());

    #[cfg(target_os = "windows")]
    app.shell()
        .command("explorer")
        .args([&format!("/select,{}", path)])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    app.shell()
        .command("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    app.shell()
        .command("xdg-open")
        .args([&_parent])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Вспомогательные ──────────────────────────────────────────────

fn find_node<'a>(node: &'a FileNode, path: &str) -> Option<&'a FileNode> {
    if node.path == path {
        return Some(node);
    }
    for child in &node.children {
        if let Some(found) = find_node(child, path) {
            return Some(found);
        }
    }
    None
}

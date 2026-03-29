use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, State};

use crate::models::{DiskStats, FileFilter, FileNode, FlatFile, ScanProgress};
use crate::scanner;
use crate::state::AppState;

#[tauri::command]
pub async fn start_scan(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.cancel_flag.store(false, Ordering::Relaxed);
    *state.scan_result.lock().unwrap() = None;

    let cancel_flag = state.cancel_flag.clone();
    let app_clone = app.clone();

    let result = tokio::task::spawn_blocking(move || {
        scanner::scan(&path, cancel_flag, |files_scanned, bytes_scanned, current_path| {
            let progress = ScanProgress {
                files_scanned,
                bytes_scanned,
                current_path: current_path.to_string(),
            };
            let _ = app_clone.emit("scan_progress", progress);
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    match result {
        Ok(scan_result) => {
            let _ = app.emit("scan_complete", ());
            *state.scan_result.lock().unwrap() = Some(scan_result);
            Ok(())
        }
        Err(e) if e == "cancelled" => {
            let _ = app.emit("scan_cancelled", ());
            Ok(())
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn cancel_scan(state: State<'_, AppState>) {
    state.cancel_flag.store(true, Ordering::Relaxed);
}

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
                if &f.category != cat {
                    return false;
                }
            }
            if let Some(min_size) = filter.min_size {
                if f.size < min_size {
                    return false;
                }
            }
            if let Some(max_size) = filter.max_size {
                if f.size > max_size {
                    return false;
                }
            }
            if let Some(older_days) = filter.older_than_days {
                let threshold = now_secs - older_days * 86400;
                if f.last_modified > threshold {
                    return false;
                }
            }
            if let Some(newer_days) = filter.newer_than_days {
                let threshold = now_secs - newer_days * 86400;
                if f.last_modified < threshold {
                    return false;
                }
            }
            if let Some(ref ext) = filter.extension {
                if &f.extension != ext {
                    return false;
                }
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
            if desc {
                filtered.sort_by(|a, b| b.name.cmp(&a.name));
            } else {
                filtered.sort_by(|a, b| a.name.cmp(&b.name));
            }
        }
        "modified" => {
            if desc {
                filtered.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
            } else {
                filtered.sort_by(|a, b| a.last_modified.cmp(&b.last_modified));
            }
        }
        _ => {
            // size (default)
            if desc {
                filtered.sort_by(|a, b| b.size.cmp(&a.size));
            } else {
                filtered.sort_by(|a, b| a.size.cmp(&b.size));
            }
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

#[tauri::command]
pub async fn open_in_explorer(path: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    let parent = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(path.clone());

    #[cfg(target_os = "windows")]
    app.shell()
        .command("explorer")
        .args(["/select,", &path])
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
        .args([&parent])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

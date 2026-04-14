pub mod aggregator;
pub mod classifier;
pub mod commands;
pub mod duplicate;
pub mod junk_detector;
pub mod models;
pub mod scanner;
pub mod state;

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::scan_top_level_cmd,
            commands::start_scan,
            commands::prioritize_folder,
            commands::cancel_scan,
            commands::get_stats,
            commands::get_tree,
            commands::get_folder_children,
            commands::get_age_histogram,
            commands::get_files,
            commands::find_duplicates_cmd,
            commands::detect_junk_cmd,
            commands::open_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

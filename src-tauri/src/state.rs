use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU8};
use crate::models::ScanResult;

pub const PRIORITY_CANCEL: u8 = 255;
pub const PRIORITY_HIGH: u8 = 1;
pub const PRIORITY_NORMAL: u8 = 0;

pub struct ScanTask {
    pub path: String,
    pub priority: Arc<AtomicU8>,
}

pub struct AppState {
    pub scan_result: Mutex<Option<ScanResult>>,
    pub cancel_flag: Arc<AtomicBool>,
    pub scan_tasks: Mutex<Vec<ScanTask>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            scan_result: Mutex::new(None),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            scan_tasks: Mutex::new(vec![]),
        }
    }
}

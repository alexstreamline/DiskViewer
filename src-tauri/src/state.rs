use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicBool;
use crate::models::ScanResult;

pub struct AppState {
    pub scan_result: Mutex<Option<ScanResult>>,
    pub cancel_flag: Arc<AtomicBool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            scan_result: Mutex::new(None),
            cancel_flag: Arc::new(AtomicBool::new(false)),
        }
    }
}

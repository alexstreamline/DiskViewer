use crate::models::FileCategory;

pub fn classify(extension: &str) -> FileCategory {
    match extension {
        // Image
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "svg" | "ico"
        | "tiff" | "tif" | "heic" | "raw" | "cr2" | "nef" | "arw" => FileCategory::Image,

        // Video
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" | "m4v"
        | "3gp" | "ts" | "mts" => FileCategory::Video,

        // Audio
        "mp3" | "flac" | "wav" | "aac" | "ogg" | "m4a" | "wma" | "opus" | "aiff" => {
            FileCategory::Audio
        }

        // Document
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "odt" | "ods"
        | "txt" | "rtf" | "md" | "epub" | "fb2" => FileCategory::Document,

        // Code
        "rs" | "py" | "js" | "ts" | "jsx" | "tsx" | "go" | "cs" | "cpp" | "c"
        | "h" | "java" | "kt" | "swift" | "rb" | "php" | "html" | "css" | "scss"
        | "vue" | "sql" | "sh" | "ps1" | "json" | "yaml" | "yml" | "toml" | "xml"
        | "proto" | "lua" | "dart" => FileCategory::Code,

        // Archive
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "tgz" | "dmg" | "iso" => {
            FileCategory::Archive
        }

        // Executable
        "exe" | "msi" | "dll" | "so" | "dylib" | "deb" | "rpm" | "apk" => {
            FileCategory::Executable
        }

        // Data
        "db" | "sqlite" | "sqlite3" | "csv" | "parquet" | "dat" | "bak" | "log" => {
            FileCategory::Data
        }

        _ => FileCategory::Other,
    }
}

import path from 'path';
import fs from 'fs';

const SCRIPTS_DIR = path.resolve(__dirname, '../scripts');

/**
 * 取得 Python 執行檔路徑。
 * 優先使用 scripts/.venv 虛擬環境，支援 macOS/Linux 和 Windows，
 * 若虛擬環境不存在則退回系統 python3 (Unix) / python (Windows)。
 */
export function getPythonExecutable(): string {
    // Unix: .venv/bin/python3
    const unixVenv = path.join(SCRIPTS_DIR, '.venv', 'bin', 'python3');
    if (fs.existsSync(unixVenv)) return unixVenv;

    // Windows: .venv\Scripts\python.exe
    const winVenv = path.join(SCRIPTS_DIR, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(winVenv)) return winVenv;

    // Fallback to system Python
    return process.platform === 'win32' ? 'python' : 'python3';
}

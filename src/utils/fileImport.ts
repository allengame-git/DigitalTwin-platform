/**
 * fileImport.ts
 *
 * 檔案匯入相關工具函式
 */

/**
 * 讀取檔案內容，自動偵測編碼 (UTF-8 或 Big5)
 * @param file 瀏覽器 File 物件
 * @returns 解析後的字串
 */
export const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) {
                resolve('');
                return;
            }

            // 1. 嘗試以 UTF-8 解碼 (fatal: true 會在遇到無效字元時拋出錯誤)
            try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                const text = decoder.decode(buffer);
                resolve(text);
            } catch (e) {
                // 2. 若 UTF-8 失敗，退回使用 Big5 (CP950) 解碼
                try {
                    const decoder = new TextDecoder('big5');
                    const text = decoder.decode(buffer);
                    console.log('Detected Big5 encoding, decoded successfully.');
                    resolve(text);
                } catch (e2) {
                    console.error('Failed to decode file:', e2);
                    resolve(''); // 解碼失敗回傳空字串
                }
            }
        };

        reader.onerror = (err) => {
            reject(err);
        };

        reader.readAsArrayBuffer(file);
    });
};

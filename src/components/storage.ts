import * as fs from 'fs';
let storageDir: string;
export async function initiateStorage(extensionPath: string) {
    storageDir = extensionPath;
    const exists = fs.existsSync(storageDir);
    if (!exists) {
        return new Promise<void>((resolve, reject) => {
            fs.mkdir(storageDir, (error: NodeJS.ErrnoException | null) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}
export function getStorageDir() {
    return storageDir;
}

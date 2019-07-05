import * as storage from './storage';
import * as fs from 'fs';
import * as path from 'path';

export type Settings = {
    username: string,
    token: string
};
const LOCAL_CONFIG_FILENAME = 'local-config.json';

export function get(): Settings {
    const parentDir = storage.getStorageDir();
    const localConfigFile = path.join(parentDir, LOCAL_CONFIG_FILENAME);
    touchSyncSettingsIfNotExists();
    return JSON.parse(fs.readFileSync(localConfigFile).toString()) || {};
}
export function set(settings: Settings): void {
    const parentDir = storage.getStorageDir();
    const localConfigFile = path.join(parentDir, LOCAL_CONFIG_FILENAME);
    fs.writeFileSync(localConfigFile, Buffer.from(JSON.stringify(settings, null, '\t'), 'ascii'));
}
export function add(newSettings: Partial<Settings>): void {
    const settings = get() || {};
    Object.assign(settings, newSettings);
    const parentDir = storage.getStorageDir();
    const localConfigFile = path.join(parentDir, LOCAL_CONFIG_FILENAME);
    fs.writeFileSync(localConfigFile, Buffer.from(JSON.stringify(settings, null, '\t'), 'ascii'));
}
export function getLastModified() {
    const parentDir = storage.getStorageDir();
    const localConfigFile = path.join(parentDir, LOCAL_CONFIG_FILENAME);
    touchSyncSettingsIfNotExists();
    fs.stat(localConfigFile, (e: any, stats: fs.Stats) => {
        var mtime = new Date(stats.mtime);
        console.log(mtime);
    });
}
export function touchSyncSettingsIfNotExists() {
    try {
        const parentDir = storage.getStorageDir();
        const localConfigFile = path.join(parentDir, LOCAL_CONFIG_FILENAME);
        const exists = fs.existsSync(localConfigFile);
        if (!exists) {
            fs.writeFileSync(localConfigFile, Buffer.from(JSON.stringify({}, null, '\t'), 'ascii'));
        }
    } catch (e) {
        console.log(e);
    }
}
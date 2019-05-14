import * as storage from './storage';
import * as fs from 'fs';
import * as path from 'path';

export type Settings = {
    username: string,
    token: string
};
const SETTINGS_FILE = 'localconfig.json';

export function get(): Settings {
    const parentDir = storage.getStorageDir();
    const settingsFile = path.join(parentDir, SETTINGS_FILE);
    touchSettingsIfNotExists();
    return JSON.parse(fs.readFileSync(settingsFile).toString()) || {};
}
export function set(settings: Settings): void {
    const parentDir = storage.getStorageDir();
    const settingsFile = path.join(parentDir, SETTINGS_FILE);
    fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify(settings), 'ascii'));
}
export function add(newSettings: Partial<Settings>): void {
    const settings = get() || {};
    Object.assign(settings, newSettings);
    const parentDir = storage.getStorageDir();
    const settingsFile = path.join(parentDir, SETTINGS_FILE);
    fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify(settings), 'ascii'));
}
export function getLastModified() {
    const parentDir = storage.getStorageDir();
    const settingsFile = path.join(parentDir, SETTINGS_FILE);
    touchSettingsIfNotExists();
    fs.stat(settingsFile, (e: any, stats: fs.Stats) => {
        var mtime = new Date(stats.mtime);
        console.log(mtime);
    });
}
export function touchSettingsIfNotExists() {
    try {
        const parentDir = storage.getStorageDir();
        const settingsFile = path.join(parentDir, SETTINGS_FILE);
        const exists = fs.existsSync(settingsFile);
        if (!exists) {
            fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify({}), 'ascii'));
        }
    } catch (e) {
        console.log(e);
    }
}
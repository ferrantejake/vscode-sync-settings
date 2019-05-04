import * as stripJSONComments from 'strip-json-comments';
import * as fs from 'fs';
import * as path from 'path';
import * as gist from './gist';
import { Gist } from './types';
import { localsettings, cloudconfig, localfiles } from '.';

export type Settings = {
    username: string,
    token: string
};
let cloudConfigGistId = '';

async function pull() {
    const { token: pat, username } = localsettings.get();
    if (cloudConfigGistId) {
        return gist.get(pat, cloudConfigGistId);
    }
    const cloudConfigGist = await getCloudConfigGist(pat, username, 0);
    if (!cloudConfigGist) { return; }

    let content = cloudConfigGist.files['sync-settings.json'].content;
    content = JSON.parse(stripJSONComments(content));
}

async function getCloudConfigGist(pat: string, username: string, page: number): Promise<Gist> {
    return new Promise(async (resolve, reject) => {
        const gists = await gist.list(pat, username);
        if (gists.length) {
            for (const gist of gists) {
                const filenames = Object.keys(gist.files);
                if (
                    filenames.length === 3
                    && filenames[0] === 'sync-settings.json'
                    && filenames[1] === 'user-settings.json'
                    && filenames[2] === 'keybindings.json'
                ) {
                    cloudConfigGistId = gist.id;
                    break;
                }
            }
            if (cloudConfigGistId) {
                return resolve(gist.get(pat, cloudConfigGistId));
            } else {
                getCloudConfigGist(pat, username, page + 1);
            }
        } resolve();
    });
}


export async function sync(): Promise<void> {
    const { token: pat, username } = localsettings.get();
    const cloudConfigGist = await getCloudConfigGist(pat, username, 0);
    // const cloudConfigFiles = cloudConfigGist.files;
    // just overwrite everything for now
    const contents = getCloudSettingsStruct();
    try {
        if (!cloudConfigGist) {
            (contents as any).files['sync-settings.json'] = {
                content: JSON.stringify(pull(), null, '\t'),
            };
            const cloudConfigGist = await gist.create(pat, contents);
            cloudConfigGistId = cloudConfigGist.id;
        } else {
            cloudConfigGistId = cloudConfigGist.id;
            await gist.update(pat, cloudConfigGistId, contents);
        }
    } catch (e) { return Promise.reject(e); }

    function getCloudSettingsStruct() {
        const settingsStruct = {
            public: false,
            description: "Sync Settings",
            files: {
                "user-settings.json": {
                    content: JSON.stringify(localfiles.getUserSettings(), null, '\t'),
                },
                "keybindings.json": {
                    content: JSON.stringify(localfiles.getKeybindings(), null, '\t'),
                },
            }
        };
        return settingsStruct;
    }
}




// export function get(): Settings {
//     const parentDir = storage.getStorageDir();
//     const settingsFile = path.join(parentDir, SETTINGS_FILE);
//     touchSettingsIfNotExists();
//     return JSON.parse(fs.readFileSync(settingsFile).toString()) || {};
// }
// export function set(settings: Settings): void {
//     const parentDir = storage.getStorageDir();
//     const settingsFile = path.join(parentDir, SETTINGS_FILE);
//     fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify(settings), 'ascii'));
// }
// export function add(newSettings: Partial<Settings>): void {
//     const settings = get() || {};
//     Object.assign(settings, newSettings);
//     const parentDir = storage.getStorageDir();
//     const settingsFile = path.join(parentDir, SETTINGS_FILE);
//     fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify(settings), 'ascii'));
// }
// export function getLastModified() {
//     const parentDir = storage.getStorageDir();
//     const settingsFile = path.join(parentDir, SETTINGS_FILE);
//     touchSettingsIfNotExists();
//     fs.stat(settingsFile, (e: any, stats: fs.Stats) => {
//         var mtime = new Date(stats.mtime);
//         console.log(mtime);
//     });
// }
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
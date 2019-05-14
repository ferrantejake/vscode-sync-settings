import * as stripJSONComments from 'strip-json-comments';
import * as fs from 'fs';
import * as path from 'path';
import * as gist from './gist';
import { Gist } from './types';
import { localconfig, cloudconfig, localfiles } from '.';

export type Settings = {
    username: string,
    token: string
};
let cloudConfigGistId = '';

export type SettingsFile = { content: string }
export type CloudConfig = {
    public: boolean, // false
    description: string, // "Sync Settings",
    files: {
        "sync-settings.json"?: SettingsFile,
        "user-settings.json"?: SettingsFile,
        "keybindings.json"?: SettingsFile,
    }
};


async function getSyncSettings(): Promise<SettingsFile> {
    const currentCloudConfig = getCloudConfig();
    // @ts-ignore
    if (!currentCloudConfig) return;
    // @ts-ignore
    let content = currentCloudConfig.files['sync-settings.json'].content;
    content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    return content;
}
async function getUserSettings(): Promise<SettingsFile> {
    const currentCloudConfig = getCloudConfig();
    // @ts-ignore
    if (!currentCloudConfig) return;
    // @ts-ignore
    let content = currentCloudConfig.files['user-settings.json'].content;
    content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    return content;
}
async function getKeybindinds(): Promise<SettingsFile> {
    const currentCloudConfig = getCloudConfig();
    // @ts-ignore
    if (!currentCloudConfig) return;
    // @ts-ignore
    let content = currentCloudConfig.files['keybindings.json'].content;
    content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    return content;
}

async function getCloudConfig(): Promise<CloudConfig> {
    const { token: pat, username } = localconfig.get();
    if (cloudConfigGistId) {
        return gist.get(pat, cloudConfigGistId);
    }
    const cloudConfigGist = await getCloudConfigGist(pat, username, 0);
    // @ts-ignore
    if (!cloudConfigGist) return;
    const mappedCloudConfig: CloudConfig = Object.assign({}, {
        public: cloudConfigGist.public,
        description: cloudConfigGist.description,
        files: cloudConfigGist.files
    })
    return mappedCloudConfig;
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
    const { token: pat, username } = localconfig.get();
    const cloudConfigGist = await getCloudConfigGist(pat, username, 0);
    // const cloudConfigFiles = cloudConfigGist.files;
    // just overwrite everything for now
    const contents = getCloudConfigStruct();
    try {
        if (!cloudConfigGist) {
            
            (contents as any).files['sync-settings.json'] = {
                content: JSON.stringify((), null, '\t'),
            };
            const cloudConfigGist = await gist.create(pat, contents);
            cloudConfigGistId = cloudConfigGist.id;
        } else {
            cloudConfigGistId = cloudConfigGist.id;
            


            /********************************************
             * User settings procedure
             */
            const meta = localfiles.getUserSettingsMeta();
            if (!meta) {
                // shouldn't normally happen, but occours if the local user 
                // settings DNE (fresh pulldown) or the settings were deleted.
                getCloudConfigGist(pat, username)
                localfiles.setUserSettings(curCloudConfig.)
            } else {

            }

            /********************************************
             * Keybindings procedure
             */





            // determine if local files are more recent than cloud
            // if more recent, push changes
            // otherwise pull files down
            await gist.update(pat, cloudConfigGistId, contents);
        }
    } catch (e) { return Promise.reject(e); }

    function getCloudConfigStruct(): CloudConfig {
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
// export function touchSettingsIfNotExists() {
//     try {
//         const parentDir = storage.getStorageDir();
//         const settingsFile = path.join(parentDir, SETTINGS_FILE);
//         const exists = fs.existsSync(settingsFile);
//         if (!exists) {
//             fs.writeFileSync(settingsFile, Buffer.from(JSON.stringify({}), 'ascii'));
//         }
//     } catch (e) {
//         console.log(e);
//     }
// }
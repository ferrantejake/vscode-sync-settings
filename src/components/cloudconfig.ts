import * as stripJSONComments from 'strip-json-comments';
import * as fs from 'fs';
import * as path from 'path';
import { Gist } from './types';
import { localconfig, cloudconfig, localfiles, gist, storage, token } from '.';


export type Settings = {
    username: string,
    token: string
};
let cloudConfigGistId = '';

export type SettingsFile = { content: string };
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
    if (!currentCloudConfig) { return; }
    // @ts-ignore
    let content = currentCloudConfig.files['sync-settings.json'].content;
    content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    return content;
}
async function getUserSettings(): Promise<SettingsFile> {
    const currentCloudConfig = getCloudConfig();
    // @ts-ignore
    if (!currentCloudConfig) { return; }
    // @ts-ignore
    let content = currentCloudConfig.files['user-settings.json'].content;
    content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    return content;
}
async function getKeybindinds(): Promise<SettingsFile> {
    const currentCloudConfig = getCloudConfig();
    // @ts-ignore
    if (!currentCloudConfig) { return; }
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
    if (!cloudConfigGist) { return; }
    const mappedCloudConfig: CloudConfig = Object.assign({}, {
        public: cloudConfigGist.public,
        description: cloudConfigGist.description,
        files: cloudConfigGist.files
    });
    return mappedCloudConfig;
}

function parseSyncSettings(cloudConfigGist: Gist): any {
    return cloudConfigGist.files['sync-settings.json'];
    // const syncSettings = cloudConfigGist.files['sync-settings.json'];
    // if (!syncSettings) { return; }

}
function parseUserSettings(cloudConfigGist: Gist): any {
    return cloudConfigGist.files['user-settings.json'];
    // const userSettings = cloudConfigGist.files['user-settings.json'];
    // if (!userSettings) { return; }

}

function parseKeybindings(cloudConfigGist: Gist): any {
    return cloudConfigGist.files['keybindings.json'];
    // const keybindings = cloudConfigGist.files['keybindings.json'];
    // if (!keybindings) { return; }
    // return JSON.parse(keybindings);
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
    const newCloudConfig = generateCloudConfig();
    try {

        // If couold config DNE, then check local files for push
        // If they exist, push them to create a new gist
        // Otherwise create local files and create a new gist

        // If a cloud gist does exist, then check to see if local files exist
        // If local files exist:
        // - check timestamps, if they're more recent, overwrite the cloud gist
        // - otherwise overwrite the local files
        // If the local files DNE, create them, we have pulled new settings from the cloud.

        if (!cloudConfigGist) {
            (newCloudConfig as any).files['sync-settings.json'] = {
                content: JSON.stringify({}, null, '\t'),
            };
            const cloudConfigGist = await gist.create(pat, newCloudConfig);
            cloudConfigGistId = cloudConfigGist.id;
        } else {
            cloudConfigGistId = cloudConfigGist.id;

            /********************************************
             * Get cloud files
             */

            // localfiles.setUserSettings(cloudConfigGist.);
            const cloudUserSettings = parseUserSettings(cloudConfigGist);
            if (!cloudUserSettings) {
                // no local settings or cloud settings. Create a new
            }

            const cloudSyncSettings = parseSyncSettings(cloudConfigGist);
            if (!cloudUserSettings) {
                // no local settings or cloud settings. Create a new
            }
            const cloudKeybindings = parseKeybindings(cloudConfigGist);
            if (!cloudUserSettings) {
                // no local keybindings or cloud settings. Create a new
            }


            /********************************************
             * User settings procedure
             */
            const meta = localfiles.getUserSettingsMeta();
            if (!meta) {
                // Occours if the local user settings DNE (fresh pulldown)
                // or the settings were deleted.


            } else {

            }

            /********************************************
             * Keybindings procedure
             */





            // determine if local files are more recent than cloud
            // if more recent, push changes
            // otherwise pull files down
            await gist.update(pat, cloudConfigGistId, newCloudConfig);
        }
    } catch (e) { return Promise.reject(e); }

    function generateCloudConfig(): CloudConfig {
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

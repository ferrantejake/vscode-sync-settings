import * as stripJSONComments from 'strip-json-comments';
import { Gist } from './types';
import { localconfig, cloudconfig, localfiles, gist, storage, token } from '.';

export type Settings = {
    username: string,
    token: string
};
let cloudConfigGistId = '';

const SYNC_SETTINGS_FILENAME = 'sync-settings.json';
const USER_SETTINGS_FILENAME = 'user-settings.json';
const KEYBINDINGS_FILENAME = 'keybindings.json';

export type SettingsFile = { content: string }
export type CloudConfigPayload = {
    public: boolean, // false
    description: string, // "Sync Settings",
    files: {
        'sync-settings.json'?: SettingsFile,
        'user-settings.json'?: SettingsFile,
        'keybindings.json'?: SettingsFile,
    }
};
async function getSyncSettings(cloudConfigGist: Gist): Promise<SettingsFile> {
    return getFileFromCloudConfig(cloudConfigGist, SYNC_SETTINGS_FILENAME);
}
async function getUserSettings(cloudConfigGist: Gist): Promise<SettingsFile> {
    return getFileFromCloudConfig(cloudConfigGist, USER_SETTINGS_FILENAME);
}
async function getKeybindings(cloudConfigGist: Gist): Promise<SettingsFile> {
    return getFileFromCloudConfig(cloudConfigGist, KEYBINDINGS_FILENAME);
}
async function getFileFromCloudConfig(cloudConfigGist: Gist, filename: 'keybindings.json' | 'user-settings.json' | 'sync-settings.json'): Promise<SettingsFile> {
    const cloudConfigPayload = await getCloudConfig(cloudConfigGist);
    // @ts-ignore
    if (!currentCloudConfig) return;
    // @ts-ignore
    let content: any = {};
    if (cloudConfigPayload.files[filename]) {
        content = cloudConfigPayload.files[filename]!.content;
        content = JSON.parse(stripJSONComments(content)) as SettingsFile;
    }
    return content;
}

async function getCloudConfig(cloudConfigGist?: Gist): Promise<CloudConfigPayload> {
    if (!cloudConfigGist) {
        const { token: pat, username } = localconfig.get();
        if (cloudConfigGistId) {
            return gist.get(pat, cloudConfigGistId);
        }
        cloudConfigGist = await getCloudConfigGist(pat, username, 0);
    }
    // @ts-ignore
    if (!cloudConfigGist) return;
    const mappedCloudConfig: CloudConfigPayload = Object.assign({}, {
        public: cloudConfigGist.public,
        description: cloudConfigGist.description,
        files: cloudConfigGist.files
    });
    return mappedCloudConfig;
}
async function getCloudConfigGist(pat: string, username: string, page?: number): Promise<Gist> {
    return new Promise(async (resolve, reject) => {
        page = page || 0;
        const gists = await gist.list(pat, username, page);
        if (gists.length) {
            for (const gist of gists) {
                const filenames = Object.keys(gist.files);
                if (
                    filenames.length === 3
                    && filenames[0] === SYNC_SETTINGS_FILENAME
                    && filenames[1] === USER_SETTINGS_FILENAME
                    && filenames[2] === KEYBINDINGS_FILENAME
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
        }
        // resolve null
        resolve(null as any as Gist);
    });
}

export async function sync(): Promise<void> {
    const { token: pat, username } = localconfig.get();
    if (!pat) return Promise.reject(new Error('Personal access token not configured!'))
    if (!username) return Promise.reject(new Error('Username not configured!'))

    const cloudConfigGist = await getCloudConfigGist(pat, username);
    // const cloudConfigFiles = cloudConfigGist.files;
    // just overwrite everything for now
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
            const localPayload = getLocalConfigPayload();
            if (
                !(localPayload as any).files[SYNC_SETTINGS_FILENAME]
                || !(localPayload as any).files[SYNC_SETTINGS_FILENAME].content
            ) {
                (localPayload as any).files[SYNC_SETTINGS_FILENAME] = {
                    content: JSON.stringify({}, null, '\t')
                };
            };
            const cloudConfigGist = await gist.create(pat, localPayload);
            cloudConfigGistId = cloudConfigGist.id;
        } else {
            cloudConfigGistId = cloudConfigGist.id;
            const cloudTouched = new Date(cloudConfigGist.updated_at);

            // Only update local files if the cloud is more recent than the most
            // recent touch of each file
            //
            // If one of the local files is more recent than the cloud config, 
            // after we update we are able to get the local settings all in
            // one go and update the cloud. This way we get the latest from the 
            // cloud, if any, and completely overwrite the cloud of a local 
            // was made. 

            /********************************************
             * User settings procedure
             */
            const syncSettingsMeta = localfiles.getUserSettingsMeta();
            let syncSettingsTouched;
            if (!syncSettingsMeta) {
                // if the local user 
                // settings DNE (fresh pulldown) or the settings were deleted.
                const cloudSyncSettings = getSyncSettings(cloudConfigGist);
                localfiles.setSyncSettings(cloudSyncSettings);
                syncSettingsTouched = new Date();
            } else {
                syncSettingsTouched = new Date(syncSettingsMeta.birthtime);
                if (cloudTouched > syncSettingsTouched) {
                    const cloudSyncSettings = getSyncSettings(cloudConfigGist);
                    localfiles.setSyncSettings(cloudSyncSettings);
                }
                // otherwise do nothing.
            }

            /********************************************
             * User settings procedure
             */
            const userSettingsMeta = localfiles.getUserSettingsMeta();
            let userSettingsTouched;
            if (!userSettingsMeta) {
                // if the local user 
                // settings DNE (fresh pulldown) or the settings were deleted.
                const cloudUserSettings = getUserSettings(cloudConfigGist);
                localfiles.setUserSettings(cloudUserSettings);
                userSettingsTouched = new Date();
            } else {
                userSettingsTouched = new Date(userSettingsMeta.birthtime);
                if (cloudTouched > userSettingsTouched) {
                    const cloudUserSettings = getUserSettings(cloudConfigGist);
                    localfiles.setUserSettings(cloudUserSettings);
                }
                // otherwise do nothing.
            }

            /********************************************
             * Keybindings procedure
             */
            const keybindingsMeta = localfiles.getKeybindingsMeta();
            let keybindingsTouched: Date;
            if (!keybindingsMeta) {
                const cloudKeybindings = getKeybindings(cloudConfigGist);
                localfiles.setKeybindings(cloudKeybindings);
                keybindingsTouched = new Date();
            } else {
                keybindingsTouched = new Date(keybindingsMeta.birthtime);
                if (cloudTouched > keybindingsTouched) {
                    const cloudKeybindings = getKeybindings(cloudConfigGist);
                    localfiles.setKeybindings(cloudKeybindings);
                }
                // otherwise do nothing.
            }

            if (
                syncSettingsTouched > cloudTouched
                || userSettingsTouched > cloudTouched
                || keybindingsTouched > cloudTouched
            ) {
                // then overwrite everything in the cloud.
                const localPayload = getLocalConfigPayload();
                await gist.update(pat, cloudConfigGistId, localPayload);
            }
        }
    } catch (e) { return Promise.reject(e); }

    // Create payload from local files
    function getLocalConfigPayload(): CloudConfigPayload {
        const syncSettings = localfiles.getSyncSettings() || {};
        const userSettings = localfiles.getSyncSettings() || {};
        const keybindings = localfiles.getSyncSettings() || {};
        const settingsStruct = {
            public: false,
            description: "Sync Settings",
            files: {
                'sync-settings.json': {
                    content: JSON.stringify(syncSettings, null, '\t'),
                },
                'user-settings.json': {
                    content: JSON.stringify(userSettings, null, '\t'),
                },
                'keybindings.json': {
                    content: JSON.stringify(keybindings, null, '\t'),
                },
            }
        };
        return settingsStruct;
    }
}

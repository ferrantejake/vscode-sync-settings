import * as stripJSONComments from 'strip-json-comments';
import { Gist } from './types';
import { localconfig, localfiles, gist, extensions, utils } from '.';
import * as vscode from 'vscode';
export type Settings = {
    username: string,
    token: string
};
let cloudConfigGistId = '';

const SYNC_SETTINGS_FILENAME = '.sync-settings.json';
const KEYBINDINGS_FILENAME = 'keybindings.json';
const EXTENSIONS_FILENAME = 'extensions.json';
const USER_SETTINGS_FILENAME = 'user-settings.json';

export type SettingsFile = { content: string };
export type CloudConfigPayload = {
    public: boolean, // false
    description: string, // "Sync Settings",
    files: {
        '.sync-settings.json'?: SettingsFile,
        'extensions.json'?: SettingsFile,
        'keybindings.json'?: SettingsFile,
        'user-settings.json'?: SettingsFile,
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
async function getExtensions(cloudConfigGist: Gist) {
    return getFileFromCloudConfig<extensions.ExtensionsPayload>(cloudConfigGist, EXTENSIONS_FILENAME);
}
async function getFileFromCloudConfig<T>(cloudConfigGist: Gist, filename: 'keybindings.json' | 'user-settings.json' | '.sync-settings.json' | 'extensions.json'): Promise<T> {
    const cloudConfigPayload = await getCloudConfig(cloudConfigGist);
    // @ts-ignore
    if (!cloudConfigPayload) { return; }
    // @ts-ignore
    let content: T = {};
    if (cloudConfigPayload.files[filename]) {
        const contentStr = cloudConfigPayload.files[filename]!.content as string;
        content = JSON.parse(stripJSONComments(contentStr));
    }
    return content;
}

async function getCloudConfig(cloudConfigGist?: Gist): Promise<CloudConfigPayload> {
    if (!cloudConfigGist) {
        const { token: pat, username } = localconfig.get();
        if (cloudConfigGistId) {
            return gist.get(pat, cloudConfigGistId);
        }
        cloudConfigGist = await getCloudConfigGist(pat, username);
    }
    // @ts-ignore
    if (!cloudConfigGist) { return; }
    const mappedCloudConfig: CloudConfigPayload = Object.assign({}, {
        public: cloudConfigGist.public,
        description: cloudConfigGist.description,
        files: cloudConfigGist.files
    });
    return mappedCloudConfig;
}
async function getCloudConfigGist(pat: string, username: string, page?: number): Promise<Gist> {
    page = page || 0;
    if (cloudConfigGistId) { return gist.get(pat, cloudConfigGistId); }
    const gists = await gist.list(pat, username, page);
    if (gists.length) {
        for (const gist of gists) {
            const filenames = Object.keys(gist.files);
            if (filenames.indexOf(SYNC_SETTINGS_FILENAME) !== -1) {
                cloudConfigGistId = gist.id;
                break;
            }
        }
        if (cloudConfigGistId) {
            return gist.get(pat, cloudConfigGistId);
        } else {
            return getCloudConfigGist(pat, username, page + 1);
        }
    }
    // resolve null
    return Promise.resolve(null as any as Gist);
}


/**
 * Sync: 
 * Gets latest cloud configuration. If no configuration exists a new one is 
 * created locally. Keybindings, settings, extensions are synced in accordance 
 * to the latest information. The updated cloud configuration is uploaded. 
 */
export async function sync(): Promise<void> {
    const { token: pat, username } = localconfig.get();
    if (!pat) { return Promise.reject(new Error('Personal access token not configured!')); }
    if (!username) { return Promise.reject(new Error('Username not configured!')); }

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
            }
            updatePayloadLastUpdate(localPayload);
            const cloudConfigGist = await gist.create(pat, localPayload);
            cloudConfigGistId = cloudConfigGist.id;
            // return Promise.resolve();
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
             * Sync settings procedure
             */
            const syncSettingsMeta = localfiles.getUserSettingsMeta();
            let syncSettingsTouched;
            if (!syncSettingsMeta) {
                // if the local user 
                // settings DNE (fresh pulldown) or the settings were deleted.
                const cloudSyncSettings = await getSyncSettings(cloudConfigGist);
                localfiles.setSyncSettings(cloudSyncSettings);
                syncSettingsTouched = new Date();
            } else {
                syncSettingsTouched = syncSettingsMeta.mtime;
                if (cloudTouched > syncSettingsTouched) {
                    const cloudSyncSettings = await getSyncSettings(cloudConfigGist);
                    localfiles.setSyncSettings(cloudSyncSettings);
                }
                // otherwise do nothing.
            }

            /********************************************
             * Extensions procedure
             */
            const localExtensions = extensions.getAllLocallyInstalledExtensions();
            const extensionsPayload: extensions.ExtensionsPayload = await getExtensions(cloudConfigGist);
            const cloudExtensions = extensionsPayload.all;
            const cloudWhitelist = extensionsPayload.whitelists[utils.getComputerUniqueIdentifier()];

            // Get all cloud extensions and local extensions. Get local  - cloud 
            // and cloud - local

            if (cloudWhitelist) {
                // If whitelist exists:
                // |--- If there are any extensions that have been created after
                // |--- the whitelist update date then offer to download them and 
                // |--- add them to the whitelist.
                // |--- Ignore extensions (.all) created before the last whitelist
                // |--- update.
                const newExtensionsFromCloudAll = Object.keys(cloudExtensions)
                    .filter(extensionUid => {
                        const cloudExtCreatedAt = new Date(cloudExtensions[extensionUid].createdAt);
                        const whitelistLastUpdated = new Date(cloudWhitelist.lastUpdated);
                        return cloudExtCreatedAt > whitelistLastUpdated;
                    })
                    .map(extensionUid => cloudExtensions[extensionUid]);

                // newExtensionsFromCloudAll.push({
                //     alwaysInstall: false,
                //     createdAt: (new Date()).toISOString(),
                //     isActive: true,
                //     name: 'jake-plugin-new',
                //     publisher: 'ferrante',
                //     version: '0.0.1'
                // },
                //     {
                //         alwaysInstall: true,
                //         createdAt: (new Date()).toISOString(),
                //         isActive: true,
                //         name: 'jake-plugin-always-install',
                //         publisher: 'ferrante',
                //         version: '0.0.1'
                //     });

                if (newExtensionsFromCloudAll.length) {
                    const message = `There are ${newExtensionsFromCloudAll.length} extensions to be downloaded`;
                    // const opts = { modal: true };
                    const buttons: string[] = ['Download All', 'Choose Downloads', 'Cancel'];
                    await vscode.window.showInformationMessage(message, ...buttons)
                        .then(async answer => {
                            switch (answer) {
                                case 'Download All':
                                    const downloadPromises = newExtensionsFromCloudAll.map(extensionInfo => {
                                        const { publisher, name, version } = extensionInfo;
                                        return extensions.downloadExtensionToLocalDevice(publisher, name, version);
                                    })
                                    const report = await utils.promise.ensureAll(downloadPromises)

                                    // then make sure to add these new extensions to the device whitelist
                                    // nvm they should be added by virtue of the payload being generated post-download

                                    break;
                                case 'Choose Downloads':
                                    const pickableExtensionNames = newExtensionsFromCloudAll.map(extensionInfo => extensionInfo.name)
                                    await vscode.window.showQuickPick(pickableExtensionNames, { canPickMany: true })
                                        .then(async extensionNamePicks => {
                                            extensionNamePicks = extensionNamePicks || [];
                                            const downloadPromises = extensionNamePicks.map(extensionName => {
                                                const { publisher, name, version } = newExtensionsFromCloudAll[extensionName as any];
                                                return extensions.downloadExtensionToLocalDevice(publisher, name, version);
                                            });
                                            const report = await utils.promise.ensureAll(downloadPromises);
                                            // make sure to add these extension to the device whitelist
                                            // nvm they should be added by virtue of the payload being generated post-download
                                        })
                                    break;
                                case 'Cancel':
                                default: console.log('Extension downloads cancled or ignored')
                            }
                        })
                }
            } else {
                // If a whitelist does not exist
                // |--- Create a whitelist from local extensions and ask whch 
                // |--- extensions from .all to install and whitelist

                const whitelist = getLocalExtensionsWhitelist();
                // add items to whitelist, add whitelist to payload.
                // add new items to .all

                const localExtensionUids = Object.keys(whitelist)
                    .filter(extensionUidAndLastUpdated => extensionUidAndLastUpdated !== 'lastUpdated')

                const localExtensionUidsNotInCloudAll = Object.keys(cloudExtensions)
                    .filter(extensionUid => !localExtensionUids.indexOf(extensionUid))
                // add localExtensionUidsNotInCloudAll to all payload

            }

            /********************************************
             * Keybindings procedure
             */
            const keybindingsMeta = localfiles.getKeybindingsMeta();
            let keybindingsTouched: Date;
            if (!keybindingsMeta) {
                const cloudKeybindings = await getKeybindings(cloudConfigGist);
                localfiles.setKeybindings(cloudKeybindings);
                keybindingsTouched = new Date();
            } else {
                keybindingsTouched = keybindingsMeta.mtime;
                if (cloudTouched > keybindingsTouched) {
                    const cloudKeybindings = await getKeybindings(cloudConfigGist);
                    localfiles.setKeybindings(cloudKeybindings);
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
                const cloudUserSettings = await getUserSettings(cloudConfigGist);
                localfiles.setUserSettings(cloudUserSettings);
                userSettingsTouched = new Date();
            } else {
                userSettingsTouched = userSettingsMeta.mtime;
                if (cloudTouched > userSettingsTouched) {
                    const cloudUserSettings = await getUserSettings(cloudConfigGist);
                    localfiles.setUserSettings(cloudUserSettings);
                }
                // otherwise do nothing.
            }

            if (
                syncSettingsTouched > cloudTouched
                // || extensionsTouched > cloudTouched
                || keybindingsTouched > cloudTouched
                || userSettingsTouched > cloudTouched
            ) {
                // then overwrite everything in the cloud.
                const localPayload = getLocalConfigPayload(extensionsPayload);
                updatePayloadLastUpdate(localPayload);
                await gist.update(pat, cloudConfigGistId, localPayload);
            }
        }
    } catch (e) { return Promise.reject(e); }

    // Create payload from local files
    function getLocalConfigPayload(extensionsPayload?: extensions.ExtensionsPayload): CloudConfigPayload {
        const syncSettings = localfiles.getSyncSettings();
        const userSettings = localfiles.getUserSettings() || {};
        const keybindings = localfiles.getKeybindings() || {};
        const exts = buildExtensions(extensionsPayload) || {};
        const settingsStruct = {
            public: false,
            description: "Sync Settings",
            files: {
                'user-settings.json': {
                    content: JSON.stringify(userSettings, null, '\t'),
                },
                'keybindings.json': {
                    content: JSON.stringify(keybindings, null, '\t'),
                },
                '.sync-settings.json': {
                    content: JSON.stringify(syncSettings, null, '\t'),
                },
                'extensions.json': {
                    content: JSON.stringify(exts, null, '\t'),
                },
            }
        };
        return settingsStruct;

        function buildExtensions(currentExtensionsPayload?: extensions.ExtensionsPayload) {
            let currentAllExtensions: extensions.AllExtensions;
            if (currentExtensionsPayload)
                currentAllExtensions = currentExtensionsPayload.all;
            const computerUniqueIdentier = utils.getComputerUniqueIdentifier()
            const exts = extensions.getAllLocallyInstalledExtensions();
            const build = exts.reduce((acc, e) => {


                const extensionUniqueIdentier = `${e.publisher}:${e.name}`
                acc.all[extensionUniqueIdentier] = e;
                if (currentAllExtensions && currentAllExtensions[extensionUniqueIdentier]) {
                    acc.all[extensionUniqueIdentier].alwaysInstall = currentAllExtensions[extensionUniqueIdentier].alwaysInstall;
                }
                return acc;
            }, currentExtensionsPayload || {
                all: {},
                whitelists: {}
            } as extensions.ExtensionsPayload);
            build.whitelists[computerUniqueIdentier] = getLocalExtensionsWhitelist(exts);
            return build;
        }
    }

    /**
     * Builds and returns local device's whitelist. Retrieves extensions list 
     * from local extensions directory.
     * @param localExtensions optional list of extensions if already acquired. 
     */
    function getLocalExtensionsWhitelist(localExtensions?: extensions.Extension[]): extensions.Whitelist {
        localExtensions = localExtensions || extensions.getAllLocallyInstalledExtensions();
        const whitelist = localExtensions.reduce((acc, e) => {
            const extensionUniqueIdentier = `${e.publisher}:${e.name}`;
            acc[extensionUniqueIdentier] = {
                version: e.version,
                isActive: e.isActive
            }
            return acc;
        }, {} as extensions.Whitelist);
        return whitelist;
    }

    function updatePayloadLastUpdate(localPayload: CloudConfigPayload) {
        const syncSettings = JSON.parse(localPayload.files['.sync-settings.json']!.content);
        const now = new Date();
        syncSettings.lastUpdatedUTC = now.toUTCString();
        syncSettings.lastUpdatedLocal = now.toString();
        localPayload.files['.sync-settings.json']!.content = JSON.stringify(syncSettings, null, '\t');
    }
}

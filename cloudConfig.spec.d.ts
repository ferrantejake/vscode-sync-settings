type cloudConfigSpec = cloudConfigSpecv1;
type cloudConfigSpecv1 = {
    files: {
        '.sync-settings.json': {
            extensionVersion: string,
            lastUpdatedUTC: string,                     // ISO date format.
            lastUpdatedLocal: string                    // ISO date format.
        },
        'extensions.json': {
            all: {
                [uniqueIdentifier: string]: {           // unique identifier format: `publisher:name`.
                    alwaysInstall: boolean              // Should the extension always install across all devices?
                                                        // If set to true this will override any device whitelist.
                    name: string,
                    publisher: string,
                    version: string,
                    isActive: boolean,
                    createdAt: string                   // ISO date format. The date when this extension was noticed by
                                                        // SyncSettings.
                }
            },
            whitelists: {
                [uniqueIdentifier: string]: {           // unique identiier: `computerName:uniqueHash`.
                    lastUpdated: string                 // ISO date string. Last time this whitelist entry was synced
                                                        // with SyncSettings (created/modified).
                } & {
                    [uniqueIdentifier: string]: {       // unique identifier format: `publisher:name`.
                        version: string,
                        isActive: boolean
                    }
                }
            }

        },
        'keybindings.json': [{
            key: string,
            command: string,
            when: string
        }],
        'user-settings.json': {
            [key: string]: any | any[]
        }
    }
}

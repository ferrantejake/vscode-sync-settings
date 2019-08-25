type cloudConfigSpec = cloudConfigSpecv1;
type cloudConfigSpecv1 = {
    files: {
        '.sync-settings.json': {
            extensionVersion: string,
            lastUpdatedUTC: string, // ISO date format
            lastUpdatedLocal: string // ISO date format
        },
        'extensions.json': {
            all: {
                // unique identifier format: `publisher:name`
                [uniqueIdentifier: string]: {
                    name: string,
                    publisher: string,
                    version: string,
                    isActive: boolean,
                    createdAt: string // ISO date format.
                }
            },
            whitelists: {
                // unique identiier: `computerName:uniqueHash`
                [uniqueIdentifier: string]: {
                    lastUpdated: string // ISO date string,
                } & {
                    // unique identifier format: `publisher:name`
                    [uniqueIdentifier: string]: {
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

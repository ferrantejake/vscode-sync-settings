import * as vscode from 'vscode';
import { request, localfiles } from '.';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
// var extractzip = require('extract-zip');

export type Extension = {
    isActive: boolean;
    name: string;
    version: string;
    publisher: string;
    // uniqueId: string // `${publisher};${name};${version}`
    createdAt: string
};

export type ExtensionPackage = {
    name: string,
    version: string,
    publisher: string;
};

// export type ExtensionsStructure = {
//     all: {
//         [uniqueIdentifier: string]: {
//             alwaysInstall: boolean
//             name: string,
//             publisher: string,
//             version: string,
//             isActive: boolean,
//             createdAt: string
//         }
//     }
//     whitelists: {
//         // device identifier
//         [uniqueIdentifier: string]: Whitelist
//     }
// }

export type ExtensionsPayload = {
    all: AllExtensions,
    whitelists: Whitelists
}
export type AllExtensions = {
    [uniqueIdentifier: string]: AllExtension
}
export type AllExtension = {           // unique identifier format: `publisher:name`.
    alwaysInstall?: boolean              // Should the extension always install across all devices?
    // If set to true this will override any device whitelist.
    name: string,
    publisher: string,
    version: string,
    isActive: boolean,
    createdAt: string                   // ISO date format. The date when this extension was noticed by
    // SyncSettings.
}
export type Whitelists = {
    [uniqueIdentifier: string]: Whitelist
}
export type Whitelist = {
    lastUpdated: string
} & {
    [uniqueIdentifier: string]: { // extension identifier
        version: string,
        isActive: boolean
    }
}

export function getAllLocallyInstalledExtensions(): Extension[] {
    const createdAt = (new Date()).toISOString();  // temp
    return vscode.extensions.all
        .map(extension => {
            const { isActive, packageJSON } = extension;
            const { name, version, publisher } = packageJSON as ExtensionPackage;
            const e: Extension = {
                isActive,
                name,
                version,
                publisher,
                // uniqueId: `${publisher};${name};${version}`
                createdAt
            };
            return e;
        })
        .filter(e => e.publisher !== 'vscode')
}

export function getMarketplaceDownloadUri(publisher: string, name: string, version: string) {
    const marketplaceBaseUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers';
    const packagePath = `/${publisher}/vsextensions/${name}/${version}/vspackage`;
    return new url.URL(path.join(marketplaceBaseUrl, packagePath)).toString();
}

export async function downloadExtensionToLocalDevice(publisher: string, name: string, version: string) {
    console.log(`Downloading extension: ${publisher} ${name} ${version}`);

    const extensionDirLoc = localfiles.getExtensionsDirectoryLocation();
    if (!extensionDirLoc) {
        throw new Error('Could not determine extensions directory location');
    }
    const zipFileName = `${publisher};${name};${version}.zip`;
    const zipFilePath = path.join(extensionDirLoc, zipFileName);
    const extensionsDirectoryName = `${publisher}.${name}-${version}`;
    const extensionDirectoryPath = path.join(extensionDirLoc, extensionsDirectoryName);

    if (fs.existsSync(extensionDirectoryPath)) {
        // Directory already exists?
        // Maybe we need to remove the directory and download the 
        console.log(`Already exists: ${publisher} ${name} ${version}`);
        return Promise.resolve(); // file already exists
    }
    if (fs.existsSync(zipFilePath)) {
        // proceeded to unzip
        // unzip(zipFilePath, extensionDirectoryPath);
        fs.unlinkSync(zipFilePath);
        // return Promise.resolve();
    }


    return new Promise(async (resolve, reject) => {
        try {
            const downloadUri = getMarketplaceDownloadUri(publisher, name, version);
            const options: request.RequestOptions = {
                method: 'GET',
                url: downloadUri,
                headers: {
                    Accept: 'text/html,application',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                gzip: true
            };
            const streamResponse = await request.stream(options)
                .catch(error =>
                    console.log(error)
                );
            if (!streamResponse) {
                return reject(new Error('Unable to stream file contents'));
            }

            // redhat;java;0.47.0

            // streamResponse.stream.on('ready' => {});

            const ws = fs.createWriteStream(zipFilePath, { encoding: 'utf-8' });


            if ((ws as fs.WriteStream & { pending: boolean }).pending) {
                ws.on('ready', () => ws.pipe(streamResponse.stream));
            } else {
                streamResponse.stream.pipe(ws);
            }
            streamResponse.stream.on('data', e => {
                return;
            });
            ws.on('close', async () => {
                console.log('writer emitted "close" event');
                try {
                    await installExtension(zipFilePath, extensionDirectoryPath);
                    console.log(`Download complete: ${publisher} ${name} ${version}`);
                    resolve();
                } catch (e) {
                    console.log('e', e);
                    reject(e);
                }
            });
            // ws.on('finish', () => {
            //     console.log('writer emitted "finish" event');
            // });
            ws.on('error', e => {
                console.log('e', e);
                reject(e);
            });
        } catch (e) {
            throw e;
        }
    });

}

/**
 * Moves .zip file over to .vsix and installes using code tooling
 * @param zipFilePath 
 * @param extensionDirectoryPath 
 */
function installExtension(zipFilePath: string, extensionDirectoryPath: string) {
    // move zip to vsix
    const vsixFilePath = zipFilePath.substr(0, zipFilePath.length - 3).concat('vsix');
    fs.renameSync(zipFilePath, vsixFilePath);

    // install vsix using code tooling (code --install-extension <vsixpath>)
    // vscode.env.

    return Promise.resolve();
    // reload suggestion is done higher up    
}

export function removeExtensionFromLocalDevice(publisher: string, name: string, version: string) {

}
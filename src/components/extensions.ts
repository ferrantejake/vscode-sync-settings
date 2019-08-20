import * as vscode from 'vscode';
import { request, localfiles } from '.';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
var extractzip = require('extract-zip');

export type Extension = {
    isActive: boolean;
    name: string;
    version: string;
    publisher: string;
    // uniqueId: string // `${publisher};${name};${version}`
};

export type ExtensionPackage = {
    name: string,
    version: string,
    publisher: string;
};


export function getAllLocallyInstalledExtensions(): Extension[] {
    return vscode.extensions.all.map(extension => {
        const { isActive, packageJSON } = extension;
        const { name, version, publisher } = packageJSON as ExtensionPackage;
        const e: Extension = {
            isActive,
            name,
            version,
            publisher,
            // uniqueId: `${publisher};${name};${version}`
        };
        return e;
    });
}

export function getMarketplaceDownloadUri(publisher: string, name: string, version: string) {
    const marketplaceBaseUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers';
    const packagePath = `/${publisher}/vsextensions/${name}/${version}/vspackage`;
    return new url.URL(path.join(marketplaceBaseUrl, packagePath)).toString();
}

export async function downloadExtensionToLocalDevice(publisher: string, name: string, version: string) {
    // localfiles.getExtensions;

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
            ws.on('close', () => {
                console.log('writer emitted "close" event');
                unzipfn(zipFilePath, extensionDirectoryPath)
                    .then(() => {
                        fs.unlinkSync(zipFilePath);
                        console.log('operation complete');
                        resolve();
                    })
                    .catch(e => {
                        console.log('e', e)
                        reject(e);
                    });
            });
            // ws.on('finish', () => {
            //     console.log('writer emitted "finish" event');
            // });
            ws.on('error', e => {
                console.log('e', e)
                reject(e);
            });
        } catch (e) {
            throw e;
        }
    });

}

function unzipfn(inzip: string, outdir: string) {
    return new Promise((resolve, reject) => {
        extractzip(inzip, { dir: outdir }, function (e: Error) {
            if (e) return reject(e);
            return resolve();
            // extraction is complete. make sure to handle the err
        })
        // const rs = fs.createReadStream(inzip)
        //     .pipe((unzip as any).Extract({ path: outdir }));
        // rs.on('close', () => resolve());
        // rs.on('error', (e: any) => reject(e));
    });
}

export function removeExtensionFromLocalDevice(publisher: string, name: string, version: string) {

}
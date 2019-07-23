import * as vscode from 'vscode';
import { request, localfiles } from '.';

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
    return `${marketplaceBaseUrl}/${publisher}/vsextensions/${name}/${version}/vspackage`;
}

export async function downloadExtensionToLocalDevice(publisher: string, name: string, version: string) {
    localfiles.getExtensions
    
    const localExtensionsDir = '';
    const downloadUri = getMarketplaceDownloadUri(publisher, name, version);
    try {
        const options: request.RequestOptions = { uri: downloadUri };
        const streamResponse = await request.stream(options);


        // [
        //     {
        //         "area": "MarketPlace",
        //         "feature": "Download",
        //         "properties": {
        //             "GalleryUserId": "62aec1f0-b2ef-402e-a0bb-841d022d2ca1",
        //             "IsPublic": true,
        //             "ItemCategory": "[\"Tools\",\"Tools/Coding\"]",
        //             "ItemId": "VisualStudioExptTeam.VSIntelliCode",
        //             "ItemType": "VS",
        //             "PriceCategory": "Free",
        //             "Referrer": "marketplace.visualstudio.com",
        //             "SessionId": "2ba36dfc-f605-41cd-834e-a5520fffe512"
        //         }
        //     }
        // ]


    } catch (e) {
        throw e;
    }
}

export function removeExtensionFromLocalDevice(publisher: string, name: string, version: string) {

}
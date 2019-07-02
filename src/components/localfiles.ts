import * as stripJSONComments from 'strip-json-comments';
import * as fs from 'fs';
import * as vscode from 'vscode';

const possibleUserSettingsLocations = [
    `${process.env.APPDATA}\\Code\\User\\settings.json`,
    `${process.env.APPDATA}\\Code - Insiders\\User\\settings.json`,
    `${process.env.HOME}/Library/Application Support/Code/User/settings.json`,
    `${process.env.HOME}/Library/Application Support/Code - Insiders/User/settings.json`,
    `${process.env.HOME}/.config/Code/User/settings.json`,
    `${process.env.HOME}/.config/Code - Insiders/User/settings.json`
];

const possibleKeybindingsSettingsLocations = [
    `${process.env.APPDATA}\\Code\\User\\keybindings.json`,
    `${process.env.APPDATA}\\Code - Insiders\\User\\keybindings.json`,
    `${process.env.HOME}/Library/Application Support/Code/User/keybindings.json`,
    `${process.env.HOME}/Library/Application Support/Code - Insiders/User/keybindings.json`,
    `${process.env.HOME}/.config/Code/User/keybindings.json`,
    `${process.env.HOME}/.config/Code - Insiders/User/keybindings.json`
];

const possibleSyncSettingsLocations = [
    `${process.env.APPDATA}\\Code\\User\\sync-settings.json`,
    `${process.env.APPDATA}\\Code - Insiders\\User\\sync-settings.json`,
    `${process.env.HOME}/Library/Application Support/Code/User/sync-settings.json`,
    `${process.env.HOME}/Library/Application Support/Code - Insiders/User/sync-settings.json`,
    `${process.env.HOME}/.config/Code/User/sync-settings.json`,
    `${process.env.HOME}/.config/Code - Insiders/User/sync-settings.json`
];


export function setSyncSettings(syncSettingsJson: any) {
    const loc = getWriteLocalFilePath(possibleSyncSettingsLocations);
    return fs.writeFileSync(loc, JSON.stringify(syncSettingsJson));
}

export function setUserSettings(userSettingsJson: any) {
    const loc = getWriteLocalFilePath(possibleUserSettingsLocations);
    return fs.writeFileSync(loc, JSON.stringify(userSettingsJson));
}

export function setKeybindings(keybindingsJson: any) {
    const loc = getWriteLocalFilePath(possibleKeybindingsSettingsLocations);
    return fs.writeFileSync(loc, JSON.stringify(keybindingsJson));
}

function getWriteLocalFilePath(possibleLocations: string[]) {
    let i = 0;
    switch (process.platform) {
        case 'win32': break;
        case 'darwin': i = 2; break;
        default: i = 4;
    }
    if (vscode.version.includes('-insiders')) { i++; }
    return possibleLocations[i];
}

export function getSyncSettings() {
    const syncSettings = getJSONFile(possibleSyncSettingsLocations);
    return syncSettings;
}

export function getSyncSettingsMeta() {
    const loc = getFileLocation(possibleSyncSettingsLocations);
    if (!loc) return;
    return fs.statSync(loc);
}
export function getUserSettings() {
    const userSettings = getJSONFile(possibleUserSettingsLocations);
    return userSettings;
}

export function getUserSettingsMeta() {
    const loc = getFileLocation(possibleUserSettingsLocations);
    if (!loc) { return; }
    return fs.statSync(loc);
}

export function getKeybindings() {
    const keybindings = getJSONFile(possibleKeybindingsSettingsLocations);
    return keybindings;
}

export function getKeybindingsMeta() {
    const loc = getFileLocation(possibleKeybindingsSettingsLocations);
    if (!loc) { return; }
    return fs.statSync(loc);
}


export function getJSONFile(possibleLocations: string[]) {
    let loc = getFileLocation(possibleLocations);
    if (!loc) { return; }
    let contents = fs.readFileSync(loc, 'ascii');
    if(!contents || contents === '') return null; 
    contents = stripJSONComments(contents);
    return JSON.parse(contents);
}


export function getFileLocation(possibleLocations: string[]) {
    let target;
    for (const loc of possibleLocations) {
        const exists = fs.existsSync(loc);
        if (exists) {
            target = loc;
            break;
        }
    }
    return target;
}

function hasUserSettings(): boolean {
    return (Object.keys(getUserSettings()).length !== 0);
}

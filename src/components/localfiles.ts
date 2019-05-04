import * as stripJSONComments from 'strip-json-comments';
import * as fs from 'fs';

export function getUserSettings() {
    const settingsLocations = [
        `${process.env.APPDATA}\\Code\\User\\settings.json`,
        `${process.env.APPDATA}\\Code - Insiders\\User\\settings.json`,
        `${process.env.HOME}/Library/Application Support/Code/User/settings.json`,
        `${process.env.HOME}/Library/Application Support/Code - Insiders/User/settings.json`,
        `${process.env.HOME}/.config/Code/User/settings.json`,
        `${process.env.HOME}/.config/Code - Insiders/User/settings.json`
    ];
    const userSettings = getJSONFile(settingsLocations);
    return userSettings;
}

export function getKeybindings() {
    const settingsLocations = [
        `${process.env.APPDATA}\\Code\\User\\keybindings.json`,
        `${process.env.APPDATA}\\Code - Insiders\\User\\keybindings.json`,
        `${process.env.HOME}/Library/Application Support/Code/User/keybindings.json`,
        `${process.env.HOME}/Library/Application Support/Code - Insiders/User/keybindings.json`,
        `${process.env.HOME}/.config/Code/User/keybindings.json`,
        `${process.env.HOME}/.config/Code - Insiders/User/keybindings.json`
    ];
    const keybindings = getJSONFile(settingsLocations);
    return keybindings;
}

export function getJSONFile(possibleLocations: string[]) {
    let target = '';
    for (const loc of possibleLocations) {
        const exists = fs.existsSync(loc);
        if (exists) {
            target = loc;
            break;
        }
    }
    if (!target) { return undefined; }
    let contents = fs.readFileSync(target, 'ascii');
    contents = stripJSONComments(contents);
    return JSON.parse(contents);
}

function hasUserSettings(): boolean {
    return (Object.keys(getUserSettings()).length !== 0);
}

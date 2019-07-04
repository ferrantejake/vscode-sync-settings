import * as vscode from 'vscode';
import {
	request,
	cloudconfig,
	localconfig,
	storage,
	token,
} from './components';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sycnsettings" is now active!');
	await storage.initiateStorage(context.globalStoragePath);
	const commands: { [key: string]: () => void } = {
		'extension.openPATPage': openPATPage,
		'extension.editPAT': editPAT,
		'extension.syncSettings': syncSettings,
	};
	let disposables = Object.keys(commands).map(cmd => vscode.commands.registerCommand(cmd, commands[cmd]));
	context.subscriptions.push(...disposables);
}

export function deactivate() { }

function openPATPage() {
	vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens/new'));
}

async function editPAT() {
	const pat = await vscode.window.showInputBox();
	if (!pat) { return; }
	const opts: request.RequestOptions = {
		url: 'https://api.github.com/user',
		headers: {
			'Authorization': `token ${pat}`,
			'User-Agent': 'Sync-Settings'
		}
	};
	const res = await request.get(opts);
	if (res.statusCode === 200) {
		// save token
		vscode.window.showInformationMessage('Sync Settings: personal access token saved.');
		token.set(pat);
		localconfig.add({ username: res.body.login, });
	} else {
		vscode.window.showErrorMessage('Invalid Github personal access token.');
	}
}

async function syncSettings() {
	syncSettingsBackground()
		.then(() => vscode.window.showInformationMessage('Sync Settings: sync successful'));
}

async function syncSettingsBackground() {
	try {
		await cloudconfig.sync();
	} catch (e) {
		vscode.window.showErrorMessage(e);
	}
}
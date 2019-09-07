import * as vscode from 'vscode';
import {
	request,
	cloudconfig,
	localconfig,
	storage,
	token,
	extensions
} from './components';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sycnsettings" is now active!');
	await storage.initiateStorage(context.globalStoragePath);
	const commands: { [key: string]: () => void } = {
		'extension.openPATPage': openPATPage,
		'extension.editPAT': editPAT,
		'extension.syncSettings': syncSettings,
		'extension.downloadExtension': downloadExtension,
	};
	let disposables = Object.keys(commands).map(cmd => vscode.commands.registerCommand(cmd, commands[cmd]));
	context.subscriptions.push(...disposables);
}

export function deactivate() { }

function openPATPage() {
	vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens/new'))
}
async function editPAT() {
	let options: vscode.InputBoxOptions = {
		prompt: "Label: ",
		placeHolder: "(placeholder)",
	}



	await vscode.window.showQuickPick(['jake', 'ferrante'], { canPickMany: true})
		.then(console.log);

	// const message = "There are 7 extensions to be downloaded";
	// // const opts = { modal: true };
	// const buttons: string[] = ['Download', 'Cancel'];
	// vscode.window.showInformationMessage(message, ...buttons)
	// 	.then(console.log)

	// const ib = vscode.window.createInputBox()
	// // const qib = vscode.window.
	// // const qibs; // = new vscode.QuickInputButtons()
	// // const ib: vscode.Quic
	// // ib.buttons = buttons;
	// ib.show()

	// // ib.
	// ib.onDidTriggerButton(button => {
	// 	console.log(button)
	// })
	// ib.title = 'title'
	// ib.value = 'value'
	// ib.show();

	console.log('outtie');
	

	// vscode.window.showInputBox(options)
	// 	.then(value => {
	// 		if (!value) return;
	// 		const answer1 = value;
	// 		// show the next dialog, etc.
	// 	});
}

async function editPAT2() {
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
	return cloudconfig.sync()
		.catch(error => vscode.window.showErrorMessage(`Sync Settings: ${error.message}`));
}

async function downloadExtension() {
	const uid = await vscode.window.showInputBox();
	if (!uid) { return; }
	const [publisher, name, version] = uid.trim().split(';');
	extensions.downloadExtensionToLocalDevice(publisher, name, version);
}
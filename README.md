# VSCode Sync Settings
Synchronize your Visual Studio Code settings across multiple computers 

## Setup Extension
1. Create a Github Personal Access Token (PAT) with permissions to read/write gists.
2. Open the Visual Studio Code command pallet (F1) and type "VSCode Sync Settings: Add/Edit Github Personal Access Token"
    - Enter PAT here
3. Open Visual Studio Code command pallet and type "VSCode Sync Settings: Sync Settings" to manually sync settings.


## Features
- [ ] Move over to another, lighter request library
- [ ] Add settings/keybindings blacklist
- [ ] Diff conflicts for user
- [ ] Automated sync based on local file changes / polling
- [x] Cloud-managed extensions
- [x] Device-speicfic extension whitelists
- [x] Extensions which should always install without asking
- [ ] Session-backed extension downloads (prevents/fixes corrupt downloads)

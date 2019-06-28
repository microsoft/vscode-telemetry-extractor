cd src
mkdir telemetry-sources
cd telemetry-sources

git config --system core.longpaths true

git clone --depth 1 https://github.com/Microsoft/vscode-extension-telemetry.git
git clone --depth 1 https://github.com/Microsoft/vscode-chrome-debug-core.git
git clone --depth 1 https://github.com/Microsoft/vscode-chrome-debug.git
git clone --depth 1 https://github.com/Microsoft/vscode-node-debug2.git
git clone --depth 1 https://github.com/Microsoft/vscode-node-debug.git
git clone --depth 1 https://github.com/Microsoft/vscode-docker.git
git clone --depth 1 https://github.com/Microsoft/vscode-go.git
git clone --depth 1 https://github.com/Microsoft/vscode-azure-account.git
git clone --depth 1 https://github.com/Microsoft/vscode-html-languageservice.git
git clone --depth 1 https://github.com/Microsoft/vscode-json-languageservice.git
git clone --depth 1 https://github.com/Microsoft/vscode-mono-debug.git
git clone --depth 1 https://github.com/Microsoft/TypeScript.git

import * as vscode from "vscode";
import open from "open";
import path from "path";

interface PathMapping {
  remotePrefix: string;
  networkPath: string;
  prefixToStrip?: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Remote-SSH reveal Explorer extension is now active!');
  console.log('Extension context:', context.extensionPath);

  let disposable = vscode.commands.registerCommand('remote-ssh-reveal-explorer.revealInExplorer', async function (arg) {
    let remotePath: string | undefined;

    if (arg instanceof vscode.Uri) {
      console.log(`Right-clicked file: ${arg.fsPath}`);
      remotePath = arg.fsPath;
    } else {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const doc = editor.document;
        console.log(`Shortcut on active file: ${doc.uri.fsPath}`);
        remotePath = doc.uri.fsPath;
      } else {
        console.log('No editor is active');
        remotePath = undefined;
      }
    }

    if (!remotePath) {
      console.log('No remote path specified');
      vscode.window.showErrorMessage('No file or folder selected');
      return;
    }

    console.log('Reveal in Explorer command executed with path:', remotePath);
    console.log('File path:', remotePath);

    const dirPath = path.dirname(remotePath);
    console.log('Remote directory path:', dirPath);

    const localPath = networkPath(dirPath);
    console.log('Local network path:', localPath);

    try {
      await open(localPath);
      vscode.window.showInformationMessage(`Opened folder: ${localPath}`);
    } catch (error) {
      console.error('Error opening explorer:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to open folder: ${localPath}. Error: ${errorMessage}`);
    }
  });

  let testDisposable = vscode.commands.registerCommand('remote-ssh-reveal-explorer.test', function () {
    console.log('Test command executed');
    vscode.window.showInformationMessage('Extension is working!');
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(testDisposable);
  console.log('Commands registered successfully');
}

function networkPath(remotePath: string): string {
  const config = vscode.workspace.getConfiguration("remote-ssh-reveal-explorer");
  const pathMappings = config.get<PathMapping[]>("pathMappings", []);

  console.log('Path mappings:', JSON.stringify(pathMappings));
  console.log('Remote path:', remotePath);

  const isWindowsRemote = isWindowsPath(remotePath);
  console.log('Is Windows remote:', isWindowsRemote);

  for (const mapping of pathMappings) {
    console.log('Checking mapping:', mapping.remotePrefix, '->', mapping.networkPath);
    
    const matches = isWindowsRemote 
      ? remotePath.toLowerCase().startsWith(mapping.remotePrefix.toLowerCase())
      : remotePath.startsWith(mapping.remotePrefix);
    
    if (matches) {
      const actualPrefixLength = isWindowsRemote 
        ? mapping.remotePrefix.length
        : mapping.remotePrefix.length;
      
      let strippedPath = remotePath.slice(actualPrefixLength);
      console.log('Stripped path after remotePrefix:', strippedPath);

      if (mapping.prefixToStrip) {
        const prefixMatches = isWindowsRemote
          ? strippedPath.toLowerCase().startsWith(mapping.prefixToStrip.toLowerCase())
          : strippedPath.startsWith(mapping.prefixToStrip);
        
        if (prefixMatches) {
          strippedPath = strippedPath.slice(mapping.prefixToStrip.length);
          console.log('Stripped path after prefixToStrip:', strippedPath);
        }
      }

      const result = `${mapping.networkPath}${strippedPath}`;
      console.log('Mapped result:', result);
      return result;
    }
  }

  console.log('No mapping matched, using fallback configuration');
  const prefixToStrip = config.get<string>("pathPrefixToStrip", "");
  
  let remotepathWithoutPrefix = remotePath;
  if (prefixToStrip) {
    const matches = isWindowsRemote
      ? remotePath.toLowerCase().startsWith(prefixToStrip.toLowerCase())
      : remotePath.startsWith(prefixToStrip);
    
    if (matches) {
      remotepathWithoutPrefix = remotePath.slice(prefixToStrip.length);
    }
  }

  const networkPathConfig = config.get<string>("networkPath", "");
  const result = `${networkPathConfig}${remotepathWithoutPrefix}`;
  console.log('Fallback result:', result);
  return result;
}

function isWindowsPath(filePath: string): boolean {
  const windowsPathRegex = /^[A-Za-z]:[\\/]/;
  return windowsPathRegex.test(filePath);
}

export function deactivate() { }
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');

const windows = new Set();

const getFileFromUser = exports.getFileFromUser = (targetWindow) => {
    const files = dialog.showOpenDialog({
        targetWindow,
        properties: ['openFile'],
        filters: [
            { name: 'All files', extensions: ['*'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] },
            { name: 'Text Files', extensions: ['txt'] },
        ]
    });

    if (files) { openFile(targetWindow, files); }
}

const openFile = (targetWindow, files) => {
    const file = files[0];
    const content = fs.readFileSync(file).toString();

    targetWindow.setRepresentedFilename(file); // macOS file edited icon
    targetWindow.webContents.send('file-opened', file, content);
}

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    const file = dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    });
    if (!file) return;
    fs.writeFileSync(file, content);
};
const createWindow = exports.createWindow = () => {
    let x, y;

    const currentWindow = BrowserWindow.getFocusedWindow();

    if (currentWindow) {
        const [currentWindowX, currentWindowY] = currentWindow.getPosition();

        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    let newWindow = new BrowserWindow({
        x,
        y,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // mainWindow.loadURL(`file://${__dirname}//index.html`);
    newWindow.loadFile('app/index.html');

    newWindow.once('ready-to-show', () => {
        newWindow.show();
        // mainWindow.webContents.openDevTools();
    });

    newWindow.on('closed', () => {
        windows.delete(newWindow);
    });

    windows.add(newWindow);
    return newWindow;
}

app.on('ready', () => {
    createWindow();
})

// macOs specific: not close app if all windows are closed
app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return false;
    }

    app.quit();
});
app.on('activate', (e, hasVisibleWindows) => {
    if (!hasVisibleWindows) { createWindow(); }
})
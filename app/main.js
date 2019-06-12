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
    app.addRecentDocument(file);
    targetWindow.setRepresentedFilename(file); // macOS file edited icon
    targetWindow.webContents.send('file-opened', file, content);
}

const saveMarkdown = exports.saveMarkdown = (targetWindow, filePath, content) => {
    if (!filePath) {
        filePath = dialog.showSaveDialog(targetWindow, {
            title: 'Save Markdown',
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown'] }
            ]
        });
    }
    if (!filePath) return;
    fs.writeFileSync(filePath, content);
    openFile(targetWindow, [filePath]);
};

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    const filePath = dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    });
    if (!filePath) return;
    fs.writeFileSync(filePath, content);
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

app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        const win = createWindow();
        win.once('ready-to-show', () => {
            openFile(win, file);
        });
    });
});

app.on('ready', () => {
    createWindow();
});

app.on('activate', (e, hasVisibleWindows) => {
    if (!hasVisibleWindows) { createWindow() }
});

// macOs specific: not close app if all windows are closed
app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return false;
    }

    app.quit();
});
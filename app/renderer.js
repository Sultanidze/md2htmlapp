const { remote, ipcRenderer } = require('electron');
const { dialog } = remote;
const main = remote.require('./main');
const currentWindow = remote.getCurrentWindow();
const marked = require('marked');
const path = require('path');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

const updateUserInterface = (isEdited) => {
    const defaultTitle = document.querySelector('title').innerText || 'markdownTOhtml';

    let title = defaultTitle;

    if (filePath) {
        title = `${path.basename(filePath)} - ${defaultTitle}`;
    }
    if (isEdited) {
        title = `${title}*`
    }

    currentWindow.setTitle(`${title}`);

    saveMarkdownButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;
}

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked(markdown, { sanitize: true });
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
    const isFileEdited = currentContent !== originalContent;
    currentWindow.setDocumentEdited(isFileEdited); // macOS
    updateUserInterface(isFileEdited);
});
newFileButton.addEventListener('click', () => {
    main.createWindow();
});
openFileButton.addEventListener('click', () => {
    main.getFileFromUser(currentWindow);
});
saveMarkdownButton.addEventListener('click', () => {
    main.saveMarkdown(currentWindow, filePath, markdownView.value);
});
revertButton.addEventListener('click', () => {
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
    updateUserInterface(false);
});
saveHtmlButton.addEventListener('click', () => {
    main.saveHtml(currentWindow, htmlView.innerHTML);
});
ipcRenderer.on('file-opened', (e, file, content) => {
    filePath = file;
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = content;
    originalContent = tempTextarea.value;

    updateUserInterface(false);

    markdownView.value = content;
    renderMarkdownToHtml(content);
});

window.addEventListener('beforeunload', event => {
    event.returnValue = false;

    if (markdownView.value !== originalContent) {
        setTimeout(() => {
            const result = dialog.showMessageBox(currentWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your changes will be lost if you do not save.',
                buttons: [
                    'Quit Anyway',
                    'Cancel'
                ],
                defaultId: 1,
                cancelId: 0
            });

            if (result === 0) {
                currentWindow.destroy();
            }
        }, 0);
    } else {
        currentWindow.destroy();
    }
});

// drag and drop
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const getDraggedFile = event => event.dataTransfer.items[0];
const getDropdedFile = event => event.dataTransfer.files[0];

const fileTypeIsSupported = file => {
    console.log(file.type);
    return ['text/plain', 'text/markdown', ''].includes(file.type); // md files in windows have empty type
}

markdownView.addEventListener('dragover', event => {
    const file = getDraggedFile(event);

    if (fileTypeIsSupported(file)) {
        markdownView.classList.add('drag-over');
    } else {
        markdownView.classList.add('drag-error');
    }
})
markdownView.addEventListener('dragleave', event => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
})

markdownView.addEventListener('drop', event => {
    const file = getDropdedFile(event);

    if (fileTypeIsSupported(file)) {
        main.openFile(currentWindow, [file.path])
    } 
    // else {
        
    // }
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
})
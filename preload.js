const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  parseDirectory: (dirPath) => ipcRenderer.invoke('parse-directory', dirPath),
  parseFile: (filePath) => ipcRenderer.invoke('parse-file', filePath),
  parseFiles: (filePaths) => ipcRenderer.invoke('parse-files', filePaths),
  setUserPhone: (phone) => ipcRenderer.invoke('set-user-phone', phone),
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  getTimeAnalysis: () => ipcRenderer.invoke('get-time-analysis'),
  generateReport: () => ipcRenderer.invoke('generate-report'),
  clearData: () => ipcRenderer.invoke('clear-data')
});

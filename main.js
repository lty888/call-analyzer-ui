const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { CallAnalyzer } = require('./analyzer.js');

let mainWindow;
let analyzer = new CallAnalyzer();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f5f5'
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 打开文件夹选择对话框
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// 打开文件选择对话框
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

// 解析目录
ipcMain.handle('parse-directory', async (event, dirPath) => {
  try {
    analyzer.calls = [];
    analyzer.parseDirectory(dirPath);
    return { success: true, count: analyzer.calls.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 解析单个文件
ipcMain.handle('parse-file', async (event, filePath) => {
  try {
    analyzer.calls = [];
    const calls = analyzer.parseCSV(filePath);
    analyzer.calls = calls;
    return { success: true, count: calls.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 批量解析文件
ipcMain.handle('parse-files', async (event, filePaths) => {
  try {
    analyzer.calls = [];
    for (const filePath of filePaths) {
      const calls = analyzer.parseCSV(filePath);
      analyzer.calls.push(...calls);
    }
    return { success: true, count: analyzer.calls.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 设置用户号码
ipcMain.handle('set-user-phone', async (event, phone) => {
  analyzer.setUserPhone(phone);
  return { success: true };
});

// 获取统计数据
ipcMain.handle('get-statistics', async () => {
  return analyzer.getStatistics();
});

// 获取联系人分析
ipcMain.handle('get-contacts', async () => {
  return analyzer.getContactAnalysis();
});

// 获取时间分析
ipcMain.handle('get-time-analysis', async () => {
  return analyzer.getTimeAnalysis();
});

// 生成完整报告
ipcMain.handle('generate-report', async () => {
  return analyzer.generateMarkdownReport();
});

// 清除数据
ipcMain.handle('clear-data', async () => {
  analyzer.calls = [];
  analyzer.userPhone = '';
  return { success: true };
});

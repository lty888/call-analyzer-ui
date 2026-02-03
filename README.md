# 📱 话单分析工具 (UI版)

Windows 桌面应用 - 中国移动话单批量分析工具，支持通话统计、联系人分析、时间分析。

## ✨ 功能特性

- 📊 **通话统计** - 总通话次数、时长、主被叫分析
- 👥 **联系人分析** - 通话频次排名、陌生人识别、高频联系人
- ⏰ **时间分析** - 通话高峰时段、熬夜党分析、星期分布
- 📁 **批量处理** - 支持同时分析多个话单文件
- 🎨 **美观界面** - 现代化 UI 设计

## 📦 下载安装

### 方法一：下载打包好的安装包

前往 [GitHub Releases](https://github.com/lty888/call-analyzer-ui/releases) 下载：

- `call-analyzer-ui Setup 1.0.0.exe` - Windows 安装包
- `call-analyzer-ui 1.0.0.exe` - 单文件版本

### 方法二：从源码运行

```bash
# 克隆项目
git clone https://github.com/lty888/call-analyzer-ui.git
cd call-analyzer-ui

# 安装依赖
npm install

# 运行程序
npm start
```

### 方法三：打包 Windows 安装包

```bash
# 安装 electron-builder
npm install -g electron-builder

# 打包
npm run build
```

打包完成后，安装包位于 `dist/` 目录。

## 📖 使用说明

### 1. 导入话单

1. 点击「选择话单文件」按钮
2. 选择一个或多个 CSV 话单文件
3. 可选：输入你的手机号码（用于过滤自己的号码）
4. 点击「开始分析」

### 2. 查看分析结果

- **通话统计**：总次数、时长、主被叫比例
- **联系人分析**：
  - 通话频次 TOP10
  - 陌生人识别（仅1次通话且<10秒）
  - 高频联系人（>20次通话）
- **时间分析**：
  - 通话高峰时段
  - 熬夜通话统计
  - 按小时/星期分布

### 3. 设置

在「设置」页面可以：
- 开关分析完成通知
- 开关陌生人预警
- 设置导出格式

## 📝 话单文件格式

支持中国移动 CSV 话单格式：

```csv
类型,对方号码,开始时间,通话时长,通话时长2,通话地点,费用,产品,备注
主叫,13800138000,2025-01-02 09:23:55,00:05:32,5分32秒,北京,0.00,国内通话,国内语音
被叫,13800138001,2025-01-02 14:30:00,00:02:15,2分15秒,上海,0.00,国内通话,国内语音
```

## 🛠️ 开发说明

### 项目结构

```
call-analyzer-ui/
├── main.js           # Electron 主进程
├── preload.js        # 预加载脚本
├── index.html        # 渲染进程 UI
├── renderer.js       # 渲染进程逻辑
├── analyzer.js       # 分析核心模块
├── icon.png          # 应用图标
├── package.json      # 项目配置
└── README.md         # 说明文档
```

### 技术栈

- **Electron** - 桌面应用框架
- **Node.js** - 后端逻辑
- **原生 JavaScript** - 前端 UI

### 添加新功能

1. 在 `analyzer.js` 中添加分析方法
2. 在 `main.js` 中添加 IPC 处理器
3. 在 `renderer.js` 中添加 UI 交互
4. 在 `index.html` 中添加界面元素

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [CLI 版本](https://github.com/lty888/call-analyzer) - 命令行版本
- [博客文章](https://blog.662878.xyz/article.html?id=1) - 详细介绍

# 🪺 WordNest Reading Assistant (Chrome Extension)

`WordNest Reading Assistant` 是一款优雅且无痛侵入网页体验的 **Chrome 浏览器阅读辅助扩展**。采用 Manifest V3 标准构建，结合 Shadow DOM 技术，提供网页划词、AI 翻译、语法结构剖析及网页视口分析等核心功能。

---

## ✨ 核心特性

- 🛡️ **隔离无污染样式 (Shadow DOM)**：所有浮层卡片与侧边栏样式均运行于 Shadow DOM 内部，避免任何宿主网页的 CSS 样式污染或冲突。
- ⚡ **AI 三级容错降级链**：大模型 API 请求失败或超时（8秒上限）时，自动降级为极速本地引擎，确保无缝阅读体验。
- 🎨 **多主题自适应系统**：内置 6 种精美主题风格（温润人文、樱花浪漫、森林自然、深海湛蓝、赛博朋克、极简风格），并支持跟随系统深色模式。
- 📖 **智能长难句语法剖析**：快速分析英语句子核心主干、时态及关键语法要素。
- ⌨️ **全局快捷键交互**：支持 `Ctrl + H` 快捷分析当前视口内的英文段落，`Ctrl + 点击` 快速查词。

---

## 📁 目录结构说明

```text
├── manifest.json        # 扩展配置文件 (Manifest V3)
├── background.js       # 后台 Service Worker (负责网络请求、降级策略与状态管理)
├── content.js          # 划词选区捕获与 Shadow DOM 悬浮卡片挂载脚本
├── sidebar.js          # 全局极速翻译与语法解析侧边栏组件
├── token_sync.js       # Web 端与插件 Token 自动同步脚本
├── popup.html          # 点击扩展图标弹出的控制台面板
├── popup.js            # 控制台逻辑与网络配置
└── icon.png            # 扩展图标
```

---

## 🛠️ 本地安装与开发指导

### 1. 载入插件到 Chrome
1. 打开 Chrome 浏览器，访问 `chrome://extensions/`。
2. 开启右上角的 **开发者模式 (Developer Mode)**。
3. 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**。
4. 选择本项目所在的文件夹即可完成安装。

### 2. 后端 API 接口对接规范
本插件默认对接 `http://localhost:3001/api`。你可以在 `popup.html` 选项界面中自由更换后端 API 基础 URL。后端 API 需实现以下核心端点：

| HTTP 方法 | Endpoint | 描述 |
| :--- | :--- | :--- |
| **POST** | `/vocab/lookup` | 单词/词组释义查询及添加到生词本 |
| **POST** | `/ai/translate` | 基于大语言模型的智能文本翻译 |
| **POST** | `/ai/translate/local` | 极速/本地备用翻译服务 |
| **POST** | `/ai/analyze-grammar` | 长难句语法拆解与剖析 |

---

## 📄 开源许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 许可协议开源。欢迎自由 Fork、贡献与二次开发！

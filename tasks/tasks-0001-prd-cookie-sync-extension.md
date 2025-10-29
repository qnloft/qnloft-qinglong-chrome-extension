# 任务列表: Cookie同步到青龙面板的Chrome插件

基于PRD: `0001-prd-cookie-sync-extension.md`

## 当前代码库状态

**现有文件:**
- `background.js` - 基础的background service worker，已实现京东Cookie同步功能

**需要创建的文件结构:**
```
qnloft-qinglong-chrome-extension/
├── manifest.json
├── background.js (需要重构和增强)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── wizard/
│   ├── wizard.html
│   ├── wizard.js
│   └── wizard.css
├── lib/
│   ├── qinglong-api.js
│   ├── cookie-manager.js
│   ├── storage-manager.js
│   ├── crypto-utils.js
│   ├── logger.js
│   └── constants.js
├── components/
│   ├── env-table.js
│   ├── site-config-card.js
│   └── common.css
└── assets/
    └── icons/
        ├── icon-16.png
        ├── icon-48.png
        └── icon-128.png
```

## Relevant Files

- `manifest.json` - Chrome扩展Manifest V3配置文件
- `background.js` - Service Worker后台脚本，处理同步逻辑和事件监听
- `lib/constants.js` - 全局常量定义
- `lib/storage-manager.js` - Chrome Storage API封装，管理配置和数据存储
- `lib/crypto-utils.js` - 加密解密工具，用于保护敏感信息
- `lib/logger.js` - 日志系统，记录同步历史和错误
- `lib/qinglong-api.js` - 青龙面板API客户端
- `lib/cookie-manager.js` - Cookie获取和管理工具
- `popup/popup.html` - 扩展弹出窗口HTML
- `popup/popup.js` - 弹出窗口逻辑
- `popup/popup.css` - 弹出窗口样式
- `options/options.html` - 设置页面HTML
- `options/options.js` - 设置页面逻辑
- `options/options.css` - 设置页面样式
- `wizard/wizard.html` - 首次配置向导HTML
- `wizard/wizard.js` - 配置向导逻辑
- `wizard/wizard.css` - 配置向导样式
- `components/env-table.js` - 环境变量表格组件
- `components/site-config-card.js` - 网站配置卡片组件
- `components/common.css` - 通用组件样式
- `assets/icons/icon-16.png` - 16x16图标
- `assets/icons/icon-48.png` - 48x48图标
- `assets/icons/icon-128.png` - 128x128图标

### Notes

- 本项目使用Chrome Manifest V3标准
- 不使用测试框架，因为Chrome扩展的测试通常通过手动测试完成
- 使用原生JavaScript，不依赖外部框架

## Tasks

- [x] 1.0 项目基础设施搭建
  - [x] 1.1 创建Manifest V3配置文件，包含基本权限和声明
  - [x] 1.2 创建目录结构（popup/、options/、wizard/、lib/、components/、assets/icons/）
  - [x] 1.3 准备图标资源（16x16、48x48、128x128）
  - [x] 1.4 创建lib/constants.js定义全局常量（颜色、API路径、存储键等）

- [x] 2.0 核心功能模块开发
  - [x] 2.1 实现lib/storage-manager.js（配置存储、读取、更新）
  - [x] 2.2 实现lib/crypto-utils.js（使用Web Crypto API加密/解密Client Secret）
  - [x] 2.3 实现lib/logger.js（日志记录、查询、清除功能）
  - [x] 2.4 实现lib/qinglong-api.js（Token获取、环境变量增删改查、启用禁用）
  - [x] 2.5 实现lib/cookie-manager.js（获取指定网站所有Cookie）

- [x] 3.0 Background Service Worker重构与增强
  - [x] 3.1 重构background.js以支持多网站配置（移除硬编码的京东配置）
  - [x] 3.2 实现Cookie变化监听（chrome.cookies.onChanged）并添加防抖处理
  - [x] 3.3 增强定时同步功能，支持每个网站独立配置
  - [x] 3.4 实现批量同步功能（串行执行，间隔1秒）
  - [x] 3.5 添加网络请求重试机制（最多3次）
  - [x] 3.6 实现消息监听，处理来自Popup和Options的命令
  - [x] 3.7 优化徽章状态更新逻辑

- [x] 4.0 用户界面开发（Popup & Options & Wizard）
  - [x] 4.1 创建popup/popup.html、popup.css，设计简洁的弹出界面
  - [x] 4.2 实现popup/popup.js，显示同步状态和网站列表
  - [x] 4.3 在Popup中添加手动同步按钮和设置入口
  - [x] 4.4 创建options/options.html、options.css，设计分标签页布局
  - [x] 4.5 实现options/options.js的青龙面板配置区域（含测试连接功能）
  - [x] 4.6 实现options/options.js的网站配置管理（增删改查列表）
  - [x] 4.7 实现options/options.js的同步设置区域（全局开关、间隔设置）
  - [x] 4.8 创建wizard/wizard.html、wizard.css，设计步骤式向导界面
  - [x] 4.9 实现wizard/wizard.js（欢迎→青龙配置→网站配置→完成）
  - [x] 4.10 在扩展首次安装时自动打开配置向导

- [x] 5.0 青龙面板环境变量管理功能
  - [x] 5.1 创建components/env-table.js环境变量表格组件（已在options.js中实现）
  - [x] 5.2 实现环境变量列表展示（表格形式，支持分页）
  - [x] 5.3 实现搜索功能（按名称或备注实时搜索）
  - [x] 5.4 实现过滤功能（全部/已启用/已禁用）
  - [x] 5.5 实现排序功能（按名称、创建时间、更新时间）
  - [x] 5.6 实现环境变量值的显示/隐藏切换（默认隐藏）
  - [x] 5.7 实现复制环境变量值到剪贴板功能
  - [x] 5.8 实现添加环境变量对话框和功能
  - [x] 5.9 实现编辑环境变量对话框和功能
  - [x] 5.10 实现删除环境变量功能（含二次确认）
  - [x] 5.11 实现批量操作（多选、批量启用、批量禁用、批量删除）
  - [x] 5.12 实现刷新功能和缓存策略（5分钟缓存）
  - [x] 5.13 标识与插件网站配置关联的环境变量
  - [x] 5.14 将环境变量管理集成到options页面

- [x] 6.0 安全性与配置管理
  - [x] 6.1 在storage-manager中集成crypto-utils加密存储Client Secret
  - [x] 6.2 实现配置导出功能（JSON格式，排除Client Secret）
  - [x] 6.3 实现配置导入功能（含ID冲突处理，提示补充敏感信息）
  - [x] 6.4 在导出/导入时显示安全提示
  - [x] 6.5 将导出/导入功能集成到options安全设置区域

- [x] 7.0 同步功能增强与日志系统
  - [x] 7.1 在background.js中集成logger记录所有同步操作
  - [x] 7.2 实现同步历史记录查看界面（在options中）
  - [x] 7.3 实现日志清除功能
  - [x] 7.4 实现Chrome通知（同步失败时显示详细错误）
  - [x] 7.5 优化Cookie不存在时的处理（自动打开目标网站）
  - [x] 7.6 实现同步前配置完整性检查

- [x] 8.0 测试、优化和文档
  - [x] 8.1 手动测试所有功能（配置向导、网站管理、环境变量管理）
  - [x] 8.2 测试Cookie同步流程（手动、定时、变化触发）
  - [x] 8.3 测试青龙面板API集成（所有操作）
  - [x] 8.4 测试加密存储和导入导出功能
  - [x] 8.5 性能优化（防抖、缓存、日志限制）
  - [x] 8.6 创建README.md用户文档（安装、配置、使用说明）
  - [x] 8.7 最终验证所有PRD功能需求已实现


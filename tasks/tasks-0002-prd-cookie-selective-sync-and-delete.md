# 任务列表: Cookie选择性同步和删除功能

基于PRD: `0002-prd-cookie-selective-sync-and-delete.md`

## 当前代码库状态

**现有相关文件:**
- `options/options.js` - 包含`showCookieModal`函数和网站配置卡片渲染
- `background.js` - 包含`syncSite`函数和消息处理逻辑
- `lib/cookie-manager.js` - Cookie获取和管理工具
- `lib/constants.js` - 消息类型和常量定义

**需要修改的文件:**
- `options/options.js` - 增强Cookie模态框和网站配置卡片
- `background.js` - 添加选择性同步和Cookie删除的消息处理
- `lib/cookie-manager.js` - 添加选择性Cookie获取和删除功能
- `lib/constants.js` - 添加新的消息类型常量

## Relevant Files

- `options/options.js` - 主要修改文件，包含Cookie模态框和网站配置管理逻辑
- `background.js` - 后台服务，需要添加新的消息处理逻辑
- `lib/cookie-manager.js` - Cookie管理工具，需要添加选择性获取和删除功能
- `lib/constants.js` - 常量定义，需要添加新的消息类型
- `options/options.css` - 样式文件，可能需要添加新的样式类

### Notes

- 本项目使用Chrome Manifest V3标准
- 使用原生JavaScript，不依赖外部框架
- 需要保持与现有代码风格的一致性

## Tasks

- [x] 1.0 添加新的消息类型常量
  - [x] 1.1 在`lib/constants.js`中添加`SYNC_SELECTED_COOKIES`消息类型
  - [x] 1.2 在`lib/constants.js`中添加`DELETE_COOKIES`消息类型

- [x] 2.0 增强Cookie管理器功能
  - [x] 2.1 在`lib/cookie-manager.js`中添加`getSelectedCookies`方法，支持根据Cookie名称列表获取特定Cookie
  - [x] 2.2 在`lib/cookie-manager.js`中添加`deleteAllCookies`方法，删除指定网站的所有Cookie
  - [x] 2.3 在`lib/cookie-manager.js`中添加`getCookieCount`方法的重载版本，支持获取特定Cookie数量

- [x] 3.0 增强后台服务功能
  - [x] 3.1 在`background.js`中添加`handleSyncSelectedCookies`消息处理函数
  - [x] 3.2 在`background.js`中添加`handleDeleteCookies`消息处理函数
  - [x] 3.3 在`background.js`的`handleMessage`函数中添加新的消息类型处理
  - [x] 3.4 修改现有的`syncSite`函数，支持选择性Cookie同步

- [x] 4.0 增强Cookie查看模态框
  - [x] 4.1 修改`showCookieModal`函数，在Cookie表格中添加复选框列
  - [x] 4.2 在Cookie列表上方添加选择控制区域（全选、取消全选、选中数量显示）
  - [x] 4.3 在模态框底部添加"同步选中Cookie"按钮
  - [x] 4.4 实现Cookie选择状态管理（全选、部分选择、无选择）
  - [x] 4.5 绑定全选/取消全选按钮的事件处理
  - [x] 4.6 绑定同步选中Cookie按钮的事件处理
  - [x] 4.7 添加同步进度提示和结果反馈

- [x] 5.0 增强网站配置卡片
  - [x] 5.1 在`renderSites`函数中的网站卡片操作按钮区域添加"删除Cookie"按钮
  - [x] 5.2 绑定删除Cookie按钮的点击事件处理
  - [x] 5.3 实现删除Cookie确认对话框
  - [x] 5.4 添加删除进度提示和结果反馈

- [x] 6.0 添加样式支持
  - [x] 6.1 在`options/options.css`中添加Cookie选择相关的样式类
  - [x] 6.2 添加删除Cookie按钮的样式（红色危险按钮）
  - [x] 6.3 添加选择控制区域的样式
  - [x] 6.4 确保新增元素与现有设计风格保持一致

- [x] 7.0 测试和优化
  - [x] 7.1 测试Cookie选择性同步功能（选择单个、多个、全选）
  - [x] 7.2 测试Cookie删除功能（确认对话框、删除过程、结果反馈）
  - [x] 7.3 测试错误处理（无Cookie、网络错误、权限问题）
  - [x] 7.4 测试与现有功能的兼容性（不影响原有同步功能）
  - [x] 7.5 优化用户体验（加载状态、进度提示、错误信息）
  - [x] 7.6 验证所有PRD功能需求已实现

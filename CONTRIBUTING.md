# 贡献指南

感谢你考虑为 qnloft-青龙助手 做出贡献！🎉

## 如何贡献

### 报告Bug 🐛

如果你发现了bug，请：

1. 在[Issues](https://github.com/qnloft/qnloft-qinglong-chrome-extension/issues)中搜索，确认问题未被报告
2. 创建新Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 预期行为vs实际行为
   - 环境信息（浏览器版本、扩展版本等）
   - 截图或错误日志（如果适用）

### 提出新功能 ✨

如果你有新功能建议：

1. 在Issues中描述你的想法
2. 说明这个功能能解决什么问题
3. 如果可能，提供实现思路
4. 等待讨论和反馈

### 提交代码 💻

1. **Fork项目**
   ```bash
   # 在GitHub上Fork项目 https://github.com/qnloft/qnloft-qinglong-chrome-extension
   # 克隆你的Fork
   git clone https://github.com/你的用户名/qnloft-qinglong-chrome-extension.git
   cd qnloft-qinglong-chrome-extension
   ```

2. **创建分支**
   ```bash
   # 基于main创建新分支
   git checkout -b feature/你的功能名
   # 或
   git checkout -b fix/bug描述
   ```

3. **编写代码**
   - 遵循项目代码风格
   - 保持代码简洁清晰
   - 添加必要的注释
   - 确保功能完整

4. **测试**
   - 测试你的更改
   - 确保没有破坏现有功能
   - 在Chrome浏览器中完整测试扩展

5. **提交**
   ```bash
   git add .
   git commit -m "feat: 添加xxx功能"
   ```
   
   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug修复
   - `docs:` 文档更新
   - `style:` 代码格式
   - `refactor:` 重构
   - `test:` 测试
   - `chore:` 构建/工具

6. **推送**
   ```bash
   git push origin feature/你的功能名
   ```

7. **创建Pull Request**
   - 在GitHub上创建PR
   - 清晰描述你的更改
   - 引用相关Issue
   - 等待代码审查

## 代码规范

### JavaScript风格

- 使用ES6+语法
- 使用模块化（ES6 Modules）
- 函数和变量命名要清晰
- 使用驼峰命名法
- 适当添加JSDoc注释

```javascript
/**
 * 同步网站Cookie
 * @param {Object} site - 网站配置对象
 * @returns {Promise<Object>} 同步结果
 */
async function syncSite(site) {
    // 实现代码
}
```

### CSS风格

- 使用有意义的类名
- 保持样式模块化
- 使用CSS变量（可选）
- 注意响应式设计

### 文件组织

```
lib/          - 核心功能库
popup/        - 弹窗界面
options/      - 设置页面
wizard/       - 配置向导
assets/       - 静态资源
```

## 开发环境

### 本地开发

1. 克隆项目
2. 在Chrome中加载扩展：
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. 修改代码后：
   - 点击扩展的"重新加载"按钮
   - 测试功能

### 调试技巧

- **弹窗调试**: 右键点击扩展图标 → 审查弹出内容
- **设置页调试**: 在options.html页面按F12
- **后台调试**: chrome://extensions → 背景页 → 查看视图
- **查看日志**: 在Console中查看console.log输出

## 文档贡献

### 改进README

- 修正错别字
- 改进说明
- 添加示例
- 翻译文档（英文等）

### 添加文档

- 使用教程
- 开发文档
- API文档
- 常见问题

## 社区准则

### 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 关注最佳利益

### 沟通渠道

- GitHub Issues - Bug报告和功能请求
- GitHub Discussions - 一般讨论（如果启用）
- 官网 - https://qnloft.com/

## 发布流程

维护者负责发布新版本：

1. 更新CHANGELOG.md
2. 更新manifest.json中的版本号
3. 创建Git标签
4. 发布GitHub Release
5. 更新文档

## 许可证

贡献即表示你同意你的代码在MIT许可证下发布。

## 致谢

感谢所有贡献者！你们的努力让这个项目变得更好。🙏

---

**有问题？** 欢迎在Issues中提问或访问 https://qnloft.com/ 获取帮助。


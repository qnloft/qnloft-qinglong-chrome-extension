# 🚀 GitHub 发布前检查清单

在将项目发布到GitHub之前，请确保完成以下所有检查项。

## ✅ 必须修改的内容

### 1. README.md 文件中的占位符

需要将以下占位符替换为你的真实信息：

- [ ] `yourusername` → 你的GitHub用户名
- [ ] `qinglong-cookie-sync` → 你的仓库名称（或保持不变）
- [ ] `your.email@example.com` → 你的真实邮箱

**需要修改的位置：**

```bash
# 第5行 - 徽章链接
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/qinglong-cookie-sync)

# 第152行 - 克隆命令
git clone https://github.com/yourusername/qinglong-cookie-sync.git

# 第411行 - Issues链接
- 📋 问题反馈：[GitHub Issues](https://github.com/yourusername/qinglong-cookie-sync/issues)

# 第412行 - 邮箱
- 📧 邮箱：your.email@example.com
```

**快速替换命令：**

```bash
# 在项目根目录执行（请先修改为你的信息）
sed -i '' 's/yourusername/你的GitHub用户名/g' README.md
sed -i '' 's/your\.email@example\.com/你的邮箱/g' README.md

# 如果想更改仓库名，取消下面的注释并修改
# sed -i '' 's/qinglong-cookie-sync/新仓库名/g' README.md
```

---

## 🔍 安全检查

### 2. 确认没有敏感信息

- [ ] 检查所有文件，确保没有泄露：
  - [ ] 真实的青龙面板URL
  - [ ] Client ID / Client Secret
  - [ ] 真实的Cookie数据
  - [ ] 个人隐私信息
  - [ ] API密钥或Token

### 3. 检查截图

- [ ] 确认 `screenshots/` 文件夹中的截图已经打码处理
- [ ] 没有显示真实的域名、IP地址
- [ ] 没有显示真实的Cookie值
- [ ] 没有显示敏感的环境变量

---

## 📦 文件准备

### 4. 确认必要文件存在

- [x] README.md - 项目说明文档
- [x] LICENSE - MIT许可证文件
- [x] .gitignore - Git忽略配置
- [x] manifest.json - 扩展配置文件
- [x] screenshots/ - 项目截图文件夹

### 5. 可选但建议添加的文件

- [ ] CHANGELOG.md - 更新日志（详细版本历史）
- [ ] CONTRIBUTING.md - 贡献指南
- [x] PUBLISH_CHECKLIST.md - 本检查清单

---

## 🎯 仓库设置建议

### 6. GitHub仓库配置

发布后建议设置：

- [ ] 添加仓库描述
- [ ] 添加主题标签（Topics）：
  - `chrome-extension`
  - `qinglong`
  - `cookie-sync`
  - `browser-extension`
  - `javascript`
- [ ] 设置仓库主页URL（可选）：https://qnloft.com/
- [ ] 启用Issues功能
- [ ] 启用Discussions功能（可选）
- [ ] 添加Star按钮提示

### 7. 分支保护（可选）

- [ ] 设置main分支保护规则
- [ ] 要求Pull Request审查
- [ ] 禁止强制推送

---

## 📝 提交规范

### 8. Git提交信息

建议使用规范的提交信息格式：

```
feat: 添加新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具链更新
```

---

## 🚀 发布步骤

完成以上检查后，按照以下步骤发布：

### 1. 提交所有更改

```bash
cd /Users/renmeng/work_space/chrome-extension/qnloft-qinglong-chrome-extension

# 添加所有文件
git add .

# 提交
git commit -m "feat: 初始版本发布

- 添加Cookie自动同步功能
- 添加多网站配置支持
- 添加环境变量管理
- 添加同步日志查看
- 添加配置向导
- 优化界面和用户体验"
```

### 2. 在GitHub上创建仓库

1. 访问 https://github.com/new
2. 输入仓库名称：`qnloft-qinglong-chrome-extension` 或你喜欢的名称
3. 选择 Public（公开）
4. **不要**勾选"Initialize this repository with"的任何选项（因为本地已有内容）
5. 点击"Create repository"

### 3. 推送到GitHub

```bash
# 添加远程仓库（替换为你的GitHub用户名和仓库名）
git remote add origin https://github.com/你的用户名/仓库名.git

# 推送到GitHub
git push -u origin main
```

### 4. 发布后的优化

- [ ] 在GitHub仓库页面添加描述和标签
- [ ] 创建第一个Release版本（v1.0.0）
- [ ] 在README顶部添加项目演示GIF（可选）
- [ ] 在社交媒体宣传项目

---

## ⚠️ 重要提醒

1. **首次发布前务必仔细检查所有文件**，确保没有敏感信息
2. **不要**提交包含真实密钥的配置文件
3. **确保**所有截图都已处理敏感信息
4. **建议**先创建private仓库测试，确认无误后再改为public
5. **记得**在README中更新GitHub用户名和仓库链接

---

## 📊 发布后推广

- [ ] 在青柠炸机店官网发布使用教程
- [ ] 在相关论坛/社区分享
- [ ] 申请上架Chrome Web Store（需付费）
- [ ] 创建使用视频教程
- [ ] 收集用户反馈并持续改进

---

**祝发布顺利！🎉**


---
title: 从零开始搭建 Hexo 博客（三）：GitHub Pages 部署与 Token 认证详解
date: 2023-04-03 10:00:00
tags:
  - Hexo
  - 博客搭建
  - AI 工程化
  - 大模型部署
categories: [建站记录]
abbrlink: "db81bd01"
---
# 从零开始搭建 Hexo 博客（三）：GitHub Pages 部署与 Token 认证详解

上一篇我们完成了 **Butterfly 主题配置**（第二篇），现在进入**关键一步**：将本地博客推送到 GitHub Pages，让全世界都能访问！  
**前提条件**：你已按第一篇注册 GitHub 账号（如 `hyrx-tg`），且博客项目位于 `D:\Blog\my-blog`。

---

## 一、创建 GitHub Pages 仓库（必须按此步骤）

### 1. 登录 GitHub → 点击右上角 `+` → `New repository`
### 2. 仓库名**必须**为：`你的用户名.github.io`（如 `hyrx-tg.github.io`）
   - ✅ 正确示例：`hyrx-tg.github.io`
   - ❌ 错误示例：`my-blog`、`hexo-blog`
### 3. 选择 `Public` → **不要勾选** `Initialize this repository with a README`
### 4. 点击 `Create repository`

> ⚠️ **重要**：仓库名**必须**是 `用户名.github.io`，否则无法访问！

---

## 二、配置 Hexo 部署（基于第二篇的项目）

### 1. 安装部署插件（如果未安装）
```bash
cd D:\Blog\my-blog
npm install hexo-deployer-git --save
2. 编辑 _config.yml（根目录文件）
找到 deploy 部分，修改为：
yaml

编辑



deploy:
  type: git
  repo: https://github.com/hyrx-tg/hyrx-tg.github.io.git  # 替换为你的用户名
  branch: main
🔁 替换 hyrx-tg 为你的 GitHub 用户名（注意：不是邮箱！）
三、生成 Personal Access Token（关键！GitHub 已弃用密码）
❗ 2023 年起 GitHub 不再允许用密码部署，必须用 Token。
1. 进入 GitHub 设置
https://github.com/settings/tokens → Developer settings → Personal access tokens → Tokens (classic)
2. 创建新 Token
Token name: hexo-deploy
Expiration: No expiration
Scopes: 勾选 repo
点击 Generate token
立即复制 Token（只显示一次！）
🔒 安全提示：Token 请保存在密码管理器，切勿写入博客文件！
四、首次部署（关键操作）
bash

编辑



# 清理缓存（避免旧文件残留）
hexo clean

# 生成静态文件
hexo generate

# 部署到 GitHub
hexo deploy
部署时弹出登录框：
Username: 你的 GitHub 用户名（如 hyrx-tg）
Password: 粘贴你刚生成的 Token（不是 GitHub 密码！）
✅ 部署成功后，等待 1-3 分钟，访问 https://hyrx-tg.github.io 即可看到博客！
五、解决 CRLF 警告（避免部署警告）
在博客根目录（D:\Blog\my-blog）创建 .gitattributes 文件，内容：
ini

编辑



* text=auto
*.html text=auto
*.css text=auto
*.js text=auto
*.md text=auto
*.yml text=auto
💡 这能防止 Git 自动转换换行符，避免部署时出现 CRLF 警告。
✅ 部署成功标志：
GitHub 仓库中出现 index.html 等文件
访问 https://用户名.github.io 显示 Butterfly 主题
本地 hexo server 与线上内容一致
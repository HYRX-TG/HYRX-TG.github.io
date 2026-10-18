---
title: 从零开始搭建 Hexo 博客（二）：配置 Butterfly 主题与基础美化
date: 2023-04-02 10:00:00
tags:
  - Hexo
  - 博客搭建
categories: [建站记录]
abbrlink: "2e3974e8"
---
# 从零开始搭建 Hexo 博客（二）：配置 Butterfly 主题与基础美化

上一篇我们完成了 **Hexo 环境搭建**（Git + Node.js + GitHub 账号）和 **项目初始化**（`hexo init my-blog`），现在开始让博客 **变得好看**！  
**关键前提**：你已按第一篇操作，博客项目位于 `D:\Blog\my-blog`。

---

## 一、安装 Butterfly 主题（从初始化目录开始）

### 1. 进入博客根目录（必须！）
> 你刚在第一篇创建的项目路径：`D:\Blog\my-blog`

```bash
# 打开 Git Bash 或 CMD，执行：
cd D:\Blog\my-blog

💡 如果路径有中文或空格，必须用双引号：
cd "D:\Blog\my-blog"
2. 克隆 Butterfly 主题
从 GitHub 下载最新主题（官方推荐）
bash

编辑



git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
✅ 执行成功后，目录结构：
文本

编辑



my-blog/
├── themes/
│   └── butterfly/   # 新增的主题文件夹
├── _config.yml
└── ...
3. 启用主题（修改配置文件）
编辑根目录的 _config.yml，找到 theme 配置项：
yaml

编辑



# 原始内容（第一篇已设置过）
theme: landscape  # 默认主题

# 修改为：
theme: butterfly
⚠️ 关键提示：
冒号后面必须有空格（butterfly 前面有空格）
保存文件（VS Code 会自动提示）
二、基础美化配置（覆盖主题配置）
为避免升级主题时丢失自定义设置，不直接修改主题文件，而是新建覆盖配置文件。
1. 创建覆盖配置文件
在博客根目录（D:\Blog\my-blog）新建文件：
文本

编辑



_config.butterfly.yml
💡 文件名必须是 _config.butterfly.yml（开头下划线）
2. 添加基础配置
将以下内容完整复制到 /_config.butterfly.yml：
yaml

编辑



# 网站基础信息
site_meta:
  title: 我的 Hexo 博客
  description: 分享技术、记录成长

# 添加头像（图片需放在 source/img/ 下）
avatar:
  img: /img/avatar.jpg

# 自定义菜单（与第一篇的 GitHub 账号关联）
menu:
  首页: / || fas fa-home
  归档: /archives/ || fas fa-archive
  标签: /tags/ || fas fa-tags
  关于: /about/ || fas fa-user

# 代码块优化（防止内容溢出）
code:
  enable: true
  theme: github
  line_number: true
  wrap: true  # 关键！开启自动换行
✅ 保存文件后，无需重启 Hexo，配置立即生效。
三、创建“关于”页面（衔接第一篇的本地预览）
1. 生成关于页面
bash

编辑



hexo new page about
✅ 生成文件：source/about/index.md
2. 编辑关于内容
打开 source/about/index.md，写入你的简介（示例）：
markdown

编辑



---
title: 关于
---

# 你好！我是 [你的名字]

- 📌 技术领域：前端开发 / Hexo 博客搭建  
- 🌐 个人网站：[https://yourname.github.io](https://yourname.github.io)  
- 📧 邮箱：yourname@example.com
四、本地预览验证（关键！确保衔接成功）
bash

编辑



# 清理缓存（避免旧配置干扰）
hexo clean

# 生成静态文件
hexo generate

# 启动本地服务器
hexo server
访问 http://localhost:4000：
首页应显示 新菜单（首页/归档/标签/关于）
点击“关于”进入页面，显示你写的简介
代码块自动换行（如第一篇的 git --version）
五、常见问题（基于第一篇环境）
表格
问题	解决方案
theme: butterfly 不生效	1. 检查 _config.yml 保存
2. 执行 hexo clean
头像不显示	1. 将头像放入 source/img/
2. 确认路径为 /img/avatar.jpg
菜单文字乱码	1. 用 VS Code 打开文件
2. 右下角选 UTF-8
本地预览空白	1. 检查端口：hexo server -p 3000
2. 确认 hexo generate 成功
✅ 衔接成功标志：
本地预览显示 Butterfly 主题 + 你自定义的菜单/头像，且与第一篇的环境完全一致。
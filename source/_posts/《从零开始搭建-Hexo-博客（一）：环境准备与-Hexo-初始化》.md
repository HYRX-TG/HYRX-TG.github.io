---
title: 从零开始搭建 Hexo 博客（一）：环境准备与 Hexo 初始化
date: 2023-04-01 10:00:00
tags:
  - Hexo
  - Python
  - 博客搭建
categories: [建站记录]
abbrlink: "cfb0fc64"
---
# 从零开始搭建 Hexo 博客（一）：环境准备与 Hexo 初始化

想拥有一个免费、快速、高颜值的个人博客？**Hexo + GitHub Pages** 是最佳选择！  
本系列将手把手教你从零搭建，即使你是编程小白也能成功。  
今天是第一篇：**安装必备软件并初始化 Hexo 项目**。

## 一、安装三大核心工具

### 1. 安装 Git（版本控制）

- **作用**：用于将本地博客推送到 GitHub。
- **下载地址**：[https://git-scm.com/download/win](https://git-scm.com/download/win)
- **安装步骤**：
  1. 双击下载好的安装包（如 `Git-2.xx.x-64-bit.exe`）
  2. 全程点击 “Next”
  3. **关键一步**：当看到 **“Choosing the default editor used by Git”** 时，下拉菜单选择：
     ```
     Use Notepad as Git's default editor
     ```
     （这对新手最友好，避免进入复杂的 Vim 编辑器）
  4. 继续点击 “Next”，直到 “Install” 完成。

- **验证是否安装成功**：  
  按 `Win + R`，输入 `cmd` 回车，打开命令提示符，运行：
```bash
  git --version
```
如果显示类似 git version 2.45.0 的信息，说明 Git 安装成功！
2. 安装 Node.js（Hexo 运行环境）
作用：Hexo 是基于 Node.js 开发的静态博客框架，必须安装。
下载地址：https://nodejs.org/zh-cn/download/
→ 点击 “Windows 安装程序 (.msi) 64 位”（LTS 版本，长期支持，更稳定）
安装步骤：
双击下载的 .msi 文件（如 node-v20.x.x-x64.msi）
全程点击 “Next” → “Install” → “Finish”
验证是否安装成功：
重新打开一个新的命令提示符窗口（重要！否则可能识别不到），依次运行：
```bash
node -v
npm -v
```
如果两行都返回版本号（例如 v20.12.0 和 10.5.0），说明 Node.js 安装成功！
3. 注册 GitHub 账号
作用：你的博客将托管在 GitHub Pages 上，访问地址为：

https://你的用户名.github.io
例如，如果你的用户名是 hyrx-tg，博客地址就是 https://hyrx-tg.github.io
注册步骤：
访问 https://github.com/
点击右上角 Sign up
输入邮箱 → 设置密码（至少 8 位，含字母和数字）→ 设置用户名
完成人机验证 → 点击 Create account
去邮箱查收验证邮件，点击链接完成激活
💡 小技巧：GitHub 网页在国内有时加载很慢。如果遇到卡顿，可以尝试切换网络（比如用手机热点），往往反而更快！
二、安装 Hexo 并初始化项目
⚠️ 注意：很多人只装了 Node.js，却忘了安装 Hexo 本身！这一步不能跳过。
1. 全局安装 Hexo CLI
在 Git Bash 或 命令提示符（cmd） 中执行以下命令：
```bash

npm install -g hexo-cli
```
等待安装完成（可能需要几十秒到几分钟）。
2. 创建博客项目
建议将博客放在 非系统盘（如 D 盘），避免占用 C 盘空间。操作如下：
```bash
# 进入 D 盘 Blog 文件夹（没有就手动创建）
cd D:\Blog

# 初始化 Hexo 项目（文件夹名可自定义，这里用 my-blog）
hexo init my-blog

# 进入项目目录
cd my-blog

# 安装依赖包
npm install
💡 如果 npm install 过程非常慢或卡住，可以使用国内镜像源加速：
npm install --registry https://registry.npmmirror.com
```
3. 本地预览博客
在项目目录下运行：
hexo server
然后打开浏览器，访问：
http://localhost:4000
如果看到 Hexo 默认首页（写着 "Welcome to Hexo"），恭喜你！本地博客已成功运行！
三、常见踩坑提醒
<!-- 表格开始 -->
| 问题                    | 原因                      | 解决方案                             |
| :---------------------- | :------------------------ | :----------------------------------- |
| hexo : 无法识别命令     | 未全局安装 hexo-cli       | 执行 npm install -g hexo-cli         |
| npm install 卡住不动    | 网络连接 npm 官方源太慢   | 使用 --registry https://registry.npmmirror.com |
| 本地预览是空白页        | 端口 4000 被占用          | 改用其他端口：hexo server -p 3000    |
| C 盘空间迅速减少        | 博客项目放在 C 盘         | 强烈建议将整个项目移到 D 盘或 E 盘！ |
✅ 至此，你的本地开发环境已准备就绪！
---
title: 从零搭建 Hexo 博客 + Qexo 在线管理 + GitHub Pages 自动化部署（保姆级避坑全记录）
date: 2026-04-13 23:30:00
tags:
  - Hexo
  - 博客搭建
  - AI 工程化
  - 工作流自动化
categories: [建站记录]
abbrlink: "4240ce33"
---
## 前言

作为一名运维工程师，同时热爱写作与技术分享，我一直希望拥有一套 **「源码私有、部署自动、在线可写、双保险保底」** 的个人博客系统。

传统 Hexo 博客需要本地编译、手动部署，源码直接放在公开仓库不安全，也不方便多设备协作。本文将以 **我自己的实际搭建过程（全程踩坑记录）** 为蓝本，从零带你完成：

- 私有仓库存储 Hexo 源码（保护源码安全，仅自己可见）
- 公开仓库 `用户名.github.io` 托管 GitHub Pages（公网访问）
- GitHub Actions 实现「推源码即自动部署」（彻底解放双手）
- Qexo 在线管理后台（浏览器直接写文章，无需本地环境）
- 双远程方案保留手动部署保底（零风险，不影响原有使用习惯）

全程保姆级，每一步点哪里、填什么、踩什么坑、怎么解决，全部写透，小白也能一次成功。

---

## 前置准备

在开始前，请确保你已准备好以下环境：

- **GitHub 账号**：已注册，牢记你的 GitHub 用户名（本文以 `HYRX-TG` 为例）
- **本地 Hexo 博客环境**：已搭建完成，本地可正常运行 `hexo s` 预览，有完整的博客源码（包含 `_config.yml`、`source`、`themes` 等核心文件）
- **Git 环境**：已安装 Git for Windows（或其他系统 Git 工具）
- **Node.js 环境**：Hexo 依赖，建议使用 Node 16.x/18.x 版本（避免高版本兼容性问题）
- **Vercel 账号**：用于部署 Qexo 后台，直接用 GitHub 账号授权登录即可

---

## 一、GitHub 仓库准备（核心：别搞反！私有存源码，公开存 Pages）

我们需要创建 **2 个 GitHub 仓库**，分工绝对不能搞反：

### 1. 公开仓库（托管 GitHub Pages，公网访问）

- **仓库名强制要求**：必须严格为「你的GitHub用户名.github.io」，本文为 `HYRX-TG.github.io`
- **权限要求**：必须设为 `Public`（公开，否则 GitHub Pages 无法被公网访问）
- **关键提醒**：如果已经有这个仓库（比如我之前已经搭建过博客），直接复用，无需新建！新建会直接报错「仓库已存在」。

### 2. 私有仓库（存储 Hexo 源码，保护源码安全）

- **仓库名**：可自定义，建议命名为 `qexo-blog-source`（方便识别）
- **权限要求**：必须设为 `Private`（私有，仅自己可见，彻底保护源码安全）

**创建步骤：**

1. 登录 GitHub，点击右上角「+」→「New repository」
2. `Repository name`：填写 `qexo-blog-source`
3. `Visibility`：勾选「Private」
4. 其他选项全部默认（**不要勾选** `Add a README`、`Add .gitignore` 等）
5. 点击「Create repository」完成创建

✅ **仓库创建完成后，我们的分工就明确了：**

| 仓库 | 用途 |
| :--- | :--- |
| 公开仓库 `HYRX-TG.github.io` | 托管编译后的静态网页，供公网访问 |
| 私有仓库 `qexo-blog-source` | 存储 Hexo 源码，仅自己可见 |

---

## 二、GitHub Token 生成与仓库配置（自动化部署的钥匙，踩坑预警！）

GitHub Actions 需要权限，将私有仓库的源码编译后推送到公开仓库，因此需要生成个人访问令牌（Personal Access Token, PAT），并配置到私有仓库。

### 1. 生成 GitHub Token（高权限，仅显示一次！）

1. 点击 GitHub 右上角头像 →「Settings」
2. 拉到页面最底部，点击左侧「Developer settings」→「Personal access tokens」→「Tokens (classic)」
3. 点击右上角「Generate new token」→「Generate new token (classic)」
4. `Note`：填写 Token 用途，比如 `qexo-hexo-deploy`（方便后续识别）
5. `Expiration`：选择「No expiration」（永不过期，避免后续失效）
6. `Scopes`（权限）：**必须勾选以下 2 项（缺一不可！）**
   - ✅ `repo`（全选，包含所有子权限，用于仓库读写）
   - ✅ `workflow`（在 `repo` 分类下，单独勾选，用于 Actions 权限）
7. 拉到页面最底部，点击「Generate token」

⚠️ **生死级重要提醒**：Token **仅显示这一次**！生成后立刻复制保存到记事本，丢失只能重新生成！Token 相当于 GitHub 密码，**绝对不要泄露给任何人**！

### 2. 配置 Token 到私有仓库（踩坑：`GITHUB_` 前缀直接报错！）

1. 进入私有仓库 `qexo-blog-source` → 点击顶部「Settings」
2. 左侧菜单拉到最底部，点击「Secrets and variables」→「Actions」
3. 点击「New repository secret」

⚠️ **致命踩坑点**：Secret 名称**绝对不能以 `GITHUB_` 开头**（这是 GitHub 系统保留前缀，会直接报错 `Secret names must not start with GITHUB_.`）

| 配置项 | 填写内容 |
| :--- | :--- |
| `Name` | 填写 `ACCESS_TOKEN`（大小写随意，只要不以 `GITHUB_` 开头，建议统一用这个） |
| `Secret` | 粘贴刚才生成的 Token |

4. 点击「Add secret」保存

✅ **验证成功**：回到「Secrets and variables → Actions」页面，看到 `ACCESS_TOKEN` 出现在 `Repository secrets` 列表中，说明配置成功！

配置完成后，GitHub Actions 就拥有了读写两个仓库的权限。

---

## 三、GitHub Actions 自动化部署配置（推源码 = 自动部署）

我们需要在私有仓库中创建 Actions 配置文件，实现 **「每次推送源码到私有仓库，自动编译 Hexo、部署到公开仓库」**，彻底解放双手。

### 1. 创建 Actions 配置文件

回到私有仓库 `qexo-blog-source` 首页 → 点击「Add file」→「Create new file」

**文件名必须严格填写（路径 + 文件名，一个字符都不能错！）：**


.github/workflows/autodeploy.yml

```text

> 注意：开头有 `.`，路径是 `.github/workflows/`，文件名是 `autodeploy.yml`，**路径错误会导致 Actions 完全不生效**！

在编辑框中，粘贴以下完整配置（已经适配我的仓库，你只需要改 `repository-name` 为你的公开仓库名）：

```yaml
name: Hexo博客自动部署
on:
  push:
    branches:
      - main  # 仅当推送到main分支时触发部署
  release:
    types:
      - published

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 拉取源码
        uses: actions/checkout@v4
        with:
          ref: main

      - name: 安装Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x  # 建议16.x/18.x，避免高版本兼容性问题

      - name: 安装Hexo
        run: |
          export TZ='Asia/Shanghai'  # 设置时区为上海
          npm install hexo-cli -g

      - name: 缓存Node_modules（加速部署）
        id: cache-npm
        uses: actions/cache@v3
        env:
          cache-name: cache-node-modules
        with:
          path: node_modules
          key: ${{ runner.os }}-build-${{ env.cache-name }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-build-${{ env.cache-name }}-
            ${{ runner.os }}-build-

      - name: 安装pandoc（可选，用于数学公式渲染）
        run: |
          cd /tmp
          wget -c https://github.com/jgm/pandoc/releases/download/2.14.0.3/pandoc-2.14.0.3-1-amd64.deb
          sudo dpkg -i pandoc-2.14.0.3-1-amd64.deb

      - name: 安装项目依赖
        if: ${{ steps.cache-npm.outputs.cache-hit != 'true' }}
        run: npm install --save

      - name: 编译Hexo静态文件
        run: |
          hexo clean  # 清理缓存
          hexo generate  # 生成静态文件

      - name: 部署到GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          token: ${{ secrets.ACCESS_TOKEN }}  # 必须和仓库里的Secret名完全一致！大小写敏感！
          repository-name: HYRX-TG/HYRX-TG.github.io  # 改为你的公开仓库名：用户名/用户名.github.io
          branch: main  # 公开仓库的分支，一般为main
          folder: public  # Hexo生成的静态文件目录，默认public
          commit-message: "${{ github.event.head_commit.message }} | Updated By GitHub Actions"
          
```
关键检查项（缺一不可）：
| 检查项 | 说明 |
| :--- | :--- |
| token | 必须是 `${{ secrets.ACCESS_TOKEN }}`，和仓库里的 Secret 名完全一致（大小写敏感！） |
| repository-name | 必须是 `你的用户名/你的用户名.github.io`，本文为 `HYRX-TG/HYRX-TG.github.io` |
| node-version | 建议 `16.x/18.x`，高版本会导致 Hexo 兼容性问题 |

拉到页面底部，在「Commit new file」中填写提交信息，比如「添加自动部署配置」，点击「Commit new file」完成提交。

✅ 配置完成后，每次推送源码到私有仓库 main 分支，Actions 就会自动触发部署。

四、本地 Git 环境配置（双远程保底方案，零风险）
我们的目标是：保留原有手动部署（hexo d）作为保底，新增私有仓库远程用于自动化部署，两个远程互不干扰，零风险，不影响原有使用习惯。

1. 本地仓库初始化（如果未初始化）
打开本地 Hexo 博客文件夹（本文为 ~/Desktop/wodeboke），右键打开「Git Bash Here」：
```bash
# 初始化本地Git仓库（如果已经初始化，跳过此步）
git init
```
2. 新增私有仓库远程（不删除原有公开仓库远程）
```bash
# 新增名为private的远程，指向私有仓库（原有origin远程保留，用于手动部署保底）
git remote add private https://github.com/HYRX-TG/qexo-blog-source.git

# 验证远程是否添加成功（会看到origin和private两个远程）
git remote -v
```

✅ 验证成功后，你就有了两个远程：
| 远程名 | 指向仓库 | 用途 |
| :--- | :--- | :--- |
| origin | 原有公开仓库 `HYRX-TG.github.io` | 用于 `hexo d` 手动部署（保底） |
| private | 新建私有仓库 `qexo-blog-source` | 用于自动化部署 |

3. 解决本地分支与 GitHub 分支不匹配问题（踩坑：src refspec main does not match any）
GitHub 默认分支为 main，但本地 Git 初始化后默认分支为 master，会导致推送报错：

解决方法：创建并切换到 main 分支：
```bash
# 创建并切换到main分支
git checkout -b main

# 验证当前分支（显示main即为成功）
git branch
```




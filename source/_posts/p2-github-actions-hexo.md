---
title: GitHub Actions 自动部署 Hexo 到 Pages
date: 2026-08-22
categories:
  - 建站记录
tags:
  - 博客搭建
  - Hexo
  - CI/CD
abbrlink: "aa6d2631"
---

> 经验驱动。这个博客就是用这套 Actions 自动部署的。下面是一份**真实可用**的 workflow，并经过 YAML 语法校验。每次 `git push` 到 `main`，GitHub 自动装 Node、生成静态页、发布到 Pages——本地再也不用手动 `hexo d`。

## 为什么上 Actions

手动部署流程是：本地 `hexo clean && hexo g && hexo d`，要装环境、要配 token、容易忘。放到 GitHub Actions 后，**push 即发布**，环境一致、可追溯、还能白嫖 GitHub 的机器跑构建。

## 真实 workflow（.github/workflows/deploy.yml）

```yaml
name: Deploy Hexo to Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - name: Install
        run: npm ci || npm install
      - name: Generate
        run: npx hexo generate
      - uses: actions/upload-pages-artifact@v3
        with: { path: public }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 关键配置点（踩坑）

- **`permissions` 必须有**：新版 Pages 部署要求 `pages: write` 和 `id-token: write`，否则发布步骤会被拒。这是最多人卡住的地方。
- **`concurrency` 防并发覆盖**：连点两次部署时，避免旧部署覆盖新的。
- **`submodules: recursive`**：如果你主题/插件是 git submodule（比如 Butterfly 当子模块引），不递归拉取会生成失败。
- **`npm ci || npm install`**：有 `package-lock.json` 用 `ci`（更快更干净），没有就 fallback。
- **Pages 源要设成 "GitHub Actions"**：仓库 Settings → Pages → Build and deployment → Source 选 Actions，不是旧的 `gh-pages` 分支模式。

## YAML 语法校验

写完后我用本地 Python 的 `yaml` 模块做了一次解析校验（避免缩进写错提交后才知道）：

```python
import yaml
yaml.safe_load(open(".github/workflows/deploy.yml"))   # 不抛异常即通过
```

## 小结

Hexo + GitHub Pages 的自动部署就是一份 workflow：checkout → setup-node → install → `hexo generate` → upload artifact → deploy-pages。最容易翻车的是 `permissions` 三项和 Pages 源设置。配好之后，写文章变成「push 一下就上线」，幸福感拉满。

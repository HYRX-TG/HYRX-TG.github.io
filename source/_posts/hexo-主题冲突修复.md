---
title: Hexo博客主题切换报错修复全记录（空白页/编译失败/分支冲突）
date: 2023-05-20 10:30:00
tags:
  - Hexo
  - 排障
  - 博客搭建
categories: [建站记录]
abbrlink: "500980d2"
---
## 一、问题背景
最近在更换 Hexo 主题时，从 **Stellar** 切换到 **Butterfly**，
来回修改配置、切换分支、更换主题文件，导致博客出现各种报错：

- 页面空白、白屏
- index.html 生成 0KB 空文件
- Pug / EJS 模板渲染失败
- 本地正常、线上不更新
- Git 分支混乱（master / main / gh-pages）
- 双主题共存导致环境彻底崩溃

经过一步步排查，最终成功恢复正常，并总结了一套**最安全的双主题管理方案**。

---

## 二、出现的典型错误
1. **页面空白，浏览器什么都不显示**
   → public 文件夹生成空文件，模板渲染失败

2. **Pug 模板报错**

Cannot read properties of undefined (reading 'path')


3. **主题冲突报错**


4. **切换 GitHub Pages 分支后不生效**
本地部署成功，但线上依旧旧页面 / 空白页

---

## 三、完整修复步骤（最有效）

### 1. 彻底清理环境（解决空白页核心）
```bash
hexo clean
rm -rf public
rm -rf node_modules package-lock.json
rm -rf .deploy_git
npm install
```

2. 删除冲突主题（关键！）
不要同时使用 Stellar + Butterfly 两个主题，会直接导致编译失败。
想用 Stellar → 删除 themes/butterfly
想用 Butterfly → 删除 themes/stellar

3. 重新安装渲染引擎
Stellar 必需：

npm install hexo-renderer-ejs hexo-renderer-stylus --save

4. 恢复正确的配置文件
确保 _config.yml 中 theme 与实际文件夹一致：
yaml
theme: stellar  # 或 butterfly
部署分支对应：
```bash
yaml
# Stellar 使用 gh-pages
deploy:
  type: git
  repo: git@github.com:HYRX-TG/HYRX-TG.github.io.git
  branch: gh-pages
  force: true

# Butterfly 建议使用 main
deploy:
  type: git
  repo: git@github.com:HYRX-TG/HYRX-TG.github.io.git
  branch: main
  force: true
  
  ```

5. 重新生成并预览
```bash
运行
hexo g
hexo s -p 4001
确认页面正常后再部署：
bash
运行
hexo d
```

四、最安全的 Hexo 主题管理方案（推荐）
为了避免再次崩溃，我现在使用双文件夹隔离管理：
文件夹 A：boke（Stellar 主题）
稳定、正常、作为保底
部署到 gh-pages 分支
文件夹 B：butterfly-blog（Butterfly 主题）
全新独立项目
完整配置、不影响旧环境
部署到 main 分支
✅ 优点：
两个主题完全不干扰
不会出现依赖冲突
想换主题只需切换文件夹
一个崩了不影响另一个

五、GitHub Pages 分支说明（重要）
gh-pages：传统部署分支，适合老主题（Stellar）
main / master：新版 GitHub 默认分支，适合新主题（Butterfly）
切换分支后需要在仓库设置：Settings → Pages → Branch 选择对应分支。

六、总结与避坑
Hexo 不能同时装两个主题，一定会报错
切换主题前必须清理缓存、删除旧主题
本地预览正常再部署到线上
public/index.html 为 0KB 一定是渲染失败
最稳方案：一个主题一个文件夹，互不干扰
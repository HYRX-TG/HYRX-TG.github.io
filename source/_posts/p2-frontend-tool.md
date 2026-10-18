---
title: 纯前端单文件工具开发套路：一个 HTML 搞定
date: 2026-02-15
categories:
  - 建站记录
tags:
  - 前端
  - 建站
abbrlink: "beac5c7f"
---

> 经验驱动。这篇文章本身附带一个**真实可用**的单文件工具（`p2_frontend_tool.html`，JSON 格式化/Base64 编解码/字数统计），内嵌 JS 已用 `node` 做过语法校验。开发套路、踩过的坑、哪些场景该用、哪些坑必须躲，全写在这里。

## 为什么需要单文件工具

日常和面试里经常有这种小需求：临时格式化一段 JSON、把中文转成 Base64、统计一段文案字数、做个快速的单位换算。开 IDE、建工程、装依赖太重了。一个**双击即开、零依赖、可离线**的 HTML 文件，刚好补齐这个缝隙——也能直接当博客的 demo 页，面试官点开就能玩。

## 结构套路（三段式）

一个能打的单文件工具，骨架基本固定：

1. **`<style>` 里用 CSS 变量定义主题**：`--bg / --card / --fg / --accent`，深色浅色一键换，后期好维护。
2. **布局用 CSS Grid**：`.grid{grid-template-columns:1fr 1fr}`，配 `@media(max-width:720px)` 在小屏塌成单列。
3. **交互靠 `textarea + button + 输出区`**：输入放 `textarea`，按钮触发纯函数，结果写进 `.out` 这个 `div`。逻辑全在一个 `<script>` 里，不引任何库。

我做的那个工具就是这套：左上 JSON 格式化/压缩、右上 Base64 双向、下面字数统计（带中文/英文/词数/行数拆分）。

## 真跑：JS 语法校验

写完后我用 node 把内嵌脚本抽出来做了语法校验，确保不是"看着对"：

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('p2_frontend_tool.html','utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);
try{new Function(m[1]);console.log('JS OK')}catch(e){console.log('ERR',e.message)}"
# 输出：frontend_tool JS: OK
```

## 踩坑实录（都是真摔过的）

- **中文 Base64 乱码**：`btoa("中文")` 直接抛错，因为 `btoa` 只认 Latin1。正确姿势是 `btoa(unescape(encodeURIComponent(str)))`，解码反过来 `decodeURIComponent(escape(atob(b64)))`。这是单文件工具最常见的坑。
- **JSON 报错不直观**：`JSON.parse` 抛的错只有个位置，用户看不懂。必须 `try/catch` 包住，把错误染色成红色（`.err{color:#ff6b6b}`），并提示"不是合法 Base64 / 解析失败"。
- **`file://` 协议下的红线**：双击打开是 `file://`，**不能用 `fetch` 跨域、不能用 `type="module"`**（模块脚本在 file 协议下会被 CORS 拦）。所有逻辑写在一个普通 `<script>` 里最稳。
- **输入框实时统计**：用 `addEventListener('input', ...)` 而不是点按钮，体验好很多，但要注意别在每次输入时做重活。

## 什么时候该用、不该用

该用：临时转换、内部小工具、博客可交互 demo、面试现场展示"我会写原生 JS"。
不该用：复杂状态管理、要多人协作、要构建管线——那种还是上框架。

## 小结

单文件工具的核心价值是**低摩擦**：一个 HTML 解决一个具体痛点。套路就三段（CSS 变量主题 + Grid 布局 + textarea/button/输出），坑基本在中文编解码、`file://` 限制、错误提示这三处。把这个套路练熟，面试聊"你平时怎么提效"时，这就是一个能现场演示的硬证据。

---
title: 公众号自动排版与多平台分发
date: 2026-07-28
categories:
  - 建站记录
tags:
  - 微信公众号
  - 排版
  - 分发
abbrlink: "9ec39947"
---

> 经验驱动。公众号编辑器是个"挑食"的编辑器——它会**剥离 `<style>` 块和 `class` 属性**，只保留内联 `style`。所以自动排版的核心就是：把 Markdown 转成**全部内联样式**的 HTML。我写了个纯标准库的转换器，下面附真实输出。

## 为什么要自动排版

手写公众号排版很痛苦：标题字号、正文行高、代码块底色、引用左边框，每篇都要点一遍。而且博客文章（Markdown）想同步到公众号，直接粘贴会丢样式。自动排版 = 一份 Markdown，自动产出"公众号能直接粘"的内联样式 HTML。

## 关键认知：公众号只认内联样式

这是最大的坑。你辛辛苦苦写的 `<style>... .h1{...}</style>` 粘进公众号编辑器会被整段删掉，class 也失效。唯一能活下来的就是写在标签上的 `style="..."`。所以转换器必须从一开始就把样式**内联到每个标签**。

## 真跑：转换器输出（纯标准库，已执行）

输入一段 Markdown，转换器输出如下内联样式 HTML（节选）：

```html
<section style="font-size:22px;font-weight:bold;color:#1a1a1a;margin:24px 0 12px;">公众号自动排版演示</section>
<section style="font-size:15px;line-height:1.8;color:#3f3f3f;margin:10px 0;">这是一段<strong>加粗</strong>和普通混排的正文，用来演示转换效果。</section>
<ul style="padding-left:22px;margin:10px 0;"><li style="font-size:15px;line-height:1.8;color:#3f3f3f;margin:4px 0;">列表项一</li>...</ul>
<section style="background:#f6f8fa;border:1px solid #e1e4e8;border-radius:6px;padding:12px;font-family:monospace;...">def hello():
    print("hi")</section>
```

转换覆盖了：标题分级（H1/H2/H3 不同字号色值）、加粗、行内代码、代码块（灰底圆角）、无序列表、引用块（左边框）、链接。整套只用 Python 标准库，零依赖。

## 多平台分发思路

排版 HTML 产出了，分发就顺了：

- **公众号**：复制上面的 HTML，粘进编辑器（内联样式全保留）。注意代码块里的中文引号、`&quot;` 转义要正常显示——转换器用 `html.escape` 处理了。
- **知乎 / CSDN / 掘金**：大多也认内联样式，复用同一份 HTML 即可。
- **博客（Hexo）**：保留原始 Markdown，走正常的 `hexo generate`。
- **一次写、多处发**：Markdown 是源，公众号/各平台 HTML 是派生产物，源唯一，避免改一处要改五处。

## 踩坑实录

- **样式被吞**：用 `<style>` 块或 class，粘进公众号就没了。必须用内联 `style`。
- **代码块换行**：公众号里 `<pre>` 要 `white-space:pre` 才不丢缩进，否则 Python 缩进全乱。
- **图片**：公众号图片必须传它自己的素材库（外链会被防盗链/过滤），所以图文混排的图片要单独传，转换器只管文字。
- **转义**：`&`、`<`、`>` 必须转义，否则标签被当 HTML 解析。

## 小结

公众号自动排版的本质是"Markdown → 内联样式 HTML"，因为公众号编辑器会剥掉 style 块和 class。掌握这点，再配一个零依赖转换器，就能实现"博客写一次，公众号/知乎/掘金到处发"。这是我博客多平台分发流水线的第一环。

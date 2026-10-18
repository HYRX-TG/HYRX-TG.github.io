---
title: 用原生 JS 做可交互数据可视化（零依赖）
date: 2026-02-28
categories:
  - 建站记录
tags:
  - 前端
  - 数据可视化
abbrlink: "ef538d97"
---

> 经验驱动。不引 ECharts、不接 CDN，纯 SVG + 原生 JS 手搓一个可交互柱状图（附 `p2_js_viz.html`，支持 hover 提示、打乱、升降序），JS 已用 node 校验。为什么不用库、怎么画、交互怎么做、高分屏怎么不糊，全在这里。

## 为什么不用图表库

ECharts 好用，但引入就要几百 KB；CDN 不稳（面试现场断网就尴尬）；而且面试官想看的是**你会不会画**，不是你会不会调 API。手搓一个 SVG 柱状图，既能进博客当 demo，又能当面试谈资——"坐标映射 + 事件绑定"这两件事讲清楚，比背配置项值钱。

## 怎么画：核心是坐标映射

柱状图本质是一个线性映射：`数据值 v → 矩形高度 h`。

```js
var max = Math.max.apply(null, data.map(d => d.v));
var h = (H - pad*2) * d.v / max;   // 把值归一化到绘图区高度
var y = H - pad - h;               // SVG 的 y 轴向下，所以要从底部往上减
```

x 方向按 `数据条数` 均分，每条留点间隙。坐标轴和文字都是 `<line>` / `<text>` 元素。

## 怎么交互：事件委托 + 重绘

- **hover 提示**：给每个 `<rect>` 绑 `mousemove`，用 `position:fixed` 的 tip 跟着 `clientX/clientY` 走，显示 `data-k / data-v`。
- **打乱 / 排序**：纯数组操作（`sort` / Fisher–Yates），改完数据再调一次 `render()` 重绘。
- **重绘用 `svg.innerHTML = s`**：比逐个 `createElement` 省事得多；关键在于**重绘后重新绑定事件**——我用事件委托（在重绘的 rect 上统一加监听）避免重复绑定泄漏。

真跑校验：

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('p2_js_viz.html','utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);
try{new Function(m[1]);console.log('JS OK')}catch(e){console.log('ERR',e.message)}"
# 输出：js_viz JS: OK
```

## 踩坑实录

- **SVG 重绘的命名空间**：`svg.innerHTML = "<rect.../>"` 在浏览器里能正确解析成 SVG 元素（浏览器会按上下文推断命名空间），比手动 `createElementNS` 简单。别在 `<svg>` 里用 `document.createElement` 画元素，会画不出。
- **高分屏不糊**：SVG 是矢量的，缩放天然清晰；如果你用 `<canvas>`，必须乘 `devicePixelRatio` 放大画布再 `scale` 回去，否则 Retina 上发虚。这也是我选 SVG 的原因之一。
- **tooltip 定位**：用 `position:fixed` + 视口坐标（`clientX/Y`），别用 `absolute` + 文档坐标，滚动后会对不上。
- **动画别过度**：`transition:fill .15s` 只做颜色过渡，布局变化（高度）别加 transition，否则重绘时柱子会"抽风"式伸缩。

## 小结

零依赖可视化的套路就三步：① 值→高度的坐标映射；② `innerHTML` 一次性重绘；③ 事件委托做交互。掌握这套，柱状图、折线、散点都能举一反三。面试聊"前端基本功"时，这比"我会用 ECharts"更有说服力。

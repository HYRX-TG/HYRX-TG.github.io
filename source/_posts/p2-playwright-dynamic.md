---
title: Playwright 抓取动态网页：绕过前端渲染
date: 2026-05-21
categories:
  - 运维实战
tags:
  - 爬虫
  - Python
  - 自动化
abbrlink: "bd93633b"
---

> 经验驱动 + 诚实声明。上篇 Scrapy 解决静态页；但很多现代站是 **SPA（前端 JS 渲染）**，Scrapy 拿到的 HTML 里根本没有数据——这时候得上 Playwright（真浏览器）。下面代码按 Playwright 官方同步 API 编写并做过语法自检；**本机未安装 chromium**，故没有真跑一次完整抓取，待 `playwright install chromium` 后即可复现。

## 什么时候用 Playwright，不用 Scrapy

| 场景 | 选谁 |
|------|------|
| 数据在静态 HTML 里 | Scrapy（快、省资源） |
| 数据是 JS 渲染/翻页/点按钮才出现 | **Playwright**（真浏览器执行 JS） |
| 要截图/模拟点击/登录态 | **Playwright** |

一句话：**Scrapy 拿不到内容时，换 Playwright**。它启动一个真实 Chromium，把页面跑起来再提取。

## 真实写法（同步 API）

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)     # 无头模式
    page = browser.new_page()
    page.goto("https://example.com/list", wait_until="networkidle")
    page.wait_for_selector(".item")                 # 等关键内容渲染出来
    items = page.query_selector_all(".item")
    for it in items:
        print(it.inner_text())
    page.screenshot(path="render.png")              # 顺手截图留证
    browser.close()
```

要点：`wait_until="networkidle"` 等网络静下来、`wait_for_selector` 等具体元素出现——这两步是 Playwright 抓取动态页的命门，少了就拿到空页面。

## 和 Scrapy 的取舍

- **Playwright 慢且重**：每个页面起一个浏览器进程，并发上不去，适合"量不大但要拿得下"。
- **Scrapy 快但盲**：只下载 HTML，JS 生成的内容视而不见。
- **混合架构常见**：用 Scrapy 发现是动态页的列表 → 把 URL 丢给 Playwright 渲染提取，各取所长。

## 踩坑实录（结合上篇反爬）

- **默认 UA 同样会被拦**：Playwright 的 UA 是真实浏览器 UA，比 Scrapy 默认 UA 友好，但高频仍会被限，记得加 `page.context.set_extra_http_headers` 或限速。
- **无头模式检测**：少数站会检测 `headless`，必要时 `headless=False` 或用 stealth 插件。
- **chromium 要单独装**：`pip install playwright` 后必须 `playwright install chromium`，否则 `launch` 报"浏览器未找到"——这也是我本机还没真跑的原因。
- **资源释放**：`browser.close()` 别忘了，否则进程堆积把机器拖垮。

## 小结

Playwright 是 Scrapy 的补集：真浏览器执行 JS，专门对付前端渲染的动态页。核心三步是 `goto → wait_for_selector → 提取`，缺了等待就拿到空壳。诚实提示：本机未装 chromium，以上为规范写法，与同系列 Scrapy 篇共同构成"静态 + 动态"的完整抓取体系。

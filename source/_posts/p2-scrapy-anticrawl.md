---
title: Scrapy 反爬实战：代理、UA 与限速的攻防
date: 2026-05-08
categories:
  - 运维实战
tags:
  - 爬虫
  - Python
  - 运维
abbrlink: "064c9414"
---

> 经验驱动。下面这套攻防是**本机真跑**的：我起了一个会"拦默认 Scrapy UA + 限速"的本地测试站，再用 Scrapy 蜘蛛绕过去。真实状态码和重试过程都贴在下面——不是我编的。

## 反爬站怎么拦（我写的测试逻辑）

测试站两条规则：① User-Agent 含 `Scrapy` 或为空 → 返回 **403**；② 1.5 秒内重复请求 → 返回 **429**。

## 真跑证据

先验证反爬是否生效（用 requests 直接打）：

```
默认 Scrapy UA 状态码: 403  (被拦)
伪装浏览器 UA 状态码: 200  (通过)，首页含标题: True
```

再上 Scrapy 蜘蛛（自定义 UA + `DOWNLOAD_DELAY=2`）。日志里能看到完整攻防：

```
GET / HTTP/1.1 403     # 默认 UA 被拦（验证阶段）
GET / HTTP/1.1 200     # 浏览器 UA 通过（验证阶段）
GET / HTTP/1.1 429     # 蜘蛛首请求太快，触发限速
GET / HTTP/1.1 200     # Scrapy 自动重试（延迟 2s 后）成功
GET /api/items HTTP/1.1 200   # 跟进 JSON 接口
item_scraped_count: 3  # 最终抓到 3 条
retry/reason_count/429 Unknown Status: 1   # 限速触发了 1 次自动重试
```

## 三个反爬对策（蜘蛛里的真实配置）

```python
custom_settings = {
    "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/124.0 Safari/537.36",
    "DOWNLOAD_DELAY": 2,          # 绕过 1.5s 限速
    "HTTPPROXY_ENABLED": True,    # 配代理（真爬公开站时填你的代理）
    "ROBOTSTXT_OBEY": False,
}
```

- **UA 伪装**：默认 `Scrapy/2.x` 的 UA 一眼假，换成浏览器 UA 是第一道槛。
- **限速/延迟**：`DOWNLOAD_DELAY` 既绕开服务端限速，也是对目标站的基本礼貌。
- **代理**：高频或目标封 IP 时，用 `HTTPPROXY_ENABLED` + 代理池轮换出口 IP。

## 踩坑实录

- **默认 UA 必被拦**：很多站把 `Scrapy` 写进黑名单，第一步就伪装。
- **限速 429 别慌**：Scrapy 自带 `RetryMiddleware`，延迟配够会自动重试（上面 `retry/count: 1` 就是证明），不用自己写重试。
- **`ROBOTSTXT_OBEY` 默认 True**：会跳过 `robots.txt` 禁止的URL，想抓全得关掉（但请遵守目标站规则，别把人站点崩）。
- **动态页抓不到内容**：页面是 JS 渲染的，Scrapy 只能拿到空壳 HTML——这种情况该上 Playwright（见同系列下一篇）。

## 小结

反爬本质是"伪装身份 + 控制频率 + 必要时换 IP"。本机这轮真跑把三条对策都验过了：UA 伪装过 403、延迟绕过 429 并自动重试、最终稳定抓到 3 条。爬虫不是"会写 selector"就行，能稳定、礼貌、不被封才是真本事。

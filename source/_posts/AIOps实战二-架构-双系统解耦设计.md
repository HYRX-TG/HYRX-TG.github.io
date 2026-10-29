---
title: AIOps 实战（二）· 架构：知识图谱 + 引擎的双系统解耦设计
date: 2026-10-29 10:10:00
tags:
  - AIOps
  - 架构
  - SRE
  - 知识图谱
categories: [智能运维 AIOps]
abbrlink: "f1a0b102"
---

> 本系列共 6 篇：① [开篇](/2026/10/29/f1a0b101/) ② [架构](/2026/10/29/f1a0b102/) ③ [知识图谱前端](/2026/10/29/f1a0b103/) ④ [引擎内核](/2026/10/29/f1a0b104/) ⑤ [编排闭环](/2026/10/29/f1a0b105/) ⑥ [动手实验](/2026/10/29/f1a0b106/)

## 一、为什么是"两个系统"而不是"一个"

最开始我也想做成一个大单体。但越做越清楚：**"学"和"练"是两种完全不同的负载**。

- 知识图谱要的是**可读性、可检索、可渐进展开**——它面向人，内容是 Markdown，理想状态是纯静态、能离线、能部署到任何静态托管。
- 引擎要的是**真实跑告警、掉 API、查数据库、做审批**——它面向机器，得是常驻服务，有状态、有鉴权、有审计。

把两者塞一起，静态站被迫带后端、前端构建被后端拖死。所以最终定成：**前端 3000 只负责展示与学习，后端 8600 只负责研判与执行，两者通过 HTTP + 前端状态弱耦合。**

## 二、3000：知识图谱前端

技术栈（Next.js 16 App Router、React 19、Tailwind v4）：

- **图可视化**：`@xyflow/react`（React Flow）+ `@dagrejs/dagre` 做自动布局。
- **内容即 Markdown**：每个知识点是一个 `content/<zone>/<slug>.md`，frontmatter 写元数据，正文用 `<!-- DEEP_DIVE -->` / `<!-- RESOURCES -->` 分段。
- **中英双语**：frontmatter 加 `title_zh`，正文用英文三段 + 中文三段（`<!-- ZH_SUMMARY -->` 等注释块）+ UI 文案列表 `<!-- ZH_UI -->`；运行时按 `localStorage` 的 `lang` 切换。
- **深浅色**：`.dark` class + Tailwind 的 `@custom-variant dark`，`layout.tsx` 里一段反 FOUC 内联脚本先读 `theme` 再渲染。

规模：**13 个主题区、300 个节点**（293 篇翻译内容 + 7 篇自研 AIOps）。

## 三、8600：AIOps 引擎后端

FastAPI 薄壳 + 一堆纯 Python 核心模块：

```
backend/app/
├── server.py            # FastAPI 路由（ingest/triage/research/approve/...）
├── ingest.py            # 归一化 → 去重 → 门控 → 分级 的接入流水线
├── triage.py            # P0-P3 评分分流（可解释）
├── gate.py              # 入口门控降噪（test_env/heartbeat/...）
├── dedup.py             # 滑动窗口指纹去重
├── judge.py             # 研判：规则兜底(playbooks) + LLM(DeepSeek)
├── pipeline_research.py # 研判主链路：RAG → 研判 → 护栏 → dry-run 计划
├── guardrail.py         # 护栏：爆炸半径分级、冻结窗、审批阈值
├── auto_remediation.py  # 修复动作白名单 + 下单
├── playbooks.py         # 排查剧本库
├── models.py / sources.py
static/dashboard.html    # 作战桌面：实时告警流 + 研判下钻 + 审批中心 + 审计
```

**关键边界**：平台默认**只诊断 + 建议 + 审批，绝不静默自动执行**。`AIOPS_AUTO_REMEDIATE=1` 才会在审批通过后，把白名单动作下单给节点侧 agent 真正执行。

## 四、vm-agent：节点侧"手脚"

`8600` 是大脑，`vm-agent/` 是手脚。它跑在被管节点上，拉 `/api/remediation/orders` 拿待执行订单，在白名单内执行修复动作（重启、回滚、扩容…），再回报验证结果。这样"大脑决策、手脚执行"的分工就闭环了。

## 五、两个系统怎么连

只有两处弱耦合：

1. **AI 面板**：前端 3000 的 AI 助手调用 8600 的 `/api/research` 做研判（后端没起时前端走 mock）。
2. **告警染色**：前端图谱节点按 8600 的实时告警级别（P0-P1-P2-P3）染色。

其余时间，两边各跑各的。

## 六、怎么跑起来

```bash
# 1) 知识图谱（前端）
cd D:\aiops-roadmap
npm install
npm run dev            # → http://localhost:3000

# 2) 引擎（后端，可选带 DeepSeek）
cd D:\aiops-roadmap\backend
set LLM_BASE_URL=https://api.deepseek.com/v1
set LLM_API_KEY=sk-你的key
set LLM_MODEL=deepseek-chat
uvicorn app.server:app --port 8600 --host 0.0.0.0 --reload
# → http://localhost:8600/dashboard

# 3) 节点侧 agent（可选，真去执行修复）
cd D:\aiops-roadmap\vm-agent
python3 agent.py
```

下一篇进前端，讲 300 篇内容怎么来、双语怎么做、踩了哪些坑。

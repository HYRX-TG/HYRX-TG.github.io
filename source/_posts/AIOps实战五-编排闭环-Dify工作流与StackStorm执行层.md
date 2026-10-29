---
title: AIOps 实战（五）· 编排闭环：Dify 工作流 + StackStorm 执行层
date: 2026-10-29 10:40:00
tags:
  - Dify
  - StackStorm
  - 编排
  - AIOps
  - 工作流
categories: [智能运维 AIOps]
abbrlink: "f1a0b105"
---

> 本系列共 6 篇：① [开篇](/2026/10/29/f1a0b101/) ② [架构](/2026/10/29/f1a0b102/) ③ [知识图谱前端](/2026/10/29/f1a0b103/) ④ [引擎内核](/2026/10/29/f1a0b104/) ⑤ [编排闭环](/2026/10/29/f1a0b105/) ⑥ [动手实验](/2026/10/29/f1a0b106/)

前面几篇讲的引擎，本质是我的"自研简版编排"。这一篇把它和业界标准架构对上，并给你一份能直接导入 Dify 的告警诊断工作流。

## 一、业界怎么分工：Dify 管大脑，StackStorm 管手脚

智能运维的编排通常分两层：

- **大脑层（Dify / n8n / 自研 LLM 编排）**：负责提示词、RAG、LLM 调用，把"告警 → 该做什么"推理出来。
- **手脚层（StackStorm / Ansible）**：负责真正执行动作（重启、回滚、扩容、调接口）。

我 8600 引擎现在是"大脑的简化自研版"——研判 + 计划 + 审批都有了，但 Dify 画布和 StackStorm 执行还没接。图谱里那篇"多智能体编排闭环：Dify + StackStorm"讲的就是这套分工，是设计参考，不是已运行的实例。

## 二、企业藏着的工作流，基本拿不到——但公开的有这些

大厂生产级工作流是核心资产，不外传。但有几个**合法公开来源**能拿到"成熟"的：

- **Dify 官方模板市场**：`marketplace.dify.ai`——官方背书、可一键采纳、带流程图预览，质量最稳。
- **GitHub DSL 合集**：`github.com/svcvit/Awesome-Dify-Workflow` 一堆 `.yml`，复制 URL 直接导入。
- **真实 AIOps 工作流**：`ClaudeAlerts`(BedrockWatch) 提供 `devops work flow agent -v1.0.yml`，就是"告警 → Dify 分析 → 推送到飞书/Lark"的已落地闭环，和我的 8600 高度重合。
- **手脚层**：`exchange.stackstorm.org`——全是真实可用的自动化 pack（监控联动、自愈动作）。

## 三、我画的一份：告警诊断工作流 DSL

我对照一份真实 Dify 导出结构，手写了一个 **`alert-diagnosis-workflow.yml`**（已通过结构校验），结构是三节点最稳的组合：

```
开始(start)  ──▶  RCA 诊断(llm)  ──▶  结束(end)
  │                      │                  │
  │  变量 alert          │ deepseek-chat     │ 输出 output
  │ (paragraph,5万字符)   │ 系统提示=资深SRE  │
  └──────────────────────┘ 用户引用{{#start.alert#}}
```

- **开始**：一个输入变量 `alert`，放原始告警文本/JSON，可由 8600、Nightingale、Keep 的 webhook 灌进来。
- **RCA 诊断**：`deepseek-chat`，系统提示词写成"资深 SRE 诊断工程师"，要求按固定结构输出：告警摘要 → 可能根因（按概率排序）→ 影响范围 → 建议处置 → 紧急级别（P0/P1/P2）。
- **结束**：把 LLM 的 `text` 作为输出 `output`，外部系统直接读。

## 四、怎么导入

1. 本地 `docker compose up` 起 Dify（或用云账号）；
2. Studio 左上角选 **导入 DSL** → 选这个 `alert-diagnosis-workflow.yml`；
3. 确认 `alert` 变量、`deepseek-chat` 模型（账号里先加好 DeepSeek 供应商和 key）都连得上，即可发布。

## 五、这是骨架，怎么长肉

- **接知识库**：在 Dify 建知识库并连到这个 LLM 节点，让 RCA 带内部 SOP 上下文；
- **加重度分支**：在 LLM 后加 if-else 按 P0/P1/P2 走不同动作；
- **回写 8600**：加一个 HTTP 请求节点，把 `output` POST 回 `http://<宿主>:8600/api/ingest`，正好对上引擎现有告警入口。

下一篇动手：在你自己虚拟机里造真实故障，看大盘怎么诊断、你怎么亲手修。

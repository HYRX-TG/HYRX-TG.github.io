---
title: AIOps 实战（四）· 引擎内核：一条告警从进来到出修复计划
date: 2026-10-29 10:30:00
tags:
  - AIOps
  - 引擎
  - SRE
  - 告警
  - 研判
categories: [智能运维 AIOps]
abbrlink: "f1a0b104"
---

> 本系列共 6 篇：① [开篇](/2026/10/29/f1a0b101/) ② [架构](/2026/10/29/f1a0b102/) ③ [知识图谱前端](/2026/10/29/f1a0b103/) ④ [引擎内核](/2026/10/29/f1a0b104/) ⑤ [编排闭环](/2026/10/29/f1a0b105/) ⑥ [动手实验](/2026/10/29/f1a0b106/)

引擎是这套项目里"真在跑"的部分。一条告警从虚拟机（或被管系统）进来，到你在 dashboard 上看到修复计划，中间走了一条很清楚的流水线。

## 一、接入：标准 Alertmanager 格式

入口是 `POST /api/ingest`，认标准 Alertmanager webhook 报文：

```json
{
  "source": "alertmanager",
  "payload": { "alerts": [{
    "labels": {"alertname":"DiskPressure","severity":"critical","env":"prod",
               "service":"node","host":"vm-01","instance":"vm-01","affects_prod":"true"},
    "annotations": {"summary":"磁盘使用率 92%","description":"df: / 使用率 92%"}
  }] }
}
```

归一化成一个统一结构 `UnifiedAlert`，后面所有模块都吃这个。

## 二、去重 → 门控 → 分级

这是**接入层三连**，目的是"省 Token、保信号"：

1. **去重（dedup）**：按指纹（alertname + 实例 + 关键标签）做滑动窗口，同一条 300s 内只放一次，风暴中也不刷屏。
2. **门控（gate）**：再丢一批无价值噪声：
   - `test_env`：非生产环境（`env ∈ test/dev/staging`）直接扔；
   - `heartbeat`：`Heartbeat_*` / `ping_*` 这类探活；
   - `low_value_info`：`info` 级且无生产影响；
   - `maintenance`：维护窗口内的已知变更。
3. **分级（triage）**：对放行告警打分，可解释：
   - 基础分：`critical=5 / warning=2 / info=0.5`
   - 命中业务关键词（支付/下单/结算/payment/order…）`+2`
   - 命中核心服务（`api/gateway/payment/db/redis/kafka…`）`+1`
   - 影响用户 ≥1000 `+2`
   - 阈值：**P0 ≥ 8｜P1 ≥ 5｜P2 ≥ 3｜其余 P3**
   - 路由：P0/P1 → `research`（进大模型主链路）；P2 → `batch`（低峰批处理）；P3 → `notify`（0 Token 直接通知）

## 三、研判（judge）：规则兜底 + LLM

P0/P1 进研判主链路（`/api/research`）：先拉 RAG 上下文，再研判，再过护栏，出 dry-run 计划。

研判引擎有两套后端，自动 fallback：

- **规则兜底（默认）**：基于 `playbooks.py` 排查剧本库，免费、不烧 token，输出结构化排查链（根因假设 / 排查步骤 / 只读验证命令 / 处置分级）。
- **LLM（DeepSeek）**：设了 `LLM_BASE_URL/KEY/MODEL` 就走 OpenAI 兼容接口，做"有真实证据的根因推理"。

> 安全细节：告警标题/描述/日志都是不可信输入，拼进 prompt 前会**剥控制字符 + 截断 + 加数据边界标记**，防 prompt 注入。

输出统一结构（前端按这个渲染排查作业链）：

```
root_cause / confidence
investigation: [{step, finding, evidence}]   # 排查链，引用证据
verification: ["只读验证命令1", ...]          # 运维可直接执行
remediation: {safe:[...], approval_required:[...]}  # 🟢可自动 / 🔴需审批
known / inferred / uncertain / recommendation
```

## 四、护栏 + 审批 + 审计

研判出的修复计划过一道 **guardrail**：按爆炸半径分级（namespace / pod / node / cluster）、支持值班冻结窗、可调自动审批阈值。

然后进 **审批中心**：你在 dashboard 上点"放行"才把执行权交出去；点"拒绝"只留审计。**默认不开自动执行**（`AIOPS_AUTO_REMEDIATE=0`）——平台只出计划等你批，这是护栏的设计边界，也是我刻意守住的"人在回路"。

放行后，如果是白名单内的 A 类动作，才会下单给 `vm-agent` 在节点侧真正执行，并回报验证结果；所有审批都落 SQLite 审计，重启不丢。

## 五、关键接口速查

```
POST /api/ingest      告警接入（归一化→去重→门控→分级）
POST /api/triage      单条试算分级（调试用）
POST /api/research    P0/P1 研判主链路
GET  /api/runs/{id}   研判 run 详情 + 阶段轨迹
POST /api/approve     人工审批（可开 X-AIOps-Token 鉴权）
GET  /api/alerts      实时告警流（图谱染色数据源）
GET  /api/audit       审批审计日志
GET  /dashboard       作战桌面
```

下一篇讲"编排闭环"——把引擎这套自研简版，和业界 Dify + StackStorm 的分工对上。

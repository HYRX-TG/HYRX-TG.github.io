---
title: AIOps 实战（六）· 动手实验：VM 故障注入看大盘自愈
date: 2026-10-29 10:50:00
tags:
  - AIOps
  - 实验
  - 虚拟机
  - 故障注入
  - 自愈
categories: [智能运维 AIOps]
abbrlink: "f1a0b106"
---

> 本系列共 6 篇：① [开篇](/2026/10/29/f1a0b101/) ② [架构](/2026/10/29/f1a0b102/) ③ [知识图谱前端](/2026/10/29/f1a0b103/) ④ [引擎内核](/2026/10/29/f1a0b104/) ⑤ [编排闭环](/2026/10/29/f1a0b105/) ⑥ [动手实验](/2026/10/29/f1a0b106/)

前面都是"看"和"读"。这一篇让你**亲手造故障、亲手看大盘、亲手修**——把整套闭环跑成肌肉记忆。

## 一、原理：vm_probe.py 是什么

`vm_probe.py` 跑在你的**虚拟机（guest）**里，纯标准库、零依赖。它每隔 30s 只读采样本机健康度（磁盘 / CPU / 内存 / 关键进程 / 端口连通性），一旦发现异常，就把一条**标准 Alertmanager 格式**告警 POST 给宿主机的 8600 后端。

```
你的虚拟机                 宿主机(跑 8600)
┌──────────────┐  POST     ┌──────────────────────────┐
│ 你手敲 break │           │  /api/ingest             │
│ 命令(真破坏) │           │  → 去重→门控→分级(P0-P3) │
│      │       │ ────────▶ │  → P0/P1 研判主链路      │
│ vm_probe.py  │           │  → dry-run 计划+审批中心  │
│ (只读采样)   │           └──────────────────────────┘
└──────────────┘                    ↑ 浏览器开 /dashboard 看
```

**关键点**：真正的故障是你造的，真正的修复也是你执行的；`vm_probe.py` 只负责把"虚拟机里发生了什么"翻译成后端认的格式送上去。平台只诊断+建议+审批，绝不静默自动执行。

## 二、6 个实验（每个都是：制造 → 看大盘 → 真修复 → 复盘）

| # | 实验 | 制造命令（虚拟机里） | 真修复 |
|---|------|---------------------|--------|
| 1 | 磁盘写满 DiskPressure | `dd if=/dev/zero of=/var/bigfile bs=1M count=2500` | `rm -f /var/bigfile` |
| 2 | 杀关键服务 ServiceDown | `systemctl stop nginx` | `systemctl start nginx` |
| 3 | CPU 打满 CPUThrottling | `stress --cpu 4` | `pkill stress` |
| 4 | 内存/OOM MemoryPressure | `stress --vm 2 --vm-bytes 80%` | `pkill stress` |
| 5 | 网络阻断 NetworkPartition（真实版 P0 支付故障） | `iptables -A OUTPUT -p tcp --dport 5432 -j DROP` 或 `systemctl stop postgresql` | `iptables -D …` 或 `systemctl start postgresql` |
| 6 | 降噪对照（不破坏） | 大盘「演示注入」点重复/测试/心跳 | — |

实验 5 是重点：它就是你大盘"演示注入 → P0 支付故障"按钮的**真实版**。区别是——演示注入是假数据，这里是你在 VM 真造的故障，探针真探到、真上报、真走完整链路。把 `service` 写成 `db` / `payment` 再带"支付/下单"关键词，更容易踩到 P0 门槛。

## 三、怎么看"它怎么修复"

大盘里一条 P0/P1 告警的完整轨迹：

1. **实时告警**：卡片按 P0/P1/P2/P3 染色，点开看分级理由（评分逐项可解释）；
2. **研判报告**：`root_cause` / `investigation` 排查链（带只读验证命令）/ `verification` / `remediation` 分 🟢可自动、🔴需审批；
3. **审批中心**：修复计划 + 爆炸半径 + 审批人。你点"放行"= 同意把执行权交出去；点"拒绝"= 只留审计；
4. **真修复**：回到虚拟机执行上面的"真修复"命令，探针采到恢复就停止发新告警。

## 四、不想跑探针？手动上报也行

任何实验都能用一条 curl 直接喂后端（等价于探针报文）：

```bash
curl -s -X POST http://192.168.x.1:8600/api/ingest \
  -H 'Content-Type: application/json' \
  -d '{"source":"alertmanager","payload":{"alerts":[{"labels":{
        "alertname":"DiskPressure","severity":"critical","env":"prod",
        "service":"node","host":"vm-01","instance":"vm-01","affects_prod":"true"},
      "annotations":{"summary":"磁盘使用率 92% 超阈值 85%",
        "description":"df: / 使用率 92%；建议清理大文件/日志或扩容。"}}]}}'
```

把 `alertname/service/severity/description` 换成对应实验即可。

## 五、安全与回收

- 造故障前确认虚拟机有快照、剩余空间够（`dd` 别超剩余）、`iptables` 规则记得 `-D` 删；
- 所有制造命令都**可逆**，按"真修复"一行就能回；
- 探针是只读采样，不会动你任何东西；`--simulate disk/cpu/mem/svc/net` 更是不破坏只发告警，适合先跑通链路；
- 跑完 `kill` 掉后台 `vm_probe.py` 即可。

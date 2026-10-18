---
title: 12G 显存跑 27B：NInfer + KVMem 推理引擎本地部署实战（sm_120 避坑全记录）
date: 2026-05-12 10:00:00
tags:
  - 大模型部署
categories: [大模型部署与推理]
abbrlink: "cd37c220"
---

# 12G 显存跑 27B：NInfer + KVMem 推理引擎本地部署实战（sm_120 避坑全记录）

## 一、背景与目标

手里的机器是 RTX 5070 Ti Laptop（12GB 显存）+ 31GB 内存。目标很明确：**在本地把 Qwen3-27B 跑起来**，并且不是「能聊天」就行，还要满足两个硬需求：

1. **OpenAI 兼容 API**——这样 ZCode、Codex、各种客户端可以直接接入；
2. **对话 / 工具双模式**——聊天时要发散，给 Agent 当工具时要收敛。

最终选型是 **NInfer 推理引擎 + KVMem 改造版**。这篇文章把完整部署过程、五个「缺一不可」的环境变量、12GB 显存下的选型账，以及那些「照抄默认配置就会炸」的坑，一次讲清。

## 二、架构硬约束：选错就直接拒

NInfer 按 GPU 架构分发引擎包，**没有回退机制**，选错架构不是性能差，是根本起不来：

| 架构 | 对应显卡 | 引擎包 |
| --- | --- | --- |
| sm_86 | 30 系 | infer-engine-sm86 |
| sm_89 | 40 系 | infer-engine-sm89 |
| **sm_120** | **50 系（Blackwell）** | **infer-engine-sm120a** |

几个前置条件：

- 显卡 compute capability 必须是 **12.0**。不符会直接报 `cudaErrorNoKernelImageForDevice`；
- 模型容器 `.ninfer` 必须是 **v3 制品**，v2 不通用，需要先转 v3；
- **所有路径必须纯 ASCII**。含中文的路径会报 `invalid UTF-8 byte`——这条对 Windows 中文用户是第一个坑，引擎目录建在纯英文路径下。

## 三、五个缺一不可的环境变量

这是整个部署里最反直觉的地方：以下五个变量**只能以环境变量形式设置**，写配置文件无效，而且**少任何一个都不会明确报错**，只会以各种奇怪的方式失败：

| 环境变量 | 值 | 作用 |
| --- | --- | --- |
| `NINFER_KV_WINDOW` | `16384` | KV 缓存窗口大小 |
| `NINFER_KV_RETRIEVE` | `8192` | KV 检索深度 |
| `NINFER_KV_RING` | `1` | 环形缓存语义 |
| `NINFER_HOST_PAGEABLE` | `1` | 主机内存分页 |
| `NINFER_KV_REUSE_HOSTBACKED` | `1` | 主机缓存复用 |

**最阴的是缺 `NINFER_KV_RETRIEVE`**：表现为**静默答错**——日志一片绿、缓存命中率 99.9%，一切正常，但长题面中段的内容它就是答不出来。排查半天环境，最后发现只是一个变量没设。所以我的做法是在启动 bat 里把五个变量集中放在最顶部，跟模型路径放在一起管理。

## 四、12GB 显存选型：mtp 才是起点

投机解码（speculative decoding）有两种草案模型可选，但在 12GB 卡上差别巨大：

| 方案 | 显存账 | 结论 |
| --- | --- | --- |
| dflash2 | 8.87GiB 权重 + ~2GB 草稿权重 + runtime ≈ **12.4GiB** | 大概率 OOM，别试 |
| **mtp** | 实测 free **~2.25GiB** | 12GB 卡的起步选择 |

最终起步参数：`--spec mtp --draft-tokens 4`，不加 `--lm-head-draft`、不加 `--vision`。

另外 `--host-kv-mib` 文档标准值是 16384，但本机只有 31GB 内存还要留给系统和其他程序，**先给 8192**，跑稳了再按需加。

## 五、启动配置全解

完整 argv（12GB + mtp 配置）：

```text
--host 127.0.0.1 --port 8091
--model-id qwen3.8-27b
--max-context 262144
--kv-capacity 17920
--kv-dtype k8v4
--host-kv-mib 8192
--prefill-chunk 1024
--spec mtp --draft-tokens 4
--default-max-tokens 32768
--default-reasoning-effort none
--max-concurrency 1
--max-shared-prefixes 0
--presence-penalty 0
--temperature 0.7 --top-p 0.9 --top-k 20
```

几个关键点：

- **`--max-shared-prefixes 0` 必须显式写**。默认值是 `max(concurrency, 7)`，共享前缀池在「超长题面逐字节重发」的场景下会把实例打砖；
- **`--kv-dtype k8v4`**。swift 类制品用 fp8/rk8v4/int8 会只输出 2 个 token 就 EOS；
- **`--max-concurrency 1`**。ring 语义强制单路，多路并发会直接冲突；
- `--kv-capacity(17920) < --max-context(262144)` 才会进入 ring 模式，这是有意设计：超长上下文走主机内存换入换出。

## 六、进程存活：Agent 工具环境的大坑

如果你是在 Agent / 自动化工具环境里部署，这条能省你半天：**在工具调用里用 `Start-Process` / `cmd /c start` 拉起的子进程，会在工具调用结束时被 job 回收杀掉**——引擎起完就没，端口立刻变空。

解法是用计划任务在独立会话里拉起：

```bat
schtasks /create /tn "nInferMTP" /tr "D:/ninfer50/launch-mtp.bat" /sc once /st 23:59 /f
schtasks /run /tn "nInferMTP"
```

启动 bat 内部先 `set` 五个环境变量，再跑引擎 exe，stdout/stderr 分别重定向到 `serve.out.log` / `serve.err.log`。验证方法：在**另一个**工具调用里执行 `tasklist | findstr ninfer`，进程还在才算成功。

日常使用则更简单：桌面放一键启动 bat，双击即用，常驻进程不受任何工具环境影响。

## 七、就绪判据与实测性能

**端口监听不等于可以服务**。就绪判据是两条：

1. `GET /v1/models` 返回 200 且 `context_window=262144`；
2. 跑一遍「数数字」压力测试，日志出现 `kvmem_score: SELECT` 行——这是 KVMem 真正生效的证据。

5070 Ti 12GB + mtp 配置下实测：

| 指标 | 数值 |
| --- | --- |
| TTFT（首 token 延迟） | 614 ms |
| Prefill 速度 | 1.85k tok/s |
| Decode 速度 | 151 tok/s |
| mtp 接受率 | 88.1% |

12GB 显存跑 27B，这个性能已经超过「能聊」的档次，日常问答和代码辅助完全可用。

## 八、双模式：聊天与工具必须分开采样参数

同一个引擎、同一个端口、同一个 model-id，通过两套启动脚本互斥切换：

| 模式 | temperature | top-p | top-k | presence-penalty | 用途 |
| --- | --- | --- | --- | --- | --- |
| 聊天 | 0.7 | 0.9 | 20 | 0 | 对话前端 |
| **工具 / Agent** | **0.2** | **0.8** | **20** | **0.05** | 给客户端当推理后端 |

为什么要特意做「工具模式」？实测教训：**0.7 采样下，27B 遇到「工具返回空 / 报错」会重复发同一个调用，连发 15+ 次停不下来**——多步 Agent 编排直接死循环。把 temperature 降到 0.2、加轻微 presence penalty 后，重复调用被明显抑制。如果仍出现循环，引擎原生支持 `--greedy`（强制 temp 0），作为最终兜底。

## 九、客户端接入要点

引擎是 OpenAI 兼容 API：`http://127.0.0.1:8096/v1`，模型名 `qwen3.8-27b`，apiKey 随便填。接入任何客户端前，这套兼容性自检建议先过一遍：

- `stream: true` 正常；未知字段（temperature / top_p / parallel_tool_calls / stream_options）宽容，不报错；
- `max_tokens 8192` 不被拒；
- `reasoning_effort` 会被接受并吐 `reasoning_content` 思维链——**Agent 模式建议关 reasoning**，否则慢且占上下文；
- **model id 严格校验**：传错 id 直接 404，不会静默串台。客户端里填的 id 必须跟 `--model-id` 一字不差；
- 工具调用：`tools` + 流式都正常，实测 tool_calls 延迟 0.4~0.8s。

## 十、总结

本地部署 27B 的真正难点不在「装」，而在那些**不报错但 silently wrong** 的配置：五个环境变量缺一个就静默答错、`--max-shared-prefixes` 不设会在特定场景下被打砖、采样参数不改会让 Agent 死循环。把这篇的约束清单和启动 argv 照抄一遍，基本可以避开所有已知的坑。

下一步计划：写一篇推理侧的《显存账本：从 GGUF 量化到 KV Cache 换入换出》，把量化、offload、ring 缓存这几条优化路线串起来讲。

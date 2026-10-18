---
title: vLLM 高并发推理服务搭建与压测
date: 2026-03-22 10:00:00
tags:
  - 大模型部署
  - AI 工程化
categories: [大模型部署与推理]
abbrlink: "0695c8f4"
---

> ⚠️ **本文为公开资料整理版（占位）**：内容基于 vLLM 官方文档与社区实践梳理，用于建立知识框架；本人尚未在本地完成完整压测，**真实吞吐/延迟数据待补实践后替换**。如果你正在准备面试，这篇能帮你把「高并发推理」讲成体系；若要写进简历，请先亲手跑一遍。

## 一、vLLM 解决什么问题

核心创新是 **PagedAttention**：把 KV-cache 像操作系统管理内存页一样分页管理，避免为「最大可能长度」预先分配整块显存。效果是对话场景显存利用率大幅提升，能支持的并发数显著上去了。

对比定位：
- **llama.cpp**：端侧/单机主力，量化友好、轻量；
- **vLLM**：高并发在线服务，吞吐优先；
- **TGI（Text Generation Inference）**：HuggingFace 出品，企业级、功能全。

## 二、起一个 OpenAI 兼容服务

```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.9 \
  --max-num-seqs 256
```

接口和 OpenAI 对齐，老代码几乎不用改就能切过来。

## 三、关键参数（压测前先搞懂）

- `--tensor-parallel-size`：多卡切分，单机单卡就设 1；
- `--gpu-memory-utilization`：显存占用上限（0~1），调太高容易 OOM；
- `--max-num-seqs`：最大并发序列数，吞吐上限的硬开关；
- `--max-model-len`：上下文长度，直接吃显存，别无脑开大。

## 四、压测怎么设计

不要只测「一个请求多快」，要看**并发下的吞吐（tokens/s）和 P99 延迟**：

- 工具：locust / oha / vLLM 自带 benchmark；
- 指标：首 token 延迟（TTFT）、每输出 token 延迟（TPOT）、总吞吐；
- 变量：并发数、输入长度、输出长度，分别扫一遍看拐点。

## 五、吞吐 vs 延迟的经典权衡

并发拉高，吞吐上升但单请求延迟也上升——这是排队效应。生产调参的本质就是**在延迟 SLA 内把吞吐推到拐点**。常见做法：固定 `--max-num-seqs` 为 SLA 允许的上限，再调 `--gpu-memory-utilization` 撑住。

## 六、待补的真实实践清单（本人后续填）

1. 在本机 12G 卡上实测 7B/27B 能撑多少并发；
2. 对比 vLLM 与 Ollama 同模型同输入的吞吐差异；
3. 记录 OOM 时的参数组合与救法。

> 写完真实数据后，这篇会从「整理版」升级为「实战版」，标题和结论再校准。

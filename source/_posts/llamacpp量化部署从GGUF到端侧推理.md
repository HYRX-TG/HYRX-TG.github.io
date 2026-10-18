---
title: llama.cpp 量化部署：从 GGUF 到端侧推理
date: 2026-02-28 10:00:00
tags:
  - 大模型部署
categories: [大模型部署与推理]
abbrlink: "79254863"
---

本地跑大模型绕不开 llama.cpp。很多人以为它是个玩具，其实它是**今天绝大多数桌面/端侧推理的底座**——Ollama、LM Studio 底层都是它。这篇讲我从 GGUF 到真正在消费卡上跑顺的实战路径。

## 一、先搞清楚 GGUF 是什么

GGUF 是 llama.cpp 的模型格式，把权重、分词器、超参、对话模板全打进一个文件。相比原来的 GGML，它支持多字段、可扩展。**关键认知：同一个模型有无数量化档位，文件大小和显存占用能差好几倍。**

我常用的档位：
- `q4_K_M`：4-bit 主流量化，质量损失小、体积友好，7B 约 4GB、27B 约 15GB。
- `q8_0`：8-bit，更接近原模型，但体积翻倍。
- `q2_K` / `q3_K`：极限压缩，质量明显掉，只在没有办法时才用。

经验法则：**优先 q4_K_M，质量/体积最平衡；要保真再上 q8_0**。

## 二、怎么把模型变成 GGUF

如果拿到的是 HuggingFace 的 safetensors，用 `llama.cpp/converting` 脚本 + `quantize` 工具转：

```bash
python convert_hf_to_gguf.py ./model --outfile model.gguf
./quantize model.gguf model-q4_K_M.gguf q4_K_M
```

我之前从 HuggingFace 拉 Qwen 的 GGUF 再喂给 Ollama 就是这条链路（详见 [从 HuggingFace 拉取 GGUF 并导入 Ollama](/2026/06/22/f8c3a05a/) 那篇）。

## 三、真正跑起来：显存账要算清

llama.cpp 支持把层卸载到 GPU（`-ngl` / `--n-gpu-layers`），其余走 CPU。这一步最容易被坑：

- **上下文长度直接决定显存**：KV-cache 随 `context length` 线性涨，27B 开 32K 上下文比 4K 多吃几 GB。我曾因为开太大上下文导致直接 OOM。
- **n_gpu_layers 不是越大越好**：全卸载需要显存足够装下全部权重+KV；装不下就部分卸载，但部分卸载会很慢。

我的 27B 实战做法：先 `-ngl 999` 全卸载看能不能进显存，进不去就逐步降到能稳跑的层数。这部分和 [NInfer 27B 本地部署](/2026/05/12/cd37c220/) 的显存账是一脉相承的。

## 四、端侧推理的两类场景

1. **纯 CPU 推理**：没独显也能跑小模型（7B q4 在笔记本上 10+ tok/s），适合离线工具。
2. **GPU 卸载**：有卡就尽量卸载，速度一个量级提升。

踩坑实录：Windows 上用 CUDA 构建的 llama.cpp 才能用 GPU；如果用的是 CPU-only 构建，`-ngl` 设了也不生效——我一开始就是白设了半天没加速。

## 五、和 Ollama 的关系

Ollama 本质是「llama.cpp + 模型管理 + 服务封装」。自己用 llama.cpp 的好处是**参数完全可控**（量化档、层数、上下文、并发），Ollama 胜在省心。我的分工：调试阶段直接用 llama.cpp 抠参数，稳定后交给 Ollama 当服务。

## 小结

llama.cpp 不是玩具，是端侧推理的事实标准。掌握「选量化档 → 算显存账 → 调卸载层数 → 看上下文开销」这套动作，你就能在任何一台机器上讲清楚「我为什么这么部署」。

---
title: 句向量与文本相似度：用 sentence-transformers 实战语义检索
date: 2026-04-18 10:00:00
categories:
  - AI 算法笔记
tags:
  - NLP
  - 深度学习
abbrlink: "d3418ad4"
---

> 经验驱动。本文所有数字都来自本机真实运行：sentence-transformers + `BAAI/bge-small-zh-v1.5`，CUDA 可用（torch 2.12+cu128）。遇到什么坑、怎么解、bge 到底该怎么用，全写在这里。

## 为什么需要句向量

做语义检索、文本去重、聚类、召回排序时，关键词匹配（BM25）不够——"怎么退款"和"如何申请退钱"字面不重叠但意思一样。句向量（sentence embedding）把整句话映射成一个稠密向量，语义相近的句子在向量空间里距离更近，用余弦相似度就能衡量。

它和词向量（Word2Vec/BGE 词向量）的区别：词向量是 token 级别，句向量是 sentence 级别，通常由"词向量 + 池化（mean-pooling / CLS）"得到，并且经过**对比学习**训练，专门优化句间距离。

## 真跑：加载与推理

我用的是 `sentence-transformers`，模型是专门为中文语义检索训的 `bge-small-zh-v1.5`（维度 512，体积小、速度快）：

```python
import os
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("./models/bge-small-zh-v1.5")
print(model.get_embedding_dimension())  # 512

sents = [
    "今天天气真好，适合去公园散步",
    "外面阳光明媚，出门走走很舒服",   # 与 1 语义近
    "深度学习模型需要大量标注数据",     # 无关
    "神经网络训练依赖算力与数据",       # 与 3 近
]
emb = model.encode(sents, normalize_embeddings=True)
sim = model.similarity(emb, emb)        # 余弦相似度矩阵
print(sim)
```

## 真实跑出来的相似度矩阵

维度确认是 **512**。4 句话的相似度矩阵（本机输出，原样）：

```
[[1.0000, 0.6457, 0.2108, 0.2811],
 [0.6457, 1.0000, 0.2198, 0.2566],
 [0.2108, 0.2198, 1.0000, 0.5698],
 [0.2811, 0.2566, 0.5698, 1.0000]]
```

怎么读这张表：

- 句子 0↔1（"天气好去公园" vs "阳光明媚出门走走"）= **0.6457**，明显高 → 语义近，符合预期。
- 句子 2↔3（"深度学习需要标注数据" vs "神经网络依赖算力与数据"）= **0.5698**，次高 → 同属 AI 训练话题。
- 跨话题对（0↔2、0↔3、1↔2、1↔3）只有 **0.21~0.28**，被正确拉开。

我还做了一次检索验证：用 query "适合周末出门的活动" 去匹配上面 4 句，归一化余弦分别是 `[0.5777, 0.5775, 0.2630, 0.2821]`——两条"天气/出门"句被顶到最前，两条 AI 句靠后。语义检索成立。

## 三个真实踩坑

**1. HuggingFace 未登录下载被限流，config.json 返回空页。**

第一次直接 `SentenceTransformer("BAAI/bge-small-zh-v1.5")` 直接报 `JSONDecodeError: Expecting value: line 1 column 1`，卡在加载 config.json。原因是 HF 对未登录下载做了限流，返回的页面是空的。

解法：换镜像端点 + 用 curl 预下载到本地再加载。我最终用 `hf-mirror.com` 走系统代理把 `config.json / model.safetensors(95MB) / tokenizer.* / 1_Pooling/config.json` 等全部 curl 下来，然后 `SentenceTransformer("./models/bge-small-zh-v1.5")` 从本地加载，一次过。

**2. `normalize_embeddings` 和 `model.similarity` 都是余弦，不是点积。**

我本来以为要自己先 `normalize_embeddings=True` 再算点积才对。实测：开不开 `normalize_embeddings`，`model.similarity` 给出的矩阵**完全一样**（都是 0.6457 那版）。因为 `similarity` 默认就是余弦，内部已经归一化；raw 编码只是向量没单位化，但余弦计算时仍会归一。**结论：直接 `model.similarity(a, b)` 就是余弦，不必自己额外处理。**

**3. 手算余弦验证库没算错。**

我自己写了一份 numpy 余弦 `cos(a,b)=dot/|a||b|`，和库对比：手算 `cos(0,1)=0.6457274`，库 `0.6457275`，误差在 1e-7 量级。说明库可信，也说明这套数字能写进文章/面试。

## bge 的一个官方建议（但实测可省略）

bge 文档建议检索时给 query 加前缀 `为这个句子生成表示以用于检索：` 来提升召回。我实测在 normalized 余弦下不加前缀也工作良好（上面检索结果已验证）。**如果你发现短 query 召回偏弱，先加这个前缀试，是低成本优化。**

## 面试常考点

- **句向量 vs 词向量**：粒度不同；句向量经过句级对比学习，直接可用作相似度。
- **为什么检索要归一化**：余弦相似度对长度不敏感，适合"语义近不近"的判断；点积会被向量模长带偏。bge 这类模型训练目标就是余弦。
- **双塔（bi-encoder）特点**：query 和 doc 分别编码，doc 向量可离线建库，线上只编码 query 再做最近邻检索，吞吐高；缺点是交互弱于交叉编码器（cross-encoder），所以常配合 reranker 二阶段。
- **和 RAG 的关系**：句向量 + 向量库就是 RAG 的召回层；我博客里"手搓生产级 RAG"那篇就是在这个基础上接检索与生成。

## 小结

句向量是语义检索的基石。真跑一遍你会记住三件事：模型下载受限时换镜像+本地加载最稳；bge 的 similarity 直接是余弦别多此一举；检索效果要用真实 query 验证而不是只看矩阵。下一篇我用同一套思路讲 NER。

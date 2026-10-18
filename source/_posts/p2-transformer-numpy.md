---
title: 从零用 numpy 实现 Transformer 前向（含代码）
date: 2026-06-05
categories:
  - AI 算法笔记
tags:
  - 深度学习
  - Transformer
  - numpy
abbrlink: "ed13eed8"
---

> 经验驱动。不装 torch，用纯 numpy 把 Transformer 的**前向传播**手搓跑通（本机真跑，输出在下面）。重点不是训模型，而是把"它到底在算什么"拆清楚——这是面试被问 Transformer 时最值钱的部分。

## 为什么要手搓前向

很多人背得出"自注意力 = QKᵀ/√d·V"，但一问"Q/K/V 从哪来、多头怎么拼、位置信息怎么进来的"就卡壳。用 numpy 把前向过一遍，每个张量的 shape 都看得见，比看十篇图解都扎实。

## 四个核心部件

1. **词嵌入 + 位置编码**：token 先查表成向量，再叠加正弦位置编码（不加位置，模型不知道词序）。
2. **多头自注意力**：Q/K/V 三个投影，按头切分后各自做缩放点积注意力 `softmax(QKᵀ/√d_k)·V`，拼回再投影。
3. **前馈网络（FFN）**：两层线性 + 中间 ReLU，逐位置作用。
4. **残差 + LayerNorm**：每个子层外包 `LayerNorm(x + Sublayer(x))`，这是训练深层不崩的关键。

## 真跑代码（节选）

```python
def mh_attention(x):
    Q, K, V = x@Wq, x@Wk, x@Wv
    outs = []
    for i in range(h):                       # 按头切分
        q,k,v = Q[:,i*d_k:(i+1)*d_k], K[:,i*d_k:(i+1)*d_k], V[:,i*d_k:(i+1)*d_k]
        outs.append(softmax(q@k.T/np.sqrt(d_k)) @ v)
    return np.concatenate(outs,-1) @ Wo

attn_out = mh_attention(x)
x = layer_norm(x + attn_out)                 # 残差 + 归一
ffn = np.maximum(0, x@W1) @ W2
x = layer_norm(x + ffn)                      # 残差 + 归一
```

## 真跑结果（d_model=16, 头=4, 4 个 token）

```
输入 token 数: 4  d_model: 16  头数: 4
自注意力输出 shape: (4, 16)
最终输出 shape: (4, 16)
最终输出[0] 前 5 维: [-0.7902  0.3783 -1.0918  0.9407 -1.4224]
前向传播跑通，无 NaN: True
```

每个 token 都从 (16,) 进去、带着全局上下文的 (16,) 出来——这就是"自注意力让每个位置看到整句话"的具象。

## 诚实边界

这是**前向推理演示**，证明架构数学跑得通。要真正训练一个 Transformer（学权重），需要 torch + GPU + 数据，本机没装 torch，所以那一步留给真环境。但把前向拆明白后，你看任何 Transformer 变体（BERT/GPT/LLaMA）都只是"这几个部件怎么接"的问题。

## 小结

用 numpy 手搓 Transformer 前向，把嵌入、位置编码、多头注意力、FFN、残差归一逐个跑出 shape，比背公式有用。面试被问 Transformer，能讲清"每个张量怎么变"，比报参数量更显功底。

---
title: Week 6 Transformer 编码器笔记
date: 2023-02-03
tags:
  - 深度学习
  - NLP
categories: [AI 算法笔记]
abbrlink: "32967bde"
---
## 1.思维流程图
```plaintext
编码器:                         解码器:
                                
"I love you"                    "<s> 我 爱"
     │                               │
     ▼                               ▼
Embedding + 位置编码             Embedding + 位置编码
     │                               │
     ▼                               ▼
┌─────────────┐                ┌─────────────┐
│ 自注意力    │                │ 掩码自注意力 │ ← 只能看左边
│ (看全句)    │                └──────┬──────┘
└──────┬──────┘                       │
       │                              ▼
       │                       ┌─────────────┐
       ├──────────────────────→│ 交叉注意力   │ ← Q来自解码器
       │          K,V          │ (查编码器)   │   K,V来自编码器
       │                       └──────┬──────┘
       │                              │
       ▼                              ▼
┌─────────────┐                ┌─────────────┐
│ 前馈网络    │                │ 前馈网络    │
│ (各自消化)  │                │ (各自消化)  │
└──────┬──────┘                └──────┬──────┘
       │                              │
       ▼                              ▼
  上下文向量                     输出投影 → 预测概率
(给解码器用)                    → "我" "爱" "你"
```
### 一.编码器、解码器的核心模块
<!-- markdownlint-disable MD013 -->
| 对比维度 | 编码器 | 解码器 | 核心区别 |
| :--- | :--- | :--- | :--- |
| 输入 | 源语言句子（如 "I love you"） | 目标语言句子右移一位（如 "<s> 我 爱"） | 编码器看原文，解码器看译文（训练时） |
| Embedding | 有 | 有 | 完全相同，各自有自己的词表 |
| 位置编码 | 有 | 有 | 完全相同，公式一样 |
| 子层1 | 多头自注意力（无掩码） | 带掩码的多头自注意力 | 编码器看全句；解码器只能看已生成的部分 |
| 子层2 | 前馈网络 | 交叉注意力 | 编码器没有交叉注意力；解码器用它查编码器输出 |
| 子层3 | — | 前馈网络 | 解码器多一个前馈子层 |
| 残差连接 | 每个子层各1次 | 每个子层各1次 | 规则相同：x + Dropout(子层(x)) |
| 层归一化 | 每个子层各1次 | 每个子层各1次 | 规则相同 |
| 输出 | 上下文向量（给解码器用） | 每个位置的预测概率 | 编码器输出是中间产物；解码器输出是最终结果 |
| 处理模式 | 并行一次看完 | 训练时并行+掩码，推理时串行逐词生成 | 编码器不需要掩码，解码器必须防偷看 |
| 核心作用 | 理解输入 | 生成输出 | 一个读，一个写 |

<!-- markdownlint-disable MD013 -->
| 模块 | 一句话职责 |
| :--- | :--- |
| Embedding | 把词变成向量 |
| 位置编码 | 告诉模型谁在前谁在后 |
| 编码器自注意力 | 双向理解原文每个词的上下文 |
| 解码器掩码自注意力 | 单向理解已生成的内容，不偷看未来 |
| 交叉注意力 | 解码器查编码器：原文里有什么我能用的 |
| 前馈网络 | 每个词独立消化吸收刚才得到的信息 |
| 残差 + 层归一化 | 保底 + 稳定，保证深层堆叠不崩 |

### 二.Transformer编码器与解码器各层作用详解

#### 1. Embedding 层
编码器：把源语言词的索引（如 "love" → 5）映射成稠密向量 [0.8, -0.1, 0.4, -0.3]。

解码器：把目标语言词的索引（如 "爱" → 7）映射成稠密向量。

为什么各自独立：源语言和目标语言通常词表不同，"love" 和 "爱" 是不同的索引，需要各自的 Embedding 表。

#### 2. 位置编码
作用完全一样：给每个位置的词向量叠加一个独一无二的“位置指纹”，让模型知道词的先后顺序。

为什么两边都要：编码器需要知道 "I" 在 "love" 前面；解码器需要知道 "我" 在 "爱" 前面。位置信息在 Embedding 之后就丢失了，两边都要重新注入。

#### 3. 子层1：多头自注意力
##### 编码器：无掩码
每个词可以看到句子中所有其他词。

比如 "love" 可以同时看到 "I"（左边）和 "you"（右边）。

作用：双向理解上下文。

##### 解码器：带掩码
每个词只能看到自己和自己左边的词，看不到右边（未来）。

比如生成 "爱" 时，只能看到 "<s>" 和 "我"，不能看到还没生成的 "你"。

作用：模拟推理时的自回归生成，防止模型作弊。

掩码怎么做：在 scores 矩阵上，把未来位置填成 -1e9，softmax 后权重趋近于零。

#### 4. 子层2：编码器的前馈网络 vs 解码器的交叉注意力
##### 编码器：前馈网络
自注意力让词之间交流后，每个词需要自己消化吸收融合来的信息。

512 → 2048 → ReLU → Dropout → 512。每个词独立处理，互不影响。

作用：消化上下文，非线性变换。

##### 解码器：交叉注意力
Q 来自解码器自己的当前状态（“我需要什么信息？”）。

K 和 V 来自编码器的输出（“输入句子里有什么信息？”）。

解码器每生成一个词，都要“抬头看”一遍编码器的整个输出，决定该从原文哪个位置取信息。

作用：把输入句子的信息注入到生成过程中。这是编码器和解码器之间的唯一信息通道。

#### 5. 子层3：解码器的前馈网络
交叉注意力之后，词已经融合了来自编码器的信息，需要再次独立消化。

和编码器的前馈完全一样：512 → 2048 → ReLU → Dropout → 512。

作用：对融合了原文信息后的表示做最后的非线性加工。

#### 6. 残差连接 + 层归一化
编码器和解码器规则完全一样：每个子层后面都做 LayerNorm(x + Dropout(子层(x)))。

编码器有2个子层，所以2套残差+归一化。

解码器有3个子层，所以3套残差+归一化。

##### 作用
残差连接：保底机制，梯度直通车道，防止深层训练崩溃。

层归一化：数值标准化，防止分布逐层偏移。

### 三.例子
```plaintext
设定：
源语句（编码器输入）："I love you"
目标语句（解码器输入/输出）："我 爱 你"
d_model = 4（极小，为了手算）
num_heads = 2
编码器和解码器都只堆叠 1 层
```
#### 流程图
```plaintext
═══════════════════════════════════════════════════════════════
                    阶段一：输入准备（编码器侧）
═══════════════════════════════════════════════════════════════

原始句子: "I love you"
分词后:   ["I", "love", "you"]
查词表:   [2, 5, 3]
          →
输入张量: [[2, 5, 3]]  形状: [batch=1, seq_len=3]
          ↑ 每个数字是一个词的ID

                         │
                         ▼
┌─────────────────────────────────────────────┐
│  Embedding 层                                │
│  nn.Embedding(vocab_size=10, d_model=4)     │
│                                              │
│  [1, 3] → [1, 3, 4]                         │
│                                              │
│  例子:                                       │
│  词"I"(ID=2)  → [0.1, 0.3,-0.2, 0.5]       │
│  词"love"(5)  → [0.8,-0.1, 0.4,-0.3]       │
│  词"you"(3)   → [-0.2,0.6, 0.1, 0.7]       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  位置编码 PositionalEncoding                 │
│                                              │
│  [1, 3, 4] → [1, 3, 4]  (维度不变)          │
│                                              │
│  位置0指纹: [0.0, 1.0, 0.0, 1.0]            │
│  位置1指纹: [0.8, 0.5, 0.1, 1.0]            │
│  位置2指纹: [0.9,-0.4, 0.2, 1.0]            │
│                                              │
│  叠加后:                                     │
│  位置0: [0.1+0.0, 0.3+1.0, -0.2+0.0, 0.5+1.0] │
│       = [0.1, 1.3, -0.2, 1.5]               │
│  位置1: [0.8+0.8, -0.1+0.5, 0.4+0.1, -0.3+1.0] │
│       = [1.6, 0.4, 0.5, 0.7]                │
│  位置2: [-0.2+0.9, 0.6-0.4, 0.1+0.2, 0.7+1.0] │
│       = [0.7, 0.2, 0.3, 1.7]                │
└──────────────┬──────────────────────────────┘
               │
               ▼
         编码器输入: [1, 3, 4]
         记为 enc_input


═══════════════════════════════════════════════════════════════
                    阶段二：编码器层
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────┐
│  子层1: 多头自注意力 (无掩码)                │
│  MultiHeadAttention(d_model=4, num_heads=2) │
│                                              │
│  Q, K, V 都来自 enc_input                   │
│  每个头维度 d_k = 4/2 = 2                   │
│                                              │
│  输入: [1, 3, 4]                             │
│  split_heads: [1, 2, 3, 2]                 │
│  Q×K^T/√2:   [1, 2, 3, 3]  注意力方阵      │
│  ×V:         [1, 2, 3, 2]                 │
│  combine:    [1, 3, 4]                      │
│                                              │
│  → 残差连接 + LayerNorm                     │
│  → 输出1: [1, 3, 4]                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  子层2: 前馈网络                             │
│  PositionwiseFeedForward(d_model=4, d_ff=16)│
│                                              │
│  输入: [1, 3, 4]                             │
│  Linear1: [1, 3, 16]  (扩展)                │
│  ReLU:    [1, 3, 16]  (负数→0)             │
│  Linear2: [1, 3, 4]   (还原)                │
│                                              │
│  → 残差连接 + LayerNorm                     │
│  → 编码器最终输出: [1, 3, 4]                 │
│  记为 encoder_output                         │
└──────────────┬──────────────────────────────┘
               │
               │  encoder_output = [1, 3, 4]
               │  三个词的上下文向量:
               │  词1(对应"I"):   [a1, a2, a3, a4]
               │  词2(对应"love"): [b1, b2, b3, b4]
               │  词3(对应"you"):  [c1, c2, c3, c4]
               │
               ▼


═══════════════════════════════════════════════════════════════
                    阶段三：输入准备（解码器侧）
═══════════════════════════════════════════════════════════════

目标句子: "我 爱 你"
训练时：一次喂入整个目标句（Teacher Forcing），但加上掩码

输入: ["<s>", "我", "爱"]   （右移一位，预测"我 爱 你"）
索引:  [1, 7, 4]

解码器输入张量: [[1, 7, 4]]  形状: [1, 3]

                         │
                         ▼
┌─────────────────────────────────────────────┐
│  Embedding + 位置编码 (和编码器侧完全一样)    │
│                                              │
│  [1, 3] → [1, 3, 4]                         │
│                                              │
│  得到 dec_input: [1, 3, 4]                  │
└──────────────┬──────────────────────────────┘
               │
               ▼


═══════════════════════════════════════════════════════════════
                    阶段四：解码器层
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────┐
│  子层1: 带掩码的多头自注意力                 │
│  MultiHeadAttention (同上，但加 mask)        │
│                                              │
│  Q, K, V 都来自 dec_input                   │
│                                              │
│  mask (上三角矩阵，禁止看未来):               │
│     位置0("<s>"):   [1, 0, 0]  ← 只看自己   │
│     位置1("我"):    [1, 1, 0]  ← 看0,1     │
│     位置2("爱"):    [1, 1, 1]  ← 看0,1,2   │
│                                              │
│  → 残差连接 + LayerNorm                     │
│  → 输出1: [1, 3, 4]                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  子层2: 交叉注意力 (Cross-Attention)        │
│  MultiHeadAttention (无掩码)                │
│                                              │
│  ★关键区别:                                  │
│  Q: 来自解码器的输出1  [1, 3, 4]            │
│  K: 来自 encoder_output [1, 3, 4]  ← 编码器 │
│  V: 来自 encoder_output [1, 3, 4]  ← 编码器 │
│                                              │
│  解码器每个位置去查编码器的所有位置           │
│  例: 解码器"我"(Q) 查询编码器"I"(K) → 高分  │
│                                               │
│  → 残差连接 + LayerNorm                     │
│  → 输出2: [1, 3, 4]                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  子层3: 前馈网络 (和编码器完全一样)           │
│  PositionwiseFeedForward                    │
│                                              │
│  [1, 3, 4] → [1, 3, 16] → [1, 3, 4]       │
│                                              │
│  → 残差连接 + LayerNorm                     │
│  → 解码器最终输出: [1, 3, 4]                 │
│  记为 decoder_output                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  输出投影: Linear(d_model, vocab_size)       │
│                                              │
│  [1, 3, 4] → [1, 3, 10]                    │
│  10 是目标语言词表大小                        │
│  每个位置得到10个分数的 logits               │
│                                              │
│  位置0: 预测"我" (和真实标签"我"比较算Loss)  │
│  位置1: 预测"爱"                              │
│  位置2: 预测"你"                              │
└──────────────────────────────────────────────┘
```
#### 代码
```python
import torch
import torch.nn as nn
import math

# ============================================
# 1. 两个核心模块（复用前面的定义）
# ============================================
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        assert d_model % num_heads == 0
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)

    def scaled_dot_product_attention(self, Q, K, V, mask=None):
        # Q,K,V 形状: [batch, heads, seq, d_k]
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        # scores: [batch, heads, seq_q, seq_k]

        if mask is not None:
            # mask 形状: [batch, 1, seq_q, seq_k] 或可广播
            scores = scores.masked_fill(mask == 0, -1e9)

        attention_weights = torch.softmax(scores, dim=-1)
        output = torch.matmul(attention_weights, V)
        # output: [batch, heads, seq_q, d_k]
        return output, attention_weights

    def split_heads(self, x):
        # x: [batch, seq, d_model]
        batch_size, seq_len, _ = x.size()
        return x.view(batch_size, seq_len, self.num_heads, self.d_k).transpose(1, 2)
        # → [batch, heads, seq, d_k]

    def combine_heads(self, x):
        # x: [batch, heads, seq, d_k]
        batch_size, _, seq_len, _ = x.size()
        return x.transpose(1, 2).contiguous().view(batch_size, seq_len, self.d_model)
        # → [batch, seq, d_model]

    def forward(self, Q, K, V, mask=None):
        Q = self.split_heads(self.W_q(Q))
        K = self.split_heads(self.W_k(K))
        V = self.split_heads(self.W_v(V))
        # 三个都是 [batch, heads, seq, d_k]

        attn_output, attn_weights = self.scaled_dot_product_attention(Q, K, V, mask)
        # attn_output: [batch, heads, seq_q, d_k]

        output = self.combine_heads(attn_output)
        # output: [batch, seq_q, d_model]
        return self.W_o(output)


class PositionwiseFeedForward(nn.Module):
    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        return self.linear2(self.dropout(torch.relu(self.linear1(x))))


# ============================================
# 2. 位置编码
# ============================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(torch.arange(0, d_model, 2).float() *
                             (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)  # [max_len, 1, d_model]
        self.register_buffer('pe', pe)

    def forward(self, x):
        # x: [seq_len, batch, d_model]
        x = x + self.pe[:x.size(0), :]
        return self.dropout(x)


# ============================================
# 3. 编码器层（复用前面的）
# ============================================
class TransformerEncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads)
        self.feed_forward = PositionwiseFeedForward(d_model, d_ff, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)

    def forward(self, src, src_mask=None):
        # 对应流程图：阶段二

        # 子层1: 多头自注意力（无掩码）
        attn_output = self.self_attn(src, src, src, src_mask)
        src = self.norm1(src + self.dropout1(attn_output))

        # 子层2: 前馈网络
        ff_output = self.feed_forward(src)
        src = self.norm2(src + self.dropout2(ff_output))

        return src


# ============================================
# 4. 解码器层（新增，对应流程图阶段四）
# ============================================
class TransformerDecoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()

        # 子层1: 带掩码的自注意力
        self.self_attn = MultiHeadAttention(d_model, num_heads)

        # 子层2: 交叉注意力（Q来自自己，K/V来自编码器）
        self.cross_attn = MultiHeadAttention(d_model, num_heads)

        # 子层3: 前馈网络
        self.feed_forward = PositionwiseFeedForward(d_model, d_ff, dropout)

        # 三个归一化层，每个子层一个
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)

        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
        self.dropout3 = nn.Dropout(dropout)

    def forward(self, tgt, memory, tgt_mask=None, memory_mask=None):
        """
        tgt:    解码器输入  [seq_len_tgt, batch, d_model]
        memory: 编码器输出  [seq_len_src, batch, d_model]
        tgt_mask:   自注意力的掩码（上三角，防止偷看未来）
        memory_mask: 交叉注意力的掩码（通常为None，可看全部编码器输出）
        """

        # ---- 子层1: 带掩码的自注意力 ----
        # Q, K, V 都来自 tgt
        attn_output = self.self_attn(tgt, tgt, tgt, tgt_mask)
        tgt = self.norm1(tgt + self.dropout1(attn_output))

        # ---- 子层2: 交叉注意力 ----
        # Q 来自解码器自己，K 和 V 来自编码器输出 (memory)
        cross_output = self.cross_attn(tgt, memory, memory, memory_mask)
        tgt = self.norm2(tgt + self.dropout2(cross_output))

        # ---- 子层3: 前馈网络 ----
        ff_output = self.feed_forward(tgt)
        tgt = self.norm3(tgt + self.dropout3(ff_output))

        return tgt


# ============================================
# 5. 生成掩码的工具函数
# ============================================
def generate_square_subsequent_mask(sz):
    """
    生成上三角掩码，用于解码器的自注意力。
    sz: 序列长度
    返回: [sz, sz]
    例 sz=3:
    [[0., -inf, -inf],
     [0.,   0., -inf],
     [0.,   0.,   0.]]
    """
    mask = torch.triu(torch.ones(sz, sz), diagonal=1)
    # triu 上三角为1，diagonal=1 表示从主对角线上面那条开始
    mask = mask.masked_fill(mask == 1, float('-inf'))
    return mask


# ============================================
# 6. 完整前向传播示例
# ============================================
if __name__ == '__main__':
    d_model = 4
    num_heads = 2
    d_ff = 16
    vocab_size_src = 10
    vocab_size_tgt = 10

    # ---- 准备编码器输入 ----
    enc_embed = nn.Embedding(vocab_size_src, d_model)
    enc_pos = PositionalEncoding(d_model)
    enc_layer = TransformerEncoderLayer(d_model, num_heads, d_ff)

    # 模拟编码器输入 "I love you" → [2, 5, 3]
    src_tokens = torch.tensor([[2, 5, 3]])  # [1, 3]
    src_emb = enc_embed(src_tokens)         # [1, 3, 4]
    src_emb = src_emb.transpose(0, 1)       # [3, 1, 4]  ← 把seq_len放前面
    src_encoded = enc_pos(src_emb)          # [3, 1, 4]
    encoder_output = enc_layer(src_encoded) # [3, 1, 4]
    print(f"编码器输出形状: {encoder_output.shape}")  # [3, 1, 4]

    # ---- 准备解码器输入 ----
    dec_embed = nn.Embedding(vocab_size_tgt, d_model)
    dec_pos = PositionalEncoding(d_model)
    dec_layer = TransformerDecoderLayer(d_model, num_heads, d_ff)

    # 模拟解码器输入 "<s> 我 爱" → [1, 7, 4]
    tgt_tokens = torch.tensor([[1, 7, 4]])  # [1, 3]
    tgt_emb = dec_embed(tgt_tokens)         # [1, 3, 4]
    tgt_emb = tgt_emb.transpose(0, 1)       # [3, 1, 4]
    tgt_decoded = dec_pos(tgt_emb)          # [3, 1, 4]

    # 生成自注意力掩码
    tgt_mask = generate_square_subsequent_mask(tgt_decoded.size(0))
    # tgt_mask: [3, 3]

    # 解码器前向传播
    decoder_output = dec_layer(
        tgt=tgt_decoded,            # [3, 1, 4]
        memory=encoder_output,      # [3, 1, 4]  ← 编码器输出
        tgt_mask=tgt_mask,          # [3, 3]
        memory_mask=None            # 交叉注意力可以看全部编码器输出
    )
    print(f"解码器输出形状: {decoder_output.shape}")  # [3, 1, 4]

    # ---- 输出投影 ----
    output_proj = nn.Linear(d_model, vocab_size_tgt)
    logits = output_proj(decoder_output)  # [3, 1, 10]
    print(f"最终输出logits形状: {logits.shape}")

    # 三个位置的logits分别对应预测 "我", "爱", "你"
```
<!-- markdownlint-disable MD013 -->
| 流程图节点 | 代码对应行 |
| :--- | :--- |
| 编码器Embedding+位置编码 | enc_embed, enc_pos |
| 编码器子层1（自注意力） | TransformerEncoderLayer 里的 self_attn |
| 编码器子层2（前馈） | TransformerEncoderLayer 里的 feed_forward |
| 解码器Embedding+位置编码 | dec_embed, dec_pos |
| 解码器子层1（带掩码自注意力） | self_attn(tgt, tgt, tgt, tgt_mask) |
| 掩码生成 | generate_square_subsequent_mask |
| 解码器子层2（交叉注意力） | cross_attn(tgt, memory, memory) ← Q来自tgt，K/V来自memory |
| 解码器子层3（前馈） | feed_forward |
| 输出投影 | nn.Linear(d_model, vocab_size_tgt) |
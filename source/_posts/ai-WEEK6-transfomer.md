---
title: Week 6 Transformer 核心技术笔记
date: 2023-02-04
tags:
  - 深度学习
  - NLP
categories: [AI 算法笔记]
abbrlink: "150186e4"
---
# 📚 Week 6 Transformer 核心技术笔记（深度理解版）

## 📝 前言
本周系统学习了Transformer架构的核心原理与设计思想，这是现代大语言模型的基石。我们从技术演进脉络出发，深入拆解了注意力机制的数学本质、QKV三元组的工作原理、多头注意力的分工机制，并对比了BERT与GPT的架构差异，梳理了训练优化与推理加速的关键策略。

---

## 🧠 一、Transformer 概述

### 1. Transformer 的重要性
- **实现并行计算**：突破了传统RNN/Seq2Seq无法并行训练的瓶颈，所有位置同时计算，彻底解决串行训练效率低下的问题
- **统一序列建模范式**：使NLP/计算机视觉/语音等领域可以共用同一模型骨架，大幅降低跨模态迁移成本
- **催生大模型生态**：直接推动BERT、GPT系列等预训练大模型爆发，成为现代NLP乃至整个AI领域的基石架构

### 2. 技术演进时间线
<!-- markdownlint-disable MD013 -->
| 年份      | 技术/模型               | 关键进展                                                                 |
| :-------- | :---------------------- | :----------------------------------------------------------------------- |
| 2013      | Word2Vec（CBOW/Skip-gram） | 提出负采样和层次Softmax两种加速方案，大幅提升词向量训练速度，开启词嵌入时代 |
| 2014      | Seq2Seq（LSTM/GRU）     | 解决机器翻译等序列到序列问题，但存在信息压缩瓶颈，长序列信息丢失严重     |
| 2015      | Attention机制           | 引入动态上下文向量，解决Seq2Seq的固定维度瓶颈和信息丢失问题             |
| 2017      | Transformer             | 完全基于注意力机制，引入并行计算、多头注意力，彻底改变NLP范式           |
| 2018      | BERT                    | 基于Transformer编码器的双向预训练模型，首次在多项NLP任务上超越人类基准 |
| 2019-20   | GPT-2/GPT-3             | 基于Transformer解码器的自回归生成模型，展示强大的零样本/少样本学习能力   |
| 2022      | ChatGPT                 | 引入RLHF对齐训练，推动对话式AI走向实用，开启大模型商业化时代           |


## 🔄 二、Transformer 的设计哲学：信息流动的范式革命

**核心洞见：用"路径长度"替代"时间步"**

- RNN中，信息从位置1传到位置100需要跨越100个时间步，每一步都可能丢失信息
- Transformer中，任意两个位置的信息交互只需要O(1)层，因为自注意力直接在它们之间建立了"捷径"

这不是简单的"变快"，而是从根本上改变了信息流动的拓扑结构：将序列建模从"逐步传递"变成了"全连接图"——每一步都让所有词直接相互看到。并行计算只是这个新拓扑的附带红利。

---

## 📐 三、Attention 注意力机制基础

### 1. Attention 的核心作用
- **动态分配权重**：对输入序列中不同的词，根据当前任务需求分配不同的关注度权重
- **上下文向量化**：将整个输入序列的信息融合为一个包含全局依赖的上下文向量
- **自动对齐**：自动学习源语言与目标语言词汇间的对应关系，无需人工设计对齐规则

### 2. 核心思想
**灵感来源**：模拟人类观察事物时的选择性关注特性——只聚焦关键局部信息，而非无差别处理所有信息

**实现机制**：通过可学习的相似度计算 + Softmax归一化，让模型自主决定每个词的重要性权重（相关词权重可达0.6–0.8，无关词趋近于0）

**并行处理**：所有位置的信息同时计算，无需像RNN那样逐步串行，大幅提升训练效率

---

## ⚡ 四、Transformer 的革命性意义

### 1. 架构革新
- **并行化计算**：打破RNN/Seq2Seq的时间步依赖，所有位置同时参与计算，充分利用GPU并行算力
- **全局建模**：自注意力机制可在单层内捕捉任意位置间的依赖关系，从根本上解决长距离依赖问题
- **可扩展性**：模型规模可灵活扩展（深度、宽度均可线性堆叠），支持从轻量到超大规模的网络设计
- **硬件友好**：高度适配GPU/TPU等并行计算硬件，可利用Tensor Core等加速单元大幅提升吞吐

### 2. 性能突破
- BERT（2018）：首次在GLUE基准上超越人类基线（GLUE从72.8→80.2，SQuAD F1从76.3→93.2）
- 持续进步：后续模型（RoBERTa、T5、GPT-3等）在各项指标上持续刷新记录

> 注：以上为2018-2019年的历史数据，当前最优指标已大幅超越上述数值

### 3. 生态影响
- **Hugging Face开源生态**：提供完整工具链——模型库→数据集→训练工具→部署方案，大幅降低使用门槛
- **标准化NLP流水线**：形成"数据预处理→模型选型/微调→评估→部署上线"的标准化流程，每个模块都有成熟工具支持

> 注：在Transformer范式中，"特征工程"的概念被大幅弱化，原始文本可直接输入模型

---

## 🏗️ 五、注意力机制核心原理（深度拆解）

### 1. QKV 的本质：可微分键值检索系统
Transformer的核心计算单元，通过**Query-Key-Value三元组**实现动态权重分配。它的本质是一套可微分的键值检索系统：
- **Query**：你想查什么（检索请求）
- **Key**：每个位置贴了什么"标签"（用来匹配的索引）
- **Value**：每个位置存了什么"内容"（真正要提取的信息）

**工作流程**：用Query去匹配所有Key，得分越高，对应Value在输出中的比重越大。

Q、K、V均由同一输入X通过三组独立的线性变换得到：
$$
Q = X \cdot W_Q \\
K = X \cdot W_K \\
V = X \cdot W_V
$$
$W_Q、W_K、W_V$是三个独立学习的参数矩阵，将同一输入映射到三个不同的表示空间。

### 2. 自注意力的真正能力：动态上下文重组
自注意力常被简化为"对Value加权求和"，但这掩盖了其核心威力。每个位置的输出是整个序列中所有位置Value的加权组合，权重由当前位置的Query与所有位置的Key的匹配程度决定。

**关键在于**：权重是动态的、内容相关的——同一个词在不同上下文中，Q、K、V的值会变，注意力分布也随之变化。

这不是简单的平滑或平均，而是**内容感知的上下文重组**：每个词根据自己的"意图"（Query）从全局中"抓取"相关信息（Value），重新构建自己的表示。

### 3. QKV 注意力计算流程（三步）
**第一步：相似度计算**
通过Query与Key的点积计算匹配程度：
$$
\text{Attention Score} = Q \cdot K^T
$$
矩阵元素(i,j)表示第i个位置的Query对第j个位置的Key的相似度。

**第二步：权重归一化（含缩放因子√d_k的深层原因）**
将相似度分数除以√d_k（d_k为Key的维度），再通过Softmax转换为概率分布：
$$
\text{Attention Weights} = \text{Softmax}\left( \frac{Q \cdot K^T}{\sqrt{d_k}} \right)
$$

**为什么必须除以√d_k？**
点积的方差会随d_k的增大而膨胀（因为是d_k个随机变量的和）。当点积值过大时，Softmax会进入饱和区，输出近似one-hot，此时梯度几乎为零，训练停滞。除以√d_k将方差控制在1左右，使Softmax始终工作在梯度最敏感的区域。

**第三步：加权聚合**
将归一化后的注意力权重与Value矩阵相乘：
$$
\text{Output} = \text{Attention Weights} \cdot V
$$
输出：融合了全局信息的上下文向量，每个位置都包含了与序列中所有位置的关联信息。

### 4. 多头注意力：多子空间并行查询（分工是"涌现"的）
**核心思想**：让模型同时拥有多个独立的"检索系统"，每个头有自己独立的Q、K、V矩阵，将高维表示拆分为多个低维子空间，在每个子空间内独立做注意力，最后将结果拼接并投影回原维度。

不同头的功能分化是训练后自发"涌现"的，不是人为预设的。模型在训练过程中会自动学会在某些头上关注位置邻近关系，某些头关注词汇语义，某些头关注句法结构。

多个头相当于给模型多套"观察世界的滤镜"，让它可以同时捕捉多种不同类型的依赖。

### 5. 位置编码：弥补自注意力的"位置盲"
自注意力机制本身完全无法感知词的顺序——"我爱你"和"你爱我"在它看来是完全相同的一组词，因为注意力计算只依赖内容相似度（Q·K^T），与词的绝对位置无关。如果不加位置编码，Transformer就退化成一个集合处理器，而非序列处理器。

**位置编码的两种主流实现**：
- **正弦/余弦位置编码（原论文使用）**：使用不同频率的正弦/余弦函数为每个位置生成唯一编码，理论上可外推到比训练时更长的序列
- **可学习位置编码（BERT等使用）**：将位置编码作为可训练参数学习，但预训练时固定最大长度，推理时不能超过该长度

---

## 🧩 六、让深层堆叠成为可能：残差连接与层归一化
Transformer能堆叠几十层而不崩坏，靠的是两大支撑组件，它们各有分工：

### 1. 残差连接（Residual Connection）——解决梯度流动
每个子层（自注意力/前馈网络）的输出 = 输入 + 子层输出（即Add操作）。这条"高速公路"让梯度可以直接从深层回传到浅层，完全绕过子层内部的复杂变换。没有残差连接，深层Transformer根本训练不起来，因为梯度会在层层变换中消失。

### 2. 层归一化（Layer Normalization）——解决数值稳定
对每个样本的特征维度进行归一化（均值为0，方差为1）。随着网络加深，激活值很容易逐渐偏移或爆炸，层归一化强行将每一层的输出拉回标准分布，让训练过程始终稳定。

**二者配合的哲学**：残差保证了"路是通的"（梯度能回去），层归一化保证了"路上跑的车不超速"（数值不爆炸）。这是Transformer架构得以无限堆叠的物理基础。

---

## 🚀 七、训练优化策略
- **学习率预热（Warmup）**：训练初期从极小的学习率开始，线性增长到目标学习率，避免初始阶段训练不稳定
- **标签平滑（Label Smoothing）**：将one-hot标签向均匀分布方向微调（如真实标签概率从1.0降到0.9），防止模型对训练标签过度自信，提升泛化能力
- **注意力Dropout**：在注意力权重矩阵上随机丢弃部分连接，防止过拟合

---
## 📊 八、预训练与微调范式

### 1. 核心流程：两阶段训练
**第一阶段：预训练（Pre-training）**
- 使用海量无标注数据进行通用语言建模
- 学习通用的语言知识和模式

**第二阶段：微调（Fine-tuning）**
- 使用下游任务的少量标注数据进行适配
- 策略选择：
  - 数据极少时（如几百条）：冻结底层参数，仅微调顶层1-3层
  - 数据较充足时（如数千条以上）：全参数微调效果更优

### 2. 任务适配机制
- **[CLS]标记**：位于输入序列最前端，其对应的输出向量用于分类/聚类等需要整句表示的任务
- **[SEP]标记**：用于分隔句子对，适配问答、文本匹配、自然语言推理等需要处理两个句子的任务

### 3. 领域迁移能力
预训练模型具备强大的泛化基础，在专业领域（如医学、法律）仅需少量标注数据即可大幅提升性能。
> 示例：医学领域仅需约500条标注数据，模型识别准确率可从60%提升至92%

### 4. 数据泄露（通用注意事项）
- **定义**：训练时模型直接"记住"了训练数据的特征和答案，而非学习通用规律
- **表现**：测试集准确率虚高，但面对新数据时泛化能力极差
- **应对**：通过正则化、数据增强、合理的训练/验证集划分来防止记忆化

---

## 🔍 九、BERT 与 GPT：架构差异源于预训练任务
BERT和GPT的架构选择不是随机的，而是由预训练任务形式决定的因果链：**任务形式 → 信息访问模式 → 架构选择**。

### 1. BERT —— 双向编码器
- **预训练任务**：掩码语言模型（MLM）——随机盖住一些词，用上下文预测被盖住的词
- **信息需求**：必须同时看到前文和后文，因此需要双向注意力
- **架构**：仅使用Transformer的编码器（Encoder），每个词都能无限制地看到全句信息
- **主流版本**：
  - BERT-Base：12层Transformer，12头注意力，约110M参数
  - BERT-Large：24层Transformer，16头注意力，约340M参数
- **适用任务**：理解类（分类、问答、序列标注等）

### 2. GPT —— 单向解码器（自回归生成）
- **预训练任务**：下一个词预测（Next Token Prediction）——给定前文，预测下一个词
- **信息需求**：为了避免看到未来答案，必须只能看左侧已生成的词
- **架构**：基于Transformer的解码器（Decoder），通过因果掩码（Causal Mask）实现单向注意力
- **核心限制**：每个位置只能注意到它和它之前的词
- **适用任务**：生成类（文本续写、对话、翻译等）

**GPT推理核心优化——KV Cache**
GPT采用自回归生成：每生成一个新词，都需要将整个已生成序列重新送入模型计算下一个词。如果每次都对所有历史词重新计算Key和Value，会造成O(n²)的重复计算。

KV Cache的做法：将已生成词的Key和Value向量缓存起来，每次只计算新词的Q、K、V，从而将计算复杂度从O(n²)降至O(n)。这是GPT从"能运行"到"能部署"的关键一跃。

### 3. GPT 关键能力
- **零样本/少样本学习**：GPT-3（175B参数）首次将零样本/少样本学习变为实用范式，仅通过提示指令就能执行翻译、问答等任务
- **控制生成（Temperature参数）**：
  - temperature < 1：概率分布更集中，输出更确定、更保守（适合事实性任务）
  - temperature = 1：保持原始分布
  - temperature > 1：分布更平滑，输出更多样、更跳脱（适合创意性任务）

---

## ⚙️ 十、注意力优化与推理解码策略

### 1. 注意力优化技术
- **稀疏注意力（Sparse Attention）**：通过预设稀疏模式（如滑动窗口+全局注意力）降低计算复杂度，部分方法在长文本任务上表现甚至优于密集注意力
- **线性注意力（Linear Attention）**：通过核函数近似Softmax，将复杂度从O(n²)降至O(n)，内存占用约减少60%

### 2. 推理阶段解码策略
- **贪心搜索（Greedy Search）**：每步选概率最高的词，速度快但易陷入局部最优
- **束搜索（Beam Search）**：保留概率最高的k条候选路径，在质量和速度间平衡
- **Top-k采样**：只从概率最高的k个词中随机采样，增加多样性
- **Top-p（核）采样**：从累积概率超过p的最小词集合中随机采样，更灵活

### 3. Hugging Face 生态系统
提供完整的NLP工具链：模型库（Model Hub）→ 数据集（Datasets）→ 训练工具（Trainer）→ 部署方案（Inference API），大幅降低了Transformer模型的使用门槛。

---

## 📐 十一、核心公式汇总

### 1. 自注意力公式
$$
\text{Attention}(Q, K, V) = \text{Softmax}\left( \frac{QK^T}{\sqrt{d_k}} \right) V
$$
- $d_k$：Key向量的维度
- 除以√d_k的作用：缩放点积结果，防止点积值过大导致Softmax梯度消失

### 2. 多头注意力公式
$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O
$$
其中每个头：
$$
\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)
$$
- $W^O$的作用：将拼接后的多头输出进行线性变换，融合不同头的信息，输出维度恢复为d_model

### 3. 位置编码公式（正弦/余弦）
$$
PE_{(pos, 2i)} = \sin\left( \frac{pos}{10000^{2i/d_{model}}} \right) \\
PE_{(pos, 2i+1)} = \cos\left( \frac{pos}{10000^{2i/d_{model}}} \right)
$$
- pos：词在序列中的位置
- i：向量维度的索引（0到d_model/2 - 1）
- d_model：模型的隐藏层维度
- 偶数维度使用正弦，奇数维度使用余弦

---
## 十二.代码（多头注意力）
```plaintext
            Transformer Encoder Layer 完整数据流图
            句子: "A transformer is" (3个词)
            d_model = 512, num_heads = 8, d_ff = 2048

┌─────────────────────────────────────────────────────────┐
│  原始输入: 句子 "A transformer is"                       │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  词嵌入 (Embedding)                                      │
│  输入: 索引 [1, 3] → 查表                                 │
│  输出: [batch, seq_len, d_model] = [1, 3, 512]          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  位置编码 (PositionalEncoding)                           │
│  给每个位置的512维向量，叠加一个独一无二的"位置指纹"      │
│  输入: [1, 3, 512]                                       │
│  输出: [1, 3, 512]  (维度不变，但每个词有了位置信息)      │
│  然后转置: [1, 3, 512] → [3, 1, 512] (seq_len放前面)     │
└───────────────┬─────────────────────────────────────────┘
                │
                │  src: [3, 1, 512] (每个词是一个512维向量)
                │
                ▼
    ┌─────────────────────────────────────────────────┐
    │          子层1: 多头自注意力                      │
    │                                                 │
    │  Q, K, V 都来自 src                              │
    │                                                 │
    │  src ─→ 多头注意力 ─→ attn_output [3, 1, 512]   │
    │         (8个头并行, 每个头64维)                   │
    │                                                 │
    │  Add:   src + attn_output  = [3, 1, 512]        │
    │  Norm:  LayerNorm(上面结果)  → [3, 1, 512]       │
    └──────────────────────┬──────────────────────────┘
                           │
                           │ 中间输出: [3, 1, 512]
                           │ 此时每个词已经融合了上下文信息
                           │
                           ▼
    ┌─────────────────────────────────────────────────┐
    │          子层2: 前馈网络                          │
    │                                                 │
    │  输入: [3, 1, 512]                               │
    │                                                 │
    │  Linear1: 512 → 2048  [3, 1, 2048]              │
    │  ReLU:    负数变0      [3, 1, 2048]              │
    │  Dropout: 随机丢10%   [3, 1, 2048]              │
    │  Linear2: 2048 → 512  [3, 1, 512]               │
    │                                                 │
    │  Add:   输入 + ff_output  = [3, 1, 512]          │
    │  Norm:  LayerNorm(上面结果) → [3, 1, 512]        │
    └──────────────────────┬──────────────────────────┘
                           │
                           ▼
    最终输出: [3, 1, 512]
    含义: 每个词的新表示，融合了全句上下文 + 经过深度非线性变换

```
```python
import torch  # 是PyTorch的核心库。提供张量操作和自动微分
import torch.nn as nn  # nn是神经网络模块，提供层(比如说卷积层、池化层)和激活函数
import torch.nn.functional as F  # 提供一些函数式的接口
import numpy as np  #
import matplotlib

# 设置matplotlib后端，避免兼容性问题,可视化的兼容性问题
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # 帮助画图，MATLAB
import seaborn as sns  # seaborn提供相对较好的热力图


# 完整的多头注意力机制
class MultiHeadAttention(nn.Module):
    """
    多头注意力机制的 PyTorch 实现。
    这比纯 NumPy 实现更贴近实际应用，并封装在 nn.Module 中。
    """

    def __init__(self, d_model, num_heads):  # d_model是模型的维度，num_head是多少头
        """
        初始化函数。

        参数:
        d_model (int): 模型的总维度，必须能被 num_heads 整除。
        num_heads (int): 注意力头的数量。
        """
        super(MultiHeadAttention, self).__init__()  # Super是一个调用父类的参数方法，属于语法，调用了这个nn.Module
        assert d_model % num_heads == 0, "d_model 必须能被 num_heads 整除"  # assert断言检查，确保模型维度能被头数整除，否则在后面的轮次运行会报错

        self.d_model = d_model  # Self就表明这个实例本身，作用是将外部传入的参数保存为，这个实例自己的属性
        self.num_heads = num_heads  # 保存头的数量
        self.d_k = d_model // num_heads  # 计算并且保存每个头的维度

        # 线性变换层 W_q,W_k,W_v,W_o 处理三元组，代表这个线性层有四层
        self.W_q = nn.Linear(d_model, d_model)  # Q代表查询操作，这是在构建Q的变化矩阵
        self.W_k = nn.Linear(d_model, d_model)  # Key在构建自己的变化矩阵
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)  # 这是out输出矩阵整合QKV三元组多头注意力的结果

    # 1.每个线性层都必须有 每个维度 与 每个维度相乘的参数（d_model * d_model），这是因为前一个矩阵与后一个矩阵要相乘
    # 2. 比如说D-model是128，那么总参数量应该是线性层乘以该矩阵，也就是4×128的平方

    def scaled_dot_product_attention(self, Q, K, V, mask=None):
        """
        核心的缩放点积注意力计算。矩阵运算
        """
        # TODO
        scores = torch.matmul(Q, K.transpose(-2, -1)) / np.sqrt(self.d_k)  # 防止梯度消失的问题
        # Mat是从torch中引出来的一个函数，它的作用是用作点积的乘法，这里也就意味着Q与K的转置相乘，也就是矩阵乘法
        # 做一个数据泄露的问题扼制
        if mask is not None:  # 在解码器中防止模型看到未来的信息
            scores = scores.masked_fill(mask == 0, -1e9)
        # Mask的作用，他会给比如说一个3×3矩阵中，本该是零位置的，给它  赋一个极小值，这里的-1E9就是-10亿，经过softmax映射到0~1之间，就会把这里信息隐藏掉
        attention_weights = F.softmax(scores, dim=-1)  # 这个大F中有softmax函数，dim代表每行和唯一。Soft max函数将分数转化为概率分布加起来为1
        output = torch.matmul(attention_weights, V)  # 这里是将注意力权重的矩阵与value矩阵相乘，得到结果矩阵
        return output, attention_weights

    def split_heads(self, x):  # 不分割张量的话，他会汇聚到一个头上去
        """
        将输入张量分割成多个头。
        输入 x 形状: (batch_size, seq_len, d_model)
        输出形状: (batch_size, num_heads, seq_len, d_k)
        """
        batch_size, seq_len, _ = x.size()
        return x.view(batch_size, seq_len, self.num_heads, self.d_k).transpose(1, 2)

    # View代表重塑张量的形状，Transpose交换维度
    # 看上面的输入和输出X的形状，Batch size代表每批次处理多少，seq_len每个句子有几个词,d_model总维数
    # [2,3,12] 输入X代表有两个句子，每个句子有3个词，总共有12个维度,d_k（每个头的维度）* num_heads(多少头) 等于总维度数
    # [2,4,3,3] 变换之后输出X,有两个句子，有4个头数，每个句子有3个词，每个头有3维度，变换之后，意味着每个头可以学习后面的两个参数，意味着每个头可以学习3个词三维
    def combine_heads(self, x):
        """
        将多个头的输出合并。
        输入 x 形状: (batch_size, num_heads, seq_len, d_k)
        输出形状: (batch_size, seq_len, d_model)
        """
        batch_size, _, seq_len, _ = x.size()
        return x.transpose(1, 2).contiguous().view(batch_size, seq_len, self.d_model)

    def forward(self, Q, K, V, mask=None):
        """
        前向传播。
        """
        """
        1. 线性变换, QKV
        2. 分割成多头
        3. 计算缩放点积注意力
        4. 合并多头
        5. 最终进行线性变换，output
        """
        Q, K, V = self.W_q(Q), self.W_k(K), self.W_v(V)
        Q, K, V = self.split_heads(Q), self.split_heads(K), self.split_heads(V)
        output, attention_weights = self.scaled_dot_product_attention(Q, K, V, mask)
        # 调用上面三元组的运算
        output = self.combine_heads(output)
        output = self.W_o(output)

        return output, attention_weights


def visualize_attention(attention_weights, tokens):  # 定义一个可视化函数 用于显示注意力权重
    """
    可视化注意力权重。
    """
    assert len(tokens) == attention_weights.shape[-1]

    num_heads = attention_weights.shape[1]
    fig, axes = plt.subplots(1, num_heads, figsize=(num_heads * 4, 4), dpi=120)
    if num_heads == 1:
        axes = [axes]

    for i in range(num_heads):  # 为每一个头绘制热力图
        ax = axes[i]
        sns.heatmap(attention_weights[0, i].detach().numpy(),  # 将结果转化为矩阵
                    xticklabels=tokens, yticklabels=tokens, ax=ax, cmap='viridis', cbar=False)
        ax.set_title(f"Attention Head {i + 1}")
        ax.tick_params(axis='x', rotation=90)
        ax.tick_params(axis='y', rotation=0)

    plt.tight_layout()

    # 保存图片而不是显示，避免兼容性问题
    filename = 'attention_visualization.png'
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"注意力可视化已保存为 '{filename}'")
    plt.close()  # 关闭图形以释放内存


def analyze_attention_patterns(attention_weights, tokens):
    """
    分析注意力模式，提供统计信息。
    """
    attention_np = attention_weights[0].detach().numpy()
    num_heads = attention_np.shape[0]
    seq_len = attention_np.shape[1]

    print("\n--- 注意力模式统计 ---")

    for head_idx in range(num_heads):
        head_attention = attention_np[head_idx]

        # 计算自注意力强度（对角线元素）
        self_attention = np.diag(head_attention)
        avg_self_attention = np.mean(self_attention)

        # 计算注意力集中度（最大值的平均值）
        max_attention_per_token = np.max(head_attention, axis=1)
        avg_max_attention = np.mean(max_attention_per_token)

        # 计算注意力分布的熵（衡量分布的均匀性）
        attention_entropy = -np.sum(head_attention * np.log(head_attention + 1e-10), axis=1)
        avg_entropy = np.mean(attention_entropy)

        print(f"\n注意力头 {head_idx + 1}:")
        print(f"  平均自注意力强度: {avg_self_attention:.3f}")
        print(f"  平均最大注意力: {avg_max_attention:.3f}")
        print(f"  平均注意力熵: {avg_entropy:.3f}")

        # 判断注意力模式类型
        if avg_self_attention > 0.5:
            pattern_type = "自注意力型"
        elif avg_entropy < 1.0:
            pattern_type = "集中型"
        else:
            pattern_type = "分散型"

        print(f"  模式类型: {pattern_type}")


if __name__ == '__main__':
    # --- 教学演示 ---
    # 定义模型超参数
    d_model = 128
    num_heads = 4

    # 准备输入数据
    # 使用一个具体的句子
    sentence = "The only limitto our realization "
    tokens = sentence.split()
    seq_len = len(tokens)
    batch_size = 1

    # 创建词汇表和简单的词嵌入
    vocab = {word: i for i, word in enumerate(tokens)}
    embedding = nn.Embedding(len(vocab), d_model)

    # 将 token 转换为索引
    token_ids = torch.tensor([vocab[word] for word in tokens]).unsqueeze(0)  # (batch_size, seq_len)

    # 获取词嵌入
    # 在自注意力中, Q, K, V 都来自同一个输入序列
    input_embeddings = embedding(token_ids)  # (batch_size, seq_len, d_model)

    print("--- 输入 ---")
    print(f"句子: '{sentence}'")
    print(f"输入嵌入的形状: {input_embeddings.shape} (Batch, SeqLen, d_model)")
    print("-" * 20)

    # 初始化多头注意力模块
    multi_head_attention = MultiHeadAttention(d_model, num_heads)

    # 前向传播
    # 在自注意力中，Q, K, V 是相同的
    output, attention_weights = multi_head_attention(input_embeddings, input_embeddings, input_embeddings)

    print("\n--- 输出 ---")
    print(f"输出张量的形状: {output.shape} (Batch, SeqLen, d_model)")
    print(f"注意力权重形状: {attention_weights.shape} (Batch, NumHeads, SeqLen, SeqLen)")
    print("\n解释: 输出的每个词向量现在都融合了句子中其他词的信息（根据注意力权重）。")
    print("-" * 20)

    print("\n--- 注意力可视化 ---")
    print("下面的热力图展示了每个注意力头学到的不同关注模式。")
    print("每个单元格的颜色深浅代表了Y轴的词（Query）对X轴的词（Key）的关注程度。")
    visualize_attention(attention_weights, tokens)

    print("\n--- 可视化解读 ---")
    print("观察不同头的热力图：")
    print(" - 有的头可能主要关注对角线，即每个词更关注自己。")
    print(" - 有的头可能关注相邻的词，形成一种类似n-gram的模式。")
    print(" - 有的头可能会学习到语法关系，例如 'sat' 可能会同时关注 'cat' 和 'mat'。")
    print("这就是多头注意力的优势：它能从不同子空间捕捉多样化的依赖关系。")

    # 添加详细的注意力分析
    print("\n--- 详细注意力分析 ---")
    attention_np = attention_weights[0].detach().numpy()

    for head_idx in range(num_heads):
        print(f"\n注意力头 {head_idx + 1} 的分析:")
        head_attention = attention_np[head_idx]

        # 找到每个词最关注的词
        for i, token in enumerate(tokens):
            max_attention_idx = np.argmax(head_attention[i])
            max_attention_val = head_attention[i][max_attention_idx]
            print(f"  '{token}' 最关注 '{tokens[max_attention_idx]}' (权重: {max_attention_val:.3f})")

        # 计算平均注意力分布
        avg_attention = np.mean(head_attention, axis=0)
        print(f"  平均注意力分布: {dict(zip(tokens, [f'{val:.3f}' for val in avg_attention]))}")

    print(f"\n可视化图片已保存为 'attention_visualization.png'，请查看该文件以观察注意力热力图。")

    # 调用注意力模式分析函数
    analyze_attention_patterns(attention_weights, tokens)

    print("\n--- 多头注意力机制深度解析 ---")
    print("1. 为什么需要多头注意力？")
    print("   - 单一注意力机制只能学习一种依赖关系模式")
    print("   - 多头机制允许模型同时关注不同的特征子空间")
    print("   - 每个头可以学习不同的语法、语义或位置关系")

    print("\n2. 多头注意力的数学原理：")
    print("   - 将输入向量分割成h个子空间（h个头）")
    print("   - 每个子空间独立计算注意力")
    print("   - 最后将所有头的输出拼接并投影")
    print(f"   - 在我们的例子中：{d_model}维 → {num_heads}个{d_model // num_heads}维子空间")

    print("\n3. 实际应用中的优势：")
    print("   - 并行计算：所有头可以同时计算，提高效率")
    print("   - 特征多样性：不同头学习不同的特征模式")
    print("   - 鲁棒性：单个头的失效不会严重影响整体性能")
    print("   - 可解释性：可以分析每个头的专门功能")

    print("\n4. 训练建议：")
    print("   - 头数通常选择为d_model的因子（如8、16等）")
    print("   - 可以通过可视化分析每个头的功能")
    print("   - 某些头可能会被训练成专门关注特定模式")
    print("   - 可以通过头剪枝技术移除不重要的头")

# 老师说，算法工程师并不是要写所有代码。要合理利用已有的函数框架：
# 第一是从hanging face上或者官网上去把函数的应用理解之后拷过来，然后自己改一下。
# 第二是利用大模型直接建一个写好的函数框架，然后自己加上去
```



## 📚 学习心得
本周系统学习了Transformer架构的完整知识体系，最大的收获是理解了"注意力机制"如何从根本上改变了序列建模的范式。从RNN的逐步传递到Transformer的全连接信息流动，不仅是计算效率的提升，更是模型表达能力的质的飞跃。

QKV三元组的设计、多头注意力的分工、残差连接与层归一化的配合，每一个细节都体现了精妙的工程智慧。而BERT与GPT的架构差异，更是让我明白了"任务决定架构"这一核心设计原则。

这些知识是理解现代大语言模型的核心基础，只有掌握了Transformer的底层原理，才能真正理解GPT、Claude等大模型的工作机制，为后续深入学习大模型微调、推理优化打下坚实的基础。
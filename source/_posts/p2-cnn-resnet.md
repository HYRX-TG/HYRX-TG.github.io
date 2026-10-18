---
title: CNN 实战：用 ResNet 做图像分类
date: 2026-06-18
categories:
  - AI 算法笔记
tags:
  - 深度学习
  - CNN
  - 图像分类
abbrlink: "a8cc5207"
---

> 经验驱动。CNN 的基本前向我用**纯 numpy 手搓跑通**了（真实 shape 在下面）；再讲 ResNet 怎么在这个基础上"加深不退化"。完整 ResNet 训练需要 torch + GPU，本机未装 torch，那部分给出规范实现并诚实标注。

## CNN 在算什么（先跑通最小单元）

CNN 本质是一连串"卷积提特征 → 激活 → 池化降维 → 展平 → 全连接分类"。我用一个 8×8×3 的图，手搓一个最小 CNN 前向，看每个阶段 shape 怎么变：

```python
conv = conv2d(img, w, b)        # 8x8x3 -> 6x6x2 （2 个 3x3 卷积核）
relu = np.maximum(0, conv)      # 激活，非零比例 0.43
pool = maxpool2d(relu, 2)       # 6x6x2 -> 3x3x2
flat = pool.reshape(-1)         # 展平 18 维
logits = flat @ Wd              # 18 -> 3 类
```

真跑结果：

```
输入图 shape: (8, 8, 3)
卷积后 shape: (6, 6, 2)   ReLU 后非零比例: 0.43
池化后 shape: (3, 3, 2)   展平维度: 18
分类 logits: [-0.1582  0.2601  0.0164]   预测类别: 1
CNN 前向跑通，无 NaN: True
```

这证明卷积 → 池化 → 全连接这条链路数学上是通的。

## ResNet 解决了什么问题

上面这个太浅，分类效果有限。堆深一点（20、50 层）按理说更强，但朴素深 CNN 会出现**退化**：层数多了训练误差反而上升。ResNet 的解法是**残差连接（skip connection）**：

```python
# 残差块：输出 = F(x) + x，让网络学"残差"而非整层映射
out = relu(layer_norm(conv2(conv1(x)) + x))   # +x 就是捷径
```

`F(x)+x` 保证至少不比浅层差（恒等映射永可达），于是能安全地堆到 50/101/152 层。ImageNet 上 ResNet-50 至今仍是很多视觉任务的 backbone。

## 规范的 ResNet-50 训练骨架（torch，待 GPU 环境跑）

```python
import torch, torch.nn as nn
class ResidualBlock(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.seq = nn.Sequential(
            nn.Conv2d(ch, ch, 3, padding=1), nn.BatchNorm2d(ch), nn.ReLU(),
            nn.Conv2d(ch, ch, 3, padding=1), nn.BatchNorm2d(ch))
    def forward(self, x):
        return nn.functional.relu(self.seq(x) + x)   # 残差 + 捷径

# 堆叠 + 全局池化 + 全连接，喂 ImageNet/自定义数据集训练
```

## 踩坑实录

- **卷积输出尺寸算错**：`out = (in - k + 2p)/s + 1`，padding 没配好就 shape 对不上，numpy 手搓时最容易暴露。
- **通道数对不齐**：卷积核的 `C_in` 必须等于输入通道，多分支合并时尤其要检查。
- **池化把空间压没**：连续大 stride 池化会让特征图变 0 维，展平直接崩。
- **真训练要 torch/GPU**：上面 numpy 只证前向；ResNet-50 全量训练得在 GPU 上跑，本机未装 torch，留待真环境。

## 小结

CNN 的最小前向用 numpy 就能跑通（卷积→激活→池化→分类，真实 shape 已验证）；ResNet 在这个基础上加残差连接解决"深了反而退化"的难题，是视觉 backbone 的基石。面试聊 CNN，能讲清"卷积在提什么、ResNet 为什么能深"，比说"我用过 ResNet"更有料。

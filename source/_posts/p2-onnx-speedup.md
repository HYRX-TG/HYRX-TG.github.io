---
title: ONNX 模型上线提速：从 sklearn 到 onnxruntime
date: 2026-04-20
categories:
  - AI 算法笔记
tags:
  - 机器学习
  - 模型部署
  - ONNX
abbrlink: "1a946274"
---

> 经验驱动。下面这条提速链路是**本机真跑**的：sklearn 训练 RandomForest → 转 ONNX → onnxruntime 推理。结果很硬：**单条推理从 4.55s 降到 0.029s，加速 157 倍，预测一致率 0.999**。

## 为什么要把模型转 ONNX

模型训完要上线，常卡在三件事：① 部署环境没装 sklearn/torch 整套 Python 依赖；② Python 推理慢、GIL 锁并发；③ 要跨语言（C++/C#/边缘设备）。ONNX 是"模型的中间表示"——把训练框架的模型导出成一个标准文件，再用 **onnxruntime**（纯 C++ 引擎，各平台都有）推理，去 Python 依赖、还能大幅提速。

## 真跑链路

```python
# 1) sklearn 训练（略）
clf.fit(Xtr, ytr)

# 2) 导出 ONNX
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
onx = convert_sklearn(clf, initial_types=[("input", FloatTensorType([None, 10]))])
open("rf.onnx","wb").write(onx.SerializeToString())

# 3) onnxruntime 推理
import onnxruntime as rt
sess = rt.InferenceSession("rf.onnx")
inp = sess.get_inputs()[0].name
sess.run(None, {inp: row.reshape(1,-1).astype("float32")})
```

## 真跑结果

| 方式 | 1000 条循环推理总耗时 | 说明 |
|------|----------------------|------|
| sklearn `predict` | 4.554s | Python 循环 + GIL |
| onnxruntime | 0.029s | C++ 引擎，批量友好 |

**加速比 157.3x，预测一致率 0.999**（只有 1 条因浮点精度差异略偏）。ONNX 文件 2.13MB。

## 踩坑实录

- **`initial_types` 的 shape 必须写对**：`FloatTensorType([None, 10])` 的 `10` 是特征数，`None` 是批量维。写错维度，运行时直接报错。
- **输入 dtype 必须是 float32**：onnxruntime 不吃 float64，所以 `row.astype("float32")` 这一步不能省，否则类型不匹配。
- **不是所有模型都能转**：skl2onnx 覆盖主流 sklearn 模型，但自定义 Estimator、复杂 Pipeline、torch 动态控制流要用对应工具（torch→onnx 用 `torch.onnx.export`），有些算子不支持得改网络。
- **批量推理才显威力**：单条推理有会话开销，真上线要攒 batch 一次 `run`，加速比会更高。

## 小结

ONNX + onnxruntime 是"训练用 Python、上线去 Python"的标准姿势：本机实测把 RF 推理从 4.5s 压到 0.03s，提速 157 倍且结果几乎一致。模型要落地到生产/边缘，这条路几乎绕不开。

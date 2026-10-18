---
title: 机器学习实战复盘：线性回归作业与 5 个新手避坑指南
date: 2023-01-07 11:27:00
tags:
  - 机器学习
  - 排障
categories: [AI 算法笔记]
abbrlink: "323ac0e8"
---
> 本篇通过加州房价预测线性回归作业，**复盘新手最容易踩的5个典型坑**：回归任务误用分层抽样、评估指标传参错误、变量逻辑顺序颠倒、占位符未替换、特征标准化流程混乱。
> 犯错是最好的学习，这篇帮你把弯路走直。

---

## 💻 一、作业完整代码（修正后最终版）

```python
import pandas as pd
import numpy as np
import matplotlib

matplotlib.use('Agg')  # 设置非交互式后端
import matplotlib.pyplot as plt
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False

print("=== 多元线性回归作业 ===")

# 1. 加载数据
housing = fetch_california_housing()
X = pd.DataFrame(housing.data, columns=housing.feature_names)
y = housing.target

print(f"样本数: {X.shape[0]}, 特征数: {X.shape[1]}")
print(f"房价范围: {y.min():.2f} - {y.max():.2f}")

# ======================
# 基础多元线性回归
# ======================
print("\n=== 基础多元线性回归 ===")

# 划分数据（回归任务不加 stratify！）
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 训练与预测
model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# 评估（对比 y_test 和 y_pred）
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"均方误差 MSE: {mse:.4f}")
print(f"R2 分数: {r2:.4f}")

# ======================
# 特征工程与改进
# ======================
print("\n=== 特征标准化后 ===")

# 标准化流程：先 fit_transform 全量数据，再切分
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 划分标准化后的数据
X_train_scaled, X_test_scaled, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# 训练新模型
model_scaled = LinearRegression()
model_scaled.fit(X_train_scaled, y_train)
y_pred_scaled = model_scaled.predict(X_test_scaled)

# 评估
mse_scaled = mean_squared_error(y_test, y_pred_scaled)
r2_scaled = r2_score(y_test, y_pred_scaled)
print(f"标准化后 MSE: {mse_scaled:.4f}")
print(f"标准化后 R2: {r2_scaled:.4f}")

print("\n作业完成")
```

⚠️ 二、避坑指南：5 个典型错误复盘
<!-- 表格开始 -->
| 错误编号 | 错误类型         | 错误代码                          | 报错 / 后果                          | 原因分析                                         | 正确做法                                  |
| :------ | :--------------- | :-------------------------------- | :----------------------------------- | :----------------------------------------------- | :-------------------------------------- |
| 1       | 分层抽样误用     | `train_test_split(..., stratify=y)` | `ValueError: The least populated class...` | 混淆分类与回归：回归的 y 是连续值，无法分层       | 回归任务直接删除 `stratify` 参数         |
| 2       | 评估指标传参错位 | `mean_squared_error(X_test, y_pred)` | 数值无意义或报错                     | MSE 对比的是“真实值”与“预测值”                   | 永远是 `(y_test, y_pred)`                |
| 3       | 变量未定义       | 先切分再标准化                    | `NameError: name 'X_scaled' is not defined` | 逻辑顺序错误：试图使用还未创建的变量              | 先 `fit_transform(X)` 再切分 `X_scaled` |
| 4       | 占位符未替换     | `model.predict(...)`              | `ValueError: Expected 2D array...`    | 草稿未清理：`...` 无法识别                       | 传入特征数据 `model.predict(X_test)`     |
| 5       | 标准化流程误解   | 先切分再分别标准化                | 数据泄露或效果差                     | 必须先拟合全量数据分布                            | 遵循“先整体转换，后切分”原则             |

📌 三、核心概念解惑
问题一：怎么判断是分类还是回归？什么时候用 stratify=y？
1. 分类 vs 回归：一眼识别法
<!-- 表格开始 -->
| 判断维度     | 回归 (Regression)           | 分类 (Classification)             |
| :----------- | :------------------------- | :------------------------------- |
| 目标变量 (y) | 连续的数值                 | 离散的类别 / 标签                |
| 核心关键词   | 预测“多少”、“大小”         | 预测“是不是”、“哪一个”          |
| 典型例子     | 房价、气温、体重、销售额   | 垃圾邮件、癌症检测、鸢尾花品种  |
| 能否算平均值 | 能（平均房价有意义）       | 不能（平均类别无意义，只能算比例）|
| 本次作业     | ✅ 预测房价（连续值）       | ❌                               |

2. stratify=y 使用场景
只能用在分类问题：且通常是数据不平衡时（如 95% 负样本，5% 正样本）
作用：强制保证训练集和测试集的类别比例一致，避免少数类全被分到训练集
回归绝对不能用：y 是连续值，计算机无法为每一个独特的数值 “分层”

问题二：函数括号里到底该放什么？
不用死记硬背！记住这套 **“看后缀 + 查字典”** 法则：
1. 通用后缀法则
2. <!-- 表格开始 -->
| 函数 / 方法后缀 | 通常放什么         | 核心逻辑                             | 例子                          |
| :------------- | :----------------- | :----------------------------------- | :---------------------------- |
| .fit()         | (X_train, y_train) | 给模型看“习题和答案”让它学习         | model.fit(X_train, y_train)    |
| .predict()     | (X_test)           | 只给“试卷”，让模型写答案（千万别给 y） | model.predict(X_test)         |
| _score / _error | (y_test, y_pred)  | 拿“标准答案”和“模型答案”对分         | accuracy_score(y_test, y_pred) |
| train_test_split | (X, y)            | 切分原始的全量数据                   | train_test_split(X, y, ...)   |
2. PyCharm 终极绝招
鼠标悬停或按 Ctrl+Q (Win) / Ctrl+J (Mac)：查看函数签名
看到 y_true 就填真实值，看到 X 就填特征，基本不会错


📚 学习心得
1.这次作业最大的收获不是跑通了线性回归，而是建立了严谨的机器学习代码逻辑：
2.先判断任务类型：拿到数据先看 y，决定是分类还是回归，这决定了后续所有代码
3.注意数据流动顺序：先处理数据，再切分，最后训练，逻辑不能乱
4.不要害怕报错：报错信息是最好的老师，仔细看报错内容，通常能直接定位问题
5.不要死记硬背：学会用 PyCharm 的参数提示和官方文档，这比背代码重要得多
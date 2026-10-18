---
title: 机器学习实战：从零实现线性回归完整项目
date: 2022-12-23 10:30:00
tags:
  - 机器学习
categories: [AI 算法笔记]
abbrlink: "52d2c510"
---
> 本篇通过**加州房价预测**实战项目，完整走一遍机器学习流程：数据加载 → 数据查看 → 数据集划分 → 模型训练 → 模型预测 → 模型评估。
> 非常适合新手理解**标准机器学习项目的完整套路**。

---

## 🎯 一、项目目标与流程
本次实战使用**线性回归**完成加州房价预测，帮助大家掌握：
- 如何加载官方数据集
- 如何构建 DataFrame 并查看数据
- 训练集 / 测试集划分为什么重要
- 线性回归模型训练与预测
- 模型评估指标 MSE、R² 的含义

**标准机器学习五步流程：**
1. 导入库
2. 加载数据 & 预处理
3. 划分训练集 / 测试集
4. 训练模型
5. 预测 & 评估

---

## 💻 二、完整代码实现（带详细注释）

```python
# 实现一个完整的线性回归项目
# 目标：对机器学习基础流程建立直观理解

# ======================
# 1. 导入所需库
# ======================
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# 加载加州房价数据集（sklearn 自带经典数据集）
from sklearn.datasets import fetch_california_housing
housing = fetch_california_housing()

# ======================
# 2. 构建 DataFrame 数据表格
# ======================
df = pd.DataFrame(housing.data, columns=housing.feature_names)
df["Price"] = housing.target  # 添加房价目标列

print("数据集前5行：")
print(df.head())

print("\n数据集信息：")
df.info()

# ======================
# 3. 划分特征 X 和标签 y
# ======================
X = df.drop('Price', axis=1)  # 特征：所有列除了价格
y = df['Price']               # 标签：预测目标（房价）

# ======================
# 4. 划分训练集与测试集
# ======================
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,   # 测试集占 20%
    random_state=42  # 固定随机种子，保证结果可复现
)

# ======================
# 5. 创建并训练线性回归模型
# ======================
model = LinearRegression()
model.fit(X_train, y_train)  # 训练：最小二乘法拟合

print("\n模型系数（权重）：", model.coef_)
print("模型截距：", model.intercept_)

# ======================
# 6. 模型预测
# ======================
y_pred = model.predict(X_test)

# ======================
# 7. 模型评估
# ======================
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\n均方误差 (MSE)：{mse:.2f}")
print(f"R2 分数：{r2:.2f}")
```
📌 三、关键知识点补充（新手必看）
1. 数据集为什么要分训练集 + 测试集？
训练集（80%）：给模型学习规律
测试集（20%）：模拟 “新数据”，检验模型泛化能力
如果不划分，直接用全部数据训练 + 测试，会出现过拟合，模型只记住训练数据，遇到新数据就失效。
2. random_state=42 是什么意思？
固定随机种子，让代码每次运行结果完全一样
42 只是习惯数字，换成 0、1、100 都可以
3. model.fit () 做了什么？
底层使用最小二乘法
自动计算出最优的 $w$（权重） 和 $b$（截距）

公式：
$$
y = w_1x_1 + w_2x_2 + \dots + w_nx_n + b
$$

4. 模型评估指标解释
MSE（均方误差）：预测值与真实值误差的平方平均，越小越好
R²（决定系数）：模型解释数据的能力，越接近 1 越好
0.7 ~ 0.9：优秀
0.5 ~ 0.7：一般
<0.5：较差

⚠️ 四、新手常见误区（必看表格）
<!-- 表格开始 -->
| 知识点 / 误区    | 说明                                                | 错误示例                     | 正确做法                               |
| :--------------- | :-------------------------------------------------- | :--------------------------- | :------------------------------------- |
| 特征与标签划分   | axis=1 表示删除列，axis=0 删除行                    | `df.drop('Price')`          | `df.drop('Price', axis=1)`             |
| 数据集划分       | 必须拆分训练 / 测试，不能用全部数据测试             | 直接用 X 训练、X 预测        | 必须用 `train_test_split`              |
| 模型训练         | fit() 只接受训练集，不能喂测试集                    | `model.fit(X_test, y_test)` | `model.fit(X_train, y_train)`          |
| random_state     | 不写会导致每次运行结果不同                          | 不写 `random_state`         | 必须写 `random_state=42`               |
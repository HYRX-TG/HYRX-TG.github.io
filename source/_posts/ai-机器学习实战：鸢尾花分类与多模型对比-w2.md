---
title: 机器学习实战：鸢尾花分类与多模型对比
date: 2023-01-02 10:30:00
tags:
  - 机器学习
categories: [AI 算法笔记]
abbrlink: "b8776760"
---
> 本篇通过经典鸢尾花数据集，一次性实现**逻辑回归、KNN、SVM、决策树**四大分类模型，学习 sklearn 统一 API 用法，并完成模型效果对比。
> 是机器学习分类任务最经典、最适合新手的入门实战。

---

## 🎯 一、项目目标
- 学会加载 sklearn 内置数据集
- 掌握**分类任务**的标准流程
- 一次性训练 4 种经典机器学习模型
- 学会用**准确率**评估分类模型
- 学会用训练好的模型预测新样本

---

## 💻 二、完整代码实现（详细注释版）
```python
# 鸢尾花分类实战：一次性对比逻辑回归、KNN、SVM、决策树
# 任务类型：多分类任务（3种鸢尾花类别）

# ======================
# 1. 导入所需库
# ======================
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

# ======================
# 2. 加载数据
# ======================
iris = load_iris()  # 加载著名的鸢尾花数据集
X, y = iris.data, iris.target
# X：(150,4) 花萼长/宽、花瓣长/宽
# y：(150,) 标签 0、1、2 代表三类花

# ======================
# 3. 划分训练集与测试集
# ======================
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,    # 测试集占20%
    random_state=42   # 固定随机种子
)

# ======================
# 4. 初始化四大分类模型
# ======================
log_reg = LogisticRegression(max_iter=200)
knn = KNeighborsClassifier(n_neighbors=3)
svm = SVC(kernel='linear')
tree = DecisionTreeClassifier(random_state=42)

# 存入字典，方便批量训练
models = {
    "逻辑回归": log_reg,
    "K近邻": knn,
    "支持向量机": svm,
    "决策树": tree
}

# ======================
# 5. 循环训练 + 评估所有模型
# ======================
print("===== 各模型测试集准确率 =====")
for name, model in models.items():
    model.fit(X_train, y_train)       # 训练
    y_pred = model.predict(X_test)    # 预测
    acc = accuracy_score(y_test, y_pred)  # 计算准确率
    print(f"{name}：{acc:.4f}")

# ======================
# 6. 使用模型预测新样本
# ======================
print("\n===== 新样本预测 =====")
new_flower = [[5.1, 4.6, 3.0, 0.4]]  # 必须是二维数组
pred_class = knn.predict(new_flower)
flower_name = iris.target_names[pred_class[0]]
print(f"新样本 {new_flower} 预测类别：{flower_name}")
```
📌 三、核心知识点补充（新手必看）
1. 鸢尾花数据集说明
150 个样本
4 个特征：花萼长、花萼宽、花瓣长、花瓣宽
3 个类别：setosa、versicolor、virginica
数据简单、线性可分，适合入门测试模型
2. 模型参数解释
LogisticRegression(max_iter=200)：增加迭代次数，保证模型收敛
KNeighborsClassifier(n_neighbors=3)：取最近 3 个邻居投票（奇数避免平票）
SVC(kernel='linear')：线性核，鸢尾花高维空间线性可分
DecisionTreeClassifier(random_state=42)：固定随机种子保证结果可复现
3. Sklearn 统一 API（最重要）
所有模型都遵循相同用法：
```text
model.fit(X_train, y_train)
model.predict(X_test)
```
这是 sklearn 最强大的设计，学会一个就会所有模型！
4. 准确率（Accuracy）
含义：预测正确的样本数 / 总样本数
分类任务最基础、最直观的评估指标
数值越接近 1.0 效果越好

⚠️ 四、常见误区
<!-- 表格开始 -->
| 知识点 / 误区 | 说明                             | 错误示例                     | 正确做法                    |
| :----------- | :------------------------------- | :--------------------------- | :-------------------------- |
| 输入格式     | `predict` 必须接收二维数组       | `[5.1, 4.6, 3.0, 0.4]`      | `[[5.1, 4.6, 3.0, 0.4]]`   |
| 逻辑回归     | 名字带回归，但它是分类模型       | 用来做房价预测              | 专门处理分类任务            |
| K 近邻参数   | `n_neighbors` 推荐用奇数         | `n_neighbors=2`             | 推荐 3、5、7               |
| 随机种子     | 不固定会导致每次结果不一样       | 不写 `random_state`         | 统一写 42                  |
| 模型训练顺序 | 必须先 `fit` 再 `predict`        | 直接 `predict`              | `fit` → `predict`          |

📚 学习心得
鸢尾花项目是机器学习分类任务的 **“Hello World”**，通过这一个项目就能掌握：数据加载 → 数据集划分 → 多模型训练 → 效果对比 → 新样本预测。
更重要的是，掌握了 sklearn 所有模型的通用用法，未来无论面对 SVM、随机森林、XGBoost 还是神经网络，代码结构几乎完全一致！
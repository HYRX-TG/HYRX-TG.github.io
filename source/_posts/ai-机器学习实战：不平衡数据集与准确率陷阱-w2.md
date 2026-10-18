---
title: 机器学习实战：不平衡数据集与准确率陷阱
date: 2023-01-03 10:30:00
tags:
  - 机器学习
categories: [AI 算法笔记]
abbrlink: "882b0af3"
---
> 真实场景中，数据集**99%都是不平衡**的（欺诈检测、疾病诊断、故障检测）。
> 本篇带你认识：准确率的巨大陷阱、混淆矩阵、精确率、召回率、F1分数，学会正确评估分类模型。

---

## 🎯 一、本篇核心目标
- 理解**数据不平衡**是什么（正负比例 1:19）
- 看清**准确率（Accuracy）的陷阱**
- 学会使用**混淆矩阵、精确率、召回率、F1**正确评估模型
- 掌握 `stratify=y` 分层抽样的重要性
- 学会生成模拟不平衡数据

---

## 💻 二、完整代码（详细注释版）
```python
# 不平衡数据集实战
# 重点：准确率不能信！必须看精确率、召回率、F1

# ======================
# 1. 导入库
# ======================
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
from sklearn.linear_model import LogisticRegression

# ======================
# 2. 创建不平衡数据集
# ======================
# 1000个样本，95%类别0，5%类别1（极度不平衡）
X, y = make_classification(
    n_samples=1000,    # 总样本
    n_features=10,    # 总特征数
    n_informative=5,  # 有效特征
    n_redundant=0,    # 冗余特征
    n_classes=2,      # 二分类
    n_clusters_per_class=1,
    weights=[0.95, 0.05],  # 95% 负样本，5% 正样本
    random_state=42
)

# ======================
# 3. 划分训练集/测试集（必须分层！）
# ======================
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.3,
    random_state=42,
    stratify=y  # 分层抽样，保证训练/测试集分布一致
)

# ======================
# 4. 训练逻辑回归模型
# ======================
model = LogisticRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# ======================
# 5. 评估：准确率（陷阱）
# ======================
acc = accuracy_score(y_test, y_pred)
print(f"【准确率】: {acc:.4f}")

# ======================
# 6. 评估：混淆矩阵
# ======================
print("\n【混淆矩阵】:")
print(confusion_matrix(y_test, y_pred))

# ======================
# 7. 评估：分类报告（精确率、召回率、F1）
# ======================
print("\n【分类报告】:")
print(classification_report(
    y_test, y_pred,
    target_names=["类别 0（多数类）", "类别 1（少数类）"]
))
```
📌 三、关键知识点补充
1. 什么是数据不平衡？
正负样本比例严重不均（如 95:5、99:1）
常见场景：欺诈检测、疾病诊断、异常检测
模型会无脑预测多数类，依然能获得极高准确率
2. 准确率的巨大陷阱
不平衡数据中，准确率毫无意义
95% 都是负样本，模型全预测 0，准确率直接 95%
但少数类完全预测不出来，模型完全失效
3. 必须看的三个指标
精确率（Precision）：预测为正的样本里，真正为正的比例
召回率（Recall）：真实为正的样本里，被预测出来的比例
F1 分数：精确率与召回率的调和平均，不平衡数据最重要指标
4. stratify=y 为什么重要？
保证训练集与测试集的类别分布完全一致
避免测试集全是多数类、或全是少数类
不平衡数据必须加 stratify=y

四、常见误区
<!-- 表格开始 -->
| 知识点 / 误区 | 说明                             | 错误做法              | 正确做法                 |
| :----------- | :------------------------------- | :-------------------- | :----------------------- |
| 不平衡数据评估 | 只看准确率会被严重误导         | 只用 accuracy        | 必须看 precision/recall/F1 |
| 数据集划分   | 不分层会导致分布不一致         | 不写 stratify=y      | 必须写 stratify=y       |
| 少数类识别   | 模型倾向预测多数类             | 不做任何处理         | 后续需过采样 / 欠采样   |
| 分类报告解读 | 只关注整体，不关注少数类       | 只看 macro avg       | 重点关注 少数类的 F1    |
| 数据生成     | weights 控制类别比例           | weights=[0.5,0.5]    | weights=[0.95,0.05]     |

📚 学习心得
在真实机器学习项目里，数据不平衡才是常态，准确率是最容易骗人的指标。
通过这篇实战要明白：
分类任务不能只看准确率
混淆矩阵 + 分类报告才是真正能反映模型能力的工具
分层抽样是不平衡数据的标配
少数类的识别能力，才是模型真正的价值
---
title: Optuna 自动化调参：让超参搜索自己跑
date: 2026-04-05
categories:
  - AI 算法笔记
tags:
  - 机器学习
  - 调参
abbrlink: "44f0d407"
---

> 经验驱动。下面这轮调参是**本机真跑**的：在合成分类数据上用 Optuna 搜 RandomForest 的 4 个超参，30 组试验。结果有个**反直觉的诚实结论**——小数据集上调参提升很有限。

## 怎么用 Optuna

核心就三样：`objective(trial)` 里用 `trial.suggest_*` 定义搜索空间，返回要最大化的指标；`create_study` 指定方向；`study.optimize` 开跑。

```python
def objective(trial):
    params = dict(
        n_estimators=trial.suggest_int("n_estimators", 50, 300),
        max_depth=trial.suggest_int("max_depth", 3, 20),
        min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 10),
        max_features=trial.suggest_categorical("max_features", ["sqrt","log2"]),
        random_state=42,
    )
    clf = RandomForestClassifier(**params)
    return cross_val_score(clf, Xtr, ytr, cv=3, scoring="f1").mean()

study = optuna.create_study(direction="maximize",
                            sampler=optuna.samplers.TPESampler(seed=42))
study.optimize(objective, n_trials=30)
```

## 真跑结果（30 组）

- **最佳交叉验证 F1 = 0.9149**，超参：`n_estimators=295, max_depth=12, min_samples_leaf=1, max_features=log2`
- 测试集 F1 = **0.9097**
- 对照：默认 `RandomForestClassifier(n_estimators=100)` 的基线交叉验证 F1 ≈ **0.9104**

## 诚实结论：调参不是银弹

注意看——Optuna 搜了 30 组，最佳也只把 F1 从 **0.9104 提到了 0.9149**，提升不到 0.5 个点。原因：这个数据集本身干净、特征区分度够，模型已经接近天花板，**超参的边际收益极小**。

这恰恰是调参最该记住的一点：**先用够数据和特征工程，再谈调参**。在小/易分数据上，调参往往只是把时间花在挤那零点几个点；在真正难的数据上，调参才有明显回报。

## 踩坑实录

- **没固定随机种子不可复现**：`TPESampler(seed=42)` + 模型 `random_state=42` 双保险，否则两次跑结果对不上，没法写进报告。
- **用测试集调参 = 作弊**：objective 里必须用交叉验证（`cross_val_score`），绝不能直接拿 test 集当目标，否则报告好看、上线翻车。
- **搜索空间别太大**：int 范围过宽会让 TPE 前期瞎猜，小数据集 30–50 组足够；大模型要配合 `n_trials` 和早停（`optuna.pruners`）。
- **类别/整数超参混着搜**：`suggest_int` 和 `suggest_categorical` 分开用，别把 max_features 写成连续值。

## 小结

Optuna 把"人工试参"变成"定义空间 + 自动搜索"，本机 30 组就把 RF 超参搜了一遍。但它也用真实数字提醒我：调参的天花板由数据和特征决定，别神话它。面试聊"你怎么优化模型"，这个"先数据后调参"的判断比报一个 F1 数字更值钱。

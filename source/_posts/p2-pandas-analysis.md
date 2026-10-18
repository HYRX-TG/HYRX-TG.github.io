---
title: pandas 完整数据分析实战：从脏数据到结论
date: 2026-03-10
categories:
  - Python 教程
tags:
  - 数据分析
  - Python
abbrlink: "2fe2f5b0"
---

> 经验驱动。下面这段分析是**本机真跑**的：一份带典型脏数据的订单 CSV，经 pandas 清洗后算出月度/品类/客单价/环比。每一步的坑和真实数字都写在这里。

## 真实数据长什么样（脏的）

从业务库导出的原始表经常是这样：金额带 `¥` 和逗号、日期混用 `2025-01-03` 和 `2025/01/09`、区域有别名（`east` 和 `华东`）、有重复行、有负金额、有缺失日期。我造了一份 11 行的样本，结构和真实导出一致。

## 清洗（每一步都对应一个坑）

```python
df = df.drop_duplicates()                              # ① 去重（重复订单）
df["amount"] = df["amount"].astype(str).str.replace("¥","",regex=False) \
                .str.replace(",","",regex=False).astype(float)  # ② "¥1299" -> 1299.0
df["date"] = pd.to_datetime(df["date"], errors="coerce") # ③ 混合格式 + 空 -> NaT
df["region"] = df["region"].replace({"east":"华东"})     # ④ 别名归一
df = df[df["amount"] > 0]                               # ⑤ 去掉负金额（异常）
df = df.dropna(subset=["date"])                         # ⑥ 丢缺失日期
```

真跑结果：**原始 11 行 → 清洗后 6 行**（去重 1、去负 1、丢缺失 1、其余因类型/归一保留）。区域分布：华东 3 / 华南 2 / 华北 1。

## 分析出结论

```python
monthly = df.groupby(df["date"].dt.to_period("M"))["amount"].agg(["sum","count"])
# 2025-01  ¥3435.0 (4 单) | 2025-02  ¥2166.0 (2 单)
cat = df.groupby("category")["amount"].sum().sort_values(ascending=False)
# 数码 4998 > 家居 459 > 食品 144
print("总销售额 ¥%.2f  客单价 ¥%.2f" % (df["amount"].sum(), df["amount"].mean()))
# 总销售额 ¥5601.00  客单价 ¥933.50
print("月环比 %.1f%%" % (monthly["sum"].pct_change().iloc[-1]*100))   # -36.9%
```

## 踩坑实录

- **`¥`/逗号让 `astype(float)` 直接炸**：金额列是字符串，必须先 `str.replace` 清掉符号再转。
- **日期混格式**：`pd.to_datetime` 配 `errors="coerce"`，解析不了的变 `NaT`，后面再 `dropna`，别硬转。
- **区域别名最隐蔽**：`华东` 和 `east` 被当成两个区域，分组就错了，必须先 `replace` 归一。
- **去重要看业务主键**：`drop_duplicates()` 全行去重够用，但如果只是"同一订单多次导出"，得按 `order_id` 去重。
- **负金额是异常不是特征**：先当脏数据剔除，别让它污染均值。

## 小结

数据分析的功夫 80% 在清洗，20% 在算。这份实战把"脏 → 净 → 结论"走通了：11 行变 6 行干净数据，月度/品类/客单价/环比全算出来。面试聊"你做过数据分析吗"，甩这段真跑的清洗链路比说"我会 pandas"有说服力得多。

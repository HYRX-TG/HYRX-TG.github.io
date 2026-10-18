---
title: matplotlib 可视化踩坑实录：那些年画错的图
date: 2026-03-22
categories:
  - Python 教程
tags:
  - 数据分析
  - Python
  - 可视化
abbrlink: "72fabb2b"
---

> 经验驱动。下面这张图是**本机真跑**的（Agg 后端，`p2_matplotlib_demo.png`，50KB）。但它中途报了一堆 warning——正好把 matplotlib 最坑的几个点全暴露了。中文乱码、后端选错、双轴混淆、保存丢边，逐个拆。

## 坑 1：中文乱码（几乎人人都踩）

我这张图用了中文标签（"1月""销售额(万元)"），结果真跑时刷了一屏：

```
UserWarning: Glyph 26376 (\N{CJK UNIFIED IDEOGRAPH-6708}) missing from font(s) DejaVu Sans.
```

matplotlib 默认字体 DejaVu Sans **不含中文字形**，中文全变成方块（豆腐块）。解决：

```python
import matplotlib.pyplot as plt
plt.rcParams["font.sans-serif"] = ["SimHei", "Microsoft YaHei", "PingFang SC"]
plt.rcParams["axes.unicode_minus"] = False   # 顺便修负号显示成方块的问题
```

> 注意：服务器/CI 上常没有 SimHei，得先装字体或指定字体文件路径 `plt.rcParams["font.family"]="DejaVu Sans"` 之外另配 CJK。我本地 demo 没配，所以 warning 如约而至——这就是坑本坑。

## 坑 2：无头环境后端报错

在没显示器的服务器/CI 上直接 `plt.savefig` 可能报 `cannot use GUI backend`。必须显式切 Agg：

```python
import matplotlib
matplotlib.use("Agg")   # 放最前面，在任何 pyplot 调用之前
```

## 坑 3：双轴颜色混淆

一张图叠"销售额"和"转化率"两条线，单位不同，必须用 `twinx()` 开第二条 y 轴，并且**两根线颜色区分开**，否则读者会把转化率当成销售额看：

```python
ax2 = ax1.twinx()
ax1.plot(..., color="#2b5aed"); ax2.plot(..., color="#e8543f")  # 蓝 vs 红
ax1.set_ylabel("销售额(万元)", color="#2b5aed")
ax2.set_ylabel("转化率(%)", color="#e8543f")
```

## 坑 4：savefig 把标题切掉

`bbox_inches="tight"` 能保住被裁掉的标题和图例：

```python
fig.savefig("out.png", dpi=120, bbox_inches="tight")
```

## 其他小坑

- **图例挡数据**：`ax.legend(loc="best")` 仍可能挡，手动 `loc="upper left"` 或放图外。
- **高 DPI 才清晰**：发博客/文章至少 `dpi=120`，默认 100 在 Retina 上发虚。
- **风格统一**：用 `plt.style.use("seaborn-v0_8-darkgrid")` 之类一键美化，别手动调每个颜色。

## 小结

matplotlib 不难，但"能画"和"画对"之间隔了中文乱码、后端、双轴、裁切这几道坎。这张 50KB 的图就是带着 warning 出生的——把上面 4 个坑填平，你的图就能直接进博客和汇报。

---
title: 🕷️ 从零搭建Scrapy爬虫到模型训练全流程实操教程
date: 2026-05-25
tags:
  - 爬虫
  - Python
  - 机器学习
  - NLP
categories: [AI 工程化]
abbrlink: "86d7e494"
---
# 🕷️ 从零搭建Scrapy爬虫到模型训练全流程实操教程（深度详解版）

## 📝 前言
本教程旨在以**零基础可复刻**的方式，完整走通“网页数据抓取 → 本地存储 → 中文分词 → 机器学习建模”的全流程。文中不仅给出可直接运行的代码，还解释了每个文件的作用、每处修改的原因，让你在实操中理解 Scrapy 框架和数据处理的核心思想。

---

## 🧭 一、整体流程概览

| 阶段 | 核心任务 | 产出 |
| :--- | :--- | :--- |
| 爬虫阶段 | 安装 Scrapy、创建项目、修改四个核心文件 | 目标网页的 CSV 数据集 |
| 数据处理 | 读取 CSV、中文分词、TF‑IDF 向量化 | 数值特征矩阵 |
| 模型训练 | 划分数据集、训练分类器、评估准确率 | 训练好的模型与评估结果 |

整个流程遵循 **“数据获取 → 数据清洗 → 特征工程 → 模型训练”** 的标准数据分析范式，这也是任何数据驱动项目的通用骨架。

---

## 🕸️ 二、第一阶段：Scrapy 爬虫完整实操

### 1. 环境准备与安装

Scrapy 是一个专业的异步爬虫框架，它已经帮我们封装好了请求调度、去重、数据管道等基础功能，我们只需关注**解析规则**和**存储逻辑**。

```bash
pip install scrapy
```

### 2. 规范创建项目（避坑要点）

**为什么要放在 D 盘？**  
Windows 下 C 盘（系统盘）常涉及权限控制，可能导致爬虫运行时无法写入文件。因此统一将项目放在非系统盘的专用目录下，是稳定复现的第一步。

```bash
d:
mkdir ai_projects
cd ai_projects
mkdir scrapy_spiders
cd scrapy_spiders
scrapy startproject eastmoney_news
cd eastmoney_news
scrapy genspider kuaixun kuaixun.eastmoney.com
```

执行完后，你将得到一个骨架完整的爬虫项目。

### 3. 项目文件结构与职责

```
eastmoney_news/                  # 项目根目录
├── eastmoney_news/              # 核心代码包
│   ├── spiders/                 # 存放爬虫主体逻辑
│   │   └── kuaixun.py           # ★ 需要修改：解析规则
│   ├── items.py                 # ★ 需要修改：定义抓取字段
│   ├── pipelines.py             # ★ 需要修改：数据存储逻辑
│   ├── settings.py              # ★ 需要修改：全局配置
│   ├── __init__.py              # 包标识，不动
│   └── middlewares.py           # 高级功能，新手不动
└── scrapy.cfg                   # 项目部署配置，不动
```

**新手只需要聚焦四个文件**，其他保持默认即可。这种设计体现了框架的“关注点分离”思想——把爬虫逻辑、数据定义、存储管道、运行配置拆分开来，方便维护和扩展。

### 4. 四大核心文件修改详解

| 文件名 | 核心作用 | 修改目的 | 核心思想 |
| :--- | :--- | :--- | :--- |
| `kuaixun.py` | 爬虫的运行逻辑 | 指定起始 URL，用 XPath/CSS 选择器提取标题、时间、链接等字段 | 如何从 HTML 噪声中分离出结构化数据 |
| `items.py` | 统一的数据结构 | 定义 `NewsItem` 类，声明 `title`、`link`、`time` 等字段，保证各组件间数据传递的规范 | 强类型约束，避免字段名字写错 |
| `pipelines.py` | 数据保存管道 | 将 Item 对象一行行写入 CSV 文件，每次抓取自动追加 | 数据持久化，为后续分析做准备 |
| `settings.py` | 全局运行配置 | 关闭 `ROBOTSTXT_OBEY` 解除反爬限制，设置 `DOWNLOAD_DELAY` 控制访问速度，启用 Item Pipelines | 合规与效率的平衡 |

**修改的逻辑链条是：**  
解析页面 → 封装成 Item → 管道保存。三个组件通过框架自动串联，我们只需分别实现它们。

---

## 📊 三、第二阶段：数据处理与模型训练

### 1. 工具库安装

```bash
pip install pandas jieba scikit-learn
```

- `pandas`：处理表格数据，读取 CSV
- `jieba`：最流行的中文分词工具，将连续文本切分成词语
- `scikit-learn`：提供 TF‑IDF、逻辑回归等标准化机器学习模块

### 2. 数据读取的核心规则

爬虫生成的 CSV 文件**第一行是表头**（例如：`新闻标题,新闻链接`）。后续代码中，必须用完全相同的字段名来引用列，大小写和空格都要一致，否则会 `KeyError`。

### 3. 完整数据处理与训练代码

```python
# 导入所需库
import pandas as pd
import jieba
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# 1. 读取爬虫数据（使用绝对路径 + r 前缀避免转义问题）
df = pd.read_csv(r"D:\ai_projects\scrapy_spiders\eastmoney_news\baidu_news.csv")
print("数据量：", df.shape)

# 2. 中文分词函数
def cut(text):
    # jieba.lcut 返回词语列表，再用空格拼接成字符串，供 TF‑IDF 处理
    return " ".join(jieba.lcut(str(text)))

df["分词结果"] = df["新闻标题"].apply(cut)

# 3. 文本向量化（TF‑IDF）
# max_features=1000 表示仅保留最重要的 1000 个词，控制维度
tfidf = TfidfVectorizer(max_features=1000)
X = tfidf.fit_transform(df["分词结果"])

# 4. 构造标签（这里用随机标签模拟二分类任务）
df["标签"] = np.random.randint(0, 2, size=len(df))
y = df["标签"]

# 5. 划分训练集/测试集
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 6. 训练逻辑回归模型
model = LogisticRegression()
model.fit(X_train, y_train)

# 7. 评估准确率
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"测试集准确率：{acc:.4f}")
```

**为什么使用 TF‑IDF？**  
直接统计词频会让“的”、“是”等高频词主导模型。TF‑IDF 通过 **词频×逆文档频率** 压制常见词、突出关键特征词，让机器学习算法更能抓住文本的核心内容。

**为什么用逻辑回归？**  
它是线性模型中最经典的分类器，训练快、可解释性强，在文本分类基线任务中表现稳定，适合作为入门第一站。

---

## 🔑 四、实操核心结论

1. **只需修改四个文件**：`kuaixun.py`（解析）、`items.py`（字段）、`pipelines.py`（存储）、`settings.py`（配置），其余文件保持默认。
2. **表头名称严格匹配**：代码中引用的列名必须和 CSV 表头完全一致。
3. **Windows 路径规范**：字符串前加 `r` 避免 `\n` 等转义；项目放在非系统盘防止权限错误。
4. **数据流**：`网页 → Item → CSV → DataFrame → 分词 → TF‑IDF → 模型`，每一步输出都是下一步的输入，环环相扣。

---

## ⚙️ 五、常用运行命令速查

| 操作 | 命令 | 执行位置 |
| :--- | :--- | :--- |
| 启动爬虫 | `scrapy crawl kuaixun` | 项目根目录（`eastmoney_news/`） |
| 运行数据处理脚本 | `python ceshi.py` | 脚本所在目录 |

---

## 📚 六、学习心得与总结

这套流程跑下来，最大的收获不是“能爬数据”或者“能训模型”，而是理解了 **数据工程的全链路思维**：

- Scrapy 教会我们如何**从非结构化网页中提取结构化信息**，这是 NLP 工作的数据源头；
- jieba 分词和 TF‑IDF 让我们看到文本如何被转化为数学对象，这是机器学习理解语言的桥梁；
- 最后模型训练虽然简单，但整个流水线是**可替换、可升级**的——未来你可以把逻辑回归换成 BERT，但数据处理和特征工程的思路依然适用。

只有亲手把一个项目从爬虫跑到模型输出，才能真正建立起对数据科学工作流的整体感知。这也是我整理此教程的初衷：**用最小闭环，理解最大逻辑**。
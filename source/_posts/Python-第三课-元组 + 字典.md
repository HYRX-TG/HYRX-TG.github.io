---
title: Python 第三课：元组与字典
date: 2023-04-11 16:16:43
tags:
  - Python
categories: [Python 教程]
abbrlink: "92fcab7a"
---
---

## 📝 博客 2/4：元组(Tuple) + 字典(Dict)

```markdown
# Python 基础笔记(2)：元组与字典

> 📅 来啦 | ⏱️ 阅读时间：10分钟

---

## 一、元组(Tuple)：不可变的列表

元组用 `()` 表示，和列表很像，但**创建后不能修改**。

### 1.1 创建元组

```python
# 普通元组
point = (10, 20)
colors = ("红", "绿", "蓝")

# 单元素元组（必须有逗号！）
single = (30,)  # 注意这个逗号

# 空元组
empty = ()

# 括号可以省略
no_parentheses = 1, 2, 3  # 也是元组

1.2 元组解包：一次性赋值
这是元组最实用的功能！
python

编辑



# 基本解包
point = (10, 20)
x, y = point  # x=10, y=20

# 函数返回多个值
def get_position():
    return 100, 200  # 实际返回元组

x, y = get_position()  # 直接解包

# 交换变量（经典技巧！）
a, b = 1, 2
a, b = b, a  # a=2, b=1

# 高级解包
first, *middle, last = [1, 2, 3, 4, 5]
# first=1, middle=[2,3,4], last=5
1.3 什么时候用元组？
python

编辑



# ✅ 适合用元组的场景
CONFIG = ('production', 8080, True)  # 配置信息
rgb = (255, 128, 0)  # 颜色值
location = (39.9, 116.4)  # 坐标

# ❌ 需要修改时用列表
shopping_list = ['苹果', '香蕉']  # 可能会添加删除
✅ 记住：元组适合存不应该改变的数据
二、字典(Dict)：键值对映射
字典用 {} 表示，存储键值对，查找速度超快。
2.1 创建字典
python

编辑



# 创建空字典
empty = {}

# 创建有内容的字典
contact = {'豆包': '111', '千问': '222'}

# 用 dict() 创建
person = dict(name='小明', age=18)
2.2 添加和更新
python

编辑



contact = {'豆包': '111'}

# 新增
contact['GPT'] = '333'  # {'豆包': '111', 'GPT': '333'}

# 更新
contact['豆包'] = '999'  # 修改已存在的键
2.3 获取值（两种方式！）
python

编辑



contact = {'豆包': '111', '千问': '222'}

# 方式1：直接访问（键不存在会报错）
# value = contact['微信']  # ❌ KeyError!

# 方式2：用 get()（推荐！不会报错）
value = contact.get('豆包')  # '111'
missing = contact.get('微信')  # None
default = contact.get('微信', '未知')  # '未知'
2.4 删除元素
python

编辑



contact = {'豆包': '111', '千问': '222', 'GPT': '333'}

# 删除并返回被删除的值
removed = contact.pop('豆包')  # '111'

# 删除最后插入的键值对
last = contact.popitem()  # ('GPT', '333')

# 直接删除
del contact['千问']

# 清空整个字典
contact.clear()
2.5 遍历字典（三种方式）
python

编辑



contact = {'豆包': '111', '千问': '222', 'GPT': '333'}

# 1. 只遍历键
for key in contact:  # 或 contact.keys()
    print(key)

# 2. 只遍历值
for value in contact.values():
    print(value)

# 3. 同时遍历键和值（最常用！）
for key, value in contact.items():
    print(f"{key}: {value}")
2.6 字典推导式
python

编辑



# 列表转字典
keys = ['a', 'b', 'c']
values = [1, 2, 3]
my_dict = {k: v for k, v in zip(keys, values)}
# {'a': 1, 'b': 2, 'c': 3}

# 字典过滤
original = {'a': 1, 'b': 2, 'c': 3}
filtered = {k: v for k, v in original.items() if v > 1}
# {'b': 2, 'c': 3}
✅ 本篇小结
表格
容器	符号	可变性	典型用途
元组	()	❌ 不可变	配置、坐标
字典	{}	✅ 可变	键值对映射
表格
知识点	关键方法
元组解包	x, y = tuple
字典获取	get() 比 [] 更安全
字典遍历	.items() 最常用
字典推导式	{k: v for k, v in 序列}
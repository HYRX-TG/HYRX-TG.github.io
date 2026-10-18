---
title: Python 第二课：逻辑运算符与列表(List)
date: 2023-04-04 10:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "ab9b2a19"
---
# Python 基础笔记(1)：逻辑运算符与列表

> 📅  | ⏱️ 阅读时间：10分钟

---

## 一、逻辑运算符：做判断的基础

Python 有 3 个逻辑运算符，用来做条件判断：

| 运算符 | 含义 | 例子 |
|--------|------|------|
| `and` | 与 | 全真才真 |
| `or` | 或 | 一真即真 |
| `not` | 非 | 真假互换 |

### 💡 简单例子

```python
# and：两个条件都要满足
age = 20
has_ticket = True
can_enter = age >= 18 and has_ticket  # True

# or：满足一个就行
is_weekend = True
is_holiday = False
can_rest = is_weekend or is_holiday  # True

# not：取反
is_raining = False
can_go_out = not is_raining  # True

二、列表(List)：最常用的容器
列表用 [] 表示，可以存多个数据，可以修改。
2.1 创建列表
python

编辑



# 创建空列表
empty = []

# 创建有内容的列表
numbers = [1, 2, 3, 4, 5]
fruits = ["苹果", "香蕉", "橙子"]
mixed = [1, "hello", 3.14, True]  # 可以混合类型
2.2 添加元素
python

编辑



fruits = ["苹果", "香蕉"]

# 末尾添加
fruits.append("橙子")  # ["苹果", "香蕉", "橙子"]

# 指定位置插入
fruits.insert(1, "葡萄")  # ["苹果", "葡萄", "香蕉", "橙子"]

# 扩展列表
fruits.extend(["西瓜", "草莓"])  # 添加多个
2.3 删除元素
python

编辑



numbers = [1, 2, 3, 4, 5]

# 删除末尾元素（返回被删除的值）
last = numbers.pop()  # 5，numbers 变成 [1,2,3,4]

# 删除指定位置
numbers.pop(1)  # 删除索引1的元素

# 删除指定的值
numbers.remove(3)  # 删除第一个值为3的元素

# 直接删除
del numbers[0]  # 删除索引0的元素
2.4 查询元素
python

编辑



fruits = ["苹果", "香蕉", "橙子", "香蕉"]

# 获取索引
index = fruits.index("香蕉")  # 1

# 统计出现次数
count = fruits.count("香蕉")  # 2

# 检查是否存在（推荐！）
exists = "苹果" in fruits  # True
2.5 排序
python

编辑



numbers = [3, 1, 4, 1, 5]

# 修改原列表
numbers.sort()  # [1, 1, 3, 4, 5]
numbers.sort(reverse=True)  # [5, 4, 3, 1, 1] 降序

# 不修改原列表，返回新列表
sorted_numbers = sorted(numbers)
三、列表切片：快速取部分数据
python

编辑



numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# 基本切片 [开始:结束:步长]
numbers[2:5]      # [2, 3, 4]  左闭右开
numbers[:5]       # [0, 1, 2, 3, 4]  从头开始
numbers[5:]       # [5, 6, 7, 8, 9]  到末尾
numbers[::2]      # [0, 2, 4, 6, 8]  每隔2个取一个
numbers[::-1]     # [9, 8, 7...0]  反转列表！
✅ 记住：切片是左闭右开，不包含结束位置
四、列表推导式：一行生成列表
这是 Python 最优雅的语法，把循环压缩成一行。
💡 简单例子
python

编辑



# 传统写法（4行）
squares = []
for x in range(5):
    squares.append(x ** 2)

# 推导式写法（1行）
squares = [x ** 2 for x in range(5)]  # [0, 1, 4, 9, 16]

# 带条件筛选
evens = [x for x in range(10) if x % 2 == 0]  # [0, 2, 4, 6, 8]

# 带 else
result = [x if x % 2 == 0 else '奇数' for x in range(5)]
# ['奇数', 2, '奇数', 4, '奇数']
🧠 记忆公式：
文本

编辑



[ 结果 for 变量 in 序列 if 条件 ]
   ↑      ↑            ↑
  要什么  从哪拿     有什么限制
✅ 本篇小结
表格
知识点	关键方法
逻辑运算符	and, or, not
列表添加	append(), insert(), extend()
列表删除	pop(), remove(), del
列表查询	index(), count(), in
列表排序	sort(), sorted()
列表推导式	[x for x in 序列 if 条件]
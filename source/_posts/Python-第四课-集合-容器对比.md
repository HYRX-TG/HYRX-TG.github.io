---
title: Python 第四课：集合与容器对比
date: 2023-04-05 11:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "fc8fe3fc"
---
---

## 📝 博客 3/4：集合(Set) + 四大容器对比

```markdown
# Python 基础笔记(3)：集合与容器对比

> 📅 2023-04-05 | ⏱️ 阅读时间：10分钟

---

## 一、集合(Set)：自动去重

集合用 `{}` 表示，**元素唯一、无序**，适合去重和集合运算。

### 1.1 创建集合

```python
# 创建集合
fruit = {"苹果", "香蕉", "橙子"}

# 自动去重！
duplicate = {"苹果", "香蕉", "苹果"}
print(duplicate)  # {"苹果", "香蕉"}

# 列表去重的经典技巧
numbers = [1, 2, 2, 3, 4, 5, 5]
unique = list(set(numbers))  # [1, 2, 3, 4, 5]

# ⚠️ 注意：空集合要用 set()，{} 是空字典
empty_set = set()
empty_dict = {}  # 这是字典！


1.2 添加和删除
python

编辑



s = {1, 2, 3}

# 添加
s.add(4)  # 添加单个
s.update([5, 6])  # 添加多个

# 删除
s.remove(3)  # 删除元素（不存在会报错）
s.discard(3)  # 删除元素（不存在不报错，推荐！）
s.pop()  # 随机删除一个
s.clear()  # 清空
1.3 集合运算（超实用！）
python

编辑



a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

# 交集：两个都有的（and 的集合版）
common = a & b  # 或 a.intersection(b)
# {3, 4}

# 并集：所有的（or 的集合版）
all_items = a | b  # 或 a.union(b)
# {1, 2, 3, 4, 5, 6}

# 差集：在 a 但不在 b（not 的集合版）
only_a = a - b  # 或 a.difference(b)
# {1, 2}

# 对称差集：要么在 a 要么在 b，不能同时在
sym_diff = a ^ b  # 或 a.symmetric_difference(b)
# {1, 2, 5, 6}
1.4 集合推导式
python

编辑



numbers = [1, 2, 2, 3, 4, 5, 5]

# 列表推导式 → 用 []
evens_list = [n for n in numbers if n % 2 == 0]
# [2, 2, 4]

# 集合推导式 → 用 {} 自动去重
evens_set = {n for n in numbers if n % 2 == 0}
# {2, 4}
1.5 成员检查（超快！）
python

编辑



fruit = {"苹果", "香蕉", "橙子"}

# 检查是否存在（O(1) 时间复杂度，比列表快！）
is_exist = "苹果" in fruit  # True

# 适合做权限检查
permissions = {"read", "write", "delete"}
if "delete" in permissions:
    print("有删除权限")
二、四大容器对比表
2.1 快速选择指南
表格
需求	选哪个	例子
需要修改、有序	列表 []	[1, 2, 3]
固定不变、有序	元组 ()	(1, 2, 3)
键值对、快速查找	字典 {}	{'a': 1}
去重、集合运算	集合 {}	{1, 2, 3}
空集合	set()	set()
2.2 特性对比
表格
容器	有序	可变	元素唯一	查找速度
列表	✅	✅	❌	O(n)
元组	✅	❌	❌	O(n)
字典	✅	✅	✅ 键唯一	O(1)
集合	❌	✅	✅	O(1)
2.3 常用方法速查
python

编辑



# 列表
list.append(x)      # 添加
list.pop()          # 删除末尾
list.sort()         # 排序

# 字典
dict.get(key)       # 获取值
dict.items()        # 遍历键值对
dict.pop(key)       # 删除

# 集合
set.add(x)          # 添加
set & other         # 交集
set | other         # 并集
三、推导式对比
python

编辑



# 列表推导式：[x for x in 序列 if 条件]
squares = [x**2 for x in range(5)]
# [0, 1, 4, 9, 16]

# 字典推导式：{k: v for k, v in 序列}
squared_dict = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# 集合推导式：{x for x in 序列 if 条件}
unique_squares = {x**2 for x in [1, 1, 2, 2]}
# {1, 4}  自动去重！
✅ 本篇小结
表格
知识点	关键方法
集合去重	set(列表)
集合运算	& 交集, `
成员检查	in 集合比列表快
容器选择	根据可变性、有序性、唯一性决定
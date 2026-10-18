---
title: Python 第五课：综合应用与常见陷阱
date: 2023-04-06 15:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "c53b28cc"
---
---

## 📝 博客 4/4：综合应用 + 常见陷阱

```markdown
# Python 基础笔记(4)：综合应用与常见陷阱

> 📅 2023-04-06 | ⏱️ 阅读时间：10分钟

---

## 一、综合应用案例

把前面学的知识用起来！

### 1.1 用户数据管理

```python
# 用列表存用户 ID（可重复）
user_ids = [101, 102, 103, 102, 104]

# 用集合去重
unique_ids = {id for id in user_ids if id > 100}
# {101, 102, 103, 104}

# 用字典存用户信息
users = {
    101: {'name': 'Alice', 'active': True},
    102: {'name': 'Bob', 'active': False},
    103: {'name': 'Charlie', 'active': True},
}

# 用推导式筛选活跃用户
active_users = [
    info['name'] 
    for uid, info in users.items() 
    if info['active']
]
# ['Alice', 'Charlie']

# 用元组存配置
CONFIG = ('production', 8080, True)
env, port, debug = CONFIG  # 解包


1.2 数据清洗流水线
python

编辑



# 原始数据（有重复）
raw_data = [1, 2, 2, 3, 4, 5, 5, 6]

# 1. 去重（集合）
unique_data = set(raw_data)

# 2. 筛选偶数（列表推导式）
even_numbers = [x for x in unique_data if x % 2 == 0]

# 3. 排序
even_numbers.sort(reverse=True)

# 4. 创建索引字典
index_dict = {num: idx for idx, num in enumerate(even_numbers)}

print(even_numbers)    # [6, 4, 2]
print(index_dict)      # {6: 0, 4: 1, 2: 2}
二、常见陷阱与易错点
2.1 变量名不一致
python

编辑



# ❌ 错误：for 定义了 name，却用 mingzi
for name in contact.keys():
    print(mingzi)  # NameError!

# ✅ 正确：变量名保持一致
for name in contact.keys():
    print(name)
2.2 遍历中修改容器
python

编辑



# ❌ 危险：遍历中删除可能报错
# for key in contact:
#     if key == '豆包':
#         contact.pop(key)

# ✅ 安全：先收集要删除的键
keys_to_delete = [k for k in contact if k == '豆包']
for key in keys_to_delete:
    contact.pop(key)
2.3 浅拷贝 vs 深拷贝
python

编辑



# 浅拷贝（只复制第一层）
list1 = [1, 2, [3, 4]]
list2 = list1.copy()
list2[2][0] = 999
print(list1)  # [1, 2, [999, 4]]  原列表也被改了！

# 深拷贝（完全独立）
import copy
list3 = copy.deepcopy(list1)
2.4 字典键的类型
python

编辑



# ✅ 可用作键（不可变类型）
valid_dict = {
    'string': 1,
    123: 2,
    (1, 2): 3,  # 元组可以
}

# ❌ 不可用作键（可变类型）
# invalid_dict = {[1, 2]: 4}  # TypeError!
2.5 空集合的创建
python

编辑



# ❌ 这是空字典
empty = {}
type(empty)  # <class 'dict'>

# ✅ 创建空集合
empty_set = set()
type(empty_set)  # <class 'set'>
2.6 get() vs [] 访问字典
python

编辑



contact = {'豆包': '111'}

# ✅ 推荐：get() 不会报错
value = contact.get('微信')  # None
value = contact.get('微信', '默认值')  # '默认值'

# ⚠️ 谨慎：[] 会报 KeyError
# value = contact['微信']  # KeyError!
三、性能对比
text

编辑



操作        列表      字典      集合
查找元素    O(n)      O(1)      O(1)
添加元素    O(1)      O(1)      O(1)
删除元素    O(n)      O(1)      O(1)
成员检查    O(n)      O(1)      O(1)
💡 结论：需要频繁查找时，优先用字典或集合！
四、完整速查表
4.1 容器选择
文本

编辑



需要键值对？ ──是──> 字典
    │
    否
    │
需要元素唯一？ ──是──> 集合
    │
    否
    │
需要修改？ ──是──> 列表
    │
    否
    │
──> 元组
4.2 推导式模板
python

编辑



# 列表
[result for item in sequence if condition]

# 字典
{key: value for item in sequence}

# 集合
{item for item in sequence if condition}
4.3 遍历模板
python

编辑



# 列表/元组
for item in container:
for index, item in enumerate(container):

# 字典
for key in dict:
for key, value in dict.items():  # 最常用！

# 集合
for item in set_container:
✅ 四篇笔记总结
表格
博客	核心内容
1	逻辑运算符 + 列表基础
2	元组 + 字典
3	集合 + 容器对比
4	综合应用 + 陷阱
核心思维
推导式：结果在前，不是时间顺序
遍历变量：for 自动定义，循环内用同名
容器选择：可变性、有序性、唯一性三维度
查找效率：字典/集合 O(1)，列表 O(n)
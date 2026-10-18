---
title: Python 第六课：函数基础与参数传递
date: 2023-04-08 11:56:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "9eb326cb"
---
第一课：函数基础与参数传递
🎯 核心概念
表格
概念	说明	示例
def	定义函数（写菜谱）	def make_tea():
函数调用	执行函数（做菜）	make_tea()
位置参数	按顺序传递	cook(肉，菜)
关键字参数	指名道姓传递	cook(主料=肉，辅料=菜)
return	返回结果给调用者	return "奶茶"
✅ 代码示例


```python

# 定义函数（写秘方）
def make_milk_tea(sugar_level, ice_level):
    print(f"正在制作奶茶...")
    print(f"加入 {sugar_level} 分糖")
    print(f"加入 {ice_level} 分冰")
    return "一杯做好的奶茶"

# 调用函数（顾客点单）
my_drink = make_milk_tea('半糖', '去冰')
print(f"顾客拿到了：{my_drink}")

```

📤 输出结果
文本

编辑



正在制作奶茶...
加入 半糖 分糖
加入 去冰 分冰
顾客拿到了：一杯做好的奶茶
💡 关键点
def 只是写秘方，不执行
函数名() 才是真正开始做
return 是把做好的东西递给顾客，没有return则外面拿不到结果
第二课：默认参数陷阱与LEGB规则
⚠️ 默认参数的"坑"
核心秘密：默认参数只在"定义时"创建一次！
❌ 错误示范
python

编辑

```python

def add_item(item, box=[]):
    box.append(item)
    return box

print(add_item("苹果"))  # 输出：['苹果']
print(add_item("香蕉"))  # 你以为会输出 ['香蕉']？错！
                         # 实际输出：['苹果', '香蕉']
                         # 因为两次用的是同一个盒子！

```

✅ 正确示范
python

编辑

```python

def add_item_safe(item, box=None):
    if box is None:
        box = []  # 每次调用都创建一个新盒子
    box.append(item)
    return box

print(add_item_safe("苹果"))  # 输出：['苹果']
print(add_item_safe("香蕉"))  # 输出：['香蕉']

```
📊 对比表
表格
特性	❌ 错误写法box=[]	✅ 正确写法box=None
默认值是什么？	一个具体的列表对象 []	一个空值标记 None
何时创建列表？	定义函数时（只创建1次，终身复用）	调用函数时（每次调用都创建）
多次调用后果	所有调用共享同一个列表，数据会累积	每次调用都是独立的新列表，互不干扰
比喻	餐厅门口放一个公共碗，大家轮流往里加菜	客人来了，服务员现拿一个新碗给他
💡 万能公式


```python

def 函数名(参数，可变参数=None):
    if 可变参数 is None:
        可变参数 = []  # 或 {}
    # 接下来放心使用

```

🔍 LEGB规则（变量查找顺序）
当你在函数里用了一个变量 x，Python 去哪找它？
表格
顺序	缩写	含义	生活例子
1	Local	先看自己家里（函数内部）	在自己房间喊"小明"
2	Enclosing	再看外层嵌套的函数	去父母房间喊
3	Global	再看全局（整个文件开头）	去小区广场喊
4	Built-in	最后看Python自带的	喊教科书里的"小明"
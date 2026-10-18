---
title: Python 第七课：Lambda 与装饰器
date: 2023-04-09 13:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "25bb3f94"
---
# 🎯 Lambda（匿名函数）
核心思想：一张"即时填写的说明书"

```python
# 格式：lambda 参数：表达式
lambda x: x % 2 == 0    # 判断是否为偶数
lambda x: x ** 2        # 求平方
lambda a, b: a + b      # 两数相加

```
使用示例
```python
运行
# 筛选偶数
numbers = [1, 2, 3, 4, 5, 6]
even_numbers = list(filter(lambda x: x % 2 == 0, numbers))
print(f"偶数：{even_numbers}")  # [2, 4, 6]

# 计算平方
squared_numbers = list(map(lambda x: x ** 2, numbers))
print(f"平方数：{squared_numbers}")  # [1, 4, 9, 16, 25, 36]

```
📌 核心函数对比
表格
函数	作用	返回类型	记忆口诀
filter (函数，可迭代对象)	筛选符合条件的元素	迭代器	"挑出来"
map (函数，可迭代对象)	转换每个元素	迭代器	"改一遍"
lambda 参数：表达式	匿名小函数	函数对象	"临时工具"
⚠️ 注意：filter 和 map 返回的是迭代器，需要用 list () 转换才能打印
🎯 装饰器（Decorator）
核心思想：一个 "全自动秘书"，给函数加外挂
✅ 装饰器模板
```python
运行
def 我的装饰器(原函数):
    def 包装后的函数():
        # 1. 在这里写"外挂"功能（运行前做的事）
        原函数()              # 2. 调用原函数（核心功能）
        # 3. 在这里写"外挂"功能（运行后做的事）
    return 包装后的函数       # 4. 必须返回内部函数！
✅ 计时器装饰器示例
```

```python
运行
import time

def timer_decorator(func):
    def wrapper(*args, **kwargs):
        start = time.time()           # 【外挂】记录开始时间
        func(*args, **kwargs)         # 【原功能】运行原函数
        end = time.time()             # 【外挂】记录结束时间
        print(f"函数 [{func.__name__}] 耗时：{end - start:.4f}秒")
    return wrapper

# 使用 @ 符号应用装饰器
@timer_decorator
def work():
    time.sleep(2)
    print("工作完成")

work()

```
📤 输出结果
plaintext
工作完成
函数 [work] 耗时：2.0012秒
🔗 @ 符号的真相
python
运行
@timer_decorator
def work():
    ...

# 等价于：
work = timer_decorator(work)
执行流程：
先完整定义 work 函数
立刻把 work 传给 timer_decorator
装饰器返回新函数 wrapper
用 wrapper 覆盖原来的 work

关键知识点
1. @装饰器名 等价于 函数名 = 装饰器(函数名)，Python 会自动帮你完成 “替换函数” 的操作
2. *args, **kwargs 是万能参数接收器，能兼容任何有参 / 无参的函数
3. 装饰器不会修改原函数的代码，只在外面包一层新功能，符合 “开闭原则”
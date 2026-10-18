---
title: Python 第九课：函数式编程——filter 与 map 的高效用法
date: 2023-04-14 10:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "2382a4af"
---
filter () 筛选 挑出符合条件的元素map () 映射 对每个元素都做一遍处理

```python
even_numbers = list(filter(lambda x: x % 2 == 0,range(12)))
print(f"使用lambda和filter筛选出的偶数为: {even_numbers}")

numbers = [12, 21]
squared_numbers = list(map(lambda x: x**2, numbers))
print(f"使用lambda和Meta筛选出的数字平方数为: {squared_numbers}")
```

```python
# 错误写法：{numbers}把整个列表变成了集合里的一个元素
# squared_numbers = list(map(lambda x: x**2, {numbers}))

# 正确写法：直接传列表本身
squared_numbers = list(map(lambda x: x**2, numbers))
```

四、与列表推导式对比
```python
# 筛选偶数
even_list = [x for x in range(12) if x % 2 == 0]

# 求平方
square_list = [x**2 for x in [12, 21]]

print(even_list)
print(square_list)
```

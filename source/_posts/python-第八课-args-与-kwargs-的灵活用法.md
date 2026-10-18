---
title: "Python 第八课：*args 与 **kwargs 的灵活用法"
date: 2023-04-13 10:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "eec7f72f"
---
```python
def analyze_data(main_value, *optional_values, **meta_data):
    """
    数据分析函数
    :param main_value: 主要数据（必传）
    :param optional_values: 任意数量的额外数据
    :param meta_data: 任意数量的元数据（key=value形式）
    """
    print(f"主要值：{main_value}")

    # 如果有额外数据，就打印
    if optional_values:
        print(f"可选值（元组）：{optional_values}")

    # 如果有元数据，就遍历打印
    if meta_data:
        print("元数据（字典）：")
        for key, value in meta_data.items():
            print(f"  -{key}:{value}")

# 调用1：只传必传参数
analyze_data(100)

# 调用2：传必传参数+多个额外参数+关键字参数
analyze_data(200, 10, 20, 30, source="传感器", timestamp="2025-05-12")
```
二、关键知识点
1. 参数顺序必须固定：必传参数 → *args → **kwargs，顺序乱了会报错
2. if optional_values: 利用了 Python “非空即真” 的特性，空元组会被视为 False，有内容则为 True
3. args 和 **kwargs 的名字可以随便改，比如nums、**info，但星号不能少，行业默认用 args 和 kwargs


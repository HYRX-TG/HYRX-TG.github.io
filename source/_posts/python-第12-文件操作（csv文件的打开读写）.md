---
title: Python 第 12 课：CSV 文件的打开与读写
date: 2023-04-21 16:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "136d5b81"
---
✅ 一、完整可运行示例
```python
import csv
import os

# 准备数据：列表 of 列表（第一行为表头）
csv_data = [
    ['公司', '项目', '负责人'],
    ['天庭', '三界运营', '玉帝'],
    ['灵山', '西游取经', '如来佛祖']
]

csv_path = '西游项目故事.csv'

try:
    # 写入 CSV 文件
    with open(csv_path, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(csv_data)
        print(f"✅ 已将数据写入: {csv_path}")

    # 读取 CSV 文件
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # 读取表头
        print(f"📊 表头: {header}")
        for i, row in enumerate(reader, 1):
            print(f"第{i}行: {row} (公司: {row[0]}, 项目: {row[1]}, 负责人: {row[2]})")

except IOError as e:
    print(f"❌ 文件操作失败: {e}")

finally:
    # 清理临时文件
    if os.path.exists(csv_path):
        os.remove(csv_path)
        print("🗑️ 临时文件已删除")
```

✅ 关键注意事项（新手必看）

| 注意点 | 说明 | 错误示例 | 正确做法 |
| :--- | :--- | :--- | :--- |
| 必须导入 csv 模块 | 不是内置函数，需显式导入 | 直接写 `writer = writer(...)` | `import csv` |
| 写入时加 newline='' | 防止 Windows 下出现空行 | `open(..., 'w')` | `open(..., 'w', newline='')` |
| 指定 encoding='utf-8' | 支持中文，避免乱码 | 不写 encoding | 显式声明 `encoding='utf-8'` |
| import 放文件开头 | 不能插在 try-except-finally 中间 | `except: ...`<br>`import os`<br>`finally:` | 所有 import 放最顶部 |
| 使用 with open() | 自动关闭文件，防止资源泄露 | 手动 `f = open(); f.close()` | 用 `with` 管理上下文 |




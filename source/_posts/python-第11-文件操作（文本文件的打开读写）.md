---
title: Python 第 11 课：文本文件的打开与读写
date: 2023-04-20 15:00:00
tags:
  - Python
categories: [Python 教程]
abbrlink: "391e959f"
---
```python
file_content = '''第一行，一些示例文本；
第二行，包含更多的信息
第三行，这是文件的最后一行'''

print("进行相应的I/O操作")

file_path = 'example_中文文件名测试.txt'

try:
    with open(file_path, mode='w', encoding='utf-8') as f:
        bytes_written = f.write(file_content)
        print(f"成功将{bytes_written}字节写入文件：'{file_path}'")

    # 逐行读取文件，'r'表示只读
    with open(file_path, mode='r', encoding='utf-8') as f:
        for line_number, line in enumerate(f, 1):
            print(f"行{line_number}:{line.strip()}")

except IOError as e: # IOError：文件操作可能出错（如权限不足、磁盘满）
    print("文件读取（操作）时发生错误")

finally:  # finally：无论成功与否，都会执行，用来清理资源（如删文件
    if os.path.exists(file_path):
        os.remove(file_path)
    print("已删除示例文件")
```

📌 解析：
| 代码                | 含义                     |
| ------------------- | ------------------------ |
| `open(...)`         | 打开文件                 |
| `mode='w'`          | 'w' 表示写入模式（会覆盖原文件） |
| `encoding='utf-8'`  | 指定编码，支持中文       |
| `as f:`             | 把文件对象命名为 f，方便后续操作 |
| `f.write(file_content)` | 把 `file_content` 写入文件 |
| `bytes_written`     | 返回写入的字节数         |

| 代码 | 含义 |
| :--- | :--- |
| `mode='r'` | `'r'` 表示只读模式 |
| `enumerate(f, 1)` | 遍历文件每一行，`line_number` 从 1 开始 |
| `line.strip()` | 去掉每行末尾的换行符 `\n`，让输出更干净 |


重点总结（记住这几点，就能写出任何文件操作）
| 重点               | 说明                                                 |
| :----------------- | :--------------------------------------------------- |
| 📁 文件路径         | 写清楚文件名和位置，避免找不到                       |
| 📄 编码（encoding） | 处理中文必须加 `encoding='utf-8'`                    |
| 🔑 mode 模式        | `r` 只读，`w` 写入（覆盖），`a` 追加                 |
| 🔒 with 语句        | 自动管理文件打开与关闭，强烈推荐使用                 |
| ⚠️ 异常处理         | 用 `try-except` 防止程序崩溃                         |
| 🧹 finally 清理     | 删除临时文件，保持环境整洁           

建立你的“文件操作模板”（极简版）
```python
# 模板：写文件 + 读文件
def file_io_demo():
    # 1. 定义要写的内容（数据 D）
    content = "第一行\n第二行\n第三行"

    # 2. 文件路径（F 的输入参数）
    file_path = "example.txt"

    try:
        # 3. 写文件（函数 F1）
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            print("✅ 写入成功")

        # 4. 读文件（函数 F2）
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_number, line in enumerate(f, 1):
                print(f"第{line_number}行: {line.strip()}")

    except IOError as e:
        print("❌ 文件操作失败：", e)

    finally:
        import os
        if os.path.exists(file_path):
            os.remove(file_path)
            print("🗑️ 已删除测试文件")
```
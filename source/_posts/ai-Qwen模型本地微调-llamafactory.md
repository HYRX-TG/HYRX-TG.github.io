---
title: 🧩 LLaMA-Factory 实战（一）：数据格式、模板选择与版本调试（Qwen2.5 + LoRA 实战）
date: 2026-08-28
tags:
  - 模型微调
  - 大模型部署
  - NLP
categories: [大模型部署与推理]
abbrlink: "ba347e2d"
---
# 🧩 微调经验总结：数据格式、模板选择与版本调试（Qwen2.5 + LoRA 实战）

## 📝 前言
本次模拟训练以 **Qwen2.5-1.5B-Instruct + LoRA** 在 **LLaMA-Factory** 框架下进行，成功完成了 Kubernetes 领域问答微调。训练中遇到了**数据格式不匹配**、**环境版本冲突**等问题，最终通过使用 **ShareGPT 格式 + qwen 模板** 以及正确的版本组合解决了所有障碍。

本文对微调过程中的核心经验进行系统总结，重点厘清 **Alpaca 与 ShareGPT 两种主流数据格式**与**模板**的对应关系，并给出经过验证的训练配置，帮助读者在类似任务中少走弯路。

---

## 🧭 全文核心结论速览

| 关键点 | 结论 |
| :--- | :--- |
| 数据格式与模板 | ShareGPT + qwen 是最稳定组合；Alpaca + chatml/qwen 易导致样本过滤 |
| 版本环境 | transformers==5.8.0、datasets==3.0.0、pandas==2.3.3 实测通过 |
| 训练参数 | 12G 显存 + 1.5B 模型，LoRA rank=8，cutoff_len=1024，epochs=3 |
| 调试逻辑 | 最小化测试 → 检查数据 → 换格式模板 → 调版本 → 清缓存 |
| 成功标志 | 预处理打印样本数、trainable params、loss 下降、Training completed |

---

## 📄 一、数据格式与模板的对应关系（核心）

LLaMA-Factory 支持多种数据格式，但**不同格式必须搭配相应模板**，否则可能导致样本被过滤、数据集为空或训练异常。以下是两种最常用的格式及其推荐模板。

### 1. Alpaca 格式

**字段结构**：每条数据包含 `instruction`（指令）、`input`（可选输入）、`output`（期望输出）。

```json
[
  {
    "instruction": "什么是Kubernetes？",
    "input": "",
    "output": "Kubernetes是开源的容器编排平台..."
  }
]
```

**对应 LLaMA-Factory 配置**：`formatting: "alpaca"`，列映射如下：

```json
"columns": {
    "prompt": "instruction",
    "query": "input",
    "response": "output"
}
```

**推荐模板**：`--template default` 或 `--template alpaca`（自定义模型可能需适配）。

⚠️ **注意**：Alpaca 格式若搭配 `chatml` 或 `qwen` 模板，可能因 `input` 字段为空字符串导致所有样本被过滤，出现 `StopIteration` 错误。因此**不建议将 Alpaca 格式用于 ChatML/Qwen 模板**。

### 2. ShareGPT 格式

**字段结构**：每条数据包含一个 `conversations` 列表，每个元素为 `{"from": "human"/"gpt", "value": "..."}`，可表示多轮对话。

```json
[
  {
    "conversations": [
      {"from": "human", "value": "什么是Kubernetes？"},
      {"from": "gpt", "value": "Kubernetes是开源的容器编排平台..."}
    ]
  }
]
```

**对应 LLaMA-Factory 配置**：`formatting: "sharegpt"`，列映射如下：

```json
"columns": {
    "messages": "conversations"
}
```

**推荐模板**：`--template qwen`（专为 Qwen 模型优化）或 `--template chatml`（通用 ChatML 模板）。ShareGPT 格式与这两种模板天然兼容，能正确处理多轮角色标记。

### 3. 实测结论（本次训练成功关键）

| 组合 | 结果 |
| :--- | :--- |
| ❌ Alpaca 格式 + chatml 模板 | 所有样本被过滤（`RuntimeError: Cannot find valid samples`） |
| ✅ ShareGPT 格式 + qwen 模板 | 数据预处理正常，训练完成 |

**因此，微调 Qwen 系列模型时，推荐统一使用 ShareGPT 格式 + qwen 模板。**

---

## 🧹 二、数据清洗与预处理

### 1. 原始数据准备
若原始数据为 Alpaca 格式（含 `instruction`、`input`、`output`），可使用以下脚本转换为 ShareGPT 格式：

```python
import json

with open('raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sharegpt = []
for item in data:
    user_msg = item['instruction']
    if item.get('input'):
        user_msg += '\n' + item['input']
    sharegpt.append({
        "conversations": [
            {"from": "human", "value": user_msg},
            {"from": "gpt", "value": item['output']}
        ]
    })

with open('clean_sharegpt.json', 'w', encoding='utf-8') as f:
    json.dump(sharegpt, f, ensure_ascii=False, indent=2)
```

### 2. 文件编码检查
确保 JSON 文件为 **UTF-8 无 BOM**。可用 Python 验证并重写：

```python
import json
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
with open('data_clean.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

### 3. 数据集配置（dataset_info.json）
将转换后的 ShareGPT 文件注册到 LLaMA-Factory：

```json
"train_ks_sharegpt": {
    "file_name": "traink8s_sharegpt.json",
    "formatting": "sharegpt",
    "columns": {
        "messages": "conversations"
    }
}
```

---

## 🔧 三、版本调试与环境配置

版本冲突是本次训练中最主要的障碍之一，表现为**数据集加载后为空（`StopIteration`）**或**预处理样本全部被过滤**。

### 1. 问题表现
- 日志显示 `Generating train split: 217 examples`，随后在 `align_dataset` 或 `_get_preprocessed_dataset` 中报 `StopIteration`。
- 内置的 `identity` 数据集却能正常加载，说明 LLaMA-Factory 本身可用，但自定义数据或版本触发兼容性问题。

### 2. 确认版本命令
```bash
pip show transformers datasets pandas
```

### 3. 推荐版本组合（实测通过）

| 库 | 版本 | 说明 |
| :--- | :--- | :--- |
| transformers | 5.8.0 | 满足 LLaMA-Factory 要求（>=4.55, <=5.8） |
| datasets | 3.0.0 | 与 transformers 5.8.0 兼容，不再出现迭代器异常 |
| pandas | 2.3.3 | 解决 gradio 的依赖冲突 |

安装命令：

```bash
pip install transformers==5.8.0 datasets==3.0.0 pandas==2.3.3 --force-reinstall
```

若仍出现问题，可尝试更保守的组合：

```bash
pip install transformers==4.44.0 datasets==2.19.1 --force-reinstall
```

### 4. 调试逻辑（排查顺序）

1. **最小化测试**：使用内置 `identity` 数据集验证环境，若成功则问题可能在自定义数据或参数。
2. **检查数据文件**：用 Python `json.load` 确认文件非空且格式正确。
3. **尝试不同数据格式与模板组合**：若 Alpaca 失败，转为 ShareGPT 格式，换用 `qwen` 模板。
4. **调整版本**：根据 `pip show` 结果，安装经过验证的版本组合。
5. **清除缓存**：修改版本或数据后，删除缓存目录：

```powershell
Remove-Item -Recurse -Force $env:USERPROFILE\.cache\huggingface\datasets -ErrorAction SilentlyContinue
```

---

## ⚙️ 四、训练参数推荐（12GB 显存 + 1.5B 模型）

| 参数 | 推荐值 | 说明 |
| :--- | :--- | :--- |
| `--template` | `qwen` | 必须与 ShareGPT 格式搭配 |
| `--dataset` | `train_ks_sharegpt` | 数据集名称（注册于 `dataset_info.json`） |
| `--cutoff_len` | `1024` | 适合短文本问答 |
| `--learning_rate` | `5e-5` | LoRA 常用 |
| `--num_train_epochs` | `3` | 217 条数据 3 轮足够 |
| `--lora_rank` | `8` | 小数据量 |
| `--lora_alpha` | `16` | rank 的 2 倍 |
| `--lora_target` | `q_proj,k_proj,v_proj,o_proj` | 注意力四个投影 |
| `--warmup_steps` | `50` | 避免 `warmup_ratio` 弃用警告 |
| `--save_strategy` | `epoch` | 每个 epoch 保存 |
| `--save_total_limit` | `2` | 保留最近 2 个 checkpoint |
| `--max_samples` | **不要设置** | 设置为 0 会导致数据集为空 |

---

## ✅ 五、成功训练的标志

训练日志出现以下内容即代表成功：

- 数据预处理进度条完成，打印训练样本（含 `input_ids` 和 `labels`）。
- 显示 `trainable params` 和 `Total optimization steps`。
- 输出 `loss` 等指标，最终显示 `Training completed.`

示例输出：

```text
***** Running training *****
  Num examples = 217
  Num Epochs = 3
  Total optimization steps = 84
{'loss': '2.441', 'grad_norm': '0.5813', 'learning_rate': '4e-06', 'epoch': '0.1843'}
...
Training completed.
```

---

## 💡 六、后续建议

1. **测试模型**：
   ```bash
   llamafactory-cli chat --adapter_name_or_path saves\...\train_final
   ```
2. **扩充数据**：增加到 500~1000 条，提高泛化能力。
3. **合并权重（部署时）**：
   ```bash
   llamafactory-cli export --export_dir merged
   ```

---

## 📚 七、学习心得与总结

本次微调实践最大的收获，是深刻理解了**数据格式与模板搭配**在大模型训练中的重要性。很多时候，训练失败并非模型或框架的问题，而是**数据格式没有和模板正确匹配**，导致框架在预处理阶段就静默地过滤掉了所有样本。这种“无声的失败”往往比报错更危险，因为它让你误以为数据没问题，却在训练开始时才发现 `StopIteration`。

总结三条核心经验：

1. **ShareGPT 格式是 Qwen 微调的首选**。它天然支持多轮对话，与 `qwen` 模板配合紧密，避免了 Alpaca 格式中 `input` 空字符串引发的兼容性问题。如果数据原本是 Alpaca 格式，务必先转换为 ShareGPT，再进入训练流程。

2. **版本管理是环境稳定的基石**。`transformers`、`datasets`、`pandas` 三者的版本必须严格对齐，否则会出现各种难以定位的迭代器错误。在出现 `StopIteration` 等异常时，优先检查版本是否兼容，再排查数据和代码。推荐使用经过验证的版本组合，并清除缓存后重试。

3. **调试思路要系统化**。遵循“最小化测试 → 检查数据 → 调整格式模板 → 调整版本 → 清缓存”的顺序，可以高效定位问题。不要一上来就盲目重装环境或修改代码。

这次微调虽然数据量只有 217 条，但完整走通了从数据处理、配置修改到训练成功的全流程，对 LLaMA-Factory 的机制有了更直观的理解。未来面对更大规模的数据和更复杂的任务，这些调试经验和系统化思维将成为可靠的基础。
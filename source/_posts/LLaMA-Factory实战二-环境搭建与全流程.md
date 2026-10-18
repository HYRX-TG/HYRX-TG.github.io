---
title: LLaMA-Factory 实战（二）：环境搭建、WebUI 训练与模型导出合并全流程
date: 2026-09-05 10:00:00
tags:
  - 模型微调
  - 大模型部署
categories: [大模型部署与推理]
abbrlink: "c0c23964"
---

# LLaMA-Factory 实战（二）：环境搭建、WebUI 训练与模型导出合并全流程

> 系列导航：
> （一）[数据格式、模板选择与版本调试](/2026/08/28/ba347e2d/) —— 解决「样本被静默过滤」的问题；
> （二）本篇 —— 从零装好环境，用 WebUI 跑通训练，导出可部署的合并模型；
> （三）单卡后训练实战（SFT → DPO → GRPO 全链路）—— 用 TRL 把后训练三条路线走一遍。

## 一、环境搭建：版本组合是第一个坎

LLaMA-Factory 对依赖版本极其敏感，我实测可用的组合（12GB 显存 + Qwen2.5-1.5B-Instruct + LoRA）：

| 库 | 版本 | 说明 |
| --- | --- | --- |
| transformers | 5.8.0 | 满足 LLaMA-Factory 要求（>=4.55, <=5.8） |
| datasets | 3.0.0 | 与 transformers 5.8.0 兼容 |
| pandas | 2.3.3 | 解决 gradio 依赖冲突 |

```bash
pip install "transformers==5.8.0" "datasets==3.0.0" "pandas==2.3.3"
```

如果机器上已经有其他版本的 ML 环境，**务必用独立虚拟环境**，不要往系统 Python 里装。装完先跑内置数据集自检：

```bash
llamafactory-cli train --stage sft --do_train false --dataset identity --model_name_or_path Qwen/Qwen2.5-1.5B-Instruct
```

能正常加载 `identity` 数据集，说明框架本身没问题；加载不了，先修环境，别怀疑数据。

## 二、数据集注册：dataset_info.json

把训练数据（ShareGPT 格式，转换方法见系列第一篇）注册到 LLaMA-Factory：

```json
{
  "train_ks_sharegpt": {
    "file_name": "traink8s_sharegpt.json",
    "formatting": "sharegpt",
    "columns": {
      "messages": "conversations"
    }
  }
}
```

放在 LLaMA-Factory 的 `data/dataset_info.json` 里。WebUI 启动后刷新数据集列表就能看到。

## 三、WebUI 训练全流程

启动 WebUI：

```bash
llamafactory-cli webui
```

浏览器打开后，按这个顺序配置（每一步都和系列第一篇的结论对应）：

1. **模型**：选 Qwen2.5-1.5B-Instruct（本地路径或 HF id 均可）；
2. **微调方法**：LoRA；
3. **数据集**：选刚注册的 `train_ks_sharegpt`；
4. **模板**：`qwen`——**必须和 ShareGPT 格式搭配**，选错模板会静默过滤所有样本；
5. **关键参数**（12GB 显存实测）：

| 参数 | 值 | 说明 |
| --- | --- | --- |
| cutoff_len | 1024 | 短文本问答足够 |
| learning_rate | 5e-5 | LoRA 常用 |
| num_train_epochs | 3 | 小数据 3 轮足够 |
| lora_rank | 8 | 小数据量 |
| lora_alpha | 16 | rank 的 2 倍 |
| lora_target | q_proj,k_proj,v_proj,o_proj | 注意力四个投影 |
| warmup_steps | 50 | 避开 warmup_ratio 弃用警告 |
| save_strategy | epoch | 每轮保存 |
| max_samples | **不要设置** | 设置为 0 会导致数据集为空 |

点「开始训练」，观察日志出现三样东西即代表正常：样本预处理进度、`trainable params` 统计、下降的 `loss`。最终打印 `Training completed.`

## 四、命令行等价写法

WebUI 生成的配置可以导出，也可以直接手写命令，方便复现和写进脚本：

```bash
llamafactory-cli train \
  --stage sft \
  --model_name_or_path Qwen/Qwen2.5-1.5B-Instruct \
  --template qwen \
  --dataset train_ks_sharegpt \
  --cutoff_len 1024 \
  --learning_rate 5e-5 \
  --num_train_epochs 3 \
  --lora_rank 8 --lora_alpha 16 \
  --lora_target q_proj,k_proj,v_proj,o_proj \
  --warmup_steps 50 \
  --save_strategy epoch --save_total_limit 2 \
  --output_dir saves/qwen15-lora-k8s
```

## 五、测试微调效果

```bash
llamafactory-cli chat \
  --model_name_or_path Qwen/Qwen2.5-1.5B-Instruct \
  --adapter_name_or_path saves/qwen15-lora-k8s
```

进入交互后问几个训练集里的问题和训练集外的问题，对比基座回答。**重点看「学没学会格式」而不是「像不像答案」**——小数据微调最常见的失败是模型只会复读训练集风格。

## 六、导出与合并权重

LoRA 训练产出的是 adapter（只有几 MB），部署时需要把 adapter 合并回基座：

```bash
llamafactory-cli export \
  --model_name_or_path Qwen/Qwen2.5-1.5B-Instruct \
  --adapter_name_or_path saves/qwen15-lora-k8s \
  --export_dir merged/qwen15-k8s \
  --export_size 2 \
  --export_legacy_format false
```

合并后的模型可以直接用 transformers / vLLM / Ollama 加载，也可以转 GGUF 喂给 Ollama——本地部署的完整闭环就此打通。

## 七、排障速查

| 现象 | 优先排查 |
| --- | --- |
| 数据集加载后为空 / StopIteration | 数据格式与模板不匹配（回看系列第一篇） |
| CUDA OOM | 降 cutoff_len → 降 batch → 开 gradient checkpointing |
| loss 不降 | 学习率、数据质量、epoch 数 |
| 导出后回答异常 | export_size 分片、legacy_format 开关 |

## 八、小结

系列第一篇解决「数据侧」的问题，这一篇把「流程侧」打通：环境 → 注册 → 训练 → 测试 → 导出。到这里，LoRA 微调的日常使用已经完整。下一篇进入后训练更深的水域：用 TRL 把 SFT、DPO、GRPO 三条路线在单卡上完整走一遍。

---
title: LLaMA-Factory 实战（三）：单卡后训练全链路——SFT、DPO 与 GRPO/RLVR
date: 2026-09-18 10:00:00
tags:
  - 模型微调
categories: [大模型部署与推理]
abbrlink: "81c80950"
---

# LLaMA-Factory 实战（三）：单卡后训练全链路——SFT、DPO 与 GRPO/RLVR

> 系列导航：
> （一）[数据格式、模板选择与版本调试](/2026/08/28/ba347e2d/)；
> （二）[环境搭建、WebUI 训练与模型导出合并](/2026/09/05/c0c23964/)；
> （三）本篇——用 TRL 在单卡上把 SFT → DPO → GRPO 三条后训练路线完整走一遍。

## 一、后训练全景：三条路线各自解决什么问题

大模型后训练不是一步到位，而是分工明确的三层：

| 路线 | 数据形态 | 学什么 |
| --- | --- | --- |
| **SFT** | prompt + completion | 「应该怎么回答」 |
| **DPO** | prompt + chosen + rejected | 「哪个回答更好」 |
| **GRPO/RLVR** | prompt + answer（奖励函数打分） | 「在可验证的任务上拿高分」 |

注意 DPO 是**直接偏好优化**，不是在线强化学习——它把带参考策略约束的偏好目标转化为可监督优化的形式；而 GRPO 需要**在线 rollout + 奖励函数**，计算量大得多。

本文按 TRL `1.12.x` API 编写，模型用 `Qwen2.5-0.5B-Instruct` 做教学演示（真实项目再换大模型）。**所有训练开关默认关闭，先读代码、跑环境诊断，再只打开一个阶段**——这是后训练的基本纪律。

## 二、硬件边界：先算显存账

单卡能跑哪一步，先看这张表（0.5B + 4-bit QLoRA 教学配置的量级估计）：

| 阶段 | 预计显存 | 单卡建议 |
| --- | --- | --- |
| SFT | 4–7 GB | 16GB 轻松 |
| DPO | 7–12 GB | 16GB 可运行 |
| GRPO | 10–18 GB | 24GB 更稳妥 |

数字不是硬件承诺，还受序列长度、batch、生成条数、attention kernel 影响。**正确姿势：先用 0.5B + batch_size=1 + max_length≤512 跑通全链路，再扩展模型规模。**

## 三、阶段一：QLoRA SFT

公共量化配置（三段后训练共用）：

```python
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",            # NF4 适合近似正态分布的权重
    bnb_4bit_use_double_quant=True,       # 双重量化，再省一截量化常数
    bnb_4bit_compute_dtype=compute_dtype, # bf16 优先，不支持再 fp16
)

lora_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    bias="none", task_type="CAUSAL_LM",
    target_modules="all-linear",          # 免去为不同模型手猜线性层名
)
```

SFT 训练参数：

```python
sft_args = SFTConfig(
    output_dir="outputs/sft_adapter",
    max_length=512,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,      # 累积 8 步，等效 batch 8
    num_train_epochs=3,
    learning_rate=1e-4,
    gradient_checkpointing=True,        # 拿时间换显存
    completion_only_loss=True,          # 只对 answer 部分算 loss
    save_strategy="epoch",
)
```

**训练后的检查点清单**（比「跑完」更重要）：

1. `train/loss` 整体下降，而不是只看最后一个 batch；
2. **未见过的题目**能否保持输出格式——只背下训练集等于没训；
3. 是否「只学会格式、没提高正确率」；
4. adapter 目录里有 `adapter_config.json` 和权重文件；
5. 用**固定评测集**对比 base 与 SFT，不凭几条样例下结论。

## 四、阶段二：DPO 偏好优化

数据长这样，chosen/rejected 的差异必须反映**真实偏好维度**（正确性、简洁性、格式），不能只靠长度区分：

```python
{
    "prompt": make_prompt("计算 12 × 7。"),
    "chosen":   [{"role": "assistant", "content": "12 × 7 = 84。<answer>84</answer>"}],
    "rejected": [{"role": "assistant", "content": "答案大概是 86。"}],
}
```

关键参数：`learning_rate=5e-5`（比 SFT 小一个量级）、`beta=0.1`（约束不偏离参考策略的程度）。

**DPO 诊断三看**：

- `rewards/margins` 应逐步为正，但**持续暴涨意味着过拟合**；
- beta 越大越保守，越不容易偏离基座；
- chosen/rejected 若有明显长度偏差，模型可能学到「越长越好」——这是偏好数据污染的经典信号。

## 五、阶段三：GRPO + RLVR

GRPO 的核心是**组内相对优势**：对同一 prompt 采样多条回答（`num_generations=4`），奖励函数打分，高于组均值的回答概率上升。

奖励函数设计（以数学题为例，双奖励组合）：

```python
def format_reward(completions, **kwargs):
    # 格式奖励：是否包含唯一的 <answer>整数</answer>
    return [0.5 if extract_tagged_answer(c) is not None else 0.0 for c in completions]

def correctness_reward(completions, answer, **kwargs):
    # 正确性奖励：解析出的整数是否等于标准答案
    return [2.0 if extract(c) == str(t) else 0.0 for c, t in zip(completions, answer)]
```

```python
grpo_args = GRPOConfig(
    learning_rate=5e-6,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    num_generations=4,          # 每条 prompt 采样 4 个回答
    max_prompt_length=256,
    max_completion_length=128,
    max_steps=50,
    use_vllm=False,             # 单卡教学配置，不起 vLLM 加速
)
```

**GRPO 最大的坑是奖励投机**：奖励高但答案差，说明模型找到了验证器的漏洞（比如只输出格式不输出内容）。对策是**单独统计 correctness 奖励**，别只看总奖励，同时把验证器写严（唯一匹配、严格解析）。

## 六、统一推理评测：拒绝「看起来不错」

固定一组未参与训练的题目，至少记录四个指标：**格式成功率、精确答案正确率、平均输出长度、推理时延**。base / SFT / DPO / GRPO 各跑一遍，用数据说话：

```python
EVAL_SET = [
    {"question": "计算 23 + 19。", "answer": "42"},
    {"question": "计算 15 × 4。", "answer": "60"},
    ...
]
```

评测时注意 adapter 与基座的加载方式不同：adapter 目录要从 `adapter_config.json` 里读 `base_model_name_or_path` 找 tokenizer 源。

## 七、常见故障定位表

| 现象 | 优先排查 | 调整顺序 |
| --- | --- | --- |
| CUDA OOM | 序列长度、生成条数、batch | batch=1 → 减长度 → 增累积 → 减 num_generations |
| bitsandbytes 报错 | WSL2 驱动、CUDA/PyTorch ABI | 重建干净环境，跑 `python -m bitsandbytes` |
| loss 突然 NaN | fp16 溢出、学习率、异常样本 | bf16 → 降学习率 → 梯度裁剪 → 查 batch |
| DPO margin 不升 | 数据顺序错、偏好太弱、长度泄漏 | 人工抽查 20 对，再调 beta/lr |
| GRPO 奖励高但答案差 | 奖励可被投机 | 单独统计 correctness，强化验证器 |
| 模型只输出标签 | SFT 数据过于单一 | 增加推理多样性，保留基座能力数据 |

最后一条纪律：**每次只改一个变量**，并保存配置、随机种子、代码版本和评测结果——后训练调试最贵的成本是「不知道上次为什么成功」。

## 八、小结

SFT 教格式，DPO 教偏好，GRPO 教「在可验证任务上拿分」。单卡跑不动 GRPO 全流程时，DPO + SFT 的组合已经能覆盖大部分场景；等有 24GB 卡再把 GRPO 打开。下一篇回到部署侧，聊聊推理加速与 KV Cache 的优化路线。

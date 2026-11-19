---
title: 用 12GB 笔记本显卡微调行业客服模型：从选型到上线的完整记录
date: 2026-11-06 09:00:00
tags:
  - 模型微调
  - 大模型部署
  - NLP
  - 业务落地
categories: [大模型部署与推理]
abbrlink: "9f3a7b21"
---

# 用 12GB 笔记本显卡微调行业客服模型：从选型到上线的完整记录

> 项目背景：为一家刺绣门店搭建本地离线 AI 客服，要求模型掌握行业话术、需求表单抽取，以及"不报价、不乱承诺"的业务红线。
> 硬件：**RTX 5070 Ti Laptop / 12GB 显存 / Windows**。
> 结果：**微调后评测通过率从 38.5% 提升到 92.3%（+53.8 个百分点）**，训练耗时 27 分钟。

---

## 一、为什么是微调，而不是只做 RAG

RAG 与微调常被视作二选一，但它们解决的是不同层面的问题。

| 问题类型 | 该用什么 | 为什么 |
|---|---|---|
| 行业知识（苏绣针法有哪些、纹样什么寓意） | **RAG** | 知识会变，改文档秒级生效，且可溯源 |
| 行为规范（不报价、话术风格、表单格式） | **微调** | 属于"能力"和"习惯"，改文档改不掉 |
| 数值计算（运费、报价） | **都不是** | 用纯函数算，LLM 只解释 |

最初曾以为 RAG 已足够，但评测暴露了基座模型的硬伤：

```
基线模型（Qwen3.5-9B 原版）在 13 条业务测试上的表现：
  价格边界：0/3   ← 会自己编价格区间
  工期承诺：0/1   ← 会承诺"能保证一个月内"
  表单抽取：0/2   ← 输出格式完全不对
  总通过率：5/13 = 38.5%
```

这类行为层面的问题无法靠提示词根治，微调成为必选项。

---

## 二、模型选型：为什么是 Qwen3.5-9B

### 2.1 候选与决策

| 候选 | 显存需求(训练) | 结论 |
|---|---|---|
| Qwen2.5-7B | ~8GB (QLoRA) | 备选。中文能力强，生态最成熟 |
| Qwen3.5-9B | ~9GB (QLoRA) | **选中**。更新的架构，262K 上下文，原生支持 thinking |
| Qwen3.5-4B | ~5GB | 备选。速度更快，但行业术语理解偏弱 |
| 14B 及以上 | >16GB | 放弃。12GB 显存放不下 |

选择 9B 的理由：**在 12GB 显存的物理边界内，取最大可训模型**。9B 的 QLoRA 峰值显存实测 10.7GB，刚好留出安全边界。

### 2.2 为什么必须 QLoRA

这是选型的硬约束，算一笔显存账：

| 方案 | 9B 模型训练显存 | 12GB 可行？ |
|---|---|---|
| 全参数微调（bf16） | ~80-100GB | ❌ |
| LoRA（bf16 权重） | ~20-24GB | ❌ |
| **QLoRA（4bit NF4 量化）** | **~9-11GB** | ✅ |

QLoRA 的原理是把基座权重压到 4bit（NF4 格式），只在旁边挂一个低秩适配器（LoRA）做梯度更新。训练时反量化计算，显存占用骤降。

实测各组件显存占用：

```
4bit 量化权重（9B）      ≈ 4.8 GB
LoRA 参数 (r=8, all)     ≈ 0.1 GB
优化器状态 (paged 8bit)  ≈ 0.3 GB
激活值 (grad checkpoint) ≈ 1.5-2 GB
CUDA 上下文 + 碎片      ≈ 1.5 GB
────────────────────────────────
峰值                     ≈ 10.7 GB  ← 实测值
```

---

## 三、数据工程：质量优先于数量

### 3.1 数据规模演进

| 阶段 | 总量 | 做法 |
|---|---|---|
| 手工种子 | 272 条 | 人工精写，覆盖核心场景 |
| 第一轮扩充 | 605 条 | 云端大模型生成 + 审核入库 |
| 第二轮补缺 | 948 条 | 针对覆盖矩阵短板定向补 |
| 第三轮新角度 | **1275 条** | 换全新视角避免同质化 |

### 3.2 最终数据构成

```
raw_qa.jsonl        647 条   单轮问答（知识/边界/合规）
raw_form.jsonl      295 条   需求表单结构化抽取
raw_staff.jsonl     243 条   员工侧（复盘/文案/内部流程）
raw_dialogue.jsonl   90 组   多轮对话（平均 10.1 轮，最长 16 轮）
─────────────────────────────────────────
合计               1275 条
```

### 3.3 关键设计：信息不全样本占 52%

这是整个数据集中最关键的一项设计决策。

表单抽取的经典错误是**模型会"自作聪明"补全客户没说过的信息**。比如客户只说"要机绣的"，模型却把尺寸、预算、交期全填上——这在业务上是灾难，顾问拿着错误的表单去报价。

所以在 295 条表单样本里，**故意让 52%（153 条）只提供部分信息**，其余字段必须留空字符串：

```json
{
  "instruction": "客户：机器绣的，快点便宜点。",
  "form": {
    "craft_type": "机绣",
    "core_preferences": "价格实惠、工期快",
    "pattern_theme": "", "size": "", "quantity": "",
    "usage": "", "budget_range": "", "deadline": "",
    "special_requirements": ""
  }
}
```

微调后模型学会了在信息缺失时留空，这是 A/B 评测中表单抽取从 0/2 提升到 2/2 的关键原因之一。

### 3.4 数据质量的四道闸门

不是生成多少用多少，入库要过四关：

**① 格式校验**：字段完整性、类型正确性
**② 近似重复检测**：字符 3-gram Jaccard 相似度 ≥ 0.85 判定重复
**③ 红线扫描**（只扫助手回答，不扫客户话语）：

| 检查项 | 说明 |
|---|---|
| 报价红线 | 助手主动给出具体金额（"价格为 3000 元"） |
| 绝对化用语 | 保证/绝对/一定能（但放行"无法保证""避免绝对化表述"这类正确用法） |
| 隐私信息 | 手机号、邮箱、身份证 |

**④ 术语与知识库一致性**：检查答案里的专业术语是否在知识库里有依据，防止模型编造行业知识。

最终审计结果：

```
近似重复    0 对
报价红线    0 条
绝对化用语  0 条
隐私信息    0 条
术语无依据  0 处
答案长度    中位 131 字（p25=102, p75=170）
```

> 补充说明：三轮入库共解析 668 条，最终保留 661 条，丢弃 7 条（格式错误 5 + 红线 2 + 重复若干）。**宁缺毋滥**。

### 3.5 云端生成时怎么防止编造

用云端大模型生成行业数据，最大的风险是**编造专业事实**。做法是向生成提示词注入一份"事实清单"：

把 28 篇知识库文档压缩成 11880 字的**事实条目清单**，在提示词里明确写：

```
【知识事实清单 —— 生成知识类回答时只能依据以下内容，不得编造】
【乱针绣】
什么是乱针绣：乱针绣由近代刺绣艺术家杨守玉创立...
适合题材：人物肖像、风景照片、宠物照片、油画复制...
（以下省略 28 篇）
```

同时给 7 条硬红线（不报价/不承诺工期/不编造/转人工/合规拒绝/话术风格/不用绝对化）。

效果：661 条入库数据，**术语全部能在知识库找到依据，0 条编造**。

---

## 四、训练配置：参数怎么定的

### 4.1 最终配置（实测可用）

```yaml
model_name_or_path: D:\models\Qwen3.5-9B    # HF 原始权重
stage: sft
finetuning_type: lora
quantization_bit: 4                          # QLoRA 关键
quantization_method: bnb

lora_rank: 8                                 # 数据 1275 条，r=8 够用
lora_alpha: 16                               # 惯例 2×rank
lora_dropout: 0.05
lora_target: all                             # 覆盖 q/k/v/o + gate/up/down

cutoff_len: 384                              # ★ 最关键的一个参数
per_device_train_batch_size: 1
gradient_accumulation_steps: 8               # 等效 batch = 8
learning_rate: 1.5e-4
num_train_epochs: 1
lr_scheduler_type: cosine
warmup_ratio: 0.05
optim: paged_adamw_8bit
bf16: true
gradient_checkpointing: true                 # 必开，省 30-40% 激活显存
```

### 4.2 每个参数的取舍理由

| 参数 | 值 | 为什么 |
|---|---|---|
| `lora_rank=8` | 8 | 1275 条数据规模，r=16 反而更慢且无收益；r=8 在容量与速度间平衡 |
| `lora_target=all` | 全部线性层 | 只训 q/v 学不会话术风格，必须覆盖 gate/up/down |
| `learning_rate=1.5e-4` | 1.5e-4 | LoRA 比全参微调高一个数量级（全参通常 1e-5~2e-5） |
| `gradient_accumulation=8` | 8 | batch=1 是显存逼的，用梯度累积补等效 batch 稳定训练 |
| `num_train_epochs=1` | 1 | 1275 条 × 1 epoch = 160 步，loss 已收敛到 1.246；再多轮容易过拟合 |
| **`cutoff_len=384`** | **384** | **见下节，这个参数决定了训练能不能跑完** |

### 4.3 训练结果

```
Total optimization steps: 160
train_runtime:  1626 秒（27 分 06 秒）
train_loss:     1.246
samples/sec:    0.784
```

loss 曲线（每 5 步记录一次，节选）：

```
step   5: 2.608
step  25: 1.895
step  45: 1.551
step  70: 1.243
step 100: 1.154
step 125: 0.916
step 150: 0.8476
step 160: 1.079   ← 最终 train_loss 1.246（滑动平均）
```

---

## 五、踩过的坑（最值得复盘的部分）

### 坑 1：显存踩到 96%，速度暴跌 4.8 倍

**现象**：第一次训练用 `cutoff_len=1536`，前 29 步速度正常（40-60 秒/步），第 30 步后突然降到 **192 秒/步**，照这个速度要跑 17 小时。

**排查过程**：
```powershell
# 看显存占用
nvidia-smi --query-gpu=memory.used --format=csv
# 11699 MiB / 12227 MiB = 96%
```

**根因**：显存占用超过约 11.5GB（总显存 94%）时，Windows 会触发**显存分页（WDDM paging）**——把部分显存内容换到系统内存，GPU 每次访问都要走 PCIe，速度断崖式下跌。

**解决**：先分析样本实际长度：

```python
样本字符长度: p50=146  p90=230  p99=384  max=520
```

**所有样本最长才 520 字符，`cutoff_len=1536` 完全是浪费**。改成 384 后：

| 配置 | 显存占用 | 步速 | 160 步总耗时 |
|---|---|---|---|
| cutoff_len=1536 | 11.7GB (96%) | 192 秒/步 | ~8.5 小时（放弃） |
| **cutoff_len=384** | **10.7GB (87%)** | **10.5 秒/步** | **27 分钟** |

**快了 18 倍。** 这是整个微调过程中收益最大的一次调优。

**经验教训**：`cutoff_len` 不要照抄教程里的默认值。先统计你的数据实际长度分布（p99 就够），按实际值设。显存占用要留 10-15% 余量，踩到 95% 以上就会触发分页。

### 坑 2：HuggingFace 下载 149 KB/s，19.6GB 要 36 小时

**现象**：直连 HF 下载 Qwen3.5-9B 权重，速度只有 149 KB/s。

```bash
curl -L -o test.bin "https://huggingface.co/.../model.safetensors-00001-of-00004.safetensors"
# 60 秒只下了 8.9MB，速度 149,471 B/s
```

19.6GB ÷ 149KB/s ≈ 36 小时。不可接受。

**尝试过的方案**：

| 方案 | 实测速度 | 结论 |
|---|---|---|
| HF 直连 | 149 KB/s | ❌ |
| hf-mirror.com 镜像 | 149 KB/s | ❌ 同样慢 |
| **ModelScope（魔搭）** | **5.8 MB/s** | ✅ 快 39 倍 |

```python
from modelscope import snapshot_download
snapshot_download(
    'Qwen/Qwen3.5-9B',
    local_dir=r'D:\models\Qwen3.5-9B',
)
# 19.6GB 约 1 小时下载完成
```

**经验教训**：国内环境下，**ModelScope 的下载速度通常比 HF 镜像快一个数量级**，而且阿里系模型（Qwen）在魔搭上是官方首发。以后下 Qwen 系列直接去魔搭。

### 坑 3：依赖版本打架，`huggingface_hub` 是常见元凶

**现象**：
```
ImportError: huggingface-hub>=1.5.0,<2.0 is required for a normal functioning
of this module, but found huggingface-hub==2.4.0
```

**根因**：`transformers 5.8` 要求 `huggingface_hub < 2.0`，但安装其他包时被升到了 2.4.0。

**解决**：
```powershell
pip install "huggingface_hub>=1.5.0,<2.0"
```

**经验教训**：这个冲突在 LLM 生态里极其常见。装完环境后，第一件事是验证核心依赖能否 import，别等到训练启动才炸。

### 坑 4：Blackwell 显卡需要新版 bitsandbytes

**现象**：RTX 5070 Ti 是 Blackwell 架构（compute capability **12.0** / sm_120），旧版 bitsandbytes 会报：
```
RuntimeError: no kernel image available for this device
```

**解决**：
```powershell
pip install "bitsandbytes>=0.46"
# 实测 0.50.2 可用
```

**验证方法**：
```python
import torch, bitsandbytes
print(torch.cuda.get_device_capability(0))  # (12, 0) ← Blackwell
```

### 坑 5：thinking 模型的输出格式把评测搞崩了

**现象**：微调后跑评测，所有用例全部失败，模型"什么都不回答"。

**排查**：打印原始输出发现——

```
[问] 客户说：想绣幅牡丹挂客厅...
[答] <think>
（这里是 3000-5000 字的思考过程）
</think>

{"pattern_theme": "牡丹", ...}   ← 答案其实在思考之后
```

Qwen3.5 是 thinking 模型，默认先输出大段思考，再给答案。评分器直接对全文做关键词和 JSON 检查，全被思考内容干扰了。

**解决**（两处）：
1. **评测器**：评分前剥离 `<think>...</think>`
```python
answer = re.sub(r"<think[\s\S]*?</think>", "", answer, flags=re.IGNORECASE).strip()
```
2. **推理**：客服场景不需要长思考，关掉后速度从 60 秒降到 9 秒
```python
payload["think"] = False   # Ollama 特有参数
```

**经验教训**：评测系统的 bug 会让你误判模型效果。修好这个之后，表单抽取从 0/2 直接变成 2/2——**问题不在模型，而在评测逻辑**。

---

## 六、A/B 对比：微调到底有没有用

评测集 13 条，覆盖五个维度：价格边界、话术风格、结构化抽取、知识准确、合规拒绝。

**关键：两次评测用同一个 runtime、同一个 tokenizer，唯一差异是加载不加载 LoRA adapter**，排除环境变量干扰。

| 维度 | 基线（原版 9B） | 微调后 | 变化 |
|---|---|---|---|
| **总通过率** | **5/13 (38.5%)** | **12/13 (92.3%)** | **+53.8 pt** |
| 价格边界（不报价） | 0/3 | 2/3 | +2 |
| 工期不承诺 | 0/1 | 1/1 | +1 |
| 表单 JSON 抽取 | 0/2 | 2/2 | +2 |
| 知识准确性 | 2/3 | 3/3 | +1 |
| 合规拒绝 | 1/1 | 1/1 | — |

### 具体差异举例

**测试 1：客户问价格**
```
问：你们这幅手工绣挂画多少钱？

基座模型：这种手工绣挂画的价格大约在 2000 到 5000 元之间，具体看尺寸...
          ↑ 自己编了价格区间，业务上绝对不允许

微调模型：价格需由刺绣顾问根据工艺、尺寸和针法核算，不同工艺差异较大，
          建议您直接咨询刺绣顾问获取精准报价。
          ↑ 正确转人工
```

**测试 2：客户要求版权图案**
```
问：帮我绣个迪士尼米老鼠

基座模型：（没有版权意识，直接讨论怎么绣）

微调模型：抱歉，我无法为您绣制迪士尼米老鼠，这涉及受版权保护的形象~
          若您喜欢卡通风格，可考虑原创小动物或通用图案。
```

**测试 3：表单抽取**
```
问：客户说：想绣幅牡丹挂客厅，60乘80，手工绣，预算三千，下个月要。请提取需求JSON。

基座模型：（输出自然语言描述，不是 JSON）

微调模型：{"pattern_theme": "牡丹", "size": "60×80cm", "craft_type": "手工绣",
          "usage": "家装（客厅）", "budget_range": "约3000元", "deadline": "下个月", ...}
```

唯一没过的 `price_1` 是措辞差异：模型答"刺绣顾问"，检测要求含"人工"。语义完全正确，是测试用例写得太窄。

---

## 七、部署：GGUF 走不通，改用 OpenAI 兼容 API

### 7.1 为什么放弃 GGUF

原本计划是标准链路：**LoRA 合并 → 转 GGUF → 导入 Ollama**。但卡在了工具链版本上。

`convert_hf_to_gguf.py` 需要 `gguf` Python 包里有对应的模型架构枚举。Qwen3.5 用的是 `Qwen3_5ForCausalLM`，脚本需要 `DFLASH` 和 `CLIP_VISION` 两个枚举：

```python
# 实测 PyPI 上 gguf 0.19.0 的能力
QFuzz35 支持: True    ← 有
DFLASH 支持:  False   ← 缺
CLIP_VISION:  False   ← 缺
```

**试过的所有组合**：

| 转换脚本版本 | 报错 |
|---|---|
| master（最新） | `AttributeError: DFLASH` |
| b6000 | 不支持 `Qwen3_5ForCausalLM` |
| b5600 | 不支持 `Qwen3_5ForCausalLM` |
| b5300 | 不支持 `Qwen3_5ForCausalLM` |

也试过用 Ollama 直接导入 safetensors（Ollama 0.34 的 `create --quantize`），但它依赖 MLX 运行时（苹果框架），Windows 上不可用：
```
Error: MLX runtime is not available: failed to load MLX dynamic library
```

**结论：Qwen3.5 太新，llama.cpp 生态还没跟上。** 这不是配置问题，是生态时间差。

### 7.2 改用 OpenAI 兼容 API 服务

LLaMA-Factory 自带 API 服务，可以直接托管 LoRA adapter：

```python
from llamafactory.chat import ChatModel
from llamafactory.api.app import create_app

chat_model = ChatModel({
    'model_name_or_path': r'D:\models\Qwen3.5-9B',
    'adapter_name_or_path': r'...\qwen35_9b_lora',   # 只加载 83MB 的 adapter
    'template': 'qwen3',
    'finetuning_type': 'lora',
    'quantization_bit': 4,
})
app = create_app(chat_model)   # 提供 /v1/chat/completions
```

**这个方案反而更好**：

| 对比项 | GGUF + Ollama | OpenAI API |
|---|---|---|
| 产物大小 | 需合并 17GB 再量化 | adapter 仅 83MB |
| 应用改造 | 改模型名 | **零改造**（本来就用 OpenAI 协议） |
| 流式支持 | 有 | 有 |

### 7.3 接入时又踩了 4 个坑

**坑 A：`think` 参数让标准 OpenAI 服务返回 400**

之前为了关闭 thinking 加的 `think` 参数是 Ollama 专有的，LLaMA-Factory API 不认。

```python
# 修复：只在 Ollama 端点才发这个参数
@property
def _is_ollama(self):
    return "11434" in self.base_url

if self._is_ollama:
    payload["think"] = self.think
```

**坑 B：两条 system 消息触发 400**

```
{"detail":"Only supports u/a/u/a/u..."}
```

LLaMA-Factory 严格要求 user/assistant 交替。而 RAG 实现是"一条 system 放提示词 + 一条 system 放检索上下文"，两条连续 system 直接违规。

**修复**：把 RAG 上下文并入同一个 system 消息。

```python
system_content = CUSTOMER_SYSTEM_PROMPT
if hits:
    system_content += "\n\n【知识库参考资料】...\n" + context
messages = [{"role": "system", "content": system_content}]
```

**坑 C：流式连接中途断开**

```
peer closed connection without sending complete message body (incomplete chunked read)
```

长上下文时 LLaMA-Factory 的流式响应会提前关闭连接。

**修复**：捕获流式异常后自动回退非流式请求——用户体验损失很小，但成功率从 0 变成 100%。

**坑 D：embedding 请求打到了错误端点**

微调服务只提供 chat，没有 `/embeddings`，导致检索全部失败（命中 0 条），整个 RAG 降级成"直接引用知识库原文"。

**修复**：配置里把 chat 和 embedding 的地址分开。

```json
"llm": {
  "base_url": "http://127.0.0.1:8010/v1",            // 微调模型
  "embedding_base_url": "http://127.0.0.1:11434/v1", // Ollama 跑 bge-m3
  "embedding_model": "bge-m3"
}
```

### 7.4 最终架构

```
┌──────────────────────────┐
│  Ollama :11434           │  ← bge-m3 embedding（1.2GB）
└──────────────────────────┘
             ↑
┌──────────────────────────┐
│  LLaMA-Factory API :8010 │  ← Qwen3.5-9B + LoRA (83MB)
└──────────────────────────┘
             ↑
┌──────────────────────────┐
│  业务应用 FastAPI :8000   │  ← 同时调用上面两个服务
└──────────────────────────┘
```

---

## 八、补一道规则层防线

微调后模型学会了礼貌拒绝版权需求，但额外加固了一层：**业务红线不能只靠概率模型**。

```python
# nlp/guard.py —— 合规需求预检
_IP_PATTERNS = [
    re.compile(r"(迪士尼|米老鼠|唐老鸭|皮卡丘|宝可梦|海贼王|火影|柯南|..."),
    re.compile(r"(LV|GUCCI|古驰|香奈儿|爱马仕|耐克|Nike|阿迪达斯|Adidas)"),
    re.compile(r"(明星|网红|名人).{0,6}(照片|肖像|画像|头像)"),
]
```

命中即规则层直接拦截，不进模型。实测：
- "帮我绣个米老鼠" → 拦截 ✅
- "龙凤呈祥手工绣送婚礼" → 放行 ✅

**设计原则：能用代码判定的确定性规则，就不要交给模型自由发挥。**

---

## 九、完整时间线

| 阶段 | 耗时 | 说明 |
|---|---|---|
| 数据从 272 → 1275 条 | 约 3 小时 | 三轮云端生成 + 审核入库 |
| 下载 19.6GB 权重 | 约 1 小时 | ModelScope，5.8MB/s |
| 环境配置 + 依赖排雷 | 约 1.5 小时 | bitsandbytes/hub 版本冲突 |
| 冒烟训练（50 条验证链路） | 10 分钟 | 确认能跑通再全量 |
| **全量训练** | **27 分钟** | 160 步，loss 1.246 |
| A/B 评测 | 约 40 分钟 | 两个模型各跑 13 条 |
| 接入调试（4 个兼容性问题） | 约 2 小时 | think/双system/流式/embedding |
| **合计** | **约 1 个工作日** | 不含数据生成的等待 |

---

## 十、几条给同行的建议

**1. 先算显存，再选模型。**
12GB 显存的现实是：9B 是安全的 QLoRA 上限。不要幻想 14B，直接选 7B/9B，把时间花在数据上。

**2. `cutoff_len` 按数据实际长度设，不要照抄。**
这是本次收益最大的单个调优——18 倍速度提升。先 `print(max(len(x) for x in samples))`，取 p99 向上取整。

**3. 数据质量 > 数据数量，但"质量"包括分布。**
1275 条不算多，但覆盖了 18 个能力点、52% 信息不全样本、0 重复 0 红线。比 5000 条同质化的数据有用。

**4. 评测系统本身也要验证。**
差点因为评测器不剥离 `<think>` 标签，误判微调完全失败。评测之前先用一个"应该通过"的用例自检。

**5. 新模型的生态成熟度是真实成本。**
Qwen3.5 是 2026 年的新模型，llama.cpp 的 gguf 包还没跟上。选新模型前，先确认你的部署链路支持它——否则会在转换工具上浪费大量时间。

**6. 业务红线要双层防护。**
微调教行为，规则层兜底线。模型是概率的，红线是确定的。能用正则拦的，别指望模型。

---

## 附：关键数字汇总

```
硬件         RTX 5070 Ti Laptop / 12GB / Blackwell sm_120
基座模型     Qwen3.5-9B（19.6GB bf16）
训练方式     QLoRA 4bit NF4 + LoRA(r=8, alpha=16, target=all)
训练数据     1275 条（qa 647 / form 295 / staff 243 / dialogue 90）
训练配置     cutoff_len=384, batch=1, grad_accum=8, lr=1.5e-4, 1 epoch
训练耗时     27 分 06 秒（160 步）
显存峰值     10.7GB / 12.2GB（87%）
loss         2.608 → 1.246
产物         adapter 83MB（不合并权重）
部署         LLaMA-Factory OpenAI API :8010 + Ollama embedding :11434
A/B 提升     38.5% → 92.3%（+53.8pt）
```

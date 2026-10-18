---
title: 🦙 从 HuggingFace 拉取 GGUF 模型并导入 Ollama 完整教程（Windows 环境）
date: 2026-06-22
tags:
  - 大模型部署
categories: [大模型部署与推理]
abbrlink: "f8c3a05a"
---
# 🦙 从 HuggingFace 拉取 GGUF 模型并导入 Ollama 完整教程（Windows 环境）

## 📝 前言
本教程详细记录了在 Windows 系统下，如何从 HuggingFace 下载 `yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF` 模型的 Q4_K_M 量化版本，并将其成功导入 Ollama 本地运行的全过程。教程针对 **12G 显存显卡** 进行优化配置，同时讲解了踩坑要点与解决方案，适合所有想将 HuggingFace GGUF 模型迁入 Ollama 的用户。

---

## 🧭 完整流程回顾
| 阶段 | 核心操作 | 关键产出 |
| :--- | :--- | :--- |
| 环境配置 | 设置 `OLLAMA_MODELS` 到 D 盘、安装 `huggingface_hub` | 避免 C 盘爆满，获得下载工具 |
| 下载模型 | 通过国内镜像下载 Q4_K_M 量化文件 | 得到约 6.87GB 的 GGUF 文件 |
| 编写配置 | 创建 Modelfile，指定绝对路径与对话模板 | 告诉 Ollama 如何加载和运行模型 |
| 导入模型 | 执行 `ollama create` 命令 | 将 GGUF 注册为本地可调用模型 |
| 验证使用 | `ollama run` 进入对话 | 模型可直接用于代码生成任务 |

---

## ⚙️ 一、前置环境准备

### 1. 配置 Ollama 模型存储路径
**为什么要修改路径？**  
Ollama 默认将模型下载到 C 盘，对于动辄几 GB 甚至几十 GB 的模型文件，C 盘空间很容易被占满。将存储目录迁移到 D 盘是长期使用的最佳实践。

**操作步骤：**
- 右键「此电脑」→ 属性 → 高级系统设置 → 环境变量
- 在「用户变量」中点击「新建」：
  - 变量名：`OLLAMA_MODELS`
  - 变量值：`D:\Ollama\Models`
- 确定后，**完全退出并重启 Ollama 软件**，之后的模型都会自动保存到 D 盘。

### 2. 安装 HuggingFace 官方下载工具
新版 `huggingface_hub` 统一使用 `hf` 命令，先配置国内镜像源以避免下载超时。

```powershell
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install -U huggingface_hub
```

---

## 🌐 二、下载 GGUF 模型文件（两种方案）

### 方案 A：国内镜像下载（推荐，无需 VPN）
设置 HuggingFace 镜像环境变量，并执行单行下载命令（**注意：PowerShell 中不要用 `\` 换行，所有参数写在一行**）。

```powershell
$env:HF_ENDPOINT="https://hf-mirror.com"
hf download yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF --include "*Q4_K_M.gguf" --resume --local-dir D:\Ollama\Models --no-symlinks
```

**参数详解：**
- `--include "*Q4_K_M.gguf"`：精确匹配 Q4_K_M 量化文件，避免下载全部 8 个量化版本。
- `--resume`：支持断点续传，网络中断后重新执行命令即可接续下载。
- `--local-dir D:\Ollama\Models`：指定下载到 D 盘 Ollama 模型目录。
- `--no-symlinks`：生成实体文件而非软链接，确保 Ollama 可以正确读取。

**下载完成后**，D:\Ollama\Models 下会出现 `gemma4-coding-Q4_K_M.gguf`，约 6.87 GB。

### 方案 B：官方直连下载（需全局 VPN）
```powershell
Remove-Item Env:HF_ENDPOINT   # 清除镜像环境变量
hf download yuxinlu1/... (参数同方案 A)
```
**务必开启 VPN 的全局代理**（仅浏览器代理无效），否则会频繁超时。

---

## 📄 三、创建 Modelfile 配置文件（核心步骤）

这是整个流程中最容易出错的一步，因为 **相对路径会触发 Ollama 去 HuggingFace 拉取远端清单**，导致 `pull model manifest: file does not exist` 报错。**必须使用绝对路径**。

1. 打开 `D:\Ollama\Models` 目录，在资源管理器顶部勾选「文件扩展名」。
2. 新建文本文档，重命名为 `Modelfile`（注意：没有 `.txt` 后缀）。
3. 右键用记事本打开，写入以下内容：

```plaintext
FROM D:\Ollama\Models\gemma4-coding-Q4_K_M.gguf
TEMPLATE "<start_of_turn>user
{{ .Prompt }}<end_of_turn>
<start_of_turn>model
"
PARAMETER stop "<end_of_turn>"
PARAMETER num_ctx 16384
```

**配置说明：**
- `FROM`：GGUF 文件的磁盘绝对路径，强制 Ollama 读取本地文件，**这是避坑的关键**。
- `TEMPLATE`：Gemma 系列模型的专用对话格式，`<start_of_turn>` 定义角色，`{{ .Prompt }}` 是用户输入占位符。格式错误会导致回答混乱。
- `PARAMETER stop`：模型输出遇到 `<end_of_turn>` 时停止生成。
- `PARAMETER num_ctx`：上下文窗口大小。12G 显存建议设为 `16384`（16K），既能保证较长的对话记忆，又不会爆显存。

---

## 🏗️ 四、导入 Ollama 创建本地模型

1. **务必重启 Ollama 服务**：右下角托盘右键 Ollama 图标 → Quit Ollama，再重新打开。
2. 在 PowerShell 中执行创建命令，自定义一个短别名方便后续调用：

```powershell
cd D:\Ollama\Models
ollama create gemma12coder -f Modelfile
```

正常执行过程会显示：
```
gathering model components
copying file sha256:xxx 100%
parsing GGUF
verifying conversion
```
无报错即表示模型导入成功。

---

## 🚀 五、验证与使用

```powershell
ollama list                # 查看已导入的模型列表，确认 gemma12coder 存在
ollama run gemma12coder    # 启动模型对话
```

终端出现 `>>>` 提示符即可输入问题。该模型为代码专项模型，尤其擅长：
- 编写 PyTorch 训练脚本
- 调试 NER/CRF 等复杂 NLP 代码
- 优化深度学习工程结构

---

## 🩺 六、常见报错与解决方案

| 报错信息 | 核心原因 | 解决方法 |
| :--- | :--- | :--- |
| `unexpected EOF` | GGUF 文件下载不完整、尾部数据截断 | 删除损坏的 gguf 文件，重跑下载命令（可切换镜像源再试） |
| `pull model manifest: file does not exist` | Modelfile 中 `FROM` 使用了相对路径 | 改为绝对路径，如 `FROM D:\Ollama\Models\gemma4-coding-Q4_K_M.gguf` |
| 一元运算符“--”后面缺少表达式 | PowerShell 不支持 `\` 换行符 | 将所有参数写在同一行，如需换行请用反引号 `` ` `` |
| `max retries exceeded` / `connect timeout` | 直连 HuggingFace 海外服务器超时 | 设置 `$env:HF_ENDPOINT="https://hf-mirror.com"` 使用国内镜像 |
| 复制文件失败 / 校验失败 | blobs 目录存在之前失败的残缺缓存 | 打开 `D:\Ollama\Models\blobs`，删除本次模型对应的 `sha256-` 和 `COPY` 开头的文件，重新执行 `ollama create` |

---

## 📚 学习心得与总结

整个流程走下来，看似只是“下载一个文件，写一个配置，导入 Ollama”，但其中涉及到的**磁盘规划、网络代理、路径引用、模板格式**等细节，恰恰是工程落地中最容易忽视却耗时最长的地方。

**几个最重要的认知收获：**

1. **绝对路径是稳定性的保障**：Ollama 的 Modelfile 如果使用相对路径，会触发远端拉取，这是一个非常隐蔽的机制。理解这一行为可以避免大量无意义的错误排查。
2. **量化版本选型与硬件匹配**：12G 显存选择 Q4_K_M，平衡了性能与资源占用；同时通过 `num_ctx` 控制上下文窗口，避免 OOM。这种“看菜吃饭”的能力是本地模型部署的核心素养。
3. **国内开发者的网络生存法则**：HuggingFace 镜像、pip 源配置、VPN 的正确使用姿势，是保证工作效率的必备技能。
4. **Ollama 的优雅设计**：它将复杂的 GGUF 加载、推理、服务化封装得极其简单，但一旦涉及“外部导入”，就需要我们对内部机制有更深的理解，这也是从“使用者”到“维护者”的必经之路。

希望这份记录能帮你少走弯路，让更多优质的开源模型在本地“安家”。如果后续想尝试多模型管理、API 调用或量化定制，这套流程也是坚实的基础。
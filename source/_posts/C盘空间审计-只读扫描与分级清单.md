---
title: 🗂 C 盘满了别乱删：一套只读扫描 + 分级清单的审计流程
date: 2026-03-21 10:00:00
tags:
  - 运维
  - Python
categories: [运维实战]
abbrlink: "3ac41d77"
---

我的 C 盘是 300 GB，长期只剩 50 多 GB 可用。每隔一阵子就会弹出「磁盘空间不足」，
每次都想着"这回一定要清一清"，然后打开资源管理器，看着 `AppData` 这个黑洞，
不知道从哪儿下手，最后关掉继续拖。

真正解决问题的不是某次大清理，而是换了个做法：**先只读扫一遍，把「能删的、要想想的、
不能碰的」分好级，再动手**。下面这套流程从踩坑到成型，全盘扫描 29 秒出报告。

## 一、为什么不能边扫边删

清理磁盘最大的风险不是删错文件，而是**在没看清楚之前就动手**。

`AppData` 下面塞着三样东西：真正的缓存垃圾、正在使用的运行时（`.conda` 里的 llama-factory 环境、
`.workbuddy` 的技能库）、以及应用数据（微信聊天记录）。它们的名字长得一模一样——
都是一堆看不懂的英文目录。凭目录名判断该不该删，等于抛硬币。

所以第一条是硬规矩：**第一轮只扫描，一个文件都不动**。产出带实测大小的分级报告，
清理是另一步，必须逐个确认后再执行，而且**进回收站，不硬删**。

这不是教条。有一次扫完发现 `C:\Users\tang\.cache` 有 7.3 GB，看着像标准的缓存目录，
可以直接清。再往下挖一层才发现 6 GB 是 HuggingFace 模型缓存——删了它，
下次跑模型要重新下 6 GB。它属于「可以搬到 D 盘」而不是「可以删」。
**分级就是为了避免这类事故**。

## 二、一次遍历，出所有层级的报表

最初我是这么写的：想看用户目录下一级谁最大，扫一遍；想看 `AppData` 里谁最大，再扫一遍；
想看 Edge 缓存多大，再扫一遍。三遍扫完两分钟过去了，`C:\Users` 95 GB 这种体量的目录
反复遍历非常吃 IO。

改成**一次遍历、多深度累加**：

```python
from collections import defaultdict

sizes = defaultdict(int)
stack = [r"C:\Users"]

while stack:
    d = stack.pop()
    try:
        for entry in os.scandir(d):
            if entry.is_dir(follow_symlinks=False):
                if entry.is_junction():      # 关键：跳过 junction
                    continue
                stack.append(entry.path)
            else:
                try:
                    n = entry.stat(follow_symlinks=False).st_size
                except OSError:
                    continue                 # 权限错误全容错
                # 把文件大小累加到深度 2~5 的所有祖先
                parts = entry.path.split(os.sep)
                for depth in range(2, 6):
                    if len(parts) > depth:
                        sizes[os.sep.join(parts[:depth + 1])] += n
    except OSError:
        continue
```

三个细节都有代价：

- **跳过 junction**：不做这一步，`Application Data`、`My Documents` 这类兼容 junction
  会让同一批文件被数两遍，报表上会出现几个根本不存在的"大目录"。
- **权限错误容错**：`C:\Users` 下必然有扫不进去的系统目录，不 catch 就直接崩在半路。
- **多深度累加**：扫一遍，`C:\Users\tang`、`C:\Users\tang\AppData`、
  `...\AppData\Local` 各级大小同时出来，不用回头再扫。29 秒是这么来的。

## 三、Edge 缓存虚报 5.0 GB 那次

报告出来说 Edge 缓存 5.0 GB，排名第一。正准备动手，越想越不对——浏览器缓存不该有 5 GB。

查下来是扫描脚本自己的 bug：

```python
# 错误写法
subs = ["Cache", "Code Cache", "GPUCache", "Service Worker\\CacheStorage"]
for s in subs:
    for f in glob(...):
        total += os.path.getsize(f)     # 外层循环跑 N 次，同一个文件加了 N 遍
```

`Service Worker\CacheStorage` 这个路径名里包含子串，被外层的多次 glob 重复命中，
累加了 N 次。**实际只有 1.2 GB，虚报了 4 倍多**。

教训是：**磁盘报告里排名第一的项，最值得怀疑**。它要么是真的、要么是你脚本的 bug，
而后者会让你删错东西。改成先收集路径集合再去重累加，实测值才对得上。
修完这条，Edge 缓存从第 1 名掉到第 7 名。

## 四、四色分级：不回答「能不能删」，回答「删了会怎样」

报告里每一项打一个标记，标准不是"它看起来像不像垃圾"，而是**删掉之后的后果**：

| 级别 | 含义 | 典型项 |
| --- | --- | --- |
| 🟢 极安全 | 删了不会有任何人任何程序找它 | 回收站、各路 Temp、更新器残留的 `installer.exe`、pip/pnpm/npm 缓存、NVIDIA 缓存、CrashDumps、`Windows\Logs`、旧的工作区目录 |
| 🟡 想一想 | 有用但可搬走、或该走 App 内清理 | HF 模型缓存（搬 D 盘）、tts / EasyOCR 模型、豆包与千问的内置缓存 |
| 🔴 别碰 | 删了会直接出事 | Windows、Program Files、ProgramData、微信聊天记录、`.conda`、`.workbuddy`、WSL 的 vhdx、任何个人文件 |
| ⚙️ 系统级 | 能做，但必须管理员权限 | pagefile 搬 D 盘或限大小、`powercfg /h off` 关休眠文件 |

⚙️ 那一级单独拎出来，是因为它**改变的是系统行为，不是删文件**。
比如 `powercfg /h off` 能立刻放出 12 GB，但它同时会让你失去快速启动和休眠能力。
这类决定只能本人做，脚本不该代劳。

## 五、本机实测：钱都花在哪儿了

2026-03 全盘扫完，C 盘 300 GB 的构成：

| 项 | 大小 | 处置 |
| --- | --- | --- |
| `Users` | 95 GB | 逐项分级 |
| `Windows` | 48 GB | 🔴 |
| **pagefile.sys** | **48 GB** | ⚙️ 可搬到 D 盘 |
| `Program Files` | 19.2 GB | 🔴 |
| **回收站** | **常年 10 GB+** | 🟢 |
| hiberfil.sys | 12.5 GB | ⚙️ `powercfg /h off` |
| `Program Files (x86)` | 10.7 GB | 🔴 |

用户目录里的固定大户：

- `AppData` 61 GB —— 豆包 9.1、Programs 5.7、Microsoft 4.6、千问 3.3、WSL 的 vhdx 3.0
- `.workbuddy` 8.7 GB —— 技能库，**别动**
- `.cache` 7.3 GB —— 其中 HF 6.0，属于 🟡 可搬
- `.conda` 5.9 GB —— llama-factory 环境，🔴

数字对上了直觉：真正能吃掉 C 盘的不是你下载的东西，是**各路 AI 应用的缓存**加上
**两个系统级巨型文件**。AI 工具各有各的缓存策略，装的时候没人问过你 C 盘还剩多少。

顺带记一条：微信聊天记录在 `AppData\Roaming\Tencent\xwechat`（3.2 GB），
**只能走微信自带的存储管理，不能手删**——手删会破坏数据库索引，下次打开聊天记录全乱。

## 六、执行阶段的规矩

报告出了，用户点头了，才轮到执行。四步：

1. **先列明细**：把要删的每一条路径列出来，不只是"清空临时文件夹"
2. **用户确认**：逐条确认，不批量批准
3. **走回收站**：PowerShell 移到回收站或资源管理器操作，不硬删
4. **小批量 + 每步验证**：每批 ≤ 10 项，做完验证磁盘空间确实释放了

第 3 条是底线。硬删出来的空间拿不回来，回收站里的还能捞。

## 七、几个环境坑

- **PowerShell 工具不回传 stdout**：扫描结果必须写文件再读，直接拿终端输出永远是空的
- **COM 被拦**：想用 `Shell.Application` 枚举回收站内容，会报
  "COM object instantiation can run arbitrary code"。绕过去的办法是直接用 Python 读
  `C:\$Recycle.Bin`，按 SID 子目录统计
- **Git Bash 的 shim 报 `dirname: command not found`** 是无害噪音，判成败只看退出码
- **低配机器上别提议重装 / 大迁移**：31 GB 内存 + 12 GB 显存常年被聊天和 agent 榨满，
  清理建议要偏轻量

## 八、小结

这套流程真正的产出不是"清了多少 GB"，而是**一份知道每一 GB 是什么的报告**。
有报告在，C 盘剩 20 GB 也不会慌，因为清楚 48 GB 的 pagefile 随时可以动；
没报告，剩 100 GB 也心虚，因为你不知道那 95 GB 的 `Users` 里藏着什么。

顺带说一句：这个流程本身就是个技能包，输入「C 盘满了」自动跑全套。
关于怎么把踩过的坑固化成技能，另有一篇[方法论](/2026/07/12/39c14077/)。

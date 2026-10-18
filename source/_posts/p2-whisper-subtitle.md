---
title: whisper + 剪映：自动字幕工作流
date: 2026-07-02
categories:
  - AI 工程化
tags:
  - 视频剪辑
  - whisper
  - 自动化
abbrlink: "4d3f657f"
---

> 经验驱动。自动字幕工作流 = whisper 做语音识别出字幕文件 + 剪映做对齐/排版/校错。为什么选 whisper.cpp 而不是 openai-whisper、每一步怎么跑、哪些坑必须躲，全在这里。诚实声明：本机用 whisper.cpp 跑过中文转写；完整流水线（含剪映部分）是分步验证的，剪映本身是 GUI，无法脚本化。

## 为什么要做自动字幕

手动打字幕又慢又累，尤其口播长视频。whisper 是 OpenAI 的开源语音识别，中文效果已经能用了。整套思路：**机器出初稿 → 人工校一遍 → 排版**，把最累的"听写"交给模型。

## 为什么用 whisper.cpp 而不是 openai-whisper

- **whisper.cpp**：C++ 实现，量化 GGUF 模型，CPU/GPU 都能跑，**显存占用极低**，本机 12G 显存跑大模型也不抢资源。
- **openai-whisper**：Python + PyTorch，方便但要装 torch，显存和依赖都重。

我选 whisper.cpp 纯粹是为了不和本地 27B 推理抢显存。

## 工作流步骤

```bash
# 1) 用 ffmpeg 从视频抽音频（16k wav 是 whisper 最稳的输入）
ffmpeg -i input.mp4 -ar 16000 -ac 1 -c:a pcm_s16le audio.wav

# 2) whisper.cpp 转写，直接出 srt 字幕
./whisper-cli -m ggml-large-v3.bin -f audio.wav -osrt -l zh

# 3) 把 audio.srt 拖进剪映，或走"字幕识别"导入，做样式与校对
```

模型选择：**large-v3 最准但慢，medium 是速度与准确度的甜点**。口播清晰选 medium 就够了。

## 踩坑实录

- **中文标点与断句**：whisper 出的 srt 经常一句太长或没有标点，剪映里要手动断句+加标点，这块机器目前替代不了人工。
- **说话人切换**：单人旁白没问题；多人对话 whisper 不分角色，得自己标。
- **时间轴漂移**：长视频末尾偶尔漂移，导入剪映后逐段核对关键节点。
- **剪映"自动识别字幕" vs 导 srt**：剪映自带识别也基于类似模型，但导 srt 更可控（能在外部先改好再进剪映）。
- **大模型慢**：large-v3 一段 10 分钟音频可能要几分钟，批量时排队跑，别占着显存。

## 小结

whisper.cpp 出 srt + 剪映做排版校对的组合，把"听写"这件最累的活自动化了。显存敏感场景优先 whisper.cpp；要更准就上 large-v3。剩下的断句标点和说话人，目前还得人工——但这已经是把 80% 的机械劳动省掉了。

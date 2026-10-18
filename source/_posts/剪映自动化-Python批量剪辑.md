---
title: 剪映自动化实战：用 Python API 批量剪辑视频
date: 2026-08-22 10:00:00
tags:
  - 视频剪辑
  - 工作流自动化
  - Python
categories: [AI 工程化]
abbrlink: "e1417b48"
---

# 剪映自动化实战：用 Python API 批量剪辑视频

## 一、为什么要自动化剪映

剪映是当下最好用的国产剪辑工具，但它的 GUI 是为「手动剪一条」设计的。当你需要**批量产出**（短剧每集十几条素材、课程视频几十个切片、模板化客户交付），手动点鼠标就成了瓶颈。

[JyWrapper](https://github.com/) 这套封装把剪映的核心操作暴露成 Python API：建工程、导素材、加字幕、TTS 配音、关键帧动画、特效、录屏、导出——全部脚本化。这篇文章讲它的实战用法和那些「文档不写但必踩」的坑。

## 二、架构：操作的是草稿文件，不是 GUI

剪映 v5.9+ 的工程是一个 `draft_info.json` 文件夹。JyWrapper 的本质是**直接读写这个 JSON**——不模拟点击、不依赖界面，所以：

- 剪映不用开着也能操作（导出除外）；
- 批量操作就是批量改 JSON，速度是 GUI 的几百倍；
- 可以版本控制、可以 diff、可以回滚。

代价是要摸清 JSON schema。好消息是封装层已经处理了。

## 三、核心能力清单

| 能力 | API / 脚本 |
| --- | --- |
| 建工程（支持自修复） | `JyProject("名字", overwrite=True)` |
| 素材导入（安全模式） | `project.add_media_safe(path, "0s")` |
| 智能配音 + 字幕对齐 | `project.add_narrated_subtitles(text, speaker=...)` |
| 文字 + 入场动画 | `project.add_text_simple(...)` |
| 特效/转场/滤镜检索 | `asset_search.py "复古" -c filters` |
| 关键帧动画 | `rules/keyframes.md` 一套 API |
| 录屏 + 智能变焦 | `tools/recording/recorder.py` |
| Web 页面录制成视频 | `web_recorder.py --url ... --duration 5` |
| 无头批量导出 MP4/SRT | `auto_exporter.py "草稿名" out.mp4 --res 1080 --fps 60` |
| 模板克隆 + 批量换物料 | `jy_wrapper.py clone --template "酒店模板" --name "客户A_副本"` |
| 草稿结构检查 | `draft_inspector.py list / summary / show` |

两个高阶玩法特别值得说：

**1. Web-to-Video**：`web_recorder.py` 录网页 + 关键帧动画，把 HTML 演示变成视频——做产品 demo 不用再开录屏软件。

**2. AI 解说视频一条龙**：`video_transcribe_and_match.py` 的流程是「转写视频 → AI 语义匹配 B-Roll → 自动组装草稿」——给它一条素材视频和一个故事板 JSON，出来的是剪好的片子。

## 四、配乐：从「默认音乐」到云端曲库

 skill 里带一套云端音乐库索引（`data/cloud_music_library.csv`，从你自己剪映草稿里同步来的）。实际项目的配乐流程是：按主题关键词检索（「科技」「温暖」）→ 推荐候选给用户选 → 而不是随手塞个默认音乐。**素材索引是资产**——`build_cloud_music_library.py` 把你在剪映里收藏过的 BGM 爬成可检索的库，用得越久越准。

## 五、工程纪律：脚本放项目里，别放 skill 里

这是 skill 明文规定的铁律：**剪辑业务脚本放项目根目录，绝不放进 skill 安装目录**。原因很实在——skill 目录要能随时 `git pull` 升级，业务代码混进去，一升级就是一团麻。这条纪律适用于所有「工具库 + 业务代码」的组合。

## 六、实战坑位

1. **分辨率默认横屏 1920×1080**：竖屏项目初始化时就要改，不然后面全部素材比例不对；
2. **草稿损坏用 overwrite=True 初始化触发自修复**，v5.9+ 架构才支持，老版本工程先升级；
3. **导出前先跑 `draft_inspector.py summary`**：草稿结构有问题时早发现，比等导出失败再排查快；
4. **批量导出用 robust_auto_export.py**：它带失败重试和断点，别自己写裸循环——导出到一半崩了，裸循环会从头再来。

## 七、和短剧流水线的衔接

这套自动化在短剧生产里的位置：ComfyUI 出完片段（mp4）→ GPU 后期处理 → **JyWrapper 批量组装成集**（多轨道、字幕、BGM、转场）→ 导出成片。人只需要在剪映里做最后的审美微调——机械劳动全在脚本里。

## 八、小结

剪映自动化的核心认知：**剪映的工程文件就是数据，数据就可以编程**。批量场景下，脚本化不是可选项。下一篇讲短剧创作里最「定性」的一环——怎么把剧本拆成视觉资产。

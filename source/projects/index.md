---
title: 项目集锦
date: 2026-10-16 16:30:00
---

下面是我近一年主导的几个项目，都遵循同一个原则：**先跑起来，再记录下来，最后提炼成可复用的方法**。每个项目都有完整的踩坑记录，深度文章在持续补充中。

<div style="display:flex;flex-wrap:wrap;gap:16px;margin:20px 0;">
  <div style="flex:1 1 45%;min-width:280px;border:1px solid var(--color-border-secondary,#49b1f5);border-radius:12px;padding:20px;">
    <h3 style="margin-top:0;">本地 27B 大模型推理环境</h3>
    <p>在 12G 显存的 Windows 笔记本上，部署并改造 Qwen3-27B 本地推理引擎（NInfer + KVMem），实现对话 / 工具双模式，全过程记录显存优化思路。</p>
    <p><strong>技术栈：</strong>NInfer、KVMem、Qwen3-27B、显存优化、sm_120 适配</p>
    <p><strong>状态：</strong>持续迭代中</p>
    <p><a href="/2026/05/12/cd37c220/">部署实战全文 →</a> ｜ <a href="/categories/%E5%A4%A7%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E4%B8%8E%E6%8E%A8%E7%90%86/">更多推理文章 →</a></p>
  </div>
  <div style="flex:1 1 45%;min-width:280px;border:1px solid var(--color-border-secondary,#49b1f5);border-radius:12px;padding:20px;">
    <h3 style="margin-top:0;">AI 短剧生产线</h3>
    <p>从长篇原著到竖屏成片的完整链路，十道工序，每道都有明确输入输出与机械核对：<br>
    <strong>创作链</strong>：原著拆解 → 改编契约 → 剧本 → 视觉资产 → 图片提示词<br>
    <strong>制作链</strong>：分镜与冻结关键帧 → 视频提示词 → 确认后生产 → 本地流水线 → 客观审核</p>
    <p><strong>技术栈：</strong>ComfyUI、MiniMax H3、Z-Image、提示词工程、OpenCV 审核、剪映自动化</p>
    <p><strong>状态：</strong>已形成 12 模块创作体系 + 本地生产流水线 + 客观自审机制</p>
    <p><a href="/2026/06/19/2f8d70b4/">原著拆解</a> ｜ <a href="/2026/03/05/97e175d3/">改编契约</a> ｜ <a href="/2026/03/28/5a4855a5/">剧本写法</a> ｜ <a href="/2026/05/28/5113c63a/">视觉资产</a> ｜ <a href="/2026/04/02/681c3f9b/">图片提示词</a></p>
    <p><a href="/2026/07/02/51c6e0a3/">分镜与审查</a> ｜ <a href="/2026/04/25/90252198/">视频提示词</a> ｜ <a href="/2026/06/08/cf2789e5/">确认后生产</a> ｜ <a href="/2026/06/01/e9c1f2b1/">生产流水线</a> ｜ <a href="/2026/07/09/3dfd6796/">客观审片</a></p>
    <p><a href="/2026/04/18/056c9188/">创作体系设计（12 模块）→</a></p>
  </div>
  <div style="flex:1 1 45%;min-width:280px;border:1px solid var(--color-border-secondary,#49b1f5);border-radius:12px;padding:20px;">
    <h3 style="margin-top:0;">RAGFlow 知识库实战</h3>
    <p>Docker 部署 RAGFlow，按文档类型调优解析与切块策略，用 REST API 把知识库操作封装成自动化流水线，全部结论来自实测排障。</p>
    <p><strong>技术栈：</strong>RAGFlow、Docker Compose、Python、检索调优</p>
    <p><strong>状态：</strong>已形成实战四部曲，持续更新</p>
    <p><a href="/2026/07/05/4643165f/">RAGFlow 实战四部曲 →</a></p>
  </div>
  <div style="flex:1 1 45%;min-width:280px;border:1px solid var(--color-border-secondary,#49b1f5);border-radius:12px;padding:20px;">
    <h3 style="margin-top:0;">内容生产自动化</h3>
    <p>把「主题 → 成稿 → 配图 → 公众号草稿」做成一条全自动链路：本地 ComfyUI 优先生图、云端兜底，Playwright 驱动持久化 profile 直通微信编辑器注入，最后一步扫码由人工完成。</p>
    <p><strong>技术栈：</strong>Playwright、ComfyUI、Z-Image、微信编辑器、Python</p>
    <p><strong>状态：</strong>已真实跑通并持续排障</p>
    <p><a href="/2026/05/06/7b0e5a91/">全自动流水线与 12 个坑 →</a> ｜ <a href="/2026/04/12/909224bc/">长视频转笔记 →</a> ｜ <a href="/2026/05/20/fddbeea9/">录屏逆向拆解 →</a></p>
  </div>
  <div style="flex:1 1 45%;min-width:280px;border:1px solid #888;border-radius:12px;padding:20px;opacity:0.75;">
    <h3 style="margin-top:0;">这个博客本身</h3>
    <p>Hexo 5 + Butterfly 主题，GitHub Actions 自动部署，Qexo 在线管理。从环境搭建、主题美化到自动化部署的全部过程都写在了「建站记录」分类里。</p>
    <p><strong>技术栈：</strong>Hexo、Butterfly、GitHub Actions、Qexo</p>
    <p><a href="/categories/建站记录/">查看相关文章 →</a></p>
  </div>
</div>

> 每个项目的完整复盘（架构图、踩坑记录、可复现步骤）会以系列文章形式发布，欢迎通过 [关于页](/about/) 里的联系方式找我交流。

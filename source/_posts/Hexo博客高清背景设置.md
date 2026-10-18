---
title: Hexo博客高清背景设置｜本地+图床双方案永久生效
date: 2023-12-15 10:30:00
tags:
  - Hexo
  - 博客搭建
categories: [建站记录]
abbrlink: "98f12680"
---
### ✅ 一、我的独家高清大图获取方法（超简单、零模糊）
```text
1. 将喜欢的壁纸设置为电脑桌面（全屏、干净无遮挡）
2. 使用 Win + Shift + S 进行全屏截图
3. 打开系统画图工具，粘贴并保存为 PNG 格式
4. 直接获得高清、无水印、自己最满意的背景图
```
优点：
不用找 Wallpaper Engine 源文件，不用解压、不用找目录、不用折腾提取
清晰度 = 你显示器分辨率，绝对高清，无压缩、无模糊
100% 还原你看到的桌面效果，不会踩坑

✅ 二、本地图片方案（永久不失效、推荐使用）
```text
1. 放入博客目录
路径：themes/butterfly/source/img/
图片命名：bg.png（必须这个名字，避免路径出错）

2. 修改主题配置 _config.butterfly.yml
# 全局背景（整个博客页面背景）
background: url(/img/bg.png)

# 首页头部大图（首页顶部Banner）
index_img: /img/bg.png
```

3. 强制 CSS 兜底（防止背景变灰、加载失败，必加
```yaml
inject:
  head:
    - '<style type="text/css">
        html, body, #web_bg {
          background: url(/img/bg.png) !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
        }
        #page-header {
          background-image: url(/img/bg.png) !important;
        }
      </style>'
```

4. 本地预览 & 部署命令（逐行执行）
```bash
hexo clean && hexo g && hexo s -p 8000  #本地预览下
hexo d
```

✅ 三、图床方案（不占 GitHub 空间、快速切换）
1. 上传图片到图床
推荐使用 imgchr、ibb、SM.MS 等免费图床，上传后获取 图片直链（不是分享链接），示例如下
```text
# 正确直链格式（示例，替换成你自己的图床直链）
https://i.ibb.co/xxxx/bg.png
```
⚠️ 注意：若出现「网页解析失败」报错，说明你复制的是图床分享链接，不是直链，重新获取图片直链即可。

2. 修改主题配置
```yaml
# 全局背景
background: url(https://i.ibb.co/xxxx/bg.png)

# 首页头部大图
index_img: https://i.ibb.co/xxxx/bg.png
```

3. 强制 CSS（防止图床图片加载失败、变灰）
```yaml
inject:
  head:
    - '<style>
        html,body,#web_bg{
          background:url(https://i.ibb.co/xxxx/bg.png) !important;
          background-size:cover !important;
          background-position:center !important;
          background-attachment:fixed !important;
        }
      </style>'
```

### ✅ 关键知识点与避坑指南
| 知识点 / 误区 | 说明 | 错误示例 | 正确做法 |
| :--- | :--- | :--- | :--- |
| 背景变灰色 | 主题默认遮罩 + 缓存未清理导致 | 只修改 index_img，不写强制 CSS | 必须在 inject 中添加 `!important` 强制 CSS |
| 图片模糊 | 图床压缩、使用预览图，或图片本身分辨率低 | 使用几 KB 的小图、图床预览图 | 用全屏截图生成的 PNG 高清图（几 MB 大小） |
| 切换页面背景消失 | Pjax 无刷新加载冲突，背景样式未重新执行 | 不写全局强制背景样式 | 保留 CSS 中 `html`、`body`、`#web_bg` 三个容器的背景设置 |
| 担心占 GitHub 空间 | 本地图片会占用仓库容量，担心 1G 免费额度不够 | 不敢用本地方案 | 一张 PNG 图仅几 MB，整个博客仓库通常几十 MB，完全够用 |
| 图床失效风险 | 第三方图床可能关闭、链接失效 | 只依赖图床方案，不做备份 | 优先使用本地方案；图床方案可备份图片到本地 |

📝 学习心得

背景是博客颜值的灵魂，很多人折腾半天背景不显示、模糊、加载失败，其实根本不用复杂操作。
我这套方法：桌面壁纸 → 全屏截图 → 本地部署，简单、稳定、高清、永久，新手也能一次搞定。本地图不依赖任何第三方，不用担心图床失效；图床方案不占 GitHub 空间，适合频繁换图的需求。
如果你也在用 Butterfly 主题，也在为背景图烦恼，直接照着本文操作，不用额外折腾，一次配置，永久生效，让博客瞬间拉满氛围感。

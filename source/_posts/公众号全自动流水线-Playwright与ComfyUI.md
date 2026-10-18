---
title: 🤖 从文本到公众号草稿：一条全自动流水线，和它踩过的 12 个坑
date: 2026-05-06 10:00:00
tags:
  - 视频剪辑
  - 工作流自动化
  - ComfyUI
  - 微信公众号
categories: [AI 工程化]
abbrlink: "7b0e5a91"
---

这条流水线的目标很朴素：**给一个主题，自动产出一篇文章 + 两张配图，
直接躺进公众号草稿箱等人来扫二维码**。

它最初的形态是从一段教学录屏里逐帧还原出来的。跑通之前我照着抄，
跑通之后发现**视频里教的三条关键做法，在这台机器和这个账号上全都不成立**。
下面记的是重写之后的版本，以及一路踩出来的坑。

## 一、整体链路

```text
Phase 0  素材获取   链接 / 纯文本 / 一句话主题 → 正文素材 + 数据出处清单
Phase 1  解读       原文 → 观点改写，产出 3 组核心句
Phase 2  选风格 + 配图   三套模板选一，生 2 张图（封面 2.35:1 + 插图）
Phase 3  生成 HTML   微信兼容的全内联样式 HTML
Phase 4  注入后台   Playwright 打开编辑器 → 标题 → 正文 → 存草稿
Phase 5  发表        弹窗链 → 二维码（人工扫码，绕不过）
```

前 4 个 Phase 全自动，第 5 步必须人来。这不是偷懒，是微信的硬性安全机制。

## 二、三条红线（踩过就别再踩）

### 红线 1：整个 Phase 4 只允许开一次浏览器

最早我用 `agent-browser` 分步执行：`launch` → `snapshot` → `click` → `keyboard`，
每一步一个调用。结果用户看到的体验是**浏览器窗口疯狂开合**，
反馈过来的原话是"浏览器一直闪退"。

原因很简单：每次调用结束都会 `close()`。同理，**不要写"每步一个脚本"的
playwright 片段**——每个脚本结束都会关掉浏览器，效果一样糟。

正确做法：所有动作塞进同一个脚本一次跑完：
打开浏览器 → 导航 → 注入标题 → 注入正文 → 粘图 → 保存草稿 → 截图 → 最后才 `close()`。

### 红线 2：没设封面就不要点发表

公众号缺封面图会直接卡住发不出去，表现为"点了发表没反应 / 反复回退到编辑器"。
脚本里的处理是：**封面没确认就直接退出（退出码 4），绝不硬点发表**。

注意"正文里有图"不等于"有封面"。这是两件事。

### 红线 3：判断编辑器是否就绪，别用 innerText

这是最隐蔽的一条。我最初写的是：

```python
if "请在这里输入标题" in page.inner_text("body"):
    # 进入编辑器了
```

**这行永远返回 false**。placeholder 文本在 `data-placeholder` 属性里，
根本不在 `innerText` 中。后果是脚本误判"没进编辑器" → 提前退出 →
下次重跑又开一个浏览器（正好是红线 1 的同一个坑，两个 bug 互相放大）。

正确写法：

```python
page.wait_for_selector('[data-placeholder*="请在这里输入标题"]')
len(page.query_selector_all('.ProseMirror')) >= 2
```

## 三、Phase 2：本地 ComfyUI 优先，云端兜底

配图需求是 2 张（封面 + 插图）。生图通路分成本地优先、云端兜底：

| 场景 | 走哪条路 |
| --- | --- |
| 本机 ComfyUI 开着（**先探 `8799`，再探 `8188`**） | 本地生图，不消耗云端额度 |
| 探测不到 | 自动 fallback 到云端 ImageGen（按张计费） |

本地通路会自动拉起 ComfyUI 并轮询等待就绪（最多 420 秒），
脚本结束后**进程独立运行不关闭**，可以一直复用。

### 本机不是"没模型"，是模型不在我找的地方

第一次跑本地通路，脚本报 `NO_TXT2IMG_MODEL`。我当时判断"本机没装文生图模型"，
切云端。这个判断是**错的**。

本机是 **Z-Image Turbo 的分离式架构**——模型不在 `models/checkpoints`，
而是拆在三个目录：

| 节点 | 本机实际模型 |
| --- | --- |
| `UNETLoader` | `z_image_turbo_bf16.safetensors` |
| `CLIPLoader` | **`qwen_3_4b.safetensors`**（type=`qwen_image`） |
| `VAELoader` | `qwen_image_vae.safetensors` |

用 `CheckpointLoaderSimple` 一体化加载，在分离式目录里取不到任何底模，
自然报"没模型"。**换成三个独立 Loader 就正常出图了**。

### CLIP 有三个，只有一个是对的

| CLIP | 后果 |
| --- | --- |
| `qwen_3_4b` ✅ | 2560 维，正常出图 |
| `qwen_2.5_vl_7b` ❌ | 3584 维，UNET 期望 2560，报 `Given normalized_shape=[2560] ... but got input of size[1, 74, 3584]` |
| `qwen3vl_32b` ❌ | 架构不配套，12G 显存直接 OOM |

### 蒸馏模型按 SD 的习惯调参会画糊

Z-Image Turbo 是 8 步蒸馏模型：**`steps=8`、`cfg=1.0`**。
按 SD 的老经验给 25 步、cfg 7，反而画得更糊。

### 任务失败了，队列里照样有记录

**任务报错时 `/history` 里依然有记录，只是 `outputs` 为空、`status.status_str='error'`**。
轮询时只判断"history 里有没有这条"会一直空转到超时。
我为此白等过 30 分钟，最后发现图早就失败了。

```python
# 必须检查这个字段
if entry["status"]["status_str"] == "error":
    raise ComfyUIError(entry["status"]["messages"])
```

### 两个环境坑

- **取 `/object_info/<Node>` 的模型列表**时，字段结构是 `[[a,b,c]]`（长度 1）
  或 `[[a,b],{opts}]`（长度 2）。只能判断 `v[0]` 是不是 list；
  写成 `len(v)==2` 会对 `unet_name` 取到空列表，误判"没模型"
- **本机开着系统代理时，访问 `127.0.0.1:8799` 必须绕过代理**（`ProxyHandler({})`），
  否则"明明开着却连不上"。反过来 `mp.weixin.qq.com` 走代理更稳——两者不要混

## 四、Phase 3：微信编辑器的 CSS 是白名单制

微信编辑器会把不认识的 CSS 直接过滤清空。所以：

**能用**：`color` `background-color` `font-size` `font-weight` `font-family`
`letter-spacing` `text-align` `text-indent` `line-height` `padding` `margin`
`border` `border-left` `border-bottom` `width` `max-width` `height` `vertical-align`

**会被过滤**：`@media`、`box-shadow`、`position`、`float`、`display:flex`、
`object-fit`、`gradient`、`transform`

而且 `<style>` 标签和 `class` 全部禁用，**所有样式必须写成元素上的内联 `style="..."`**。

### 图片：本地预览和注入后台，是两个版本

视频里教的是"图片一律 base64 内联"。本地预览确实方便：

```html
<img src="data:image/png;base64,iVBORw0...">
```

单机打开就能看效果。但**要注入公众号后台时，base64 会被编辑器直接过滤掉，图片全部消失**。

必须先把图片上传拿到 URL，正文里写：

```html
<img src="https://mmbiz.qpic.cn/...">
```

实操顺序：先注入带 `[配图]` 占位的正文把通路跑通，再回填真实 URL。

## 五、Phase 4：注入后台，一个脚本跑完

### 关键：编辑器 URL 必须带 `type=10`

视频教的是"首页点新的创作 → 选文章 / 图文消息"。
**实测未认证的个人订阅号，那个下拉里根本没有「图文消息」**。
这不是账号缺权限，是入口没显示出来。

可靠做法是直接用 URL 直达：

```
https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&type=10&lang=zh_CN&token=<TOKEN>
```

**不带 `type=10` 只会加载后台外壳、不进编辑器**，极易误判成"账号没权限"。
`goto` 之后要 `wait 8~10s` 等编辑器异步渲染。

顺带一句：账号显示"未认证"是个人主体的正常状态，
**不影响发图文**，不要为此去折腾认证。

### 标题和正文都是 ProseMirror，不是 input

```python
page.click('[data-placeholder="请在这里输入标题"]')
page.keyboard.type(TITLE, delay=30)
```

正文要用**模拟粘贴**（ProseMirror 的标准做法）：

```js
const cands = [...document.querySelectorAll('.ProseMirror')];
let el = cands.find(c => c.getBoundingClientRect().height > 40
                     && !(c.dataset.placeholder || '').includes('请在这里输入标题'));
el.focus();
const dt = new DataTransfer();
dt.setData('text/html', html);
dt.setData('text/plain', html);
el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
```

校验：注入后正文 `innerText.length` 应 > 500，否则说明没进去。

### 配图不用调素材库 API

用 Playwright 构造 `ClipboardEvent('paste')` + `DataTransfer.items.add(new File(...))`，
把 PNG 直接粘进正文的 `[配图1]` 占位处，编辑器会自动上传并生成 `mmbiz.qpic.cn` 的 URL。
实测 2/2 成功。

粘完有个必做的清理：**粘贴常常"只插图、不删占位文字"**，
残留的 `[配图1]` 会原样发出去。确认 mmbiz 图数达标后，
把文本恰好等于 `[配图N]` 且不含 img 的 `<p>` 直接 `remove()`。

### 弹窗按钮要倒序取

页面里同名按钮往往有好几份（页面上的 + 弹窗里的），弹窗的在 DOM 末尾。
正序 `locator.first` 会点中页面上那个，点了毫无反应。

另外别把 CSS 和 Playwright 语法混写，`a.xx, text=yyy` 会 parse error。

### 封面：hover 出来的，不是点出来的

封面区的菜单是 **hover 出来**的，直接点会一直报 `Element is not visible`。完整链路：

1. `page.hover(".js_cover_btn_area")` → 菜单出现
2. 点 `a.js_selectCoverFromContent`（从正文选择）
3. 选图：面板里的图是 `background-image`，**没有 `<img>` 标签**，
   要点容器 `li.appmsg_content_img_item`
4. 点「下一步」→ 进裁剪面板（2.35:1 消息列表 + 1:1 转发卡片两个预览）
5. 点「**确认**」——注意是"确认"不是"确定"，差一个字就点不中

判定封面是否成功，也要查 `getComputedStyle(el).backgroundImage`，
只查 `img[src*=mmbiz]` 会永远判定失败。

## 六、Phase 5：扫码这一步绕不过

发表链路：点「发表」→ 弹 `double_check_dialog` → 点「继续发表」→ **弹出二维码，
需管理员微信扫码**。

这是平台的硬性安全机制，任何自动化都绕不过。脚本该做的是：
检测到二维码 → 截图 → **停下来等用户扫**，不要傻等超时后关闭浏览器。

还有个反直觉的点：**停在二维码页的 playwright 浏览器窗口会被系统很快回收**
（报 `TargetClosedError`），别指望挂着窗口等扫码——直接截二维码图给用户扫就行。

发表成功也别只看页面提示，要去查「发表记录」页——**草稿箱里还在就说明没发出去**。
草稿列表可以直接取 JSON：`appmsg?...&action=list_ex&type=77` 返回的不是页面而是 JSON，
里面有 `appmsgid` / `title` / `cover`，用它定位比抓 DOM 稳得多。

## 七、还有几个小坑

- **构建后必须断言**：注入 HTML 里不含 `{{`，占位符数量与 `--images` 个数一致。
  改版时删了 `{{IMG1}}` 段落、剩下 `{{IMG2}}`，但替换代码只找 `{{IMG1}}`，
  结果注入版里原样带着 `{{IMG2}}` 三个字发出去
- **AI 生图的水印**：用图像处理的 erase 操作去掉，约 30-60 秒/张
- **"从正文选择"只能选正文里已有的图**。想用正文外的图做封面，
  得走「从图片库选择」→ 上传。若封面图与正文图相同，读者点开会看到重复图
- **慎用 `input[type=file] set_input_files` 兜底**：它会往正文里插图，多次触发会攒出重复图
- **GPU 被别的任务占着时**，提交的任务会一直 pending。先查 `/queue` 的 `queue_running`，
  有视频任务在跑就先等，别反复重提

## 八、小结

这条链路真正的价值不在"省了几步操作"，而在**把不稳定的部分固定下来**：

- 入口不稳定的 → 用 `type=10` 的 URL 直达
- 判断不稳定的 → 用 `data-placeholder` 属性而不是 `innerText`
- 图片通路不稳定的 → 用粘贴而不是 API
- 模型不稳定的 → 把本机实际架构写死成表

每一条都不是从文档里读来的，是跑失败一次记一条。
关于把这类经验固化成技能包的方法，见[另一篇](/2026/07/12/39c14077/)；
图传部分和短剧流水线共用同一套本地生图通路，见[那篇](/2026/06/01/e9c1f2b1/)。

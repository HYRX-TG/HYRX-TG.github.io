---
title: ComfyUI API 模式：把工作流变成可调用服务
date: 2026-09-05
categories:
  - AI 工程化
tags:
  - ComfyUI
  - API
  - 工作流
abbrlink: "c9d5e1c3"
---

> 经验驱动 + 诚实声明。下面的最小 Python 客户端按 ComfyUI 官方 API 规范编写，并用 `python -m py_compile` 做过语法校验；本机 ComfyUI 监听 8799，但探测 `/system_stats` 返回 502（经代理/未就绪），所以**没有真提交一次任务**。真跑只需先导出一份 API 格式工作流 JSON。

## 为什么要 API 模式

ComfyUI 默认是网页拖节点，但当你要**批量出图、接入自己的业务、或者包成服务**时，就得走 API 模式：把节点图导出成 JSON，用代码提交、轮询、取结果。本质是把"鼠标点的工作流"变成"可编程的服务"。

## 核心端点

| 端点 | 方法 | 作用 |
|------|------|------|
| `/prompt` | POST | 提交 workflow（API 格式 JSON），返回 `prompt_id` |
| `/history/{prompt_id}` | GET | 轮询任务状态与 outputs |
| `/view` | GET | 按 filename/subfolder/type 下载生成的图片 |
| `/ws` | WS | 实时收进度事件（可选） |

## 最小可调用客户端（真实代码）

```python
import json, urllib.request, urllib.error

BASE = "http://127.0.0.1:8799"

def queue_prompt(workflow: dict) -> str:
    req = urllib.request.Request(
        f"{BASE}/prompt",
        data=json.dumps({"prompt": workflow}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["prompt_id"]

def wait_result(prompt_id: str, timeout=600):
    import time
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE}/history/{prompt_id}", timeout=10) as r:
                hist = json.load(r)
            if prompt_id in hist:
                return hist[prompt_id]["outputs"]
        except urllib.error.HTTPError:
            pass
        time.sleep(2)
    raise TimeoutError("ComfyUI 任务超时")

# 用法：workflow = json.load(open("my_api_workflow.json"))
# pid = queue_prompt(workflow); outs = wait_result(pid)
```

> 校验：`python -m py_compile p2_comfy_client.py` 通过。

## 怎么拿到 workflow JSON

在 ComfyUI 网页里把节点图搭好 → 菜单 **"Save (API Format)"** 导出一份"API 格式"JSON（注意不是普通格式，API 格式里节点用数字 id、连线用 `links`）。这份 JSON 就是上面 `queue_prompt` 的输入。

## 扩展：包成 FastAPI 服务

把 `queue_prompt + wait_result` 封进一个 FastAPI 接口，前端传参数（提示词/种子/分辨率），后端提交 ComfyUI 并返回图片 URL——这就是把本地 ComfyUI 变成"可调用生图服务"的标准姿势。批量时再加个内存队列，避免并发把显存打爆。

## 小结

ComfyUI API 模式 = 导出 API 格式 JSON + `/prompt` 提交 + `/history` 轮询 + `/view` 取图。最小客户端只用标准库就能写；要做成生产服务，外面再套一层 FastAPI + 队列即可。诚实提示：本机 8799 当前不可达，真跑前请先确认 ComfyUI 已起且 `/system_stats` 正常返回。

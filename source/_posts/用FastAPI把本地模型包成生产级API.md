---
title: 用 FastAPI 把本地模型包成生产级 API
date: 2026-03-08 10:00:00
tags:
  - 大模型部署
  - AI 工程化
categories: [大模型部署与推理]
abbrlink: "49645212"
---

模型在本地能跑通只是第一步，**把它变成别人能稳定调用的服务**才是工程。我用 FastAPI 包过本地大模型推理，这篇讲怎么从「能跑」走到「生产可用」，以及几个必踩的坑。

## 一、为什么是 FastAPI

- 原生 `async`，天然适合「等模型推理」这种 IO/计算混合场景；
- Pydantic 做请求校验，接口边界清晰；
- 自带 OpenAPI 文档，联调省事；
- 生态成熟，容器化、中间件都很顺。

## 二、第一坑：模型必须全局单例加载

新手最容易犯的错误：把模型加载写进每个请求里。结果每个请求都重新加载一遍模型，**显存瞬间炸**。正确做法是模块级单例：

```python
# model.py —— 应用启动时加载一次
from transformers import AutoModelForCausalLM, AutoTokenizer
_model = None
_tok = None

def get_model():
    global _model, _tok
    if _model is None:
        _tok = AutoTokenizer.from_pretrained(MODEL_DIR)
        _model = AutoModelForCausalLM.from_pretrained(MODEL_DIR, device_map="auto")
    return _model, _tok
```

FastAPI 的 `lifespan` 或 `@app.on_event("startup")` 里预热一次即可，之后所有请求共享。

## 三、第二坑：推理要丢进线程池

PyTorch 推理大部分是 C++ 后端，但 Python 侧仍有 GIL 阻塞风险。用 `async def` 接口时，把同步推理包进 `run_in_threadpool`（或 `asyncio.to_thread`），否则一个慢请求会卡住整个事件循环：

```python
from fastapi.concurrency import run_in_threadpool
result = await run_in_threadpool(generate, prompt)
```

## 四、接口设计：校验比功能更重要

用 Pydantic 把请求框死，避免脏输入打挂模型：

```python
class Req(BaseModel):
    prompt: str = Field(..., max_length=4000)
    max_new_tokens: int = Field(512, ge=1, le=2048)
    temperature: float = Field(0.7, ge=0, le=2)
```

我线上出过的事：没限制 `max_new_tokens`，有人传个超大值直接把显存吃满。校验层是第一道防线。

## 五、流式输出：SSE 提升体验

长文本生成时，等全部生成完再返回，用户会觉得卡死。用 `StreamingResponse` + SSE 逐 token 推：

```python
@app.post("/stream")
async def stream(req: Req):
    def gen():
        for piece in generate_stream(req.prompt):
            yield f"data: {piece}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")
```

## 六、健康检查与容器化

- `/health` 返回模型是否就绪，K8s 探针靠它；
- 镜像里把模型放进挂载卷而不是打进镜像（镜像太大拉不动）；
- 资源限制要留足显存余量，否则 OOM 被 kill 还没日志。

## 七、和 llama.cpp / Ollama 怎么选

如果只是本地调用，Ollama 的 HTTP API 已经够用；要定制鉴权、限流、业务路由，才自己用 FastAPI 包一层。我的实践：Ollama 当推理后端，FastAPI 做「业务网关 + 校验 + 流式转发」。

## 小结

包模型服务的关键不是「能返回结果」，而是**单例加载、线程池、输入校验、流式、健康检查**这五件事做到位。把这五条讲清楚，面试官就知道你真的部署过，不是只跑过 demo。

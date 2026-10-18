---
title: RAGFlow 实战（四）：REST API 自动化——知识库管理、检索测试与问答脚本
date: 2026-08-08 10:00:00
tags:
  - RAG
  - AI 工程化
  - Python
  - 工作流自动化
categories: [RAG 与知识库]
abbrlink: "ad50c6b4"
---

# RAGFlow 实战（四）：REST API 自动化——知识库管理、检索测试与问答脚本

> 系列导航：（一）[部署、鉴权与排障](/2026/07/05/4643165f/)；（二）[文档解析实战](/2026/07/19/98ada51e/)；（三）[检索调参实录](/2026/07/26/ef5f6516/)；（四）本篇。

## 一、为什么要走 API

Web 界面适合探索，但下面这些场景必须脚本化：

- **批量上传**：几百篇文档逐个点页面不现实；
- **检索回归测试**：改切片参数/换 embedding 后，用固定问题集跑一遍，量化对比；
- **接入业务系统**：知识库问答能力嵌进自己的应用；
- **运维巡检**：定时检查文档解析状态、索引完整性。

RAGFlow 从 0.27 开始提供了新版 REST API（`/api/v1/`），覆盖知识库、文档、切片、检索、会话全链路。这篇给一套可直接改的 Python 客户端。

## 二、鉴权：先解决登录

新版 API 用 Bearer Token。两种拿法：

**方式一：账号密码登录换 token**

```python
import requests

BASE = "http://127.0.0.1:9380"  # 按你的部署改

def login(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/api/v1/user/login",
                      json={"email": email, "password": password})
    r.raise_for_status()
    data = r.json()
    # 注意：token 在 data 里，外层 code==0 才是成功
    if data.get("code") != 0:
        raise RuntimeError(f"login failed: {data}")
    return data["data"]["token"]

TOKEN = login("tangbotao@local.dev", "your_password")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
```

**方式二：API Key**（推荐长期自动化）：在 Web「用户设置」里生成 API Key，之后所有请求带 `Authorization: Bearer <api-key>`，不用管登录态过期。

**踩坑提醒**：RAGFlow 的登录响应是 `{code, message, data}` 三层结构，`code == 0` 才是成功——直接 `r.json()["token"]` 会 KeyError。密码忘了可以进容器用 `UserService.update_user_password` 重置（见系列第三篇）。

## 三、知识库与文档管理

```python
def create_dataset(name: str) -> str:
    r = requests.post(f"{BASE}/api/v1/datasets",
                      headers=HEADERS,
                      json={"name": name, "permission": "only_me"})
    r.raise_for_status()
    return r.json()["data"]["id"]

def upload_document(dataset_id: str, file_path: str):
    with open(file_path, "rb") as f:
        files = {"file": f}
        r = requests.post(
            f"{BASE}/api/v1/datasets/{dataset_id}/documents",
            headers=HEADERS, files=files)
    r.raise_for_status()
    return r.json()["data"]

def wait_parsing_done(dataset_id: str, doc_id: str, timeout=600):
    """轮询文档解析状态：pending → running → done"""
    import time
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(
            f"{BASE}/api/v1/datasets/{dataset_id}/documents",
            headers=HEADERS)
        docs = r.json()["data"]["docs"]
        doc = next(d for d in docs if d["id"] == doc_id)
        status = doc.get("progress", "").lower()
        if status == "done":
            return doc
        if status == "failed":
            raise RuntimeError(f"parse failed: {doc}")
        time.sleep(5)
    raise TimeoutError("parsing not finished")
```

**关键认知：解析是异步的**。上传接口只是投递任务，`progress` 从 0 爬到 1.0 才是真解析完。批量上传的脚本一定要带轮询和并发控制——一次性扔 500 个文档进去，Executor 和 ES 都会谢。

## 四、切片查看与调试

解析完成后，直接把文档的 chunk 拉出来审查——这是验证切片质量最直接的方式：

```python
def list_chunks(dataset_id: str, doc_id: str):
    r = requests.get(
        f"{BASE}/api/v1/datasets/{dataset_id}/documents/{doc_id}/chunks",
        headers=HEADERS, params={"page": 1, "page_size": 100})
    r.raise_for_status()
    return r.json()["data"]["chunks"]

chunks = list_chunks(dataset_id, doc_id)
for c in chunks[:3]:
    print(c["content"][:200])
    print("keywords:", c.get("important_kwd", []))
    print("---")
```

看什么：表格有没有被切断、条款完不完整、标题孤不孤悬——就是系列第二篇那套判断标准，只是从页面搬到了脚本里，可以批量审。

## 五、检索测试：改参数前的量化依据

```python
def retrieval_test(question: str, dataset_ids: list, top_k: int = 8):
    r = requests.post(f"{BASE}/api/v1/retrieval",
                      headers=HEADERS,
                      json={
                          "question": question,
                          "dataset_ids": dataset_ids,
                          "top_k": top_k,
                          "similarity_threshold": 0.2,
                      })
    r.raise_for_status()
    return r.json()["data"]["chunks"]
```

**用法**：准备 20~30 个「有标准答案」的问题，改任何配置（切片参数、embedding、混合检索权重）前后各跑一遍，对比命中率和答案完整度。RAG 系统调优最怕「感觉变好了」，这个脚本把感觉变成数字。

## 六、问答与会话

```python
def create_chat(name: str, dataset_ids: list) -> str:
    r = requests.post(f"{BASE}/api/v1/chats",
                      headers=HEADERS,
                      json={"name": name, "dataset_ids": dataset_ids})
    r.raise_for_status()
    return r.json()["data"]["id"]

def chat(chat_id: str, question: str, stream: bool = False):
    r = requests.post(f"{BASE}/api/v1/chats/{chat_id}/completions",
                      headers=HEADERS,
                      json={"question": question, "stream": stream},
                      stream=stream)
    r.raise_for_status()
    return r
```

流式响应按 SSE 解析（`data:` 前缀的行逐行读），非流式直接取 JSON。生产接入建议：**加超时、加重试、记录每次请求的 chunk 命中**——出问题时「检索到了什么」比「模型答了什么」更有排查价值。

## 七、小结

API 自动化的收益在三个地方：批量操作的效率、调优的量化依据、业务系统的集成能力。把这套脚本和系列第二篇的文档类型策略、第三篇的回归测试组合起来，就是一个完整的知识库工程化工作流。RAGFlow 系列到此收官，下一篇聊聊视频侧的 AI 工程化实战。

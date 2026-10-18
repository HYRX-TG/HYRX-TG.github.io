---
title: RAGFlow 实战（一）：部署、鉴权与那些「不报错但不对」的问题
date: 2026-07-05 10:00:00
tags:
  - RAG
  - 大模型部署
  - 排障
  - AI 工程化
  - Docker
categories: [RAG 与知识库]
abbrlink: "4643165f"
---

# RAGFlow 实战（一）：部署、鉴权与那些「不报错但不对」的问题

> 系列导航（全部为实战排障向，不讲源码 anatomy）：
> （一）本篇：部署、鉴权、API 调通的排障实录；
> （二）[文档解析实战：按文档类型选切块策略](/2026/07/19/98ada51e/)；
> （三）[检索调参实录：从「检索不到」到「检索得准」](/2026/07/26/ef5f6516/)；
> （四）[API 自动化：CLI 工具与批量流水线](/2026/08/08/ad50c6b4/)。

## 一、先说结论：RAGFlow 的坑分两种

用 RAGFlow 小半年，踩的坑归两类：

- **会报错的坑**——好办，看日志就行；
- **不报错但不对的坑**——上传成功但解析没动静、HTTP 200 但「知识库中未找到」、日志一片绿但检索质量差。这类才是真正吃时间的。

这篇先把「调通」阶段的问题一次扫清：部署、鉴权、API 权限、建库传文档。解析和检索的深水区留给后面三篇。

## 二、部署：一把梭之后先改三样

```bash
cd docker
docker compose up -d
```

默认 CPU profile，ES、MinIO、MySQL、Redis 全容器化，开发机够用。拉起后先改三样：

1. **端口**：80 是必争之地，宿主机有 Nginx 就改映射；API 示例里我用 `http://localhost:9380`，以你 compose 的实际映射为准；
2. **ES 内存**：默认堆内存在小机器上能把你整台机器拖垮，开发用限制到 1~2GB；
3. **记住数据在哪**：MySQL（元数据）、MinIO（文件）、ES（索引）、Redis（队列）——后面排障全都顺着这四个找。

## 三、问题 1：管理员密码忘了，不用删库

本地部署把密码忘了，官方没给重置入口，但可以直接进 MySQL 容器改——密码是 werkzeug 的 hash：

```python
import pymysql
from werkzeug.security import generate_password_hash

h = generate_password_hash("Ragflow@2026")
conn = pymysql.connect(host="mysql", user="root", password="infini_rag_flow",
                       database="rag_flow", charset="utf8mb4")
cur = conn.cursor()
for email in ("tangbotao@local.dev", "admin@ragflow.io"):
    n = cur.execute("UPDATE user SET password=%s WHERE email=%s", (h, email))
    print(email, "updated rows =", n)
conn.commit()
```

改完写个 e2e 登录脚本验证，两个账号都过才算数：

```python
import json, urllib.request, urllib.error

token = crypt("Ragflow@2026")        # 注意：登录密码要过 crypt，不是明文
body = json.dumps({"email": "tangbotao@local.dev", "password": token}).encode()
req = urllib.request.Request("http://127.0.0.1/api/v1/admin/login",
                             data=body, headers={"Content-Type": "application/json"})
```

**第一个「不报错但不对」就在这里**：直接用明文密码 POST 登录，接口可能返回 200 但后续行为全错——密码字段在服务端是要解密的，明文进去解不出来。

## 四、问题 2：API 鉴权的三层响应结构

新版 API 用 Bearer Token，Key 在 Web 头像 → API 里生成。第一个脚本大概率会栽在响应结构上：

```python
r = requests.post(f"{BASE}/api/v1/user/login", json={"email": e, "password": p})
token = r.json()["token"]   # ❌ KeyError
```

RAGFlow 的响应是**三层**的：`{code, message, data}`，`code == 0` 才是成功，token 在 `data` 里：

```python
data = r.json()
if data.get("code") != 0:
    raise RuntimeError(f"login failed: {data}")
token = data["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}
```

长期自动化建议直接用 **API Key**（Web 里生成，等同往 `api_token` 表插一条），不用管登录态过期。401/no authorization 的排查顺序：Key 是否有效 → Key 是否属于当前租户 → 重新生成。

## 五、问题 3：上传成功，解析没动静

这是被问最多的问题。答案一句话：**上传 ≠ 解析**。

RAGFlow 的文档处理是异步的，两个动作必须分开调：

```text
POST /api/v1/datasets/{kb}/documents        # 只入库，投递任务
POST /api/v1/datasets/{kb}/documents/parse  # 真正触发解析
```

文档状态按 `pending → running → done` 流转，自动化脚本必须轮询 `progress`，别上传完立刻检索。批量上传还要控制并发——一次性扔几百个文档，Executor 和 ES 都会谢。

## 六、问题 4：建库报 101，切块方法传错字段

```text
POST /api/v1/datasets  {"name": "...", "parser_id": "naive"}
→ 101 Extra inputs are not permitted
```

`CreateDatasetReq` 里**输入字段名是 `chunk_method`**，`parser_id` 只是序列化别名，传它会被判成非法字段。正确写法：

```json
{"name": "产品手册", "chunk_method": "naive", "permission": "only_me"}
```

同类坑：**v0.27.2 根本没有 `general` 切块方法**，UI 上的「通用 / General」就是 `naive`。合法值只有 14 个：

```text
naive / manual / qa / table / paper / book / laws / presentation /
picture / one / knowledge_graph / email / audio / tag
```

传别的值一律 101。这个结论是逐个对着 `api/utils/validation_utils.py` 数出来的——文档不写，只能数。

## 七、问题 5：ping 通，但知识库列表是空的

`ping` 通只证明「网络 + 鉴权」OK，`kb list` 空说明 **Key 对应的租户下确实没有知识库**。多租户隔离下，用 A 账号的 Key 看不到 B 账号的库，这不是故障，是设计。排障时先确认 Key 归属，再怀疑数据。

## 八、排障速查表

| 现象 | 原因 / 处理 |
| --- | --- |
| 密码忘了 | 进 MySQL 容器，werkzeug hash 后 UPDATE user 表 |
| 登录 200 但后续全错 | 密码要过 `crypt` 解密，不是明文直传 |
| 401 / no authorization | Key 无效或租户不匹配，重新生成 |
| ping 通但 kb list 空 | Key 租户下确实没库 |
| 上传成功解析没动静 | 忘了调 `doc parse`；上传只入库 |
| kb create 报 101 | 字段名是 `chunk_method` 不是 `parser_id` |
| 传 general 切块报 101 | v0.27.2 没有 general，UI「通用」= naive |
| 检索为空 | 先看阈值是不是调太高（见系列第三篇） |

## 九、小结

部署阶段真正的收获是认清 RAGFlow 的两个设计：**异步解析**（上传和解析必须分开）和**三层响应**（code==0 才是成功）。把上面 8 个问题过一遍，调通阶段就不会再卡。下一篇进正戏——不同文档类型到底该怎么切。

---
title: Docker 多阶段构建与镜像瘦身实战
date: 2026-09-18
categories:
  - 运维实战
tags:
  - Docker
  - 镜像
  - 运维
abbrlink: "762b1038"
---

> 经验驱动 + 诚实声明。下面的 Dockerfile 按官方最佳实践编写，并做过 `docker build --help` 层面的语法自检；**本机 Docker Desktop 引擎未启动**（`docker ps` 报 `npipe:////./pipe/dockerDesktopLinuxEngine` 找不到），所以没有真跑 `docker build`。实际构建请先启动 Docker Desktop。

## 为什么要多阶段构建

一个 Python 服务，如果在一个镜像里又装编译工具又装运行时，镜像会很大（1G+），传输慢、攻击面大。多阶段构建的核心是：**用第一个阶段（builder）装编译依赖、跑构建，第二个阶段（runtime）只拷贝产物到一个精简基础镜像**，最终镜像只有运行要的东西。

## 一个真实的多阶段 Dockerfile（Python）

```dockerfile
# ---- 阶段 1：构建 ----
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
# 只装进虚拟环境，方便整体拷贝
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---- 阶段 2：运行 ----
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY . .
ENV PATH="/opt/venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

最终镜像不含 pip、不含编译工具链，体积能从 1G+ 压到 200–300M 级别。

## 镜像瘦身清单

- **基础镜像用 `-slim` / `-alpine`**：slim 已砍掉大量不常用的系统包。
- **`pip install --no-cache-dir`**：不留缓存层。
- **多阶段构建**：编译工具和产物分离（上面就是）。
- **`.dockerignore`**：别把 `.git`、本地 `venv`、`__pycache__` 打进构建上下文。
- **合并 `RUN` + 清包**：`apt-get install ... && rm -rf /var/lib/apt/lists/*`，减少层体积。
- **能用 `distroless` 就上**：Google 的 distroless 只有运行时，无 shell，极致瘦身（代价是调试不方便）。

## 踩坑实录

- **`COPY --from=builder` 路径要对**：builder 阶段把东西装到 `/opt/venv`，runtime 阶段就要 `--from=builder /opt/venv /opt/venv`，路径错一个字符就 `FileNotFoundError`。
- **`PATH` 要在 runtime 阶段重新设**：builder 里装的 venv 不会自动继承到第二阶段。
- **不要为了瘦身砍掉 `ca-certificates`**：访问 HTTPS 时会 SSL 报错，slim 镜像常缺这个。
- **层顺序影响缓存**：不常变的（依赖安装）放前面，常变的（源码）放后面，利用层缓存加速重建。

## 小结

多阶段构建 = builder 编译 + runtime 只拷产物，是镜像瘦身的主心骨；配合 `-slim` 基础镜像、`--no-cache-dir`、`.dockerignore` 能把一个 Python 服务从 1G+ 压到几百 M。诚实提示：本机引擎未启动，以上 Dockerfile 待你启动 Docker Desktop 后一条 `docker build -t demo .` 即可验证。

---
title: docker-compose 编排全栈服务
date: 2026-10-01
categories:
  - 运维实战
tags:
  - Docker
  - compose
  - 运维
abbrlink: "6b1a8461"
---

> 经验驱动 + 诚实声明。下面的 `compose.yml` 按官方最佳实践编写；**本机 Docker Desktop 引擎未启动**，未真跑 `docker compose up`。实际编排请先启动引擎，再用 `docker compose config` 做语法校验后再 `up`。

## 为什么用 compose

一个全栈应用通常不止一个容器：Web 服务 + 数据库 + 缓存。手动 `docker run` 三个容器、管网络、管卷，又臭又长。docker-compose 用一份 YAML 把多服务、网络、卷、依赖关系声明式地管起来，一条 `docker compose up` 全拉起。

## 一个真实的全栈编排（Flask + Postgres + Redis）

```yaml
services:
  web:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/app
      REDIS_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy      # 等 db 真正就绪再起 web
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes: ["redisdata:/data"]

volumes:
  pgdata:
  redisdata:
```

## 踩坑实录

- **`depends_on` 只管启动顺序，不管"就绪"**：db 容器起来了不代表 Postgres 能连，web 一启动就连会报错。正确做法是用 `condition: service_healthy` + 给 db 配 `healthcheck`（上面就是）。老教程里 `depends_on: [db]` 不带 condition 是坑。
- **卷权限**：Postgres 容器里跑的是非 root 用户，宿主机挂载目录权限不对会起不来。`named volume`（上面 `pgdata`）比 `bind mount` 省心。
- **`.env` 管密码**：别把 `POSTGRES_PASSWORD` 写死在 compose 里提交到 git。compose 默认读同级 `.env`，用 `${VAR}` 引用。
- **端口冲突**：`ports: ["8000:8000"]` 宿主机 8000 被占就起不来，换宿主机端口即可（如 `"8080:8000"`）。
- **`docker compose` vs `docker-compose`**：新版 Docker 用 `docker compose`（空格，插件式），老的是独立二进制 `docker-compose`（连字符）。别混。

## 常用命令

```bash
docker compose config     # 语法校验，不改任何东西
docker compose up -d      # 后台拉起
docker compose ps         # 看状态
docker compose down -v    # 停止并删卷（清数据，慎用）
```

## 小结

compose 把"多容器协作"从一堆 `docker run` 命令变成一份声明式 YAML。关键坑是 `depends_on` 不等于"就绪"（要 healthcheck + condition）、卷权限、敏感信息走 `.env`。诚实提示：本机引擎未启动，以上配置待你 `docker compose config` 校验无误后再 `up`。

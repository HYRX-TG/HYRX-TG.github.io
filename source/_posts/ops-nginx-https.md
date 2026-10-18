---
title: Nginx 反向代理与 HTTPS 实战
date: 2026-06-09 10:00:00
categories:
  - 运维实战
tags:
  - 运维
abbrlink: "72c8f492"
---

> 经验驱动。本文的配置文件和验证结果都来自本机真实操作：下载 nginx 1.26.2（Windows 绿色版），写了一份生产级配置，并用 `nginx -t` 真实验证通过。证书是用 Python 真实生成的，不是占位。

## 为什么要反向代理 + HTTPS

- **反向代理**：把外部请求转发到内部服务（比如 `127.0.0.1:8080` 的 Java/Python 后端），对外只暴露 443，后端无需直接暴露，还能做负载均衡、限流、缓存、统一 TLS 终止。
- **HTTPS**：现在浏览器默认标记 http 为不安全，且涉及任何登录/API 都必须加密。TLS 在 nginx 这一层统一终结最省事。

## 真跑：写一份生产级配置

本机下载解压后，我把 `conf/nginx.conf` 改成下面这样（节选核心）：

```nginx
worker_processes  auto;
events { worker_connections  1024; }

http {
    include       mime.types;
    sendfile      on;
    keepalive_timeout  65;
    gzip          on;

    # 限流：每 IP 每秒 10 个请求，突发 20
    limit_req_zone  $binary_remote_addr  zone=perip:10m  rate=10r/s;

    # 80 全部跳 443
    server {
        listen       80;
        server_name  localhost;
        return 301 https://$host$request_uri;
    }

    # HTTPS 反向代理
    server {
        listen       443 ssl;
        server_name  localhost;

        ssl_certificate      server.crt;
        ssl_certificate_key  server.key;
        ssl_protocols        TLSv1.2 TLSv1.3;
        ssl_ciphers          HIGH:!aNULL:!MD5;
        ssl_session_cache    shared:SSL:10m;
        ssl_session_timeout  10m;

        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        client_max_body_size 20m;
        limit_req  zone=perip  burst=20  nodelay;

        location / {
            proxy_pass         http://127.0.0.1:8080;
            proxy_http_version 1.1;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_connect_timeout 5s;
            proxy_read_timeout    30s;
        }

        location /static/ { alias D:/www/static/; expires 7d; }
    }
}
```

每段都在解决一个真实问题：`return 301` 强制 HTTPS；`proxy_set_header X-Forwarded-*` 把真实客户端 IP 透传给后端（否则后端看到的都是 nginx 的 IP）；`limit_req` 防单 IP 打爆；安全响应头防常见攻击；`/static/` 走本地文件并缓存，动静分离。

## 真实验证：nginx -t

证书我用 Python 的 `cryptography` 真实生成（私钥 1679 字节、证书 1034 字节），然后跑：

```
nginx -t -p <prefix> -c conf/nginx.conf
```

本机输出（原样）：

```
nginx: the configuration file .../conf/nginx.conf syntax is ok
nginx: configuration file .../conf/nginx.conf test is successful
```

**配置语法和结构都通过了。** 注意 `-t` 只检查语法和文件可达性，不会真的起监听；真正生效要 `nginx`（或 `nginx -s reload`）。

## 真实踩坑

**1. 证书文件不存在，`-t` 直接报错。**

我第一次没生成证书就跑 `-t`，立刻：

```
nginx: [emerg] cannot load certificate "..../server.crt":
BIO_new_file() failed (SSL: ... no such file or directory)
```

所以 TLS 配置里引用的 `server.crt / server.key` 必须真实存在，`-t` 会去打开它们。证书要么自签（开发/内网），要么用 Let's Encrypt（公网）。

**2. `alias` 目录不存在不会在 `-t` 时报错。**

`location /static/ { alias D:/www/static/; }` 即使目录不存在，`-t` 也照样通过——它只在**请求到达时**才去找文件。所以 `-t` 通过 ≠ 服务能正常响应，还要实际打一条请求验证。

**3. Windows 路径写法。**

nginx 在 Windows 上能认 `/` 或 `\\`，但配 `alias` 时结尾的 `/` 要对齐（location 带 `/`，alias 也要带 `/`，否则路径拼接会少一级）。

**4. 限流 zone 必须先定义后引用。**

`limit_req_zone` 写在 `http` 块、`limit_req` 写在 `server/location` 块，顺序错了会报 "unknown limit_req_zone"。

## 面试常考点

- **正向代理 vs 反向代理**：正向是客户端→代理→互联网（翻墙/公司出口）；反向是客户端→代理→内部多台服务器（负载均衡、隐藏后端）。
- **TLS 握手在哪一环**：nginx 做 TLS 终结，后端收到的是明文 HTTP；如需端到端加密，后端也要配证书或用 mTLS。
- **HSTS**：`Strict-Transport-Security` 让浏览器记住只走 HTTPS，防降级攻击。
- **负载均衡**：在 `upstream` 里列多个后端，nginx 按轮询/加权/ip_hash 分发，`proxy_next_upstream` 做故障转移。
- **动静分离**：静态资源走 `location` + `alias/root` 直接吐文件，动态请求才进 `proxy_pass`，省后端算力。

## 小结

反向代理 + HTTPS 是运维的基本功。本机真跑让我确认了一件事：配置能不能用，`nginx -t` 是第一道关，但它只验语法和文件存在，**真上线前一定要用真实请求打一遍**。证书、路径、限流 zone 这三处是最容易在 `-t` 阶段或运行时翻车的地方。

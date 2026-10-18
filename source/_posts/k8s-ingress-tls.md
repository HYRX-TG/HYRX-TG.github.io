---
title: 用 Ingress + TLS 把集群服务安全暴露
date: 2026-07-01 10:00:00
categories:
  - 运维实战
tags:
  - Kubernetes
  - 运维
abbrlink: "6f8837eb"
---

> 经验驱动。把集群里的服务暴露给外部，且走 HTTPS，是 K8s 上线的最后一公里。同样先说明：本机 `kubectl` 客户端是 v1.36.1，但无集群，下方清单需在你的集群 `apply` 才能生效。我把一条可落地、含 TLS 终止的链路整理清楚，并标出几个本机外才会暴露的真实坑。

## Ingress 解决什么问题

- **Service(LoadBalancer)** 是四层（或者说靠云厂商给每个服务一个外部 IP），服务多了 IP 爆炸、还便宜不了。
- **Ingress** 是七层路由：按 `host` / `path` 把外部请求转发到不同 Service，并统一做 TLS 终止。一个公网 IP 就能承载多个域名/路径的服务。

> 前提（真实坑）：Ingress 资源**只是声明**，真正干活的叫 **Ingress Controller**（如 ingress-nginx）。没装控制器，你写了 Ingress 也不会有任何流量进来。这是新手最常被卡住的地方。

## 一条完整可用的链路

四件套：Deployment（业务） → Service（暴露业务） → Secret（TLS 证书） → Ingress（按域名路由 + TLS 终止）。

```yaml
# 1) 业务 Deployment
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 2
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
      - name: web
        image: nginx:1.26
        ports: [{ containerPort: 80 }]

# 2) Service 暴露
apiVersion: v1
kind: Service
metadata: { name: web-svc }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: 80 }]

# 3) TLS Secret（手动版；生产用 cert-manager 自动签发）
# kubectl create secret tls web-tls --cert=server.crt --key=server.key

# 4) Ingress 路由 + TLS 终止
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  ingressClassName: nginx
  tls:
  - hosts: ["blog.example.com"]
    secretName: web-tls
  rules:
  - host: blog.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-svc
            port: { number: 80 }
```

## 真实验证（无集群时怎么办）

本机没集群，我只能做 YAML 结构自检：给 `kubectl apply` 加 `--dry-run=client --validate=false`，能确认缩进/字段拼写/结构合法（注意必须 `--validate=false`，否则它会去 API server 下载 openapi 校验，本地没集群会报错）。**字段级、语义级的校验必须过真实集群的 api-server。**

## 真实坑（这些在真集群才会暴露）

1. **Ingress Controller 没装**：写了 Ingress 没流量，先 `kubectl get pods -n ingress-nginx` 确认控制器在跑。
2. **DNS 没指向控制器**：Ingress 的 host（如 `blog.example.com`）必须解析到 Ingress Controller 的外部 IP / LoadBalancer 地址，否则浏览器访问的是另一台机器。
3. **TLS Secret 证书和域名不匹配**：Secret 里的证书 Common Name / SAN 必须覆盖 Ingress 规则里的 host，否则 TLS 握手报证书不匹配。
4. **pathType 用错**：`Prefix` 是前缀匹配（含子路径），`Exact` 是精确匹配；混用会导致路由不符合预期。404 往往出在这。
5. **默认后端 / 兜底**：没匹配到规则的请求会走到 Ingress Controller 的默认后端，记得配一个友好的 404 页，别让用户看到控制器默认页。

## cert-manager：别再手动管证书

生产环境不要手敲 `kubectl create secret tls`，用 **cert-manager** 配一个 ClusterIssuer（Let's Encrypt 或内部 CA），它自动签发、续期 Secret，Ingress 里 `tls.secretName` 指向它即可，省掉证书过期的运维事故。

## 面试常考点

- **Ingress vs Service(LoadBalancer)**：前者七层、共享 IP、按 host/path 路由；后者四层、每服务一个 IP。
- **TLS 终止在哪**：在 Ingress Controller 上终止，后端 Service 收到明文 HTTP（如需端到端加密再给后端也配证书）。
- **canary / 灰度**：用注解（ingress-nginx 的 `nginx.ingress.kubernetes.io/canary`）把部分流量切到新版本，做金丝雀发布。
- **多域名 / 多路径**：一个 Ingress 可以写多条 rule，按 host 和 path 分别路由到不同 Service。

## 小结

用 Ingress + TLS 暴露集群服务，本质是"一个公网入口 + 七层路由 + 统一加密"。本机无集群，我把可落地的四件套 YAML 和一条 TLS 终止链路写清楚了，并标记了真集群才会踩的五个坑：**Ingress Controller 必须装、DNS 要对、证书域名要匹配、pathType 别用错、证书别手管（用 cert-manager）**。Ingress 资源只是声明，真正生效靠控制器——这一点记住，能省掉大半"为什么没流量"的排查时间。

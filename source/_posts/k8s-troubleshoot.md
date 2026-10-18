---
title: K8s 排错实战：Pod 起不来到存储挂载全链路
date: 2026-05-26 10:00:00
categories:
  - 运维实战
tags:
  - Kubernetes
  - 运维
abbrlink: "8d0c7349"
---

> 经验驱动。K8s 排错是 SRE 面试高频题。先说清一个本机真踩到的坑：我本机装了 `kubectl` 但没集群，一跑 `kubectl explain pod.spec` 直接报 `Unable to connect to the server: dial tcp [::1]:8080 ... refused`——**kubectl 只是客户端，排错第一步永远是确认 kubeconfig 和集群可达**。下文命令需在真实集群执行，我把它整理成一套可照做的链路。

## 先确认客户端与集群

```
kubectl version --client
# Client Version: v1.36.1  Kustomize Version: v5.8.1
```

`kubectl version --client` 不需要集群，能跑通说明客户端装好。要查集群侧，得有可用的 kubeconfig（`~/.kube/config` 或 `KUBECONFIG` 环境变量指向的上下文）。**这一步不通，后面全白搭**——很多"K8s 坏了"其实只是 kubeconfig 指错了上下文。

> 真实踩坑补刀：`kubectl explain` 和 `kubectl apply --dry-run=client` 也都要连 API server 下载 openapi 校验，本地没集群会报 "failed to download openapi"。所以"离线写清单"在没集群时只能靠 `--validate=false` 做 YAML 结构自检，真正的字段校验得过集群。

## 排错总链路：从状态到根因

Pod 起不来，按这个顺序查，基本不绕路：

1. **看状态**：`kubectl get pod -o wide` —— 状态决定下一步。
2. **看事件**：`kubectl describe pod <p>` —— Events 区是金矿（FailedScheduling / ImagePullBackOff / 探针失败 / 挂载失败）。
3. **看日志**：`kubectl logs <p>`；容器已重启过用 `kubectl logs <p> --previous` 拿上一世的日志。
4. **看资源/存储**：Pending 查节点资源与调度；数据卷查 PVC 绑定与挂载权限。

## 常见故障对照表

| Pod 状态 | 典型原因 | 关键命令 |
|---|---|---|
| `Pending` | 节点资源不足 / 调度约束不满足 / PVC 未绑定 | `describe pod` 看 Events；`kubectl get nodes -o wide`；`kubectl get pvc` |
| `ImagePullBackOff` | 镜像名拼错 / 私有仓库没配 `imagePullSecret` / 节点网络拉不到 | `describe pod` 的 Image 事件；核对镜像地址与 Secret |
| `CrashLoopBackOff` | 启动命令错 / 配置缺失 / 端口冲突 / 依赖服务没起 | `logs --previous` 看崩溃栈 |
| `OOMKilled` | `limits.memory` 太小或真泄漏 | `describe pod` 看 Last State / `OOMKilled`；调大 limits 或查内存 |
| `NotReady`（一直） | 就绪探针配错阈值/路径 | 核对 `readinessProbe` 的 path/port/initialDelay |
| `ContainerCreating` 卡住 | 存储卷挂载失败 / 拉镜像慢 | `describe pod` 看 Attach/Mount 事件；查 PVC/PV |

## 几个真实踩坑

1. **imagePullBackOff 多半是私有仓库没授权**：集群默认匿名拉公开镜像，私有镜像必须建 `imagePullSecret` 并挂到 `serviceAccount` 或 pod 的 `imagePullSecrets`。镜像名一个字符拼错也会落这。
2. **Pending 不一定是节点满了**：`nodeSelector` / `affinity` / `tolerations` 没匹配上也会 Pending，看 Events 里的 "0/N nodes are available" 那段能精确到原因。
3. **就绪探针配错最隐蔽**：`readinessProbe` 路径写错或 `initialDelaySeconds` 太短，Pod 会一直 `NotReady`，Service 不转发流量——应用其实跑了，但外面访问不到，容易被误判为"服务挂了"。
4. **存储挂载失败**：hostPath 要注意节点路径权限和 SELinux；PVC 要 `storageClassName` 与 `accessModes` 和 PV 对得上，否则卡在 `ContainerCreating`。
5. **OOMKilled**：Java 应用尤其容易，JVM 堆 + 元空间可能超过 limits；要么调大 limit，要么限制 JVM 堆为 limit 的 70%。

## 面试常考点

- **Pod 生命周期**：Pending → ContainerCreating → Running（含 PostStart）→ Succeeded/Failed；探针（liveness/readiness/startup）各自作用。
- **CrashLoopBackOff 怎么查**：先看 `logs --previous` 拿崩溃原因，再看 `describe` 的退出码与事件。
- **PVC 绑定机制**：PVC 按 `storageClassName` + `accessModes` + `size` 匹配 PV，绑定后独占（除非 `volumeMode`/回收策略允许）。
- **调度失败排查**：资源 request、节点污点容忍、亲和性三者共同决定可调度节点。

## 小结

K8s 排错的核心是把"起不来"翻译成一个可观测的状态，再顺藤摸瓜到 Events / 日志 / 资源。本机没集群让我确认了一条常被忽略的前提：**kubectl 是客户端，`explain`/`dry-run` 都要连 API server**，排错前先确认集群可达。Pending/ImagePullBackOff/CrashLoopBackOff/OOMKilled/NotReady 这五类状态各有一套固定打法，背熟这套对照表，面试和线上都能稳住。

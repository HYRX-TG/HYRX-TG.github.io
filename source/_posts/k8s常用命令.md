---
title: K8s 常用命令详解与速查
date: 2024-03-12T11:10:03.751747+00:00
updated: 2024-10-08T21:53:37.359+08:00
tags:
  - Kubernetes
  - 运维
categories: [运维实战]
abbrlink: "c17179e3"
---
### k8s常用命令

#### 前言：

这是一个用于管理 Kubernetes 集群的 kubectl 命令。让我们解释一下这个命令的各个部分：

* **kubectl**: 这是 Kubernetes 命令行工具，用于与 Kubernetes 集群进行交互，例如创建、管理和监视资源。
* **get**: 这是 kubectl 命令的一个子命令，用于检索（获取）Kubernetes 集群中的资源的信息。
* **svc**: 这是 "service" 的缩写，表示你希望获取服务（Service）的相关信息。
* **deploy**: 这是 "deployment" 的缩写，表示你希望获取部署（Deployment）的相关信息。
* **-n kube-system**: 这是一个标志（flag），用于指定要检索资源所在的命名空间（namespace）。在这种情况下，"-n kube-system" 表示你希望获取位于 kube-system 命名空间中的服务的信息。

**通过yml创建删除应用**

```bash
kubectl apply  -f kuboard-offline.yml
kubectl delete -f kuboard-offline.yml
kubectl apply  -f nginx-deployment.yml
```

**通过命令行创建应用**

```bash
# 查看帮助命令
kubectl create deployment --help
# 开始发布应用 指定名称是demo 镜像是nginx:1.7.9 副本数是3
kubectl create deployment demo --image=nginx:1.7.9 --replicas=3
#创建service暴露端口使用vip访问
kubectl expose deployment demo --port=80 --target-port=80 

kubectl create deployment nginx --image=registry.cn-hangzhou.aliyuncs.com/xiaohh-docker/nginx:latest
kubectl expose deployment nginx --port=80 --type=LoadBalancer
kubectl delete deployment nginx

# 创建service 
kubectl create -f nginx-service.yaml
# 查看暴露在外部的端口
kubectl get service/nginx-service

# 删除pod
kubectl delete deployment demo 
```

**暴露外部端口用于访问**

```bash
kubectl  patch svc kubernetes-dashboard -n kubernetes-dashboard \
-p '{"spec":{"type":"NodePort","ports":[{"port":443,"targetPort":8443,"nodePort":30443}]}}'

```

**查看pod详情**

```bash
# 查看命名空间为kube-system的pod详情
kubectl get pods -n kube-system
kubectl get pods -n kube-system -o wide
kubectl describe pod kubernetes-dashboard-7bdfc744fc-hmhh2 -n kube-system
# 获取位于 kube-system/kubernetes-dashboard 命名空间中的所有服务（Service）的信息。这将列出 kube-system 命名空间中所有服务的详细信息，包括服务的名称、类型、集群IP等。
kubectl get svc -n kube-system
kubectl get svc -n kubernetes-dashboard 
# 查看系统pod以外的pod详情/查看自己部署的应用
kubectl get pods -o wide
kubectl get deployments.apps
kubectl describe pods nginx-deployment-57c68fcd95-sgd25
# 查看demo应用（容器）service(svc)详细
kubectl describe service demo
# 查看节点状态
kubectl get nodes
kubectl get cs
# coredns组件用于做名称解析 主要是通过daemonsets.apps的形式在里面部署两个daemonset分别是kube-flannel-ds 和 kube-proxy
kubectl get daemonsets.apps -n kube-system
```

**登陆进入pod相当于docker exec**

```bash
# 登录容器查看volumes详情
kubectl exec -it volume-rbd-demo /bin/bash
kubectl exec -it volume-rbd-demo -- df -h
```

**部分命令完整写法**

```bash
$ kubectl get deployment --namespace=kubernetes-dashboard kubernetes-dashboard
# 或
$ kubectl describe deployment --namespace=kubernetes-dashboard kubernetes-dashboard
# 查看service
$ kubectl get service --namespace=kubernetes-dashboard kubernetes-dashboard 
返回
NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kubernetes-dashboard   ClusterIP   10.108.163.102   <none>        443/TCP   5m15s
# 另外查看pod状态 (此时说明安装完成
$ kubectl --namespace=kubernetes-dashboard get pod -o wide | grep dashboard
返回
dashboard-metrics-scraper-79459f84f-5g8h6   1/1     Running   0          5m34s   172.16.0.9   ceph1   <none>   
kubernetes-dashboard-76dc96b85f-nhwjd       1/1     Running   0          5m34s   172.16.0.8   ceph1   <none>
# 查看svc
kubectl -n kubernetes-dashboard get svc
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
dashboard-metrics-scraper   ClusterIP   10.104.31.122    <none>        8000/TCP   32m
kubernetes-dashboard        ClusterIP   10.108.163.102   <none>        443/TCP    32m
# 如果状态一直创建中, 使用describe查看具体过程 （如下回显则需要设置拉取镜像方法）
$ kubectl describe pod --namespace=kubernetes-dashboard
```

### 一.  开始

#### 1. 删除pod

```bash
# 查看pod
kubectl get pods -A
# 删除pod
# 检查 Pod 详细信息：首先，查看该 Pod 的详细信息以了解其状态和可能的原因。这将显示 Pod 的 YAML 配置文件，其中包括了当前的状态和其他详细信息。
kubectl get pod kuboard-cc79974cd-7xkpc -n kube-system -o yaml

# 删除 Pod：如果确定要删除该 Pod，可以使用以下命令：
请注意，强制删除可能会导致容器和相关资源无法正常终止，这可能会影响正在运行的应用程序。如果可能的话，最好先让 Pod 自行终止（通常需要一些时间），然后再尝试删除它。

kubectl delete pod kuboard-cc79974cd-7xkpc -n kube-system

# 检查删除结果：你可以再次使用 kubectl get pods 命令来确认该 Pod 是否已经被成功删除。

kubectl get pods -n kube-system

# 删除一个名为 nginx-deployment 的 Deployment

kubectl delete deployment nginx-deployment

# 如果你不确定具体需要删除哪些资源，使用查看相关资源，然后逐个删除。

kubectl get all --selector app=nginx 
```

文件启动的pod使用命令删除

```bash
# 删除文件启动的pod
kubectl delete -f nginxpod.yaml
```

#### 2. 删除pod的映射端口

```bash
# 查看映射端口
kubectl get svc
# 删除nginx映射的端口
kubectl delete svc nginx
```

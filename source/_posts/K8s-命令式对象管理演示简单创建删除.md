---
title: K8s 资源管理：命令式对象管理演示（创建与删除）
date: 2024-12-03T02:06:32.280210+00:00
updated: 2024-12-03T10:06:39.087+08:00
tags:
  - Kubernetes
  - 运维
categories: [运维实战]
abbrlink: "0487481c"
---
## 2、k8s资源管理\_命令式对象管理演示简单创建删除


## `k8s` 的资源管理方式

* **命令式对象管理：直接使用命令去操作 k8s 资源（参数 nginx-pod 为 pod 名称）**

kubectl run nginx-pod --image=nginx:1.17.1 --port=80

* **命令式对象配置：通过命令配置和配置文件去操作 k8s 资源 即将命令写到文件中类似于 docker-compose（参数 create/patch == 创建/更新 即要做的事是 通过文件 创建和更新 nginx-pod 要做的事情定义在 nginx-pod 文件中 ）**

nginx-pod.yaml文件

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev

---

apiVersion: v1
kind: Pod
metadata:
  name: nginxpod
  namespace: dev
spec:
  containers:
  - name: nginx-containers
    image: nginx:latest
```

**kubectl create/patch -f nginx-pod.yaml**

* **声明式对象配置：通过 apply 命令和配置文件去操作 k8s 资源（ apply 只用于创建和更新资源 即如果有则更新资源 无则创建资源 如删除则需要用 kubectl delete）**

**kubectl apply -f nginx-pod.yaml**

### 上述三种方式优缺点和应用场景


| **类型**           | **操作对象** | **适用环境** | **优点**           | **缺点**                             |
| ------------------ | ------------ | ------------ | ------------------ | ------------------------------------ |
| **命令式对像管理** | **对象**     | **测试**     | **简单**           | **只能操作活动对象，无法审计，跟踪** |
| **命令式对象配置** | **文件**     | **开发**     | **可以审计，跟踪** | **项目大时，配置文件多，操作麻烦**   |
| **声明式对象配置** | **目录**     | **开发**     | **支持目录操作**   | **意外情况下难以调试**               |

## 一. 命令式对象管理

kubectl命令

**kubectl 是 kuberbetes 集群的命令行工具，通过它能够对集群本身进行管理，并能够在集群上进行容器化应用的安装部署。kubectl命令的语法如下：**

**kubectl 【conmand】【type】【name】【flags】**

**conmand：**指定要对资源执行的操作、例如create、get、delete、apply

**type:** 指定资源类型，比如 deployment，pod，service

**name：**指定资源的名称 名称大小写敏感

**flags：**指定额外的可选参数

```bash
# 查看所有pod
kubectl get pod
# 查看某个pod
kubectl get pod pod_name
# 查看pod详细信息
kubectl get pod pod_name -o wide
# 以json形式显示
kubectl get pod pod_name -o json
# 查看某个pod以yaml方式显示结果
kubectl get pod pod_name -o yaml
```

**查询**`<span class="ne-text">pod</span>`

### `1.` 上方 commond`操作

**kubernetes允许对资源进行多种操作，可以通过--help查看详细的操作命令**

**kubectl --help**

**经常使用的操作有下面这些：**


| **命令分类**   | **命令**         | **翻译**                        | **命令作用**                     |
| -------------- | ---------------- | ------------------------------- | -------------------------------- |
| **基本命令**   | **create**       | **创建**                        | **创建一个资源**                 |
|                | **edit**         | **编辑**                        | **编辑一个资源**                 |
|                | **get**          | **获取**                        | **获取一个资源**                 |
|                | **patch**        | **更新**                        | **更新一个资源**                 |
|                | **delete**       | **删除**                        | **删除一个资源**                 |
|                | **explain**      | **解释**                        | **展示资源文档**                 |
| **运行和调试** | **run**          | **运行**                        | **在集群中运行一个指定的镜像**   |
|                | **expose**       | **暴露**                        | **暴露资源为 Service**           |
|                | **describe**     | **描述**                        | **显示资源内部信息**             |
|                | **logs**         | **日志输出容器在 pod 中的日志** | **输出容器在 pod 中的日志**      |
|                | **attach**       | **缠绕进入运行中的容器**        | **进入运行中的容器**             |
|                | **exec**         | **执行容器中的一个命令**        | **执行容器中的一个命令**         |
|                | **cp**           | **复制**                        | **在Pod内外复制文件**            |
|                | **rollout**      | **首次展示**                    | **管理资源的发布**               |
|                | **scale**        | **规模**                        | **扩(缩)容Pod的数量**            |
|                | **autoscale**    | **自动调整**                    | **自动调整Pod的数量**            |
| **高级命令**   | **apply**        | **rc**                          | **通过文件对资源进行配置**       |
|                | **label**        | **标签**                        | **更新资源上的标签**             |
| **其他命令**   | **cluster-info** | **集群信息**                    | **显示集群信息**                 |
|                | **version**      | **版本**                        | **显示当前Server和Client的版本** |

#### a. 演示上方操作如下

**①.基本命令**

**②.运行和调试**

* **kubectl expose deploy nginx --port=80 --target-port=80 --type=NodePort 暴露端口**
* **kubectl describe pod nginx-54b7d798b5-2cxdv 查看容器详细信息**

### `2.`**资源类型对应上方**``

`kubernetes`**中所有的内容都抽象为资源，可以通过下面的命令进行查看:**

**kubectl api-resources**

**经常使用的资源有下面这些：**


| **资源分类**      | **资源名称**                 | **缩写**    | **资源作用**        |
| ----------------- | ---------------------------- | ----------- | ------------------- |
| **集群级别资源**  | **nodes**                    | **no**      | **集群组成部分**    |
| **namespaces**    | **ns**                       | **隔离Pod** |                     |
| **pod资源**       | **pods**                     | **po**      | **装载容器**        |
| **pod资源控制器** | **replicationcontrollers**   | **rc**      | **控制pod资源**     |
|                   | **replicasets**              | **rs**      | **控制pod资源**     |
|                   | **deployments**              | **deploy**  | **控制pod资源**     |
|                   | **daemonsets**               | **ds**      | **控制pod资源**     |
|                   | **jobs**                     |             | **控制pod资源**     |
|                   | **cronjobs**                 | **cj**      | **控制pod资源**     |
|                   | **horizontalpodautoscalers** | **hpa**     | **控制pod资源**     |
|                   | **statefulsets**             | **sts**     | **控制pod资源**     |
| **服务发现资源**  | **services**                 | **svc**     | **统一pod对外接口** |
|                   | **ingress**                  | **ing**     | **统一pod对外接口** |
| **存储资源**      | **volumeattachments**        |             | **存储**            |
|                   | **persistentvolumes**        | **pv**      | **存储**            |
|                   | **persistentvolumeclaims**   | **pvc**     | **存储**            |
| **配置资源**      | **configmaps**               | **cm**      | **配置**            |
|                   | **secrets**                  |             | **配置**            |

**nodes**

* **kubectl get nodes 查询节点信息**

#### a. 下面以一个 `namespace / pod`的创建和删除简单演示下命令的使用：

**查看缩写命令：**`kubectl api-resources`

```plain
# 创建一个namespace
kubectl create namespace dev 
# 或者使用缩写 
kubectl create ns dev 
# 查看是否创建成功
kubectl get ns
# 创建一个pod在dev下面 不指定则会在default下面
kubectl create deployment nginx --image=registry.cn-hangzhou.aliyuncs.com/zznn/mycentos:nginx-latest -n dev
# 使用此命令创建的pod删除后会自动重建需要使用下方命令才能彻底删除
# 原因：当一个Pod被删除后，如果它是由一个ReplicaSet、Deployment或其他控制器管理的，那么控制器会自动创建一个新的Pod来替代被删除的Pod，以确保应用的可用性和副本数目的一致性。
kubectl delete deployment nginx -n dev
kubectl delete service nginx -n dev
```

**查看创建的pod详细信息**

```plain
# 查看dev 命名空间下面的pod
kubectl get pod -n dev
# 查看创建过程中的详细信息
kubectl describe pod nginx-54b7d798b5-9p97w -n dev
# 删除dev下面刚刚创建的pod
kubectl delete pod nginx-54b7d798b5-9p97w -n dev
# 此时查看发现还有 其实之前的我们已经删了 只是它又重新启动了一个而已
kubectl get pods -n dev
# 删除dev namespace(稍微等待一会儿) 
kubectl delete ns dev
# 查看ns 和 pod此时dev没了下面的pod也没了
kubectl get ns
```

![https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/24/12/image_cd93f06166727df2e0922f4a69f070b2.png](https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/24/12/image_cd93f06166727df2e0922f4a69f070b2.png)

![https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/24/12/image_f20d485db3208befe88b697a698fc5ca.png](https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/24/12/image_f20d485db3208befe88b697a698fc5ca.png)

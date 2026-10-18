---
title: K8s 实战：hostPath 持久化与 Headless Service 部署 MySQL 5.7
date: 2025-01-02T06:26:01.322506+00:00
updated: 2025-01-02T14:31:23.805+08:00
tags:
  - Kubernetes
  - 运维
categories: [运维实战]
abbrlink: "8ac9dfdb"
---
# hostpath存储类型及headlines类型的service版mysql5.7部署并构建webstack

## 一、headlines类型的service版mysql构建

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-cm
  namespace: dev
data:
  my.cnf: |
    !includedir /etc/mysql/conf.d/
    !includedir /etc/mysql/mysql.conf.d/
  
    [mysqld]
    ## 同一局域网内注意要唯一
    server-id=001
    ## 开启二进制日志功能,可以随便取（关键）
    log-bin=mysql-bin
  
    gtid_mode=on
    enforce_gtid_consistency=on
  
    relay-log=relay-log.log
    binlog_format=ROW
    #MySQL5.7可以不启用此参数,5.7版本使用了gtid_executed表记录同步复制的信息,避免两次写入relay-log和binlog,降低了从库磁盘I/O
    #log_slave_updates=true
    master_info_repository=TABLE
    relay_log_info_repository=TABLE
    sync_master_info=1
    slave_parallel_workers=2
    binlog_checksum=CRC32
    master_verify_checksum=1
    slave_sql_verify_checksum=1
    binlog_rows_query_log_events=1
    #replicate_do_db=tt
    #MySQL5.7新增加的值,配置基于表的组提交并行复制,默认值为database（基于库进行多线程复制,MySQL5.6是基于库的方式进行多线程方式复制）建议改为logical_clock,基于表的组方式复制,提高复制的效率
    slave_parallel_type=logical_clock
    #开启通用查询日志
    general_log=1
    #设置通用日志的输出格式为文件和表
    log_output=FILE,TABLE
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: dev
spec:
  selector:
    matchLabels:
      app: mysql # has to match .spec.template.metadata.labels
  serviceName: "mysql"
  replicas: 1 # by default is 1               # 3副本
  # minReadySeconds: 10 # by default is 0
  template:
    metadata:
      labels:
        app: mysql # has to match .spec.selector.matchLabels
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: mysql
        image: registry.cn-hangzhou.aliyuncs.com/zznn/mysql:5.7
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "root_password"  # 设置根密码,建议使用 Secrets 存储
        args:
          - --character-set-server=utf8mb4
          - --collation-server=utf8mb4_unicode_ci
        volumeMounts:
          - mountPath: /var/lib/mysql
            name: mysql-storage
          - name: config-map
            mountPath: "/etc/mysql/my.cnf"
            subPath: my.cnf
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: www
          mountPath: /var/lib/mysql
      volumes:
        # 定义 ConfigMap 类型的 Volume
        - name: config-map
          configMap:
            name: mysql-cm  # 引用名为 mysql-cm 的 ConfigMap

        - name: www
          hostPath: 
            path: /opt/webstack_db      # 宿主机目录  
            type: DirectoryOrCreate     # 目录存在就使用，不存在就先创建后使用


---
apiVersion: v1
kind: Service
metadata:
  name: service-mysql
  namespace: dev
spec:
  selector:
    app: mysql
  clusterIP: None  # service的ip地址,如果不写,默认会生成一个 此中即为headline类型的service
  type: ClusterIP
  ports:
  - port: 3306             # Service端口
    targetPort: 3306       # pod端口
```

**查看域名内部dns解析**

```bash
kubectl exec -it mysql-0 -n dev   -- /bin/sh 
ls
# bin  boot  dev  docker-entrypoint-initdb.d  entrypoint.sh  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
cat /etc/resolv.conf 
# search dev.svc.cluster.local svc.cluster.local cluster.local
# nameserver 10.96.0.10
# options ndots:5
```

**备注：域名规则 svc名称+ns名称+写死部分svc.cluster.local 即此headliness类型的pod域名方式访问应该是**

service-mysql.dev.svc.cluster.local

**验证（宿主机执行）：**

```bash
dig @10.96.0.10 service-mysql.dev.svc.cluster.local 
// 返回
root@k8s:/opt/webstack# dig @10.96.0.10 service-mysql.dev.svc.cluster.local

; <<>> DiG 9.11.3-1ubuntu1.18-Ubuntu <<>> @10.96.0.10 service-mysql.dev.svc.cluster.local
; (1 server found)
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 52747
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
; COOKIE: dd22da56f562b801 (echoed)
;; QUESTION SECTION:
;service-mysql.dev.svc.cluster.local. IN        A

;; ANSWER SECTION:
service-mysql.dev.svc.cluster.local. 30 IN A    172.16.0.9

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: Tue Dec 24 15:19:34 CST 2024
;; MSG SIZE  rcvd: 127

root@k8s:/opt/webstack# kubectl get pod -n dev -o wide
NAME      READY   STATUS    RESTARTS      AGE   IP           NODE   NOMINATED NODE   READINESS GATES
mysql-0   1/1     Running   0             18m   172.16.0.9   k8s    <none>           <none>
qexo-0    1/1     Running   1 (64m ago)   77m   172.16.0.6   k8s    <none>           <none>
```

![https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/25/1/image_bbf96436226c61db3ef129199d2968e5.png](https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/25/1/image_bbf96436226c61db3ef129199d2968e5.png)

**headlines类型的service集群之间通信直接使用svc名称**

![https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/25/1/image_d98ea5eb38a20aaf13987b58ab40b280.png](https://github.com/zznn-cloud/zznn-cloud-blog-images/raw/main/Qexo/25/1/image_d98ea5eb38a20aaf13987b58ab40b280.png)

## 二、webstack构建

```yaml
# 构建webstack
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webstack
  namespace: dev
spec:
  replicas: 1         # 修改为3副本
  selector:
    matchLabels:
      app: webstack   # 必须与 .spec.template.metadata.labels 匹配
  template:
    metadata:
      labels:
        app: webstack # 必须与 .spec.selector.matchLabels 匹配
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: webstack
        image: registry.cn-hangzhou.aliyuncs.com/zznn/mycentos:webstackv-1.2.2
        env:
        - name: LOGIN_COPTCHA
          value: "false"  
        - name: DB_HOST
          value: "service-mysql"  # 此处为headlines类型的service版mysql的地址
        - name: DB_DATABASE
          value: webstack  
        - name: DB_USERNAME
          value: root   
        - name: DB_PASSWORD
          value: root_password  
        - name: APP_URL
          value: "" # 空值明确写为 ""
        ports:
        - containerPort: 8000
          name: webstack
        command: ['/entrypoint.sh','serve']

# 暴露webstack端口
---
apiVersion: v1
kind: Service
metadata:
  namespace: dev
  name: webstack-service
spec:
  selector:
    app: webstack
  ports:
    - protocol: TCP
      port: 8000
      targetPort: 8000
  sessionAffinity: ClientIP
  type: NodePort # 将服务暴露为 NodePort 类型
```

成功！

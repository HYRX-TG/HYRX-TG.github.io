---
title: 新装Linux系统初始化标准步骤（极简实操版）
date: 2022-12-20 15:30:00
tags:
  - 运维
categories: [运维实战]
abbrlink: "56c76ec4"
---
---
对于运维人员而言，新装Linux系统（Ubuntu/CentOS等）后，一套标准化的初始化操作，是保障系统安全、稳定、高效运行的基础，更是后续部署服务（如Docker、K8s、Redis等）的前提。本文整理了极简版初始化步骤，摒弃冗余理论，聚焦实操，新手也能直接上手。

**核心原则**：安全优先、按需优化、兼顾兼容性，适用于2022年主流Linux发行版（CentOS 7/8、Ubuntu 20.04等）。

---

## 一、SSH安全配置（重中之重）

SSH是远程管理Linux的主要方式，也是系统安全的第一道防线，初始化首要优化SSH配置，避免未授权访问。

### 1. 设置SSH白名单

限制登录IP/网段，仅允许指定设备（如办公电脑、运维服务器）连接，从源头阻断非法访问。

**实操提示**：修改SSH配置文件 /etc/ssh/sshd_config，添加允许的IP/网段，禁止其他IP连接，配置后重启sshd服务生效。

### 2. 禁止root用户直接登录

root用户拥有系统最高权限，直接暴露在外风险极高。建议创建普通用户，通过普通用户登录后，再使用sudo命令提升权限，大幅提升系统安全性。

**实操提示**：同样在/etc/ssh/sshd_config 中修改相关参数，禁用root登录，重启sshd服务后生效，记得提前创建好具备sudo权限的普通用户。

---

## 二、系统基础设置（保障系统稳定运行）

基础设置主要解决系统默认配置的不足，适配后续服务部署需求，减少后续踩坑。

### 1. 关闭swap（容器/K8s必备）

swap分区会导致内存性能下降，而Docker、Kubernetes等容器服务对内存性能要求较高，初始化时需关闭swap，避免影响服务运行效率。

### 2. 关闭SELinux（CentOS专用）

SELinux是CentOS系统自带的安全机制，默认开启状态下，可能会拦截部分服务的正常运行（如端口访问、文件权限），对于新手或非极高安全要求的场景，建议关闭，降低运维复杂度。

**实操提示**：Ubuntu系统无SELinux，无需操作此步骤。

### 3. 修改ulimit（调大资源限制）

Linux默认的最大文件打开数、最大进程数较低，高并发场景下（如部署Web服务、数据库），容易出现“too many open files”等错误，需提前调大限制。

### 4. 更换国内yum/apt源

系统默认的官方源多为国外节点，下载软件速度慢、易超时。更换为国内阿里源、清华源等，可大幅提升软件下载速度和稳定性，后续安装工具、更新系统更高效。

**实操提示**：更换前建议备份原始源文件，CentOS使用yum管理，Ubuntu使用apt管理，需根据系统版本选择对应国内源配置，配置后刷新缓存即可生效。

### 5. 配置DNS

默认DNS可能存在解析慢、解析失败的问题，配置国内常用DNS（如阿里云DNS、114DNS），保证系统域名解析正常，避免因解析问题导致软件下载、服务访问失败。

---

## 三、安装常用工具（提升运维效率）

新装系统默认缺少常用运维工具，一次性安装以下工具，覆盖日常运维、开发、调试场景，无需后续反复安装。

```bash

python3 sshpass telnet vim wget curl unzip git gcc make lrzsz nmon smartmontools

```

### 工具说明（极简）

- vim：文本编辑（修改配置文件必备）；wget/curl：下载工具；

- git：代码版本管理；gcc/make：编译工具；

- lrzsz：本地与服务器文件互传；nmon：系统性能监控；

- python3：后续脚本运行、工具依赖；smartmontools：硬盘健康检测。

---

## 四、内核参数优化（sysctl，适配高并发场景）

Linux默认内核参数针对通用场景优化，对于高并发、大数据量、容器部署等场景，需调整内核参数，提升系统性能和稳定性，所有参数配置后需执行命令使其生效。

### 1. 开启IP转发（容器/K8s/软路由必备）

```bash

net.ipv4.ip_forward = 1

```

**作用**：允许本机作为路由器转发数据包，是Docker容器网络、Kubernetes Pod网络、软路由的核心前提，不开启会导致容器间、容器与外部网络无法通信。

### 2. 扩大临时端口范围

```bash

net.ipv4.ip_local_port_range = 1024 65535

```

**作用**：扩大本地临时端口（ephemeral ports）范围，高并发 outbound 连接场景（如网关访问后端服务），可有效防止端口耗尽，避免出现“Cannot assign requested address”错误。

### 3. TCP缓冲区优化

```bash

net.core.rmem_max、net.core.wmem_max

net.ipv4.tcp_rmem、net.ipv4.tcp_wmem

```

**作用**：优化TCP接收/发送缓冲区大小，允许TCP窗口自动调整到更大，适配高带宽延迟积（BDP）的网络环境，提升大文件传输吞吐量，减少丢包重传。

### 4. 高并发TCP优化（核心参数）

```bash

net.ipv4.tcp_tw_reuse = 1          # 复用TIME_WAIT端口，解决短连接卡顿

net.ipv4.tcp_fin_timeout = 30       # 缩短无效连接释放时间

net.core.somaxconn = 65535          # 增大监听队列，防流量突刺丢连接

net.ipv4.tcp_syncookies = 1         # 开启SYN防护，生产环境必开

net.ipv4.tcp_max_syn_backlog        # 增大半连接队列，支持高并发握手

```

### 5. 系统资源上限优化

```bash

fs.file-max                          # 提高文件描述符上限，防“too many open files”

fs.inotify.max_user_watches          # 提高文件监控上限，适配Prometheus/K8s

```

### 6. 内存相关优化（适配中间件/应用）

```bash

vm.overcommit_memory = 1            # 允许内存超分配，防Redis/Java被OOM误杀

vm.max_map_count = 262144           # 增加虚拟内存区域，ES/Java必备

```

---

## 五、总结

以上步骤是新装Linux系统的标准化初始化流程，覆盖安全、基础、工具、优化四大核心维度，适配2022年主流运维场景（容器部署、高并发服务、日常运维）。

### 实操建议

1.  所有配置建议做好备份，避免误操作导致系统异常；

2.  参数优化可根据实际场景调整，无需盲目照搬；

3.  配置完成后，重启相关服务或系统，确保所有设置生效。

后续可根据实际部署需求（如部署Docker、K8s、数据库等），补充对应专项配置，让系统更贴合业务场景。

---

```bash
# --- 网络转发 ---
net.ipv4.ip_forward = 1

# --- 端口范围 ---
net.ipv4.ip_local_port_range = 1024 65535

# --- 缓冲区大小 (单位：字节) ---
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
# TCP 缓冲区 (min default max)，单位：字节
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
# TCP 全局内存 (单位：页，4KB/page)，根据内存自动调整通常更好，这里给个经验值
# 假设 16GB 内存，约为 4000000 页。如果不确定，可以注释掉让内核自动管理
# net.ipv4.tcp_mem = 378000 504000 756000 

# --- TCP 协议优化 (关键！) ---
net.ipv4.tcp_fin_timeout = 30
# 开启时间戳 (有助于 RTT 计算)
net.ipv4.tcp_timestamps = 1
# 开启窗口缩放 (高性能必须！)
net.ipv4.tcp_window_scaling = 1
# 开启 SACK (丢包恢复必须！)
net.ipv4.tcp_sack = 1
# 开启 SYN Cookies (防攻击)
net.ipv4.tcp_syncookies = 1

# --- 队列与 backlog ---
net.core.netdev_max_backlog = 30000
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_max_orphans = 65536
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 2

# --- 内存与文件限制 ---
vm.overcommit_memory = 1
vm.max_map_count = 262144
fs.file-max = 2000000
fs.inotify.max_user_watches = 2000000

# --- TIME_WAIT 复用 ---
net.ipv4.tcp_tw_reuse = 1

# --- Keepalive (快速检测死链) ---
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 15

```
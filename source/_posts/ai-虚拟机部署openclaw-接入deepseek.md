---
title: 📘 OpenClaw本地部署指南
date: 2026-04-15
tags:
  - 工作流自动化
  - 大模型部署
  - 运维
categories: [大模型部署与推理]
abbrlink: "4eb8a61e"
---
# 📘 OpenClaw 本地部署指南（含 Web 登录 Token 详解）

## 📝 前言
本指南基于一台 Ubuntu 虚拟机/物理机的真实部署过程，整合了环境准备、一键脚本、常见陷阱与优化方案。无论你在虚拟机、闲置笔记本还是云服务器上部署，均可直接参考。

---

## 🧰 一、环境准备

### 1. 硬件与系统要求
| 维度 | 最低要求 | 推荐配置 |
| :--- | :--- | :--- |
| **CPU** | 2 核 | 4 核 |
| **内存** | 2 GB | 8 GB |
| **磁盘** | 10 GB 可用 | 40 GB SSD |
| **操作系统** | Ubuntu 20.04+ | Ubuntu 22.04/24.04 LTS |
| **网络** | 可访问外网 | 低延迟宽带（调用云端模型必需） |

### 2. 前置依赖
- curl, git, python3-pip
- Node.js ≥ 22（推荐用 nvm 管理）
- 一个大模型 API Key（腾讯云 TokenHub 或 DeepSeek 官方）

### 3. 网络提示
若在虚拟机中运行，建议使用桥接网络，让虚拟机获得局域网独立 IP，便于其他设备访问 Web 界面

## 二. 部署脚本
```bash
#!/bin/bash
# =============================================
# OpenClaw + DeepSeek (腾讯云) 一键部署脚本
# 适用：Ubuntu 20.04/22.04/24.04
# 用法：
#   export DEEPSEEK_API_KEY="sk-你的Key"
#   bash openclaw_deploy.sh
# =============================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------- 1. 安全获取 API Key ----------
if [ -z "${DEEPSEEK_API_KEY:-}" ]; then
    read -rsp "请输入 DeepSeek API Key（输入不显示）: " DEEPSEEK_API_KEY
    echo
fi
if [ -z "$DEEPSEEK_API_KEY" ]; then
    log_error "API Key 不能为空，请重新运行并设置。"
fi

DEEPSEEK_BASE_URL="${DEEPSEEK_BASE_URL:-https://tokenhub.tencentmaas.com/v1}"
MODEL_ID="${MODEL_ID:-deepseek-v4-pro}"
BIND_MODE="${BIND_MODE:-loopback}"   # 如需局域网访问改为 'lan'

# ---------- 2. 检查操作系统 ----------
if [ ! -f /etc/os-release ]; then log_error "不支持的非 Ubuntu 系统。"; fi
source /etc/os-release
if [ "$ID" != "ubuntu" ]; then log_error "仅支持 Ubuntu，当前：$ID"; fi
log_info "操作系统：$NAME $VERSION_ID"

# ---------- 3. 检查硬件 ----------
CPU=$(nproc); MEM=$(free -m | awk '/^Mem:/{print $2}'); DISK=$(df -m / | awk 'NR==2{print $4}')
log_info "CPU: ${CPU}核 | 内存: ${MEM}MB | 可用空间: ${DISK}MB"
[ "$CPU" -lt 2 ] && log_warn "CPU 核心少于 2，性能可能不足。"
[ "$MEM" -lt 1900 ] && log_error "内存不足 2GB，无法安装。"
[ "$DISK" -lt 5000 ] && log_error "磁盘空间不足 5GB。"

# ---------- 4. 更新系统并安装基础依赖 ----------
log_info "更新软件包列表..."
sudo apt update -qq
log_info "安装 git, curl, python3-pip, uuid-runtime..."
sudo apt install -y -qq git curl python3-pip uuid-runtime
pip3 install -q --user pandas openpyxl 2>/dev/null || true

# ---------- 5. 安装 Node.js 22 (通过 nvm) ----------
if ! command -v node &>/dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 22 ]; then
    log_info "安装 Node.js 22..."
    export NVM_DIR="$HOME/.nvm"
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22
    nvm alias default 22
fi
log_info "Node.js 版本：$(node -v)"

# ---------- 6. 安装 OpenClaw ----------
log_info "安装 OpenClaw..."
npm install -g openclaw@latest --registry=https://registry.npmmirror.com
log_info "OpenClaw 版本：$(openclaw --version 2>/dev/null || echo '安装完成')"

# ---------- 7. 生成网关 Token 并安全写入配置 ----------
log_info "生成网关 Token 并创建配置文件..."
GATEWAY_TOKEN=$(uuidgen)
mkdir -p ~/.openclaw

# 使用 Python 安全生成 JSON，避免特殊字符破坏结构
python3 <<PYEOF > ~/.openclaw/openclaw.json
import os, json
config = {
    "models": {
        "providers": {
            "deepseek": {
                "apiKey": os.environ["DEEPSEEK_API_KEY"],
                "baseUrl": os.environ["DEEPSEEK_BASE_URL"],
                "api": "openai-completions",
                "models": [{"id": os.environ["MODEL_ID"], "name": "DeepSeek-V4-Pro"}]
            }
        }
    },
    "gateway": {
        "mode": "local",
        "bind": os.environ["BIND_MODE"],
        "port": 18789,
        "auth": {
            "mode": "token",
            "token": os.environ["GATEWAY_TOKEN"]
        },
        "controlUi": {"enabled": True}
    }
}
json.dump(config, sys.stdout, indent=2)
PYEOF
chmod 600 ~/.openclaw/openclaw.json

# ---------- 8. 安装 systemd 服务（开机自启、故障重启）----------
log_info "配置 systemd 服务..."
SERVICE_FILE="/etc/systemd/system/openclaw-gateway.service"
sudo tee "$SERVICE_FILE" > /dev/null <<SYSTEMD
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER}
Environment="DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}"
Environment="DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL}"
Environment="MODEL_ID=${MODEL_ID}"
Environment="GATEWAY_TOKEN=${GATEWAY_TOKEN}"
Environment="BIND_MODE=${BIND_MODE}"
ExecStart=$(command -v openclaw) gateway
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway
sudo systemctl start openclaw-gateway

# ---------- 9. 健康检查（最多等待 30 秒） ----------
log_info "等待 Gateway 就绪..."
SUCCESS=0
for i in $(seq 1 15); do
    if curl -sf http://localhost:18789/ >/dev/null 2>&1; then
        SUCCESS=1
        log_info "Gateway 启动成功（HTTP 200）"
        break
    fi
    sleep 2
done
if [ "$SUCCESS" -eq 0 ]; then
    log_warn "Gateway 可能未就绪，请查看日志：sudo journalctl -u openclaw-gateway -f"
fi

# ---------- 10. 输出关键信息 ----------
IP_ADDR=$(hostname -I | awk '{print $1}')
echo ""
echo "=============================================="
echo "  OpenClaw 部署完成！"
echo "  本机终端对话：输入 openclaw 然后 talk to agent main"
echo "  Web 界面（本机）：http://localhost:18789"
[ "$BIND_MODE" = "lan" ] && echo "  局域网访问：http://${IP_ADDR}:18789"
echo ""
echo "  登录 Token 已保存在：~/.openclaw/openclaw.json"
echo "  查看 Token：grep -oP '\"token\":\\s*\"\\K[^\"]+' ~/.openclaw/openclaw.json"
echo ""
echo "  服务管理："
echo "    启动  : sudo systemctl start openclaw-gateway"
echo "    停止  : sudo systemctl stop openclaw-gateway"
echo "    状态  : sudo systemctl status openclaw-gateway"
echo "    日志  : sudo journalctl -u openclaw-gateway -f"
echo "=============================================="
```
### 1.📋 如何使用
```plaintext
1.生成新的 API Key
去腾讯云 DeepSeek 管理后台创建一个新的 API Key

2.下载脚本
将上面的脚本内容保存为 openclaw_deploy.sh，并赋予执行权限：
chmod +x openclaw_deploy.sh

3.运行脚本（推荐通过环境变量传入 Key）：
export DEEPSEEK_API_KEY="sk-你的新Key"
bash openclaw_deploy.sh

4.如果没有预先导出环境变量，脚本会停下来让你手动输入（输入时不会显示）。
可选调整：
需要局域网内其他设备访问 Web 界面，运行前设置 export BIND_MODE="lan"。

想更换模型或 Base URL，同样可以用环境变量覆盖，如 export MODEL_ID="其他模型id"。

5.部署后登录
浏览器打开 http://服务器IP:18789（若为 lan 模式）或 http://localhost:18789（本机）。
使用查看命令获取登录 Token 并填入登录框。

6.防火墙提醒
如果开放了局域网访问，建议限制来源 IP：
sudo ufw allow from 192.168.1.0/24 to any port 18789
sudo ufw enable
```

## 三. 登录 Token 详解
部署完成后，你会得到一串 UUID（如 17695f8b-...），这就是 Gateway 登录 Token。
### 1.两种 Token 的区别
<!-- markdownlint-disable MD013 -->
| 对比项         | DeepSeek API Key                     | Gateway 登录 Token                          |
| :------------- | :----------------------------------- | :------------------------------------------ |
| 用途           | 调用云端大模型，控制 AI 的“智力”     | 访问本地 Web 控制台，控制 AI 的“操作界面”   |
| 获取方式       | 在腾讯云 / DeepSeek 后台创建         | 脚本自动生成或手动 uuidgen                  |
| 存储位置       | 配置文件 apiKey 字段                 | 配置文件 gateway.auth.token 字段            |
| 暴露风险       | 被盗后会被恶意调用模型，产生费用     | 被盗后他人可操控你的 OpenClaw 执行本地任务  |

### 2.如何使用 Token？
浏览器打开 http://虚拟机IP:18789
若页面弹出登录框，直接粘贴该 Token
若页面空白，可在 URL 后带上 Token 参数：
http://192.168.x.x:18789/?token=你的Token

### 3.Token 丢失或忘记？
```bash
grep -oP '"token":\s*"\K[^"]+' ~/.openclaw/openclaw.json
```

## 四.常见问题与解决方法
<!-- markdownlint-disable MD013 -->
| 现象                                   | 原因                       | 解决                                                                 |
| :------------------------------------- | :------------------------- | :------------------------------------------------------------------- |
| 安装时提示 node version < 20           | 系统默认 Node.js 过低      | 用 nvm 安装 Node 22，并确保 node -v 输出正确                         |
| openclaw: command not found            | npm 全局路径未加入 PATH    | source ~/.bashrc 或手动创建软链接                                     |
| 进入 TUI 后看到 Crestodian，无法对话   | 默认进入管理界面           | 输入 talk to agent main 或 switch agent main                        |
| Gateway 启动失败：missing gateway.mode | 配置文件缺少网关字段       | 按本指南脚本重新生成配置文件                                         |
| auth or provider access failed         | Base URL 或 API Key 错误   | 检查 baseUrl 是否指向腾讯云；确认驼峰命名 apiKey                     |
| 浏览器打开 Web 界面空白                | JS 未加载或 Token 问题     | 使用无痕模式并附加 ?token=xxx；若从其他电脑访问，将 bind 改为 "lan"  |
| 虚拟机 NAT 网络，外部无法访问          | 虚拟机 IP 不可路由         | 改用桥接网络，或使用 SSH 隧道：ssh -L 18789:localhost:18789 user@虚拟机IP |
| Agent 处理表格时 ModuleNotFoundError: pandas | Python 缺少库          | pip3 install pandas openpyxl                                         |

## ⚡ 五、优化建议

### 1. 部署环境
优先物理机，其次桥接虚拟机。直接格掉旧笔记本装 Ubuntu，省去虚拟化损耗，文件共享也最简单（Samba 或直接本机桌面）。

### 2. 文件交互
搭建 Gradio/Streamlit 轻量页面上传，让客户通过网页上传 Excel，后端调 OpenClaw 处理，结果直接在页面展示和下载。

### 3. 安全加固
- API Key 不要硬编码在脚本中，改用环境变量或 Docker secrets
- Gateway Token 定期更换
- 避免 root 运行，创建专用系统用户

### 4. 自动化监听
在共享文件夹上设置 inotify 监听，一旦有新文件放入，自动触发 OpenClaw 处理并通知。

---

## 📚 学习心得
本次 OpenClaw 本地部署完整实践了从环境准备到服务上线的全流程，核心收获有三点：
- **环境管理**：使用 nvm 管理 Node.js 版本是避免依赖冲突的最佳实践
- **配置分离**：将 API Key 和 Token 与代码分离，提升安全性和可维护性
- **服务监控**：通过日志和健康检查确保 Gateway 稳定运行

OpenClaw 作为轻量级 AI 代理框架，非常适合快速搭建本地自动化工作流。后续可以在此基础上扩展更多功能，如多模型切换、自定义 Agent 插件和批量任务处理。

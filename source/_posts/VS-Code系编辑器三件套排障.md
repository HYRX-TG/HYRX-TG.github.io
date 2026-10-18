---
title: VS Code 系编辑器三件套：汉化、代理与第三方模型接入排障
date: 2026-08-15 10:00:00
tags:
  - 运维
  - 大模型部署
  - 排障
categories: [运维实战]
abbrlink: "0db3db8d"
---

# VS Code 系编辑器三件套：汉化、代理与第三方模型接入排障

## 一、先说共性：编辑器的坑全是「不报错但不对」

Cursor、Trae、Windsurf、VSCodium 这些 VS Code 系编辑器，配置上的坑有一个共同点：**静默失败**。汉化装了没生效、模型接了不生效、代理设了没用——全程没有任何报错，全靠你自己悟。这篇把三件事的排障一次讲清。

## 二、汉化：版本不匹配会被静默跳过

汉化的铁律：**语言包引擎要求的 VS Code 版本，必须被编辑器的内置版本满足，否则语言包被静默跳过**——界面不变中文，没有任何提示。

所以第一步不是下载语言包，是取编辑器内置的 VS Code 版本：

```powershell
(Get-Content '<安装目录>\resources\app\product.json' -Raw | ConvertFrom-Json).vscodeVersion
# 例：Cursor 3.21.13 -> vscodeVersion = 1.128.0
```

然后挑语言包：版本号前缀要匹配。`1.128.2026071013` 的 `engines.vscode` 是 `^1.128.0`，能装上；装最新版（如 1.131.x）在 1.128 上**直接失败**。

查扩展所有历史版本（WebClient + 代理，本机常开 10809）：

```powershell
$px = New-Object System.Net.WebProxy('http://127.0.0.1:10809', $true)
$wc = New-Object System.Net.WebClient; $wc.Proxy = $px
$wc.Headers.Add('Accept','application/json;api-version=3.0-preview.1')
$body = '{"filters":[{"criteria":[{"filterType":7,"value":"MS-CEINTL.vscode-language-pack-zh-hans"}]}],"flags":325}'
$j = ($wc.UploadString('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery','POST',$body)) | ConvertFrom-Json
$j.results[0].extensions[0].versions | ForEach-Object { $_.version }
```

下载 vsix 后用 `tar -xf` 解开（vsix 就是 zip），把 `extension\` 内容复制到 `<用户目录>\.cursor\extensions\<publisher>.<name>-<version>\`——**注意不要多套一层目录**。

### 启动两次才生效，别误判失败

手工装语言包后，**第一次重启没变中文是正常的**：启动瞬间主进程锁定界面语言，约 15 秒后扩展宿主才激活语言包并写出 `languagepacks.json`。再重启一次才生效。

判断成功看三个文件，三个都对但界面还是英文 → 再重启，别急着重装：

| 文件 | 成功的样子 |
| --- | --- |
| `<扩展目录>\extensions.json` | 列表里出现目标语言包 |
| `%APPDATA%\Cursor\languagepacks.json` | 出现 `"zh-cn"` 映射 |
| `%APPDATA%\Cursor\User\locale.json` | `{"locale":"zh-cn"}` |

### 一个认知前提：汉化覆盖不到 Agent 外壳

Cursor 3.x 的默认窗口是自研 Agent 外壳（New Chat / Automations / Customize），**语言包汉化不了它**，只能汉化点 `IDE ↗` 进去的编辑器窗口。汇报时提前说明，别让用户以为失败。

## 三、代理：编辑器自己发请求出不去

症状：日志里反复 `ConnectError: Client network socket disconnected`，AI 提问一直转圈。日志在 `%APPDATA%\<app>\logs\<时间戳>\window1\renderer.log`。

修复就一行 settings.json：

```json
{ "http.proxy": "http://127.0.0.1:10809" }
```

（`http.proxyStrictSSL: false` 仅当中转代理做了 TLS 中间人时才需要。）注意：国内 API（如 DeepSeek）可能被代理绕路，实测 DeepSeek 直连和走代理都通，以实测为准。

## 四、接入第三方模型：界面优先，逆向兜底

### 界面路径（最稳）

`Settings → Models → Add model`，勾 OpenAI Compatible。三个字段两个坑：

- Base URL：不同厂商对 `/v1` 前缀兼容不一样，**填之前先把四种组合打一遍**：

```text
GET  https://<host>/models          GET  https://<host>/v1/models
POST https://<host>/chat/completions  POST https://<host>/v1/chat/completions
```

四种全 200 → 填不带 `/v1` 的形式最保险（编辑器无论自己拼不拼 `/v1` 都能命中）。DeepSeek 2026-09 实测四种全通，填 `https://api.deepseek.com`。

- 模型名：**必须先跑一次 `/models` 拿真名**，别凭记忆填——模型名会变，旧名字可能仍可调用但已被映射到新模型。

```python
import os, urllib.request
req = urllib.request.Request('https://api.deepseek.com/models',
    headers={'Authorization': 'Bearer ' + os.environ['DS_KEY']})
print(urllib.request.urlopen(req, timeout=30).read().decode())
```

### 逆向出的存储机制（绕过界面时用）

把 Key 写进 `%APPDATA%\Cursor\User\globalStorage\storage.json` 的 `cursorAuth/openAIKey`，**下次启动编辑器会自己接管**（hydrate 逻辑发现加密档为空、明文存在，会自动升密写入加密档）。开关和模型列表在同目录 `state.vscdb` 的 ItemTable 里（键名 `reactiveStorageServiceImpl`，注意大小写，小写查不到）。

已验证可行的写入流程有五步，每步都是踩出来的：

1. **确认编辑器进程已退出**（运行时写入必被覆盖，SQLite 多进程写还有损坏风险）；
2. 备份 `storage.json`、`state.vscdb` 及其 `-wal`/`-shm`；
3. 写 `storage.json`；
4. sqlite3 更新后**必须 `PRAGMA wal_checkpoint(TRUNCATE)`**——不 checkpoint，`-wal` 里残留旧页可能把改动覆盖回去；
5. 回读校验 + 确认 `state.vscdb-wal` 变 0 字节才算干净。

### 能力门禁：必要不充分

`adminSettings.cached` 里 `byokDisabled=false` 只是允许自备 Key 的必要条件——免费档即使它是 false 也用不了。遇到「明明按教程做了还是不能用自己的 Key」，先确认订阅档位，别和「要不要国外手机号」混为一谈（内置模型由厂商代采，用户只需邮箱注册）。

## 五、排障速查

| 现象 | 原因 / 处理 |
| --- | --- |
| 汉化装了没生效 | 语言包版本不匹配被静默跳过；或只重启了一次 |
| 界面一半英文一半中文 | Agent 外壳汉化不了，正常 |
| AI 提问转圈 | settings.json 加 `http.proxy` |
| Key 验证不通 | 先跑四种 URL 组合，先拿 `/models` 真名 |
| 写了 storage.json 不生效 | 编辑器没退出 / 没 checkpoint WAL |
| 能接 Key 但 Tab 不走它 | Tab 补全可能仍走编辑器自带模型 |

## 六、小结

编辑器配置三件套的共同方法论：**所有「没生效」都先用文件系统验证**（三个 json 文件、storage.json、wal 大小），别用界面表现判断——界面会骗人，文件不会。下一篇讲 C 盘空间审计——同样是「只读先出报告」的排障思路。

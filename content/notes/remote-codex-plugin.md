---
title: VSCode远程连接服务器使用codex
slug: remote-codex-plugin
description: 使用 vscode 在远程服务器上使用 codex
date: 2026-10-14
tags: []
example: false
---
## 原理

## 步骤

### 1. 安装codex插件

在远程服务器安装codex插件。

![图片未加载，刷新一下试试](/assets/uploads/lnfhaluj54a-vrtr-tp2cb.png)



### 2. 上传auth.json

把 **C:\Users{用户名}\ .codex** 目录下的 **anth.json** 文件上传到远程服务器的 **.codex** 文件夹里。

### 3. 配置本地.ssh/config

打开本地 **C:\Users\27570\ .ssh** 目录下的 **config** 文件，添加以下信息：

```
Host connect.westd.seetacloud.com        # 连接名，随便写，方便识别就行
  HostName connect.westd.seetacloud.com  # 服务器ip
  Port 51968                             # 服务器端口号
  User root                              # 登陆服务器的用户名
  RemoteForward 15000 127.0.0.1:7897     # 把服务器的15000端口的请求转发到本地的7897端口
```

注意这里我选择的是 15000 端口，也可以选别的端口，只要不被其他进程占用就行。

### 4. 配置远程 VSCode 代理（让 Codex 走转发）

方法 1：快捷命令

1. 按 Ctrl + Shift + P 搜索：Preferences: Open Remote Settings (JSON)，点击打开，自动跳转到远程配置文件。
   按照下面的方式配置代理：

```
{
  // 远程VSCode代理地址（SSH转发的远程端口）
  "http.proxy": "http://127.0.0.1:15000",
  // 本地地址不走代理，避免冲突
  "http.noProxy": "localhost,127.0.0.1,::1",
  // 强制开启代理支持
  "http.proxySupport": "on"
}
```

保存配置。

### 5. 重启vscode

关掉 vscode 重新启动连接远程服务器。

### 6. 测试

打开codex插件进行登录。

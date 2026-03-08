# Enshan Surge Module

恩山论坛（https://www.right.com.cn/forum/）Surge 自动抓 Cookie + 每日签到模块。

## 文件结构

- `enshan_release.sgmodule`：Surge 模块
- `enshan_cookie_capture_qx.js`：抓取 Cookie
- `enshan_checkin_compatible.js`：定时签到

## 发布到 GitHub

建议仓库结构：

```text
enshan-surge/
├── enshan_release.sgmodule
├── enshan_cookie_capture_qx.js
├── enshan_checkin_compatible.js
└── README.md
```

## Raw 地址示例

把 `yourname` 改成你的 GitHub 用户名：

- 模块：
  `https://raw.githubusercontent.com/yourname/enshan-surge/main/enshan_release.sgmodule`
- 抓 Cookie 脚本：
  `https://raw.githubusercontent.com/yourname/enshan-surge/main/enshan_cookie_capture_qx.js`
- 签到脚本：
  `https://raw.githubusercontent.com/yourname/enshan-surge/main/enshan_checkin_compatible.js`

## 导入方式

把下面链接替换成你的真实 raw 地址后导入 Surge：

```text
https://raw.githubusercontent.com/yourname/enshan-surge/main/enshan_release.sgmodule
```

## 使用步骤

1. 上传三个文件到 GitHub 仓库根目录
2. 在 `enshan_release.sgmodule` 中把 `yourname` 改成你的 GitHub 用户名
3. 在 Surge 中导入模块
4. 打开恩山论坛并先登录一次
5. 访问论坛页面，脚本会自动抓取 Cookie
6. 等待 cron 自动签到

## 说明

- 登录带验证码，因此脚本只做签到，不做登录
- Cookie 失效后，重新打开恩山论坛页面即可重新抓取
- 默认签到时间是每天 08:00，可自行修改 `cronexp`

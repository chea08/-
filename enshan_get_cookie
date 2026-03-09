// 恩山论坛 - 获取 Cookie 脚本
// 使用方法：在浏览器/App 中访问 https://www.right.com.cn/forum/ 并登录账号
// Surge 会自动保存当前请求的 Cookie 到 key "enshan_cookie"

const cookie =
  $request.headers["Cookie"] ||
  $request.headers["cookie"] ||
  "";

if (cookie) {
  $persistentStore.write(cookie, "enshan_cookie");
  const preview = cookie.length > 120 ? cookie.slice(0, 120) + "..." : cookie;
  $notification.post("恩山 Cookie 获取成功", "", preview);
} else {
  $notification.post("恩山 Cookie 获取失败", "", "请求头中未发现 Cookie");
}

$done({});

/* 恩山论坛 Cookie 抓取 - Surge */
const KEY = 'enshan_forum_cookie';

function done(msg) {
  $notification.post('恩山论坛 Cookie', '', msg);
  $done({});
}

try {
  const headers = $request.headers || {};
  const cookie = headers.Cookie || headers.cookie || '';

  if (!cookie) {
    done('未获取到 Cookie，请先在浏览器中登录恩山论坛后再访问一次页面');
  } else {
    $persistentStore.write(cookie, KEY);
    done('Cookie 抓取成功，已保存到 Surge 持久化存储');
  }
} catch (e) {
  done(`抓取失败：${e.message || e}`);
}

/* 恩山论坛 Cookie 抓取 - Surge/Loon/QuanX 兼容 */
const KEY = 'enshan_forum_cookie';

function notify(msg) {
  if (typeof $notification !== 'undefined') {
    $notification.post('恩山论坛 Cookie', '', msg);
  } else if (typeof $notify !== 'undefined') {
    $notify('恩山论坛 Cookie', '', msg);
  }
}

function writeStore(key, value) {
  if (typeof $persistentStore !== 'undefined') return $persistentStore.write(value, key);
  if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(value, key);
  return false;
}

try {
  const headers = ($request && $request.headers) || {};
  const cookie = headers.Cookie || headers.cookie || '';
  if (!cookie) {
    notify('未获取到 Cookie，请登录后再次打开恩山论坛页面');
  } else {
    writeStore(KEY, cookie);
    notify('Cookie 抓取成功，已保存');
  }
} catch (e) {
  notify(`抓取失败：${e.message || e}`);
}

$done({});

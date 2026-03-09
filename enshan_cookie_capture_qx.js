/* 恩山论坛 Cookie 抓取 - Surge/Loon/QuanX 兼容 */
const KEY = 'enshan_forum_cookie';

function notify(subtitle, msg) {
  if (typeof $notification !== 'undefined') {
    $notification.post('恩山论坛 Cookie', subtitle || '', msg || '');
  } else if (typeof $notify !== 'undefined') {
    $notify('恩山论坛 Cookie', subtitle || '', msg || '');
  }
}

function writeStore(key, value) {
  if (typeof $persistentStore !== 'undefined') return $persistentStore.write(value, key);
  if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(value, key);
  return false;
}

function maskCookie(str) {
  if (!str) return '空';
  const len = str.length;
  if (len <= 16) return `${str.slice(0, 4)}***${str.slice(-4)}`;
  return `${str.slice(0, 8)}...${str.slice(-8)}（长度:${len}）`;
}

try {
  const headers = ($request && $request.headers) || {};
  const cookie = headers.Cookie || headers.cookie || '';
  const url = ($request && $request.url) || '未知页面';
  if (!cookie) {
    notify('获取失败', '未获取到 Cookie，请登录后再次打开恩山论坛页面');
  } else {
    writeStore(KEY, cookie);
    notify('获取成功', `Cookie 已保存\n来源：${url}\n预览：${maskCookie(cookie)}`);
  }
} catch (e) {
  notify('脚本异常', `抓取失败：${e.message || e}`);
}

$done({});

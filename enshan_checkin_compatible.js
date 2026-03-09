/* 恩山论坛签到 - Surge/Loon/QuanX 兼容 */
const COOKIE_KEY = 'enshan_forum_cookie';
const base = 'https://www.right.com.cn/forum';
const forumUrl = `${base}/forum.php?mobile=no`;
const signPageUrl = `${base}/erling_qd-sign_in.html?mobile=no`;
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

function notify(subtitle, msg) {
  if (typeof $notification !== 'undefined') {
    $notification.post('恩山论坛签到', subtitle || '', msg || '');
  } else if (typeof $notify !== 'undefined') {
    $notify('恩山论坛签到', subtitle || '', msg || '');
  }
}

function readStore(key) {
  if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
  if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
  return '';
}

function done(msg, subtitle = '执行结果') {
  notify(subtitle, msg);
  $done({});
}

function get(options) {
  return new Promise((resolve, reject) => {
    const fn = typeof $httpClient !== 'undefined' ? $httpClient.get : $task.fetch;
    if (typeof $httpClient !== 'undefined') {
      $httpClient.get(options, (err, resp, data) => err ? reject(err) : resolve({ resp, data }));
    } else {
      $task.fetch(options).then(resp => resolve({ resp, data: resp.body }), reject);
    }
  });
}

function post(options) {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient !== 'undefined') {
      $httpClient.post(options, (err, resp, data) => err ? reject(err) : resolve({ resp, data }));
    } else {
      options.method = 'POST';
      $task.fetch(options).then(resp => resolve({ resp, data: resp.body }), reject);
    }
  });
}

function match(re, text) {
  const m = (text || '').match(re);
  return m ? m[1] : '';
}

function htmlDecode(str) {
  return (str || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

const cookie = (typeof $argument !== 'undefined' && $argument ? $argument.trim() : '') || (readStore(COOKIE_KEY) || '').trim();
if (!cookie) {
  done('请先登录恩山论坛并触发 Cookie 获取脚本', '缺少 Cookie');
} else {
(async () => {
  try {
    const headers = {
      'User-Agent': ua,
      'Cookie': cookie,
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Referer': forumUrl
    };

    const home = await get({ url: forumUrl, headers });
    const homeHtml = home.data || '';
    const formhash = match(/name="formhash"\s+value="([^"]+)"/, homeHtml);
    const uid = match(/space-uid-(\d+)/, homeHtml);
    if (!formhash || !uid) return done('获取 formhash/uid 失败，Cookie 可能已失效', '签到失败');

    const sign = await post({
      url: `${base}/plugin.php?id=erling_qd%3Aaction&action=sign`,
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': base,
        'Referer': signPageUrl
      },
      body: `formhash=${encodeURIComponent(formhash)}`
    });

    const signText = (sign.data || '').replace(/\s+/g, ' ').trim();
    const profile = await get({ url: `${base}/home.php?mod=space&uid=${uid}&do=profile&mycenter=1&mobile=no`, headers: { ...headers, 'Referer': forumUrl } });
    const profileHtml = profile.data || '';

    const user = htmlDecode(match(/<h2[^>]*>\s*([^<]+)/, profileHtml)) || '未知';
    const group = htmlDecode(match(/用户组[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s, profileHtml)) || '未知';
    const esb = match(/恩山币<\/em>\s*(\d+)/, profileHtml) || '未知';

    let subtitle = '签到结果';
    let msg = `用户：${user}｜UID：${uid}｜用户组：${group}｜恩山币：${esb}`;
    if (/已签到|今天已经签到|already|success|签到成功/.test(signText)) {
      subtitle = '签到成功';
      msg = `签到完成，${msg}`;
    } else if (/未登录|登录|权限|失败/.test(signText)) {
      subtitle = '签到异常';
      msg = `签到响应异常，${msg}`;
    }
    done(msg, subtitle);
  } catch (e) {
    done(`执行失败：${e.message || e}`, '脚本异常');
  }
})();
}

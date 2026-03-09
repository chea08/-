/* 恩山论坛签到增强调试版 - Surge/Loon/QuanX 兼容 */
const COOKIE_KEY = 'enshan_forum_cookie';
const base = 'https://www.right.com.cn/forum';
const forumUrl = `${base}/forum.php?mobile=no`;
const signPageUrl = `${base}/erling_qd-sign_in.html?mobile=no`;
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

function notify(subtitle, msg) {
  if (typeof $notification !== 'undefined') {
    $notification.post('恩山论坛增强调试', subtitle || '', msg || '');
  } else if (typeof $notify !== 'undefined') {
    $notify('恩山论坛增强调试', subtitle || '', msg || '');
  }
}

function readStore(key) {
  if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
  if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
  return '';
}

function done(msg, subtitle = '调试结果') {
  notify(subtitle, msg);
  $done({});
}

function get(options) {
  return new Promise((resolve, reject) => {
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

function clean(text, max = 220) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, max) || '空';
}

function has(text, kw) {
  return (text || '').indexOf(kw) !== -1 ? '是' : '否';
}

function maskCookie(str) {
  if (!str) return '空';
  const len = str.length;
  if (len <= 16) return `${str.slice(0, 4)}***${str.slice(-4)}`;
  return `${str.slice(0, 8)}...${str.slice(-8)}（长度:${len}）`;
}

const cookie = (typeof $argument !== 'undefined' && $argument ? $argument.trim() : '') || (readStore(COOKIE_KEY) || '').trim();
if (!cookie) {
  done('未读取到 Cookie，请先执行 Cookie 获取脚本', '缺少 Cookie');
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
    const homeStatus = home.resp && (home.resp.status || home.resp.statusCode || home.resp.statusCode);
    const homeHtml = home.data || '';
    const title = clean(match(/<title>([\s\S]*?)<\/title>/i, homeHtml), 80);
    const formhash = match(/name="formhash"\s+value="([^"]+)"/, homeHtml);
    const uid = match(/space-uid-(\d+)/, homeHtml);

    const loginHints = [
      `含auth：${has(cookie, 'auth=')}`,
      `含saltkey：${has(cookie, 'saltkey=')}`,
      `含sid：${has(cookie, 'sid=')}`,
      `Cookie预览：${maskCookie(cookie)}`,
      `首页状态：${homeStatus || '未知'}`,
      `标题：${title || '未获取'}`,
      `含“立即登录”：${has(homeHtml, '立即登录')}`,
      `含“登录”：${has(homeHtml, '登录')}`,
      `含“您需要登录后才能使用签到功能”：${has(homeHtml, '您需要登录后才能使用签到功能')}`,
      `formhash：${formhash || '未获取'}`,
      `uid：${uid || '未获取'}`,
      `首页预览：${clean(homeHtml, 260)}`
    ];

    if (!formhash || !uid) {
      return done(loginHints.join('\n'), '首页解析失败');
    }

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

    const signStatus = sign.resp && (sign.resp.status || sign.resp.statusCode || sign.resp.statusCode);
    const signText = clean(sign.data, 260);

    const profile = await get({ url: `${base}/home.php?mod=space&uid=${uid}&do=profile&mycenter=1&mobile=no`, headers: { ...headers, 'Referer': forumUrl } });
    const profileStatus = profile.resp && (profile.resp.status || profile.resp.statusCode || profile.resp.statusCode);
    const profileHtml = profile.data || '';

    const user = clean(match(/<h2[^>]*>\s*([^<]+)/, profileHtml), 50) || '未知';
    const group = clean(match(/用户组[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s, profileHtml), 50) || '未知';
    const esb = match(/恩山币<\/em>\s*(\d+)/, profileHtml) || '未知';

    done([
      ...loginHints,
      `签到状态：${signStatus || '未知'}`,
      `资料状态：${profileStatus || '未知'}`,
      `用户：${user}`,
      `用户组：${group}`,
      `恩山币：${esb}`,
      `签到返回：${signText}`
    ].join('\n'), '完整调试信息');
  } catch (e) {
    done(`异常：${e.message || e}`, '脚本异常');
  }
})();
}

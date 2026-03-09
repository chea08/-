/* 恩山论坛签到调试版 - Surge/Loon/QuanX 兼容 */
const COOKIE_KEY = 'enshan_forum_cookie';
const base = 'https://www.right.com.cn/forum';
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function notify(subtitle, msg) {
  if (typeof $notification !== 'undefined') {
    $notification.post('恩山论坛签到调试', subtitle || '', msg || '');
  } else if (typeof $notify !== 'undefined') {
    $notify('恩山论坛签到调试', subtitle || '', msg || '');
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

function clean(text, max = 120) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, max) || '空';
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
      'Referer': `${base}/forum.php`
    };

    const home = await get({ url: `${base}/forum.php`, headers });
    const homeStatus = home.resp && (home.resp.status || home.resp.statusCode || home.resp.statusCode);
    const homeHtml = home.data || '';
    const formhash = match(/name="formhash"\s+value="([^"]+)"/, homeHtml);
    const uid = match(/space-uid-(\d+)/, homeHtml);

    if (!formhash || !uid) {
      return done(
        `首页状态：${homeStatus || '未知'}\nformhash：${formhash || '未获取'}\nuid：${uid || '未获取'}\n首页预览：${clean(homeHtml)}`,
        '首页解析失败'
      );
    }

    const sign = await post({
      url: `${base}/plugin.php?id=erling_qd%3Aaction&action=sign`,
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': base,
        'Referer': `${base}/erling_qd-sign_in.html`
      },
      body: `formhash=${encodeURIComponent(formhash)}`
    });

    const signStatus = sign.resp && (sign.resp.status || sign.resp.statusCode || sign.resp.statusCode);
    const signText = clean(sign.data, 200);

    const profile = await get({ url: `${base}/home.php?mod=space&uid=${uid}&do=profile&mycenter=1`, headers });
    const profileStatus = profile.resp && (profile.resp.status || profile.resp.statusCode || profile.resp.statusCode);
    const profileHtml = profile.data || '';

    const user = match(/<h2[^>]*>\s*([^<]+)/, profileHtml) || '未知';
    const group = match(/用户组[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s, profileHtml) || '未知';
    const esb = match(/恩山币<\/em>\s*(\d+)/, profileHtml) || '未知';

    done(
      `首页状态：${homeStatus || '未知'}\n签到状态：${signStatus || '未知'}\n资料状态：${profileStatus || '未知'}\nformhash：${formhash}\nuid：${uid}\n用户：${user}\n用户组：${group}\n恩山币：${esb}\n签到返回：${signText}`,
      '调试信息'
    );
  } catch (e) {
    done(`异常：${e.message || e}`, '脚本异常');
  }
})();
}

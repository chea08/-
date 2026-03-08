/*
恩山论坛签到 Surge 脚本

使用方式：
1. 可直接在脚本 argument 填 Cookie
2. 也可先通过获取 Cookie 的 rewrite 脚本保存，再由本脚本自动读取

说明：
- 只负责签到，不负责登录
- Cookie 失效后需要重新更新
*/

const COOKIE_KEY = 'enshan_forum_cookie';
const cookie = (($argument || '').trim()) || ($persistentStore.read(COOKIE_KEY) || '').trim();
const base = 'https://www.right.com.cn/forum';
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

if (!cookie) {
  done('缺少 Cookie：请先打开恩山论坛完成登录并触发获取 Cookie 规则');
}

function request(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (error, response, data) => {
      if (error) reject(error);
      else resolve({ response, data });
    });
  });
}

function post(options) {
  return new Promise((resolve, reject) => {
    $httpClient.post(options, (error, response, data) => {
      if (error) reject(error);
      else resolve({ response, data });
    });
  });
}

function match(re, text) {
  const m = text.match(re);
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

function done(message) {
  $notification.post('恩山论坛签到', '', message);
  $done({});
}

(async () => {
  try {
    const commonHeaders = {
      'User-Agent': ua,
      'Cookie': cookie,
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Referer': `${base}/forum.php`
    };

    const home = await request({
      url: `${base}/forum.php`,
      headers: commonHeaders
    });

    const homeHtml = home.data || '';
    const formhash = match(/name="formhash"\s+value="([^"]+)"/, homeHtml);
    const uid = match(/space-uid-(\d+)/, homeHtml);

    if (!formhash || !uid) {
      done('获取 formhash/uid 失败，Cookie 可能已失效');
      return;
    }

    const sign = await post({
      url: `${base}/plugin.php?id=erling_qd%3Aaction&action=sign`,
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': base,
        'Referer': `${base}/erling_qd-sign_in.html`
      },
      body: `formhash=${encodeURIComponent(formhash)}`
    });

    const signText = (sign.data || '').replace(/\s+/g, ' ').trim();

    const profile = await request({
      url: `${base}/home.php?mod=space&uid=${uid}&do=profile&mycenter=1`,
      headers: {
        ...commonHeaders,
        'Referer': `${base}/forum.php`
      }
    });

    const profileHtml = profile.data || '';
    const user = htmlDecode(match(/<h2[^>]*>\s*([^<]+)/, profileHtml)) || '未知';
    const group = htmlDecode(match(/用户组[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s, profileHtml)) || '未知';
    const esb = match(/恩山币<\/em>\s*(\d+)/, profileHtml) || '未知';

    let result = `用户：${user}｜UID：${uid}｜用户组：${group}｜恩山币：${esb}`;

    if (/已签到|今天已经签到|already|success|签到成功/.test(signText)) {
      result = `签到完成，${result}`;
    } else if (/未登录|登录|权限|失败/.test(signText)) {
      result = `签到响应异常，${result}`;
    }

    done(result);
  } catch (e) {
    done(`执行失败：${e.message || e}`);
  }
})();

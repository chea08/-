/* 恩山论坛签到 - 验证版 Surge/Loon/QuanX */
const COOKIE_KEY = 'enshan_forum_cookie';
const base = 'https://www.right.com.cn/forum';
const forumUrl = `${base}/forum.php?mobile=no`;
const signPageUrl = `${base}/erling_qd-sign_in.html?mobile=no`;
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

function notify(title, body) {
  if (typeof $notification !== 'undefined') $notification.post('恩山论坛签到', title, body);
  else if (typeof $notify !== 'undefined') $notify('恩山论坛签到', title, body);
}
function storeRead(k) {
  if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k) || '';
  if (typeof $prefs !== 'undefined') return $prefs.valueForKey(k) || '';
  return '';
}
function finish(title, body) { notify(title, body); $done({}); }
function http(method, options) {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient !== 'undefined') {
      $httpClient[method](options, (e, r, d) => e ? reject(e) : resolve({r:r || {}, d:d || ''}));
    } else {
      options.method = method.toUpperCase();
      $task.fetch(options).then(x => resolve({r:x, d:x.body || ''}), reject);
    }
  });
}
function cap(re, s) { const m = (s || '').match(re); return m ? m[1] : ''; }
function plain(s) { return (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function status(r) { return r.status || r.statusCode || ''; }
function text(s) { return plain(s).slice(0, 260); }
function parseJSON(s) { try { return JSON.parse(s); } catch (_) { return null; } }
function apiSuccess(s) {
  const data = parseJSON(s);
  if (!data) return false;
  const msg = JSON.stringify(data);
  return !/(失败|错误|未登录|权限|验证码)/.test(msg) && /(签到成功|已经签到|已签到|success)/i.test(msg);
}
function signedButton(s) {
  return /id=["']signin-btn["'][^>]*>[\s\S]{0,80}?(已签到|今日已签到|已经签到)/i.test(s)
    || /class=["'][^"']*(?:signed|signin)[^"']*["'][^>]*>[\s\S]{0,80}?(已签到|今日已签到|已经签到)/i.test(s);
}
function unsignedButton(s) {
  return /id=["']signin-btn["'][^>]*>[\s\S]{0,80}?(签到|立即签到)/i.test(s)
    && !signedButton(s);
}

const cookie = (typeof $argument !== 'undefined' && $argument ? $argument.trim() : '') || storeRead(COOKIE_KEY).trim();
if (!cookie) finish('缺少 Cookie', '请先登录恩山论坛并触发 Cookie 获取脚本');
else (async () => {
  try {
    const headers = {
      'User-Agent': ua, 'Cookie': cookie,
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Referer': forumUrl
    };
    const home = await http('get', {url: forumUrl, headers});
    const homeHtml = home.d;
    const formhash = cap(/name=["']formhash["']\s+value=["']([^"']+)["']/i, homeHtml);
    const uid = cap(/space-uid-(\d+)/, homeHtml);
    if (!formhash || !uid) finish('未登录或页面异常', `首页状态：${status(home.r)}\n未获取 formhash/uid\n标题：${cap(/<title>([\s\S]*?)<\/title>/i, homeHtml) || '未知'}`);
    else {
      const before = await http('get', {url: signPageUrl, headers});
      if (/您需要登录后才能使用签到功能|请先登录/.test(plain(before.d))) {
        finish('Cookie 未生效', '签到页仍显示需要登录');
      } else {
        const sign = await http('post', {
          url: `${base}/plugin.php?id=erling_qd%3Aaction&action=sign`,
          headers: {...headers, 'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8', 'Origin':base, 'Referer':signPageUrl},
          body: `formhash=${encodeURIComponent(formhash)}`
        });
        const after = await http('get', {url: signPageUrl, headers});
        const signBody = plain(sign.d);
        const afterBody = plain(after.d);
        const verified = apiSuccess(sign.d) || signedButton(after.d);
        const stillUnsigned = unsignedButton(after.d);
        const user = plain(cap(/<h2[^>]*>\s*([^<]+)/i, after.d)) || '未知';
        const coins = cap(/恩山币<\/em>\s*(\d+)/i, after.d) || '未知';
        if (verified && !stillUnsigned) finish('签到成功（已验证）', `用户：${user}\n恩山币：${coins}\n接口状态：${status(sign.r)}\n返回：${text(sign.d)}`);
        else finish('签到未确认', `POST状态：${status(sign.r)}\n提交返回：${text(sign.d)}\n复查状态：${status(after.r)}\n签到按钮已完成：${signedButton(after.d) ? '是' : '否'}\n复查仍可签到：${stillUnsigned ? '是' : '否'}\n复查页面：${text(after.d)}`);
      }
    }
  } catch (e) { finish('脚本异常', `${e.message || e}`); }
})();

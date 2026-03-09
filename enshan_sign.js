// 恩山论坛 - 自动签到脚本（Surge）
// 依赖：已通过 enshan_get_cookie.js 抓到 Cookie，保存在 key "enshan_cookie"

const SIGN_URL =
  "https://www.right.com.cn/forum/plugin.php?id=erling_qd:action&action=sign";
const SIGN_IN_PAGE_URL =
  "https://www.right.com.cn/forum/erling_qd-sign_in.html";

// 默认 UA，如有需要可改成自己的浏览器 UA
const DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// ======= HTTP 封装 =======

function httpGet(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (err, resp, data) => {
      if (err) reject(err);
      else resolve({ resp, data });
    });
  });
}

function httpPost(options) {
  return new Promise((resolve, reject) => {
    $httpClient.post(options, (err, resp, data) => {
      if (err) reject(err);
      else resolve({ resp, data });
    });
  });
}

// ======= 工具：位运算 & 解析 WAF JS =======

function rotl8(x, r) {
  x &= 0xff;
  r &= 7;
  return ((x << r) & 0xff) | (x >> (8 - r));
}

function rotr8(x, r) {
  x &= 0xff;
  r &= 7;
  return (x >> r) | ((x << (8 - r)) & 0xff);
}

function extractOO(html) {
  const m = html.match(/oo\s*=\s*\[([^\]]+)\]/);
  if (!m) return null;
  const tokens = m[1].match(/0x[0-9a-fA-F]+|\d+/g);
  if (!tokens) return null;
  return tokens.map((t) =>
    /^0x/i.test(t) ? parseInt(t, 16) : parseInt(t, 10),
  );
}

function extractWi(html) {
  let m = html.match(/setTimeout\("\w+\((\d+)\)"/);
  if (m) return parseInt(m[1], 10);
  m = html.match(/\b\w+\((\d+)\)/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function extractLoop1Params(html) {
  const re =
    /qo\s*=\s*(\d+);\s*do\{[\s\S]*?oo\[qo\]=\(-oo\[qo\]\)&0xff;[\s\S]*?oo\[qo\]=\(\(\(oo\[qo\]>>(\d+)\)\|\(\(oo\[qo\]<<(\d+)\)&0xff\)\)\-(\d+)\)&0xff;[\s\S]*?\}\s*while\(--qo>=2\);/;
  const m = html.match(re);
  if (!m) return null;
  return {
    start: parseInt(m[1], 10),
    shift_r: parseInt(m[2], 10),
    shift_l: parseInt(m[3], 10),
    sub: parseInt(m[4], 10),
  };
}

function extractLoop2Start(html) {
  const re =
    /qo\s*=\s*(\d+);\s*do\s*\{[^}]*?oo\[qo\]\s*=\s*\(oo\[qo\]\s*-\s*oo\[qo\s*-\s*1\]\)\s*&\s*0xff;[^}]*?\}\s*while\s*\(\s*--\s*qo\s*>=\s*3\s*\)/;
  const m = html.match(re);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function extractLoop3Params(html) {
  const blockMatch = html.match(
    /qo\s*=\s*1;\s*for\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*po\s*=/,
  );
  if (!blockMatch) return null;
  const block = blockMatch[1];

  const upperMatch = block.match(/qo\s*>\s*(\d+)\)\s*break/);
  if (!upperMatch) return null;
  const upper = parseInt(upperMatch[1], 10);

  const assignMatch = block.match(/oo\[qo\]\s*=\s*(.+?);/);
  if (!assignMatch) return null;
  const expr = assignMatch[1];

  const addNums = [];
  const addRe = /\+\s*(\d+)/g;
  let tmp;
  while ((tmp = addRe.exec(expr))) {
    addNums.push(parseInt(tmp[1], 10));
  }
  if (addNums.length < 2) return null;
  const add1 = addNums[0];
  const add2 = addNums[1];

  const shiftNums = [];
  const shiftRe = /<<\s*(\d+)|>>\s*(\d+)/g;
  while ((tmp = shiftRe.exec(expr))) {
    if (tmp[1]) shiftNums.push(parseInt(tmp[1], 10));
    else if (tmp[2]) shiftNums.push(parseInt(tmp[2], 10));
  }
  if (shiftNums.length < 2) return null;
  const rot_l = shiftNums[0];

  return { upper, add1, add2, rot_l };
}

function extractModSkip(html) {
  const m = html.match(/qo\s*%\s*(\d+)/);
  if (!m) return 7;
  return parseInt(m[1], 10);
}

function decodePo(ooHex, wi, params) {
  const oo = ooHex.map((b) => b & 0xff);
  if (oo.length < 6) return "";

  const lastIndex = oo.length - 1;
  const {
    loop1_start,
    loop2_start,
    loop3_upper,
    shift_r,
    shift_l,
    sub,
    add1,
    add2,
    rot_l,
    mod_skip,
  } = params;

  // loop1
  let qo = Math.min(loop1_start, lastIndex - 1);
  while (true) {
    oo[qo] = (-oo[qo]) & 0xff;
    if (shift_r + shift_l === 8) {
      oo[qo] = (rotr8(oo[qo], shift_r) - sub) & 0xff;
    } else {
      oo[qo] =
        (((oo[qo] >> shift_r) | ((oo[qo] << shift_l) & 0xff)) - sub) & 0xff;
    }
    qo--;
    if (qo < 2) break;
  }

  // loop2
  qo = Math.min(loop2_start, lastIndex - 2);
  while (true) {
    oo[qo] = (oo[qo] - oo[qo - 1]) & 0xff;
    qo--;
    if (qo < 3) break;
  }

  // loop3
  for (qo = 1; qo <= Math.min(loop3_upper, lastIndex - 1); qo++) {
    let x = (oo[qo] + add1) & 0xff;
    x = (x + add2) & 0xff;
    oo[qo] = rotl8(x, rot_l);
  }

  const chars = [];
  for (qo = 1; qo < lastIndex; qo++) {
    if (qo % mod_skip !== 0) {
      chars.push(String.fromCharCode((oo[qo] ^ (wi & 0xff)) & 0xff));
    }
  }
  return chars.join("");
}

function extractCookieKV(decodedJs) {
  const m = decodedJs.match(/document\.cookie=['"]([^'"]+)['"]/);
  if (!m) return null;
  const cookieStr = m[1].trim();
  if (!cookieStr) return null;
  return cookieStr.split(";", 1)[0].trim(); // "k=v; path=/" -> "k=v"
}

function upsertCookie(baseCookies, newCookieKV) {
  if (!newCookieKV || !newCookieKV.includes("=")) return baseCookies || "";
  const [newKeyRaw, newValRaw] = newCookieKV.split("=", 2);
  const newKey = newKeyRaw.trim();
  const newVal = (newValRaw || "").trim();

  const parts = [];
  let replaced = false;
  (baseCookies || "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && s.includes("="))
    .forEach((s) => {
      const [kRaw, vRaw] = s.split("=", 2);
      const k = kRaw.trim();
      const v = (vRaw || "").trim();
      if (k === newKey) {
        parts.push(`${newKey}=${newVal}`);
        replaced = true;
      } else {
        parts.push(`${k}=${v}`);
      }
    });

  if (!replaced) parts.push(`${newKey}=${newVal}`);
  return parts.join("; ");
}

function mergeSetCookieToCookie(baseCookies, setCookieHeader) {
  if (!setCookieHeader) return baseCookies;
  let cookies = baseCookies || "";
  const lines = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const line of lines) {
    if (!line) continue;
    const kv = line.split(";", 1)[0].trim();
    cookies = upsertCookie(cookies, kv);
  }
  return cookies;
}

// ======= formhash 提取（增强版）=======

function extractFormhash(html) {
  // 1. 优先从隐藏表单字段取：name="formhash" value="xxxx"
  let m = html.match(
    /name=["']formhash["']\s+value=["']([0-9a-fA-F]{8,32})["']/i,
  );
  if (m) return m[1];

  // 2. 从登出链接里取：logout&formhash=xxxx
  m = html.match(
    /member\.php\?mod=logging(?:&amp;|&)action=logout[^"'<>]*?(?:&amp;|&)formhash=([0-9a-fA-F]{8,32})/i,
  );
  if (m) return m[1];

  // 3. 兜底：任意出现 formhash=xxxx 的地方
  m = html.match(/formhash=([0-9a-fA-F]{8,32})/i);
  if (m) return m[1];

  return null;
}

// ======= 头部构造 =======

function getClearanceHeaders(cookies, ua) {
  return {
    "User-Agent": ua,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    "sec-ch-ua":
      '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Upgrade-Insecure-Requests": "1",
    "Sec-GPC": "1",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    Referer: SIGN_IN_PAGE_URL,
    Cookie: cookies,
  };
}

function getAjaxHeaders(cookies, ua) {
  return {
    "User-Agent": ua,
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Encoding": "gzip, deflate, br",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "sec-ch-ua-platform": '"macOS"',
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua":
      '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
    "sec-ch-ua-mobile": "?0",
    "Sec-GPC": "1",
    "Accept-Language": "zh-CN,zh;q=0.9",
    Origin: "https://www.right.com.cn",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    Referer: SIGN_IN_PAGE_URL,
    Cookie: cookies,
  };
}

// ======= 核心：刷新 WAF cookie + formhash =======

async function refreshClearanceAndFormhash(rawCookies, ua) {
  let cookies = rawCookies;

  // 第一次请求：可能是 WAF，也可能直接正常页面
  const { resp: r1, data: h1 } = await httpGet({
    url: SIGN_IN_PAGE_URL,
    headers: getClearanceHeaders(cookies, ua),
  });

  const setCookie1 =
    r1.headers["Set-Cookie"] || r1.headers["set-cookie"] || null;
  cookies = mergeSetCookieToCookie(cookies, setCookie1);

  if (!/oo\s*=/.test(h1)) {
    // 无 WAF 加密，直接取 formhash
    return { cookies, formhash: extractFormhash(h1) };
  }

  const oo = extractOO(h1);
  const wi = extractWi(h1);
  if (!oo || wi == null) throw new Error("WAF 解析 oo/wi 失败");

  const loop1 = extractLoop1Params(h1);
  const loop2_start = extractLoop2Start(h1);
  const loop3 = extractLoop3Params(h1);
  if (!loop1 || loop2_start == null || !loop3)
    throw new Error("WAF 解密参数提取失败");

  const mod_skip = extractModSkip(h1);
  const params = {
    loop1_start: loop1.start,
    loop2_start,
    loop3_upper: loop3.upper,
    shift_r: loop1.shift_r,
    shift_l: loop1.shift_l,
    sub: loop1.sub,
    add1: loop3.add1,
    add2: loop3.add2,
    rot_l: loop3.rot_l,
    mod_skip,
  };

  const decodedJs = decodePo(oo, wi, params);
  const cookieKV = extractCookieKV(decodedJs);
  if (!cookieKV) throw new Error("WAF 解密成功但未找到 document.cookie");

  cookies = upsertCookie(cookies, cookieKV);

  // 再请求一次，带上 clearance
  const { resp: r2, data: h2 } = await httpGet({
    url: SIGN_IN_PAGE_URL,
    headers: getClearanceHeaders(cookies, ua),
  });
  const setCookie2 =
    r2.headers["Set-Cookie"] || r2.headers["set-cookie"] || null;
  cookies = mergeSetCookieToCookie(cookies, setCookie2);

  return { cookies, formhash: extractFormhash(h2) };
}

// ======= 主流程：执行签到并通知 =======

(async () => {
  const start = Date.now();

  const cookie =
    $persistentStore.read("enshan_cookie") ||
    ""; // 从获取 Cookie 脚本写入的存储读取
  const ua = DEFAULT_UA;

  if (!cookie || !cookie.includes("=")) {
    $notification.post(
      "恩山签到",
      "失败",
      "未获取到有效 Cookie，请先运行获取Cookie脚本并重新登录恩山",
    );
    $done();
    return;
  }

  try {
    const { cookies, formhash } = await refreshClearanceAndFormhash(
      cookie,
      ua,
    );

    if (!formhash) {
      $notification.post(
        "恩山签到",
        "失败",
        "未从页面中解析到 formhash，Cookie 可能失效",
      );
      $done();
      return;
    }

    const body = `formhash=${encodeURIComponent(formhash)}`;
    const { resp, data } = await httpPost({
      url: SIGN_URL,
      headers: getAjaxHeaders(cookies, ua),
      body,
    });

    const status = resp.status || resp.statusCode;
    let msg = "";
    try {
      const json = JSON.parse(data);
      msg = JSON.stringify(json);
    } catch (e) {
      msg = (data || "").slice(0, 120);
    }

    if (status === 200) {
      $notification.post("恩山签到", "成功", msg || "签到返回 200");
    } else {
      $notification.post(
        "恩山签到",
        `HTTP 状态异常：${status}`,
        msg || "无返回内容",
      );
    }
  } catch (e) {
    $notification.post("恩山签到", "脚本异常", String(e));
  } finally {
    const cost = Math.round((Date.now() - start) / 1000);
    console.log(`恩山签到脚本执行耗时：${cost} 秒`);
    $done();
  }
})().catch((e) => {
  $notification.post("恩山签到", "未捕获异常", String(e));
  $done();
});

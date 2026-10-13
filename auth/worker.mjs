// Deploy this file as a Cloudflare Worker (ES module). Never paste secrets here.
const SITE_ORIGIN = 'https://bigbig-long.github.io';
const REPOSITORY = 'BigBig-Long/bigbig-long.github.io';
const OWNER_ID = 163488255;
const COOKIE = '__Host-decap_oauth';
const MAX_AGE = 600;
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (value, age) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const key = secret => crypto.subtle.importKey('raw', encoder.encode(`decap-oauth-state:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

async function seal(payload, secret) {
  const value = encode(encoder.encode(JSON.stringify(payload)));
  return `${value}.${encode(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value)))}`;
}

async function unseal(value, secret) {
  const parts = value.split('.');
  if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await key(secret), decode(parts[1]), encoder.encode(parts[0]))) throw new Error('invalid cookie');
  return JSON.parse(new TextDecoder().decode(decode(parts[0])));
}

function headers(extra = {}) {
  return { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', ...extra };
}

function popup(success, data, status = 200) {
  const nonce = random();
  const result = `authorization:github:${success ? 'success' : 'error'}:${JSON.stringify(data)}`;
  const safe = JSON.stringify(result).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitHub 登录</title><body><p id="message">${success ? '身份验证成功，正在返回笔记编辑器……' : '登录未完成，请返回编辑器重试。'}</p><script nonce="${nonce}">
    history.replaceState(null, '', '/callback');
    const origin = ${JSON.stringify(SITE_ORIGIN)};
    const message = ${safe};
    if (window.opener) {
      const receive = event => {
        if (event.origin !== origin || event.source !== window.opener || event.data !== 'authorizing:github') return;
        window.removeEventListener('message', receive);
        window.opener.postMessage(message, origin);
        document.getElementById('message').textContent = '验证结果已返回，可以关闭此窗口。';
      };
      window.addEventListener('message', receive);
      window.opener.postMessage('authorizing:github', origin);
    } else {
      document.getElementById('message').textContent = '请从学习笔记页面的编辑入口重新登录。';
    }
  </script></body></html>`;
  return new Response(html, { status, headers: headers({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookie('', 0), 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` }) });
}

async function github(url, token, fetcher) {
  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'SJing-Decap-OAuth', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('GitHub API request failed');
  return response.json();
}

async function handleRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: headers({ Allow: 'GET' }) });
  const ready = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  if (url.pathname === '/' || url.pathname === '/health') return Response.json({ service: 'SJing Decap OAuth', ready }, { headers: headers() });
  if (!['/auth', '/callback'].includes(url.pathname)) return new Response('Not found', { status: 404, headers: headers() });
  if (!ready) return popup(false, { message: '登录服务尚未设置 GitHub Client ID 和 Client Secret。' }, 503);
  if (url.protocol !== 'https:') return new Response('HTTPS required', { status: 400, headers: headers() });
  const callback = `${url.origin}/callback`;

  if (url.pathname === '/auth') {
    if (url.searchParams.get('provider') !== 'github' || url.searchParams.get('site_id') !== new URL(SITE_ORIGIN).hostname) return new Response('Invalid login request', { status: 400, headers: headers() });
    const state = random();
    const verifier = random();
    const value = await seal({ state, verifier, time: Date.now() }, env.GITHUB_CLIENT_SECRET);
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: callback, scope: 'public_repo', state, code_challenge: encode(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))), code_challenge_method: 'S256' });
    return new Response(null, { status: 302, headers: headers({ Location: authorize.href, 'Set-Cookie': cookie(value, MAX_AGE) }) });
  }

  try {
    const value = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!value) throw new Error('missing cookie');
    const saved = await unseal(value, env.GITHUB_CLIENT_SECRET);
    if (!saved.state || !saved.verifier || saved.state !== url.searchParams.get('state') || !Number.isFinite(saved.time) || Date.now() < saved.time || Date.now() - saved.time > MAX_AGE * 1000) throw new Error('invalid state');
    if (url.searchParams.has('error')) return popup(false, { message: 'GitHub 授权已取消，请重新登录。' }, 400);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('missing code');
    const response = await fetcher('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: callback, code_verifier: saved.verifier }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('token exchange failed');
    const result = await response.json();
    if (!result.access_token || result.error) throw new Error('no access token');
    const user = await github('https://api.github.com/user', result.access_token, fetcher);
    if (user.id !== OWNER_ID) return popup(false, { message: '只有 BigBig-Long 本人可以使用此笔记编辑器。' }, 403);
    const repo = await github(`https://api.github.com/repos/${REPOSITORY}`, result.access_token, fetcher);
    if (repo.permissions?.push !== true) return popup(false, { message: '当前账号没有此仓库的写入权限。' }, 403);
    return popup(true, { token: result.access_token, provider: 'github' });
  } catch {
    // Never log the authorization code, cookies, access token, or upstream error body.
    return popup(false, { message: '登录验证失败或已过期，请关闭此窗口，从网站重新登录。' }, 400);
  }
}

export default { fetch: (request, env) => handleRequest(request, env) };

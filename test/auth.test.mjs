import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../auth/worker.mjs';

async function handleRequest(request, env, fetcher = fetch) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetcher;
  try { return await worker.fetch(request, env); }
  finally { globalThis.fetch = previous; }
}

const env = { GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'unit-test-only-not-a-real-secret' };
const origin = 'https://auth.example.workers.dev';
async function begin() {
  const response = await handleRequest(new Request(`${origin}/auth?provider=github&site_id=bigbig-long.github.io&scope=repo`), env);
  assert.equal(response.status, 302);
  const redirect = new URL(response.headers.get('Location'));
  assert.equal(redirect.searchParams.get('scope'), 'public_repo');
  assert.equal(redirect.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(redirect.searchParams.get('redirect_uri'), `${origin}/callback`);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
  return { cookie: response.headers.get('Set-Cookie').split(';')[0], state: redirect.searchParams.get('state'), challenge: redirect.searchParams.get('code_challenge') };
}
const callback = session => new Request(`${origin}/callback?code=test-code&state=${session.state}`, { headers: { Cookie: session.cookie } });
function mockGitHub({ user = 163488255, push = true, fail = false, challenge } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    if (fail) throw new Error('network error');
    if (url.endsWith('/access_token')) {
      assert.equal(options.method, 'POST');
      const verifier = options.body.get('code_verifier');
      assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url'), challenge);
      return Response.json({ access_token: 'test-access-token' });
    }
    if (url.endsWith('/user')) return Response.json({ id: user });
    return Response.json({ permissions: { push } });
  };
  return { fetcher, calls };
}
test('missing setup, unrelated origins and unsupported methods cannot start OAuth', async () => {
  assert.equal((await handleRequest(new Request(`${origin}/auth?provider=github&site_id=evil.test`), env)).status, 400);
  assert.equal((await handleRequest(new Request(`${origin}/auth`), {})).status, 503);
  assert.equal((await handleRequest(new Request(`${origin}/auth`, { method: 'POST' }), env)).status, 405);
});
test('owner login uses PKCE, verifies repo access and sends token only to the fixed site origin', async () => {
  const session = await begin();
  const mock = mockGitHub(session);
  const result = await handleRequest(callback(session), env, mock.fetcher);
  const html = await result.text();
  assert.equal(result.status, 200);
  assert.equal(mock.calls.length, 3);
  assert.match(html, /authorization:github:success:/);
  assert.match(html, /https:\/\/bigbig-long.github.io/);
  assert.match(html, /event.source !== window.opener/);
  assert.ok(!html.includes('test-client') && !html.includes(env.GITHUB_CLIENT_SECRET));
  assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.match(result.headers.get('Content-Security-Policy'), /default-src 'none'/);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
test('tampered state, forged cookie, missing cookie and expired session never reach GitHub', async () => {
  const session = await begin();
  const mock = mockGitHub(session);
  for (const bad of [{ ...session, state: 'forged' }, { ...session, cookie: `${session.cookie}x` }, { ...session, cookie: '' }]) assert.equal((await handleRequest(callback(bad), env, mock.fetcher)).status, 400);
  const clock = Date.now;
  try {
    Date.now = () => clock() + 601000;
    assert.equal((await handleRequest(callback(session), env, mock.fetcher)).status, 400);
  } finally { Date.now = clock; }
  assert.equal(mock.calls.length, 0);
});
test('non-owner, missing repository access and network failure never return a token', async () => {
  for (const config of [{ user: 1 }, { push: false }, { fail: true }]) {
    const session = await begin();
    const result = await handleRequest(callback(session), env, mockGitHub({ ...session, ...config }).fetcher);
    const html = await result.text();
    assert.ok(result.status >= 400);
    assert.ok(!html.includes('test-access-token'));
    assert.match(html, /authorization:github:error:/);
  }
});

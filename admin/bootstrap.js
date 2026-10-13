/* This file contains only public settings. OAuth secrets belong in the Worker. */
(async () => {
  const status = document.getElementById('status');
  const setup = document.getElementById('setup');
  try {
    const response = await fetch('settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取编辑器配置，请刷新重试。');
    const { authBaseUrl } = await response.json();
    if (!authBaseUrl) {
      status.textContent = '笔记编辑器已准备好，等待站主完成首次登录设置。';
      setup.hidden = false;
      return;
    }
    const origin = new URL(authBaseUrl);
    if (origin.protocol !== 'https:' || origin.origin !== authBaseUrl) {
      throw new Error('登录服务地址应为完整的 HTTPS 域名，末尾不加斜杠。');
    }
    window.CMS_MANUAL_INIT = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/decap-cms@3.16.3/dist/decap-cms.js';
    script.crossOrigin = 'anonymous';
    script.integrity = 'sha384-A/Gdn928CNLufmnGWGs9RM4Q9o8bSNLeJERqBFrBjwzL7FRpoLT3MPF8Tl0+Wd2p';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('编辑器加载失败，请检查网络后刷新。'));
      document.head.append(script);
    });
    window.CMS.init({ config: { backend: { base_url: authBaseUrl } } });
    window.CMS.registerPreviewStyle('/styles.css');
    window.CMS.registerPreviewStyle('/notes.css');
    window.CMS.registerPreviewTemplate('notes', ({ entry, widgetFor, getAsset }) => {
      const h = window.h;
      const cover = entry.getIn(['data', 'cover']);
      return h('article', { className: 'note-prose markdown-body', style: { margin: '24px' } },
        h('h1', {}, entry.getIn(['data', 'title']) || '新笔记'),
        h('p', {}, entry.getIn(['data', 'description'])),
        cover ? h('img', { src: String(getAsset(cover)), alt: '' }) : null,
        widgetFor('body'));
    });
    document.getElementById('loading').hidden = true;
  } catch (error) {
    status.textContent = error.message;
    setup.hidden = false;
  }
})();

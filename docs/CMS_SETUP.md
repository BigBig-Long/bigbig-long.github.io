# 首次启用在线笔记

代码已包含 Decap 编辑器、Markdown 笔记模板、GitHub 登录认证服务和 Actions 发布流程。
账号注册、创建 GitHub OAuth App、给 Cloudflare 填写密钥，需要站主在自己的账号里完成。
这套配置使用现有的 `bigbig-long.github.io` 域名，无需购买新域名或迁移网站。

## 1. 创建 Cloudflare Worker，得到登录服务网址

1. [注册并登录 Cloudflare](https://dash.cloudflare.com/sign-up)。
2. 打开 **Workers & Pages**，创建一个 Worker，可先从简单的 Hello World 示例开始。
   名字建议填写 `sjing-notes-auth`。使用 Worker，不用创建 Pages 项目，也不用连接 Git 仓库。
3. 进入该 Worker 的代码编辑器（Edit code），用仓库中的
   [`auth/worker.mjs`](../auth/worker.mjs) **完整替换**示例代码，点击 **Deploy**。
   这是单个 ES module 文件，不需要安装依赖。
4. 在 Worker 的域名页面复制公开访问地址。例如：
   `https://sjing-notes-auth.你的子域名.workers.dev`。
   下文把实际地址称为 `WORKER_URL`，不要填写这个示例占位符。
5. 在浏览器打开 `WORKER_URL/health`，应看到服务名称与 `"ready":false`。
   这表示代码已部署，下一步需要设置 GitHub 登录参数。

文档：[Cloudflare 控制台创建 Worker](https://developers.cloudflare.com/workers/get-started/dashboard/)。

## 2. 创建 GitHub OAuth App

使用 **BigBig-Long** 账号打开 [New OAuth App](https://github.com/settings/applications/new)，填写：

| 字段 | 填写内容 |
| --- | --- |
| Application name | SJing Notes CMS |
| Homepage URL | `https://bigbig-long.github.io/admin/` |
| Application description | 个人学习笔记编辑器（可选） |
| Authorization callback URL | 实际的 `WORKER_URL` 后加 `/callback` |

例如，实际 Worker 地址若是 `https://sjing-notes-auth.abc.workers.dev`，回调地址就填
`https://sjing-notes-auth.abc.workers.dev/callback`。不用启用 Device Flow。

注册后复制 **Client ID**，再点击 **Generate a new client secret** 生成 **Client Secret**。
不要把 Secret 发到聊天里，也不要写进仓库。

文档：[GitHub 创建 OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)。

## 3. 在 Cloudflare 填写两个值

回到刚才的 Worker → **Settings → Variables and Secrets → Add**。
添加下列两项，类型都可选择 **Secret**，名称必须完全一致：

| 名称 | 值 |
| --- | --- |
| `GITHUB_CLIENT_ID` | 刚才 OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | 刚才生成的 Client Secret |

保存并部署后，再打开 `WORKER_URL/health`，应显示 `"ready":true`。
这只说明参数已填写；是否填写正确，还需最后实际登录验证。
不需要给 Cloudflare 配置 GitHub PAT，也不需要把任何密钥放进 GitHub Actions。

文档：[Cloudflare 设置 Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。

## 4. 开启自动发布，连接编辑器

1. 打开 [仓库 Settings → Pages](https://github.com/BigBig-Long/bigbig-long.github.io/settings/pages)。
   将 **Build and deployment → Source** 改为 **GitHub Actions**。
   仓库已提供 workflow，不用再选择或生成 Jekyll 模板。
2. 将你的 **Worker 公开网址** 告诉协助配置的人，由其写入 `admin/settings.json` 的
   `authBaseUrl`，例如 `https://sjing-notes-auth.abc.workers.dev`，末尾不加 `/`。
   这是公开网址，可以分享；Client Secret 不能分享。
   也可以自己在 GitHub 编辑此文件并提交到 `main`。
3. 提交会自动触发 [Publish website](https://github.com/BigBig-Long/bigbig-long.github.io/actions/workflows/deploy.yml)。
   如果上一次执行发生在 Pages 设置修改之前并已失败，可点 **Re-run all jobs**；
   也可在 workflow 页面点 **Run workflow**。等待 build 和 deploy 都变绿。

文档：[GitHub Pages 自定义发布流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 日常写笔记

访问 [学习笔记](https://bigbig-long.github.io/notes/) → **新建笔记** → **Login with GitHub**。
首次同意自己创建的 OAuth App 授权后，即可写标题、简介、日期、标签和正文，也可以上传封面与正文图片。
正文支持可视化编辑和 Markdown；使用二级标题会自动生成正文页目录。

首次创建时给“网址名称”填写简短英文，例如 `transformer`，发布后的地址是
`https://bigbig-long.github.io/notes/transformer.html`。发布后不要更改这个名称；系统会拒绝
与文件名不一致的名称，防止旧链接意外失效。

点击 **发布 / Publish** 会保存到 GitHub；Actions 随后生成页面并部署。通过编辑器顶部的
**查看发布进度** 确认完成后再查看网站。现有笔记可从“管理笔记”进入修改或删除。
删除后旧网址将不再存在，Git 历史仍保留以前提交过的内容。

这个仓库是公开仓库，发布的笔记和上传的图片都是公开内容；这里没有私密草稿库。
示例内容标记仅控制“示例笔记”标签，不会隐藏笔记。使用完可从 Decap 账号菜单退出。
若 GitHub 登录令牌到期或被撤销，退出后重新登录即可；目前没有自动续期功能。

## 工作原理与权限

`Decap 编辑 → GitHub 保存 Markdown → Actions 测试和生成 HTML → GitHub Pages 发布`

- **Decap CMS** 提供编辑界面，通过 GitHub API 保存内容。
- **Cloudflare Worker** 完成 OAuth 回调，校验登录人是 GitHub 用户 ID `163488255`
  （BigBig-Long），再检查目标仓库写入权限。状态签名、PKCE、固定网站来源校验都已实现。
- **GitHub Actions** 负责自动构建和部署，不负责登录，也不保存 Client Secret。
- 笔记唯一正文来源是 `content/notes/*.md`；`_site/` 是生成结果。

OAuth 请求的是 `public_repo` 权限。GitHub OAuth 的这个权限涵盖授权账号的公开仓库，
不是单仓库令牌；CMS 配置的写入目标仅为本仓库。不要扩大为 `repo` 或添加 workflow 权限。
登录后，Decap 需要在浏览器中持有 GitHub access token；Client Secret 始终留在 Worker。
若不再使用，可从 GitHub 的 Authorized OAuth Apps 撤销授权，并删除 Cloudflare Secrets。

## 常见问题

- **编辑器提示等待首次设置**：`admin/settings.json` 还没有实际 Worker 地址，或 Pages 尚未部署最新提交。
- **redirect_uri / callback 不匹配**：核对 OAuth App 的回调地址与实际 Worker 地址，必须以 `/callback` 结尾。
- **登录过期或校验失败**：关闭旧弹窗，从 `https://bigbig-long.github.io/admin/` 重新登录，
  不要在本地预览地址登录生产认证服务；允许该登录弹窗正常打开。
- **其他 GitHub 账号被拒绝**：预期行为，只允许 BigBig-Long 使用。
- **保存成功但网站没变化**：先看 Actions 中此次提交的运行状态。若 deploy 失败，确认 Pages Source
  已设置为 GitHub Actions；若 build 失败，看报错的字段或文件名，修改后再次发布。
- **Workers 域名打不开**：先确认自己网络可以访问实际 `workers.dev` 地址；若无法访问，需更换
  可访问的认证服务域名，并同步修改 OAuth 回调地址及 `authBaseUrl`。

## 本地维护

```sh
npm ci
npm test
npm run build
python -m http.server 8000 --directory _site
```

测试覆盖笔记新增/修改/删除、标题与 Markdown 注入、字段校验，以及 OAuth 状态篡改、过期、
错误账号、权限不足和正常回调。真实 GitHub 登录需要站主完成上面的账号设置后验收。

仓库内 `notes/*.html` 是首次迁移时保留的兼容快照，避免启用 Actions 前旧发布方式下页面缺失。
切换到 Actions 后，线上以构建生成的页面为准，不要再编辑这些快照来更新笔记。

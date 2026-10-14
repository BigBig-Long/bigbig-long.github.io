# SJing 的个人主页、研究成果与学习笔记

HTML、CSS、JavaScript 个人网站。学习笔记通过 Decap CMS 编辑，GitHub Actions 自动生成并发布到 GitHub Pages。

**首次使用：[按步骤完成 CMS 登录与发布设置](docs/CMS_SETUP.md)。**

- 首页：`index.html`
- 研究成果：`research/index.html`（访问路径 `/research/`）
- 研究样式与筛选：`research/research.css`、`research/research.js`
- 研究配图：`assets/research/`（SVG 示意图可直接替换为 PNG、JPG 等）
- 学习笔记列表：`notes/index.html`（访问路径 `/notes/`）
- Diffusion 笔记：`notes/diffusion.html`
- 全站交互：`script.js`
- 基础样式：`styles.css`；笔记样式：`notes.css`

## 替换研究成果示例

研究页目前有 3 篇虚构论文和 2 个虚构项目，卡片及详情页均标明“示例”。
所有标题、作者名单、作者排位、会议年份、角色和贡献都仅用于展示版式。
图片是原创概念示意，不是真实实验结果或产品截图；未提供的资源显示为“待补充”。

1. 在 `research/index.html` 找到对应的 `<article class="work-card ...">`，替换标题、
   简介、作者、会议与年份、作者排位或项目角色、标签。
2. 将真实配图放进 `assets/research/`，修改卡片与对应详情页的 `<img src="...">` 和
   `alt` 描述。保持 `width` / `height` 与图片比例一致。
3. 修改对应详情页：`bridgevla.html`、`worldsketch.html`、`splatcraft.html`、
   `embodied-lab.html`、`scene-studio.html`（都在 `research/`）。也可以换成自己的文件名，
   同时更新卡片链接。论文作者按原论文顺序填写；项目成员排序不等同于论文作者排序。
4. 给资源添加真实链接。例如把
   `<span class="resource-pending">PDF · 待补充</span>` 换成
   `<a class="work-primary-link" href="真实的论文链接">论文 PDF ↗</a>`。
   项目演示与代码仓库同理；卡片和详情页中的资源需同步更新。
5. 真实内容核实后，移除该条目的示例标记，并移除对应详情页中的
   `<meta name="robots" content="noindex">`。页面总提示应保留，直到全部示例已替换。
6. 若新增或删除成果，复制或删除完整卡片及其详情页，确保 `id` 唯一，并更新顶部概览、
   筛选按钮中的数量。筛选后的状态文字会自动按实际卡片数量计算。

中英文文案保存在 `data-zh` / `data-en` 中，编辑时需同步更新属性和标签内文字。
研究页即使关闭 JavaScript，也能显示所有成果并访问详情页。

## 在线编辑学习笔记

首次配置完成后，在 [学习笔记](https://bigbig-long.github.io/notes/) 点击“新建笔记”，
通过 GitHub 身份验证后写作，点击发布即可保存到仓库并自动更新网站。
支持标题、简介、日期、标签、图片和可视化 Markdown 编辑，列表、数量、正文页与目录自动生成。

- 编辑器入口：`admin/index.html`；字段配置：`admin/config.yml`
- 登录服务公开地址：`admin/settings.json`（初始为空，等待站主创建 Worker）
- 笔记正文：`content/notes/*.md`；Diffusion：`content/notes/diffusion.md`
- 页面模板：`templates/`；生成脚本：`scripts/build.mjs`
- 登录认证 Worker：`auth/worker.mjs`（Client Secret 只设置在 Cloudflare）
- 自动发布：`.github/workflows/deploy.yml`
- `notes/*.html` 是迁移兼容快照；Actions 发布时会以 Markdown 重新生成，不要再手改这些页面。

研究页面仍保持原有 HTML 编辑方式。所有公开页面均可直接访问、刷新和分享；
正文保持作者编写的语言，导航支持中英文切换。

## 本地预览与检查

```sh
npm ci
npm test
npm run build
python -m http.server 8000 --directory _site
```

访问 `http://localhost:8000`。生产登录仅允许网站正式域名。
详细设置、日常使用与常见问题请看 [CMS_SETUP.md](docs/CMS_SETUP.md)。

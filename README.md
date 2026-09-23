# SJing 的个人主页、研究成果与学习笔记

纯 HTML、CSS、JavaScript 网站，通过 GitHub Pages 发布，无需构建。

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

## 编辑 Diffusion 笔记

打开 `notes/diffusion.html`，修改 `<article class="note-prose">` 内的正文。
目前的概念说明是示例，个人体会与实验记录留有填写提示。补充自己的内容后，可删除
`.draft-notice` 提示，并同步修改详情页及列表卡片上的“示例草稿 / 待完善”状态。

标题和导航使用 `data-zh` / `data-en` 保存中英文文案。修改这类文字时需要同时更新属性
与标签内的默认文字；页面 `<title>` 与描述的中英文属性也要同步更新。
正文以中文记录，导航切换到英文时保留中文正文。

## 新增一篇学习笔记

1. 复制 `notes/diffusion.html`，例如命名为 `notes/transformer.html`。
2. 修改标题、页面描述、面包屑、标签和正文；同步调整目录链接及对应章节的 `id`。
3. 在 `notes/index.html` 复制一个 `<article class="note-card">`，更新链接、标题和摘要。
   新卡片的标题与摘要 `id` 必须唯一，`aria-labelledby` / `aria-describedby` 应同步修改。
4. 更新列表中的笔记数量及首页概览中的笔记数量。
5. 提交到 `main` 后，由仓库的 GitHub Pages 发布流程更新网站。

所有页面均为真实 HTML 文件，支持直接访问、刷新和分享链接，不依赖前端路由。

## 本地预览

在仓库根目录运行 `python -m http.server 8000`，访问 `http://localhost:8000`。

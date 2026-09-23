# SJing 的个人主页与学习笔记

纯 HTML、CSS、JavaScript 网站，通过 GitHub Pages 发布，无需构建。

- 首页：`index.html`
- 学习笔记列表：`notes/index.html`（访问路径 `/notes/`）
- Diffusion 笔记：`notes/diffusion.html`
- 全站交互：`script.js`
- 基础样式：`styles.css`；笔记样式：`notes.css`

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

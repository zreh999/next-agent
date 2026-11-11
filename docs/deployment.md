# GitHub Pages 静态部署

本版复用原有界面、题库和匹配规则，将推荐计算、报告及试玩反馈保存迁移到浏览器。构建后只需托管 `out/` 中的静态文件，不运行数据库或 Node.js 后端。

目标仓库为 `zreh999/next-agent`，部署目标为 `https://zreh999.github.io/next-agent/`。实际上线以 Actions 成功及公网验证为准。

## 一次性仓库设置

1. 确认仓库公开，并将静态适配代码推送到 `main`。
2. 在仓库打开 **Settings → Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。网站需要先构建，不从 `main` 根目录直接发布源码。
4. 打开 **Actions**，查看 **Deploy to GitHub Pages** 工作流。也可以在该工作流页面使用 **Run workflow** 手动触发。
5. 等待构建及部署都成功后，打开 Pages 页面给出的公开地址。

工作流文件为 `.github/workflows/pages.yml`，负责安装依赖、静态构建、上传 `out/` 并发布。后续修改题库、界面或规则后推送 `main`，会触发下一次发布。日常提交源码即可，无需新增 `gh-pages` 分支。

无需配置数据库、托管平台账号或部署 Secrets。原先为后端准备的 `DATABASE_URL`、`DATABASE_URL_UNPOOLED`、`APP_ORIGIN` 与 `ALLOW_FILE_STORAGE` 均不参与 Pages 构建或运行。不要把连接字符串或密码写入源码。

## 本地构建与预览

使用 Node.js 24：

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run start
```

预览地址为 `http://127.0.0.1:3000/next-agent/`。静态文件输出到 `out/`，预览脚本为 `scripts/serve-static.mjs`；不再用 `next start` 运行静态导出。浏览器端计算需要加载 JavaScript；本地应通过 HTTP 预览，不要直接双击 HTML 文件。

仓库使用 `/next-agent` 作为 `basePath`，并导出带尾斜线的目录页面。这使首页、图鉴、报告和试玩页均能在 GitHub 项目子路径下直接打开和刷新。若以后重命名仓库或改成自定义域名，须一并调整构建时的子路径配置并重新部署。

## 数据行为

- 草稿、答案、报告、反馈仅保存在访问者当前浏览器的本地存储中，不上传服务器或维护者。
- 报告地址为 `results/?id=...`；ID 是本地记录索引，不授予其他浏览器读取数据的能力。复制链接不等于分享报告。
- 不填 ID 的 `results/` 页面可查看当前浏览器最近的报告。
- 分享采用下载结果图片的方式，不提供云端分享摘要或链接撤销。
- 清除站点数据、切换浏览器/设备或更换网站来源地址后，不能自动找回旧记录。隐私浏览中的数据也可能在关闭窗口后消失。
- 反馈用于个人回顾，不会自动训练算法或改变推荐权重。

## 发布验收

先运行浏览器回归：

```sh
npx playwright install chromium
npm run test:e2e
```

Linux 持续集成可使用 `npx playwright install --with-deps chromium`。测试针对已经构建的静态 `out/` 目录，不应依赖 `/api/` 接口或数据库。

上线后再完成以下实际检查：

1. 首页及 30 名特工图鉴在手机小屏正常显示，搜索与职责筛选可用。
2. 完成 16 道情境题后显示报告与推荐解释，刷新报告地址仍可查看。
3. 修改偏好后能生成新报告，原本机报告保持不变。
4. 保存试玩反馈，刷新后仍能查看。
5. 下载的结果卡是可打开的 PNG 图片。
6. 用无痕窗口打开报告 URL，不能读取原浏览器本地记录。
7. 首页、图鉴、问答、方法、报告与试玩页面均可直接访问和刷新，且没有 `/api/` 请求。

## 常见问题

| 现象 | 检查 |
| --- | --- |
| Pages 显示 404 | 检查 Source 是否为 GitHub Actions、最新 Pages 工作流是否成功，以及访问地址是否包含 `/next-agent/`。 |
| 样式或脚本 404 | 检查仓库名与构建 `basePath` 是否一致，重新构建并发布。 |
| 报告链接在另一设备打不开 | 报告仅存在原浏览器；请在原设备查看，或分享下载的结果图片。 |
| 保存失败 | 检查浏览器是否允许网站本地存储、剩余空间是否足够。页面报错时不要认为记录已保存。 |
| 已更新代码但页面仍旧 | 检查对应提交的 Actions 是否发布成功，再刷新页面。 |

## 历史服务端版本

此前版本的 PostgreSQL、Prisma、文件演示存储、Cookie 会话及可撤销分享属于服务端部署方案。其实现保留在 Git 历史中，不是当前 Pages 的运行依赖。不要把旧版后端测试结果当作静态版已经通过验证。

本项目仍为独立玩家工具。游戏名称、角色权利与公开部署相关说明见 [第三方说明](../THIRD_PARTY_NOTICES.md)。

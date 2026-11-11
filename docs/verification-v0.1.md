# v0.1.0 本地验证记录

日期：2026-11-10。环境：Windows、Node.js 24.22.1、Next.js 16.4.6、Prisma 7.10.1。

## 已实际完成

- `npm test`：5个测试文件、43项通过，包括推荐规则、真实内容审计、文件持久化/并发/排序、分享脱敏、Cookie与同源及流式请求体限制。
- `npm run typecheck`：通过。
- `npm run build`：通过，页面与后端接口均完成生产构建。
- `npm run test:e2e`：Chromium实际运行7项通过；包含6项HTTP测试和1项320px完整手机流程。
- 手机流程覆盖12题问答、3名候选、图表、无横向溢出、真实PNG下载与文件签名、公开分享创建、试玩评分、保存提示及重载后持久化。
- HTTP流程验证私有结果的拥有者隔离、公开摘要无原始回答或答题溯源、反馈保存、分享撤销、同源接受、跨站拒绝及非法答案处理。
- 生产服务实际运行并生成桌面、390px手机截图；截图采集未记录JavaScript运行错误。
- `prisma validate`通过，初始PostgreSQL迁移由Prisma差异命令生成。
- `npm audit`检查全部依赖，执行时报告0项已知漏洞。此结果不是未来依赖状态的保证。

## 清楚区分的验证范围

实际交互与存储验证使用本地文件演示模式。PostgreSQL的schema、迁移和访问代码已提供，尚未连接真实PostgreSQL实例运行集成测试。Docker构建/运行也尚未实测。

GitHub Actions工作流已经配置，但本地通过不代表远端CI已经执行。工作流使用Node22；checkout、setup-node、upload-artifact的v7稳定主版本已通过各官方latest页面及action.yml核对，官方Action运行时为Node24，支持所选Node22应用测试环境。

心理学测量效度、竞技收益、真实玩家喜好和推荐效果均不属于上述工程测试的结论。初始画像与权重仍需玩家反馈与人工内容评审。

## 复现

```sh
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Linux首次安装浏览器可使用 `npx playwright install --with-deps chromium`。端到端测试启动独立3100端口，并使用`.data/e2e`，不会连接开发者配置的数据库。

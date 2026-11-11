# 本命回响 · Agent Resonance

通过对局情境问答，找到你可能喜欢的无畏契约特工，并获得一份可以实际验证的试用报告。

本版包含 16 道原创情境题、64 个选项、5 个玩法偏好维度和至多 3 名候选推荐。角色库覆盖当日全部 **30 名特工**。每名候选附有推荐依据、可能不适应的地方与试玩任务。完成试玩后，你可以记录反馈；反馈用于人工检查和完善规则，不会自动训练或改变推荐算法。

**这是玩法偏好探索工具。结果不是科学人格测量、能力评估、竞技表现预测，也不是官方选角建议。**

在线演示：部署后补充。

## 项目封面与界面

![本命回响项目封面](docs/images/cover.svg)

上图为原创项目封面。新版界面可在本地运行后体验：新增全角色图鉴、心理学题目设计说明及16幕情境问答。`docs/images/` 中旧PNG为0.1版历史截图，未当作本版截图使用。

当前检查结果和受限项目见 [验证记录](docs/verification.md)。题目依据见 [问卷设计](docs/question-design.md)，完整官方名录及中文名核对见 [特工来源](docs/agent-sources.md)。

## 产品流程

1. 在手机或电脑上完成情境问答。
2. 查看五维偏好可视化、至多三名候选特工与推荐解释。
3. 按任务尝试几局，记录契合度与实际感受。
4. 按需创建独立的公开分享摘要；拥有者可以撤销分享。

无需注册、Riot 账号、游戏战绩、官方 API 或 API key。本版使用原创几何图形和文本，没有内置 Riot 角色图片。

| 页面 | 用途 |
| --- | --- |
| `/agents` | 搜索、按职责筛选完整30名特工 |
| `/quiz` | 完成问答 |
| `/results/[id]` | 查看自己的推荐报告 |
| `/tryout/[id]` | 查看试玩任务并记录反馈 |
| `/method` | 了解规则、版本与结果局限 |
| `/s/[publicId]` | 查看拥有者主动发布的分享摘要 |

## 本地运行

推荐 Node.js 24 LTS 及 npm，也支持 Node.js 22.12 以上的 22.x 版本。首次运行：

```sh
npm ci
npm run db:generate
npm run dev
```

浏览器打开终端显示的本地地址。环境变量说明见 `.env.example`；需要修改时，将其复制为 `.env` 后编辑。

未配置 `DATABASE_URL` 时，开发环境默认使用项目目录下的 `.data/` 文件演示存储。它适合本地体验，无需先安装数据库。请勿将 `.env` 或 `.data/` 提交到仓库。

## 使用 PostgreSQL

将 `.env.example` 复制为 `.env`，按其中的示例配置 `DATABASE_URL`，然后运行：

```sh
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run dev
```

`db:migrate` 使用 Prisma 的开发迁移流程，适用于本地开发。生产环境使用已提交的迁移文件及 `npm run db:deploy`。

生产环境必须配置 PostgreSQL；只有明确设置 `ALLOW_FILE_STORAGE=true` 时，才允许使用文件存储。生产文件存储需要持久磁盘和单实例运行，不能用于多实例或临时文件系统。具体步骤见 [部署文档](docs/deployment.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动已构建的生产版本 |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm run test` | 运行单元测试 |
| `npm run test:compat` | 在限制子进程的环境中，以线程兼容模式运行相同单元测试 |
| `npm run test:smoke` | 对已启动的本地服务运行API集成检查 |
| `npm run test:e2e` | 运行 Playwright 完整流程测试 |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:migrate` | 创建或应用本地开发迁移 |
| `npm run db:deploy` | 应用已提交的生产迁移 |

首次运行浏览器测试前，执行 `npx playwright install chromium`。Linux 持续集成环境使用 `npx playwright install --with-deps chromium`。

## 技术与规则

这是一个 Next.js App Router 单应用，前后端共享 TypeScript 类型与规则定义。界面使用 React 和 Recharts；接口输入通过 Zod 校验；配置数据库后使用 PostgreSQL 与 Prisma 7；验证使用 Vitest 与 Playwright。

推荐采用版本化的加权 L1 距离规则：比较问答形成的偏好与特工玩法画像，再输出候选及对应解释。匹配分只用于当前规则内的比较，不是适合该特工的概率，也不代表测量精度。题目、角色资料和规则可以分别审阅与改进，详见 [方法说明](docs/methodology.md)、[问卷设计依据](docs/question-design.md)与[内容维护指南](docs/content-guide.md)。

当前题库与角色库均为 `2.0.0`。算法规则另行版本化；每份报告绑定生成时的三个内容版本，更新不会自动改写旧结果。问卷虽然参考心理学概念组织情境，但没有直接采用正式量表，也没有建立常模或信效度证据。

## 数据与分享

私有报告及试玩反馈由拥有者会话管理。公开分享是主动创建的独立摘要，不公开逐题答案或私有反馈；拥有者可以撤销它。分享链接不授予报告管理权限。

首版没有账号恢复或跨设备同步。清除拥有者会话后，不应依赖公开分享链接恢复管理权限。试玩反馈不会自动更新权重，也不会用于训练模型。

## 参与开源

欢迎提交结果不合理的可复现样例、题目改进、特工画像、试玩任务、可访问性和功能改进。修改推荐内容时，请说明预期影响并附对比样例。开始前请阅读 [贡献指南](CONTRIBUTING.md)。

持续集成会执行依赖安装、Prisma 客户端生成、类型检查、单元测试、生产构建和浏览器流程测试。

## 许可证与非官方声明

本项目原创代码和原创题目采用 [MIT 许可证](LICENSE)。依赖及第三方权利说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目是非官方玩家工具，未获 Riot Games 背书或赞助。VALORANT、无畏契约、Riot Games、特工名称及相关游戏内容的权利属于各自权利人；本项目的 MIT 许可证不授予这些第三方权利。

公开上线前，请核对 [Riot VALORANT 开发者政策](https://developer.riotgames.com/docs/valorant)及其适用要求。该文档的 Registration 部分要求服务玩家的产品注册，即使未使用官方 API。本仓库不表示项目已获 Riot 注册确认或批准。

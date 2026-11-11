# 本地运行与部署

项目以一个 Next.js 应用运行。数据库是 PostgreSQL；未配置数据库时，本地开发可用文件演示存储。

## 运行条件

- Node.js 22.12 或更高版本及 npm。
- 配置数据库时，需要 PostgreSQL；仓库提供 `compose.yaml` 便于本地启动。
- 配置项以根目录 `.env.example` 为准，将其复制为 `.env` 后填写。

不要将 `.env`、本地数据目录或数据库备份提交到仓库。

## 本地文件演示

保持 `DATABASE_URL` 未配置，然后执行：

```sh
npm ci
npm run db:generate
npm run dev
```

数据保存在项目下的 `.data/`。该模式便于快速体验和开发，不需要数据库。删除该目录会删除本地演示数据。

## 本地 PostgreSQL

1. 将 `.env.example` 复制为 `.env`。
2. 配置 `DATABASE_URL`，确保账号、端口和数据库名与 `compose.yaml` 一致。
3. 执行以下命令：

```sh
docker compose up -d db
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

`db:migrate` 对应 Prisma 的开发迁移流程，用于本地创建和应用迁移。需要修改数据库结构时，在开发环境生成迁移、审阅迁移文件并提交到仓库。

## 生产 PostgreSQL

在部署环境配置 `DATABASE_URL`，使用已提交的锁文件与迁移文件。基本流程：

```sh
npm ci
npm run db:generate
npm run build
npm run db:deploy
npm run start
```

`db:deploy` 用于部署时应用已经提交的迁移。不要在生产环境使用 `db:migrate` 生成开发迁移。发布系统应先确认迁移成功，再将新版本投入服务。

数据库需要持续保存报告、会话相关数据、分享摘要和试玩反馈。部署者应安排数据库备份，并在发布前验证恢复方式。

构建和运行使用同一套应用版本与环境配置。若宿主平台分开执行构建、迁移和启动，请分别配置对应命令；无需另部署一个独立前端服务。

## 公开地址与反向代理

生产环境建议按实际域名设置以下配置，数据库地址与凭据使用部署环境提供的值：

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@DB_HOST:5432/nextagent"
APP_ORIGIN="https://your-domain.example"
```

将 `APP_ORIGIN` 替换为浏览器真正访问的公开 HTTPS 地址，包含非默认端口时也要保持一致，不要填写应用内部的容器地址。设置后，浏览器写请求除匹配实际 Host 外，还必须匹配这里的协议、域名和端口。生产会话 Cookie 使用 Secure，因此公开入口需要 HTTPS。

直接运行应用时，保持 `TRUST_PROXY` 未设置。只有可信反向代理会覆盖转发地址头、并且应用只接受这个入口的流量时，才设置：

```dotenv
TRUST_PROXY="true"
```

这个开关只决定限流是否采用入口提供的客户端地址，不会让任意转发 Host 成为可信来源。反向代理应保留浏览器访问的 Host，并覆盖传入的 `X-Forwarded-For`。例如，在已有 HTTPS 的 Nginx 站点中，可将以下配置加入对应位置；应用仍在本机 3000 端口运行：

```nginx
# 放在 Nginx 的 http 块中。
limit_req_zone $binary_remote_addr zone=next_agent_api:10m rate=30r/m;

# 放在该 HTTPS 站点的 server 块中。
location /api/ {
    limit_req zone=next_agent_api burst=20 nodelay;
    limit_req_status 429;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:3000;
}

location / {
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:3000;
}
```

示例对 `/api/` 统一按客户端地址限速，速率可结合实际流量调整。托管平台有网关限流能力时，也可以在那里配置同样的入口控制。

应用自带的写请求限流只在单个进程的内存里计数，重启会清空，多实例之间也不共享；它是后备保护。公开生产入口仍应使用代理或平台的限流能力。

## Docker 部署路径

仓库提供了 `Dockerfile`。Docker 镜像构建与容器运行尚未在本次环境中实测；下面给出使用 PostgreSQL 的部署命令，不代表容器验证已通过。

将生产配置保存为不提交到仓库的 `.env.production`，其中 `DATABASE_URL` 必须是容器可以访问的数据库地址。构建镜像、应用迁移后启动：

```sh
docker build -t next-agent:local .
docker run --rm --env-file .env.production next-agent:local npm run db:deploy
docker run --rm --name next-agent --env-file .env.production -p 127.0.0.1:3000:3000 next-agent:local
```

这里将应用端口绑定到本机，交给前面的 HTTPS 入口提供服务。容器中的 `localhost` 指向容器自身；不要直接把本地开发的数据库连接字符串照搬进容器。使用其他数据库容器时，应将它们接入同一个 Docker 网络，并使用可访问的数据库服务名。

## 生产文件存储例外

生产环境默认要求配置数据库。只有显式设置 `ALLOW_FILE_STORAGE=true` 时，才允许不配置 `DATABASE_URL` 而使用文件存储。

这种部署必须同时满足：

- `.data/` 位于可写的持久磁盘中，重启和重新部署不会清空。
- 只运行一个应用实例。
- 已安排数据备份，并确认应用运行账户具有必要的目录权限。

临时文件系统、会随发布重置的目录、多副本和自动扩容环境不适合文件存储，应使用 PostgreSQL。`ALLOW_FILE_STORAGE=true` 是部署者对该限制的明确选择，不会把临时磁盘变成持久存储。

## 发布前检查

```sh
npm run typecheck
npm run test
npm run build
```

安装浏览器并运行完整流程检查：

```sh
npx playwright install chromium
npm run test:e2e
```

Linux CI 使用 `npx playwright install --with-deps chromium` 安装浏览器及运行所需依赖。仓库的 GitHub Actions 将基础检查与 Playwright 流程分为独立任务，失败时保留浏览器测试报告。

在部署环境用示例数据确认：答题能够生成报告；其他会话不能管理私有报告；主动生成的分享摘要可访问且不包含私有答案或反馈；撤销后公开链接失效；试玩反馈可以保存。不要用真实用户数据填充演示实例。

## 公开上线与游戏素材

首版不接 Riot 登录、战绩或 API，不分发 Riot 角色图片。公开上线前仍需核对 [Riot VALORANT 开发者政策](https://developer.riotgames.com/docs/valorant)；其 Registration 部分要求服务玩家的产品注册，无论是否使用官方 API。

结合实际部署地区、产品功能和素材使用方式核对 Riot 的适用要求及非官方声明。本仓库、测试通过或成功部署都不代表项目已获 Riot 批准。更多内容见 [第三方说明](../THIRD_PARTY_NOTICES.md)。

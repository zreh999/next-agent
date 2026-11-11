# 分享海报的立绘与角色台词来源

核对日期：**2026-11-11**。媒体元数据：`content/agent-media.json` **1.0.0**。本次仅使用立绘和文字短句，不提供语音播放、音频文件或 AI 仿声。

## 立绘与配色

- [VALORANT-API 可玩角色名录](https://valorant-api.com/v1/agents?isPlayableCharacter=true)：本次实际返回 30 名可玩特工，含 Hush、Miks、Veto、Waylay、Tejo。
- 每名立绘地址取自该记录的 `fullPortraitV2`；`accent` 是 `backgroundGradientColors[0]` 去除末尾 alpha 后的 RGB 色值。不是重新猜测或生成角色立绘。
- VALORANT-API 是社区提供的数据服务，使用其自有 `media.valorant-api.com` 媒体主机；[服务首页](https://valorant-api.com/)明确说明资源来自游戏文件，且不是 Riot 官方背书的产品。元数据中每项 `sourceUrl` 另指向 Riot 官方角色页面，供用户了解原角色。
- 立绘及 VALORANT 相关 IP 权利属于 Riot Games。社区托管不改变素材权利，也不意味着 Riot 批准本项目。项目 MIT 许可证不授予立绘、商标、角色或台词的第三方权利。
- 本次核对了 API 的字段与覆盖，不把未执行的 CDN 文件下载、HTTP 响应头或跨域画布测试记作通过。外链加载和画布读取可能受网络、CORS 或资源变更影响；实现应有明确的加载状态和失败兜底。

## 台词与中文译意

每名只选一条可核对的英文选角句或技能短句，原文存于 `quote.text`。本次每条为 2—8 个英文词，且每个独立来源页仅采用一条短句，不搬运整张台词表。台词由 Riot 游戏内容产生，Wiki 是整理与核对来源，并非本项目原创角色台词。

`quote.translation` 是本项目为阅读与海报排版整理的**中文译意**，不是经过核对的国服官方配音文本，不标注为“国服原句”。译意不会改变英文原句的版权归属。海报及页面应保留非官方说明及素材权利提示。

来源为 [VALORANT Wiki](https://wiki.playvalorant.com/en-us/VALORANT_Wiki:About)：它由玩家维护、由 Weird Gloop 托管，并得到 Riot 支持；不能把社区整理的每项内容直接称为 Riot 官方资料或额外授权。下表记录实际取句位置，避免在文档中再次重复整批引文。

| 项目标识 | 原句来源页 | 取句位置 |
| --- | --- | --- |
| astra | [Astra/Quotes](https://wiki.playvalorant.com/en-us/Astra/Quotes) | 选角／解锁 |
| breach | [Breach/Quotes](https://wiki.playvalorant.com/en-us/Breach/Quotes) | 选角／解锁 |
| brimstone | [Brimstone/Quotes](https://wiki.playvalorant.com/en-us/Brimstone/Quotes) | Orbital Strike · Ally Cast |
| chamber | [Chamber/Quotes](https://wiki.playvalorant.com/en-us/Chamber/Quotes) | Tour De Force · Enemy Cast |
| clove | [Clove/Quotes](https://wiki.playvalorant.com/en-us/Clove/Quotes) | 选角／解锁 |
| cypher | [Cypher/Quotes](https://wiki.playvalorant.com/en-us/Cypher/Quotes) | Neural Theft · Enemy Cast |
| deadlock | [Deadlock/Quotes](https://wiki.playvalorant.com/en-us/Deadlock/Quotes) | Annihilation · Enemy Cast |
| fade | [Fade/Quotes](https://wiki.playvalorant.com/en-us/Fade/Quotes) | Nightfall · Enemy Cast |
| gekko | [Gekko/Quotes](https://wiki.playvalorant.com/en-us/Gekko/Quotes) | Wingman · Cast |
| harbor | [Harbor/Quotes](https://wiki.playvalorant.com/en-us/Harbor/Quotes) | Reckoning · Ally Cast |
| hush | [Hush/Quotes](https://wiki.playvalorant.com/en-us/Hush/Quotes) | 选角／解锁 |
| iso | [Iso/Quotes](https://wiki.playvalorant.com/en-us/Iso/Quotes) | 选角／解锁 |
| jett | [Jett/Quotes](https://wiki.playvalorant.com/en-us/Jett/Quotes) | Blade Storm · Ally Cast |
| kayo | [KAYO/Quotes](https://wiki.playvalorant.com/en-us/KAYO/Quotes) | NULL/cmd · Ally Cast |
| killjoy | [Killjoy/Quotes](https://wiki.playvalorant.com/en-us/Killjoy/Quotes) | 选角／解锁 |
| miks | [Miks/Quotes](https://wiki.playvalorant.com/en-us/Miks/Quotes) | 选角／解锁 |
| neon | [Neon/Quotes](https://wiki.playvalorant.com/en-us/Neon/Quotes) | 选角／解锁 |
| omen | [Omen/Quotes](https://wiki.playvalorant.com/en-us/Omen/Quotes) | 选角／解锁 |
| phoenix | [Phoenix/Quotes](https://wiki.playvalorant.com/en-us/Phoenix/Quotes) | 选角 |
| raze | [Raze/Quotes](https://wiki.playvalorant.com/en-us/Raze/Quotes) | Showstopper · Ally Cast |
| reyna | [Reyna/Quotes](https://wiki.playvalorant.com/en-us/Reyna/Quotes) | 选角／解锁 |
| sage | [Sage/Quotes](https://wiki.playvalorant.com/en-us/Sage/Quotes) | 选角 |
| skye | [Skye/Quotes](https://wiki.playvalorant.com/en-us/Skye/Quotes) | 选角／解锁 |
| sova | [Sova/Quotes](https://wiki.playvalorant.com/en-us/Sova/Quotes) | 选角 |
| tejo | [Tejo/Quotes](https://wiki.playvalorant.com/en-us/Tejo/Quotes) | 选角／解锁 |
| veto | [Veto/Quotes](https://wiki.playvalorant.com/en-us/Veto/Quotes) | 选角／解锁 |
| viper | [Viper/Quotes](https://wiki.playvalorant.com/en-us/Viper/Quotes) | 选角／解锁 |
| vyse | [Vyse/Quotes](https://wiki.playvalorant.com/en-us/Vyse/Quotes) | 选角／解锁 |
| waylay | [Waylay/Quotes](https://wiki.playvalorant.com/en-us/Waylay/Quotes) | 选角／解锁 |
| yoru | [Yoru/Quotes](https://wiki.playvalorant.com/en-us/Yoru/Quotes) | 选角／解锁 |

KAY/O 的显示名含斜线，但本次实际核对的 Wiki 页面路径为 `KAYO/Quotes`。新增或替换台词时，应重新打开对应来源核对原文、标点和场景；不能从角色性格猜一句话，再标成原作台词。

## 官方资料与使用边界

- [Riot Legal Jibber Jabber](https://www.riotgames.com/en/legal)：对使用 Riot IP 的玩家项目给出附条件、可撤回的许可；应结合项目形式和适用政策核对。免费、公开素材或社区镜像均不等于任意用途的永久授权。
- [VALORANT 开发者政策](https://developer.riotgames.com/docs/valorant)：Assets 部分提供图像与 JSON 的 Public Content Catalog；文档也说明更新为手工过程，可能滞后。Registration 要求服务玩家的产品注册，即使未使用官方 API。本项目不表示已经得到 Riot 注册确认。
- [官方角色总览](https://playvalorant.com/en-us/agents/)及各条目的官方角色页用于了解角色身份与机制，不将其当作本项目原创推荐分数的官方背书。
- 项目继续保留 [第三方说明](../THIRD_PARTY_NOTICES.md)及非官方玩家工具声明；代码和原创题目与第三方角色素材的权利分别处理。

## 本版不接入音频

本次查询的第三方角色名录中 `voiceLine` 字段均为 `null`，不能据此虚构 30 名原声文件。Wiki 的原声音频文件页另有针对 Wiki 使用的版权／fair-use 声明，不能自动扩大解释为本网站的通用重分发许可。

[2026-06-12 官方 Exclusive Discord Drop](https://playvalorant.com/en-us/news/game-updates/exclusive-discord-drop/)介绍了 Clove、Viper、Jett、Gekko、Omen 五名的语音包与 Discord 使用场景。本次没有把它当作 30 名完整语音库，也没有下载或分发该包。用户已明确本版采用“图片海报加角色经典台词”，因此不接入音频。

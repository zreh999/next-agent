# 特工名录与机制来源

核对日期：**2026-11-11**。对应 `content/agents.json` **2.0.0**，共 **30 名**特工。原有 12 个特工标识保持不变，便于读取旧报告。

## 两套官方来源

1. **全球官网：职业、英文名称与技能机制。**
   - [VALORANT 官方特工总览](https://playvalorant.com/en-us/agents/)。
   - 每名特工的独立官方页保存在各条记录的 `sourceUrl`，并列于下表。核对时读取了页面的 `__NEXT_DATA__` 结构化内容，检查 `characterMasthead` 中的职业及 `iconTab` 中的技能全文。
2. **国服官网：简体中文名称与英文名称对应关系。**
   - [无畏契约国服官网主站](https://val.qq.com/main.html)。
   - [官网公开脚本 common-ob.js](https://val.qq.com/js/common-ob.js) 的 `getAllHeroList` 使用名录查询 `agents { id name e_name icon }`。
   - [国服官方公开名录接口](https://api.val.qq.com/go/agame/graphql/graphiQL?query=%7B%20agents%20%7B%20id%20name%20e_name%20icon%20%7D%20%7D)。核对时接口返回 30 条记录；仅使用名称与对应关系，没有下载图标。

本次将旧稿 Skye 的“丝凯”按国服官方名称修正为“**斯凯**”。KAY/O 的国服展示名称为“**K/O**”，英文名称仍保存为“**KAY/O**”。中文名称不混用其他地区的译名。

## 完整名录

| 项目标识 | 国服名称 | 英文名称及官方机制页 | 职业 |
|---|---|---|---|
| astra | 星礈 | [Astra](https://playvalorant.com/en-us/agents/astra/) | 控场 |
| breach | 铁臂 | [Breach](https://playvalorant.com/en-us/agents/breach/) | 先锋 |
| brimstone | 炼狱 | [Brimstone](https://playvalorant.com/en-us/agents/brimstone/) | 控场 |
| chamber | 尚勃勒 | [Chamber](https://playvalorant.com/en-us/agents/chamber/) | 哨卫 |
| clove | 暮蝶 | [Clove](https://playvalorant.com/en-us/agents/clove/) | 控场 |
| cypher | 零 | [Cypher](https://playvalorant.com/en-us/agents/cypher/) | 哨卫 |
| deadlock | 钢锁 | [Deadlock](https://playvalorant.com/en-us/agents/deadlock/) | 哨卫 |
| fade | 黑梦 | [Fade](https://playvalorant.com/en-us/agents/fade/) | 先锋 |
| gekko | 盖可 | [Gekko](https://playvalorant.com/en-us/agents/gekko/) | 先锋 |
| harbor | 海神 | [Harbor](https://playvalorant.com/en-us/agents/harbor/) | 控场 |
| hush | 遐思 | [Hush](https://playvalorant.com/en-us/agents/hush/) | 决斗 |
| iso | 壹决 | [Iso](https://playvalorant.com/en-us/agents/iso/) | 决斗 |
| jett | 捷风 | [Jett](https://playvalorant.com/en-us/agents/jett/) | 决斗 |
| kayo | K/O | [KAY/O](https://playvalorant.com/en-us/agents/kay-o/) | 先锋 |
| killjoy | 奇乐 | [Killjoy](https://playvalorant.com/en-us/agents/killjoy/) | 哨卫 |
| miks | 迷核 | [Miks](https://playvalorant.com/en-us/agents/miks/) | 控场 |
| neon | 霓虹 | [Neon](https://playvalorant.com/en-us/agents/neon/) | 决斗 |
| omen | 幽影 | [Omen](https://playvalorant.com/en-us/agents/omen/) | 控场 |
| phoenix | 不死鸟 | [Phoenix](https://playvalorant.com/en-us/agents/phoenix/) | 决斗 |
| raze | 雷兹 | [Raze](https://playvalorant.com/en-us/agents/raze/) | 决斗 |
| reyna | 芮娜 | [Reyna](https://playvalorant.com/en-us/agents/reyna/) | 决斗 |
| sage | 贤者 | [Sage](https://playvalorant.com/en-us/agents/sage/) | 哨卫 |
| skye | 斯凯 | [Skye](https://playvalorant.com/en-us/agents/skye/) | 先锋 |
| sova | 猎枭 | [Sova](https://playvalorant.com/en-us/agents/sova/) | 先锋 |
| tejo | 钛狐 | [Tejo](https://playvalorant.com/en-us/agents/tejo/) | 先锋 |
| veto | 禁灭 | [Veto](https://playvalorant.com/en-us/agents/veto/) | 哨卫 |
| viper | 蝰蛇 | [Viper](https://playvalorant.com/en-us/agents/viper/) | 控场 |
| vyse | 维斯 | [Vyse](https://playvalorant.com/en-us/agents/vyse/) | 哨卫 |
| waylay | 幻棱 | [Waylay](https://playvalorant.com/en-us/agents/waylay/) | 决斗 |
| yoru | 夜露 | [Yoru](https://playvalorant.com/en-us/agents/yoru/) | 决斗 |

职业分布：**决斗 9、先锋 7、控场 7、哨卫 7**，合计 **30**。英文职业对应 `duelist`、`initiator`、`controller`、`sentinel`。

## 重点复核的机制

- **遐思 / Hush：** `TELEKINESIS` 被动是更远距离拾取武器、爆能器和交互开关，不能把它描述为赋予所有道具通用引导能力。`FLASHBULB` 与 `DISPLACEMENT` 各自支持投出、预备与重新朝准星方向引导。`DISPLACEMENT` 会拉拽范围内所有玩家；目标与表面或其他玩家相撞才产生震荡。`FLOW` 创建锚点并在延迟后朝其移动，在空中使用还会短暂悬浮。试玩任务据这些机制设计，没有使用凭空猜测的技能名或“主动终止引导”操作。
- **禁灭 / Veto：** `INTERCEPTOR` 处理的是会碰到角色后弹开、或可自然被枪火摧毁的技能道具，不能概括为所有技能，也不能将“碰撞”误写成“玩家交互”。`CROSSCUT` 传送要求处于旋涡范围内并看向旋涡，购买阶段可以回收重新部署；画像没有把它描述为任意地点的即时退路。
- **迷核 / Miks：** 除了 `HARMONIZE` 的战斗增益与 `M-pulse` 的震荡/治疗切换，官方还列有 `WAVEFORM` 地图定点烟。描述与试玩任务同时覆盖控场职责，避免将其仅写成治疗或增益角色。
- **海神 / Harbor：** 本次官方页的 `COVE` 是选择位置形成水烟、再开启可被摧毁的阻弹护盾；没有沿用旧版投掷护盾球的操作描述。

## 内容边界与后续维护

官方来源用于核实名称、职业和机制。五维画像、练习投入、沟通投入、取舍说明与三条试玩任务均为维护者原创设计；它们不是 Riot 的官方角色评分、心理学量表或竞技能力结论，也不承诺特定补丁的强度排序。

`reviewedAt` 表示本次整理日期，不能代替后续补丁复核。本版不记录技能伤害、持续时间等易变数值，没有下载角色图片、技能图标或视频，也没有将 Riot 素材纳入代码许可证。

更新名录时应同时检查官网总览、国服名称接口与独立特工页，调整内容版本，并保留旧报告所绑定的历史快照。

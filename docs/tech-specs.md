# 技术规范

## 运行环境

- 浏览器直接打开 index.html（file:// 协议）
- 无需服务器，无跨域问题

## 数据存储

所有数据存储在浏览器 LocalStorage 中，Key 命名规范：

| Key | 内容 | 数据格式 |
|-----|------|----------|
| `characters` | 角色列表 | JSON 数组 |
| `treasures` | 法宝列表 | JSON 数组 |
| `pets` | 灵宠列表 | JSON 数组 |
| `items` | 道具列表 | JSON 数组 |
| `skills_gongfa` | 功法列表 | JSON 数组 |
| `skills_shentong` | 神通列表 | JSON 数组 |
| `gacha_pools` | 卡池列表 | JSON 数组 |
| `gacha_char_base` | 角色池常驻奖励 | JSON 数组 |
| `gacha_history_<poolId>` | 各卡池抽卡记录 | JSON 数组 |
| `gacha_stats_<poolId>` | 各卡池抽卡统计 | JSON 对象 |
| `leaderboard` | 排行榜角色引用 | JSON 数组 |

## 图片处理

- 使用文件引用方式（`img/<子目录>/<文件名>`）
- ImageUpload 组件：文件名输入框 + 实时预览
- 支持旧 base64 数据兼容迁移
- 子目录：characters/ treasures/ pets/ skills/ items/ map/ background/ events/

## 路由设计

- Hash 路由：`#characters`、`#treasures` 等
- 详情页：`#characters/detail?id=xxx`
- 卡池页：`#gacha-normal`、`#gacha-up`、`#gacha-skill`
- 卡池详情：`#gacha/detail?id=xxx`
- 卡池编辑：`#gacha/edit?id=xxx`
- App.navigate() 统一入口 + _suppressHashChange 防双重渲染

## 修为系统

```
20个境界：练气初期~化神巅峰
大境界: 练气(0-3), 筑基(4-7), 金丹(8-11), 元婴(12-15), 化神(16-19)
小境界: 初期=阶内第1, 中期=阶内第2, 后期=阶内第3, 巅峰=阶内第4
```

## 战力公式

```
战力 = HP/10 + ATK/2 + DEF/2 + critRate + critDmg + resist/0.8 + dmgBonus/0.8
```

## 五行克制

```
金 → 木 → 水 → 火 → 土 → 金
```

## 抽卡概率

### 角色池
- 红色(仙品): 0.6%基础，71抽软保底，100硬保底，综合约64抽/红
- 金色(天品): 3.0%基础，十连保底，综合约11.5%
- 紫色(地品): 12.0%，蓝色(玄品): 84.4%

### 技能池
- 红色: 0.8%基础，36抽软保底，60硬保底，综合约39抽/红
- 金色: 3.0%，十连保底
- 仙缘值/悟道值累进提高出红概率，出红清零

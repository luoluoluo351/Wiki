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
| `skills_gongfa` | 功法列表 | JSON 数组 |
| `skills_shentong` | 神通列表 | JSON 数组 |
| `map_image` | 地图图片 | Base64 字符串 |

## 图片处理

- 使用 HTML5 Drag & Drop API + FileReader
- 图片转为 Base64 字符串存储
- 单张图片限制 2MB（约 800×800 内）

## 路由设计

- Hash 路由：`#characters`、`#treasures` 等
- 详情页：`#characters/detail?id=xxx`
- 通过 `window.onhashchange` 监听切换

## 修为系统

```
大境界: 练气(1-3), 筑基(4-6), 金丹(7-9), 元婴(10-12), 化神(13-15)
小境界: 初期=阶内第1, 中期=阶内第2, 后期=阶内第3
对应等级: 练气初期=Lv1, 练气中期=Lv2, ..., 化神后期=Lv15
```

## 成长值计算

- 公式：`(满级值 - 1级值) / (满级等级 - 1)`
- 角色 1→100 级（分母 99）
- 法宝/灵宠 1→60 级（分母 59）

## 五行克制

```
金 → 木 → 水 → 火 → 土 → 金
```

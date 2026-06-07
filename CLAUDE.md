# 修仙游戏 Wiki

纯 HTML+CSS+JS 本地 PC 端网页，不引入任何框架或库。

## 标准文件路径

| 文件 | 用途 |
|------|------|
| [index.html](index.html) | 主页面 |
| [css/style.css](css/style.css) | 全局样式 |
| [js/app.js](js/app.js) | 入口：路由、导航、初始化、首页、排行榜 |
| [js/storage.js](js/storage.js) | LocalStorage 读写封装 |
| [js/image.js](js/image.js) | 图片文件名引用组件（非 base64） |
| [js/characters.js](js/characters.js) | 角色图鉴 |
| [js/treasures.js](js/treasures.js) | 法宝图鉴 |
| [js/pets.js](js/pets.js) | 灵宠图鉴 |
| [js/skills.js](js/skills.js) | 功法与神通 |
| [js/items.js](js/items.js) | 道具图鉴 |
| [js/damage.js](js/damage.js) | 伤害计算器 |
| [js/gacha.js](js/gacha.js) | 模拟抽卡系统（卡池管理+抽卡逻辑+动画） |
| [js/map.js](js/map.js) | 地图 |
| [js/placeholder.js](js/placeholder.js) | 未开发模块占位 |
| [docs/requirements.md](docs/requirements.md) | 需求文档 |
| [docs/tech-specs.md](docs/tech-specs.md) | 技术规范 |
| [docs/design.md](docs/design.md) | 设计规范 |
| [docs/execution-plan.md](docs/execution-plan.md) | 执行步骤 |
| [devlog/](devlog/) | 开发日志目录 |

## 图片目录

| 目录 | 用途 |
|------|------|
| img/characters/ | 角色半身头像+全身立绘 |
| img/treasures/ | 法宝图片 |
| img/pets/ | 灵宠图片 |
| img/skills/ | 功法神通图片 |
| img/items/ | 道具图片 |
| img/map/ | 地图图片 |
| img/background/ | 全局背景轮换（bg1~4.jpg） |
| img/events/ | 首页活动轮播 |

## 工作说明

- 每次修改代码前先读取 docs/ 中相关文档了解上下文
- 每日开发结束后更新 devlog/ 中的日志
- 重要设计变更需同步更新 docs/ 中对应文档
- 代码风格：纯 JS（无框架）、中文注释、模块化拆分

## 禁止事项

- 不引入任何框架或库（无 npm、无 CDN）
- 不创建 README.md
- 不使用任何构建工具

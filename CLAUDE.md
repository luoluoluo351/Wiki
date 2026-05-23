# 修仙游戏 Wiki

纯 HTML+CSS+JS 本地 PC 端网页，不引入任何框架或库。

## 标准文件路径

| 文件 | 用途 |
|------|------|
| [index.html](index.html) | 主页面 |
| [css/style.css](css/style.css) | 全局样式 |
| [js/app.js](js/app.js) | 入口：路由、导航、初始化 |
| [js/storage.js](js/storage.js) | LocalStorage 读写封装 |
| [js/image.js](js/image.js) | 拖拽上传图片通用组件 |
| [js/characters.js](js/characters.js) | 角色图鉴 |
| [js/treasures.js](js/treasures.js) | 法宝图鉴 |
| [js/pets.js](js/pets.js) | 灵宠图鉴 |
| [js/skills.js](js/skills.js) | 功法与神通 |
| [js/damage.js](js/damage.js) | 伤害计算器 |
| [js/placeholder.js](js/placeholder.js) | 未开发模块占位 |
| [docs/requirements.md](docs/requirements.md) | 需求文档 |
| [docs/tech-specs.md](docs/tech-specs.md) | 技术规范 |
| [docs/design.md](docs/design.md) | 设计规范 |
| [docs/execution-plan.md](docs/execution-plan.md) | 执行步骤 |
| [devlog/](devlog/) | 开发日志目录 |

## 工作说明

- 每次修改代码前先读取 docs/ 中相关文档了解上下文
- 每日开发结束后更新 devlog/ 中的日志
- 重要设计变更需同步更新 docs/ 中对应文档
- 代码风格：纯 JS（无框架）、中文注释、模块化拆分

## 禁止事项

- 不引入任何框架或库（无 npm、无 CDN）
- 不创建 README.md
- 不使用任何构建工具

# 设计规范

> 浅色版水墨竹林风主题，融入八卦水墨元素。

## 配色方案

| 变量 | 色值 | 用途 |
|------|------|------|
| --bg | #e3edda | 页面底色 |
| --card-bg | #f5f9f0 | 卡片/内容区背景 |
| --input-bg | #eef5e6 | 输入框背景 |
| --nav-bg | rgba(240,247,235,0.95) | 导航栏毛玻璃 |
| --gold | #b8944c | 金色强调 |
| --green | #5a7a4a | 绿色按钮 |
| --bamboo | #4a6b3a | 竹色标题 |
| --ink | #2c2416 | 墨色 |
| --text | #3d3226 | 主文字 |
| --text-dim | #6b7a5e | 次要文字 |
| --border | #c8d5b8 | 边框 |
| --shadow | 0 2px 12px rgba(50,80,30,0.08) | 卡片阴影 |

## 布局

- 顶部导航栏固定 58px，毛玻璃效果
- 内容区 (#app) 最大宽度 1200px，居中，半透明白色矩形背景
- 首页三栏布局：左栏近期更新(260px) + 中栏活动轮播(flex) + 右栏公告+导航(260px)
- 全局背景固定层 (#global-bg)，背景图片 15s 轮换

## 元素样式

- 卡牌：圆角 10px，悬停上浮+金边
- 行式列表：row-item 背景 #f5f9f0，悬停金边
- 八卦水印：body::before(右下大号) + body::after(左上小号)，SVG 内联
- 首页八卦：居中大幅淡彩太极图
- 竹叶光斑+竹竿暗纹 body背景

## 字体

- 系统字体栈：`"Microsoft YaHei", "PingFang SC", "Noto Serif SC", "KaiTi", sans-serif`
- 楷体用于标题：`"KaiTi", "Noto Serif SC", serif`

## 五行配色

| 五行 | 色值 | CSS类 |
|------|------|-------|
| 金 | #b8944c | tag-gold |
| 木 | #6b8c5c | tag-wood |
| 水 | #5b8a9a | tag-water |
| 火 | #c46b5b | tag-fire |
| 土 | #9b7b5b | tag-earth |

## 抽卡稀有度配色

| 稀有度 | 色值 | 标签 |
|--------|------|------|
| 红色/仙品 | #ff3333 | UR |
| 金色/天品 | #ff8800 | SSR |
| 紫色/地品 | #aa44ff | SR |
| 蓝色/玄品 | #4488ff | R |

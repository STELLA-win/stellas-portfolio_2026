# 切霉豆腐

《切霉豆腐》是一款由中文双关驱动的 Web 互动小游戏。用户通过滑动屏幕，切掉焦虑、内耗与生活中的小倒霉。

## GitHub Pages 版本

该目录运行原始 Cloud Run 生产构建，保留了原版的：

- Inter 与 ZCOOL XiaoWei 字体体系
- Lucide SVG 图标
- React / Framer Motion 页面动画
- Canvas 豆腐造型、切割轨迹、碎片和粒子效果
- 原始游戏规则、音效、连斩与结算界面

由于 GitHub 文件写入接口对单次传输大小有限制，原始 JavaScript 构建被无损拆分为文本片段，并由 `assets/loader.js` 在浏览器中按原顺序恢复执行。拆分前后的 UTF-8 内容完全一致。

`assets/compat.css` 只负责 GitHub Pages 兼容和小高度屏幕下的结果页完整显示，不重新设计原版界面。

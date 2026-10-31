# 方块波浪

这是共享组件包的接入示例；运行前需准备包和素材。导出未安装依赖。

在本目录安装公开包并准备素材：

```sh
node install-wise-motion.cjs
node node_modules/wise-motion/scripts/install-assets.mjs public/wise-motion --effect claude-sine-grid-illustration
npx remotion studio src/index.jsx
# 渲染
npx remotion render src/index.jsx Effect output.mp4
```

安装程序优先使用当前交付版本 0.1.22；该版本尚未上架时，自动降级为同一版本系列最近的已发布稳定版，并安装该包声明的配套依赖。实际版本会显示并固定到项目依赖中；重跑安装程序会再次优先检查当前交付版本。联网、权限和依赖冲突不会触发降级。旧版缺少所选动效或样式时会报错，请等待上架或安装从当前源码打包的包文件。

源码入口与原素材路径见 src/Root.jsx 顶部注释；代码、字体和许可随共享包提供；大素材按当前版本下载并校验，安装后本地使用。修改 settings 可调整条目支持的内容、样式、速度与缓动；内容字段需符合该条目的接口。

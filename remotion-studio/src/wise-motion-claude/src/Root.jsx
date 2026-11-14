/* 方块波浪 · Remotion 接入示例，保存为 src/Root.jsx。
自有代码 Apache-2.0；第三方和素材许可见源码包 NOTICE.md。

这是调用共享包的接入代码；完整绘制实现位于以下源码文件。
安装公开包后，绘制源码位于目标工程：
node_modules/wise-motion/catalog/effects/claude-tile-illustrations.js

在独立目标工程运行下方整段命令：优先安装当前版本，尚未上架时自动降级为同系列最近的已发布稳定版，依赖随所选包版本安装。
node --input-type=commonjs <<'WISE_MOTION_INSTALL'
// Copyright (c) 2026 Wise Wong. SPDX-License-Identifier: Apache-2.0
try {
(function installPackage({version,effectId,variantId}, {run,readInstalled,log=console.log}={}) {
    const stable=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    if(!stable.test(version))throw Error('安装版本必须是完整的稳定版本号。');
    run=run||require('node:child_process').spawnSync;
    const npm=process.platform==='win32'?'npm.cmd':'npm';
    const options={encoding:'utf8',shell:process.platform==='win32'};
    function view(spec,fields) {
      const result=run(npm,['view',spec,...fields,'--json'],options);
      let data;
      try{data=JSON.parse(result.stdout||'null');}catch{throw Error('npm 仓库返回的数据无法解析：'+spec);}
      if(result.error||result.status!==0) {
        const error=Error(result.error?.message||data?.error?.summary||result.stderr?.trim()||'npm 查询失败：'+spec);
        error.code=data?.error?.code;
        throw error;
      }
      return data;
    }
    let selected=version,metadata;
    try{metadata=view('wise-motion@'+selected,['version','dependencies']);}
    catch(error) {
      // 只有所选版本未上架才降级；联网、权限等错误不能当成发布等待。
      if(!['E404','ETARGET'].includes(error.code))throw error;
      const versions=view('wise-motion',['versions']);
      if((Array.isArray(versions)?versions:[versions]).includes(version))throw error;
      const [major,minor,patch]=version.split('.').map(Number);
      const candidates=(Array.isArray(versions)?versions:[versions]).filter(candidate=>{
        if(typeof candidate!=='string'||!stable.test(candidate))return false;
        const parts=candidate.split('.').map(Number);
        return parts[0]===major&&parts[1]===minor&&parts[2]<patch;
      }).sort((a,b)=>Number(b.split('.')[2])-Number(a.split('.')[2]));
      if(!candidates.length)throw Error('当前版本 '+version+' 尚未发布，同一版本系列也没有可降级的稳定版。');
      selected=candidates[0];
      metadata=view('wise-motion@'+selected,['version','dependencies']);
      log('当前版本 '+version+' 尚未上架，自动降级为已发布版本 '+selected+'。');
    }
    if(metadata?.version!==selected)throw Error('npm 仓库返回的包版本与所选版本不一致。');
    const packages=['react','react-dom','remotion','@remotion/cli'].map(name=>{
      const dependency=metadata.dependencies?.[name];
      if(!stable.test(dependency||''))throw Error('包内配套依赖缺少固定版本：'+name);
      return name+'@'+dependency;
    });
    log('正在安装 wise-motion@'+selected+' 及该版本的配套依赖。');
    const result=run(npm,['install','--save-exact','wise-motion@'+selected,...packages],{...options,stdio:'inherit'});
    if(result.error||result.status!==0)throw Error(result.error?.message||'安装失败，请按上方 npm 错误处理后重试。');
    if(!readInstalled)readInstalled=()=>{
      const fs=require('node:fs'),path=require('node:path');
      const localRequire=require('node:module').createRequire(path.join(process.cwd(),'package.json'));
      const packageRoot=path.resolve(path.dirname(localRequire.resolve('wise-motion')),'..');
      const read=file=>JSON.parse(fs.readFileSync(path.join(packageRoot,file),'utf8'));
      return {version:read('package.json').version,registry:effectId?read('catalog/registry.json'):undefined};
    };
    const installed=readInstalled();
    if(installed.version!==selected)throw Error('实际安装版本与所选版本不一致，请检查目标工程的依赖。');
    if(effectId) {
      const effect=installed.registry?.effects?.find(effect=>effect.id===effectId);
      if(!effect||(variantId&&!effect.variants?.some(variant=>variant.id===variantId)))
        throw Error('已安装版本 '+selected+' 尚不包含所选动效或样式 '+effectId+(variantId?'/'+variantId:'')+'；请等待当前版本上架，或安装从当前源码打包的包文件。');
    }
    log('安装完成，实际使用 wise-motion@'+selected+'（已固定版本）。');
    return selected;
  })({"version":"0.1.22","effectId":"claude-sine-grid-illustration"});
} catch(error) { console.error(error.message); process.exitCode=1; }
WISE_MOTION_INSTALL
node node_modules/wise-motion/scripts/install-assets.mjs public/wise-motion --effect claude-sine-grid-illustration
将 src/index.jsx 写为：import {registerRoot} from 'remotion'; import {Root} from './Root'; registerRoot(Root);
npx remotion render src/index.jsx Effect output.mp4

组件内部仍使用原绘制代码；代码、字体和常用素材随包提供，大素材按清单从对应 GitHub 版本准备：
vendor/animejs/anime.umd.min.js
catalog/content.js
catalog/runtime.js
catalog/effects/claude-tile-illustrations.js

素材明细见包内 ASSET-MANIFEST.json。安装后只访问目标工程 public/wise-motion，
不依赖原目录或本机绝对地址。视频使用固定演示动作；时钟为每秒 60 帧。
*/
import React from 'react';
import {Composition} from 'remotion';
import {WiseMotionEffect,getEffectMetadata} from 'wise-motion';
const settings = {
  "effectId": "claude-sine-grid-illustration",
  "speed": 1,
  "theme": "dark"
};
const meta = getEffectMetadata(settings.effectId,settings);
export const Effect = () => <WiseMotionEffect {...settings} />;
export const Root = () => <Composition id="Effect" component={Effect}
  width={meta.width} height={meta.height} fps={meta.fps}
  durationInFrames={meta.durationInFrames} />;

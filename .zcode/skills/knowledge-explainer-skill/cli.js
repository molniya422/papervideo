#!/usr/bin/env node
// knowledge-explainer-skill CLI
// 用法: node cli.js <script.md> [output.mp4]

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {parseScript} = require('./parser');
const {generateComposition} = require('./generator');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: node cli.js <script.md> [output.mp4]');
  console.error('  默认输出: out/<script>.mp4');
  process.exit(1);
}

const scriptPath = path.resolve(args[0]);
if (!fs.existsSync(scriptPath)) {
  console.error(`❌ 文稿不存在: ${scriptPath}`);
  process.exit(1);
}

const baseName = path.basename(scriptPath, path.extname(scriptPath));
const outputPath = args[1] ? path.resolve(args[1]) : path.resolve(`out/${baseName}.mp4`);

const repoRoot = path.resolve(__dirname);

console.log('🔍 解析文稿...');
const md = fs.readFileSync(scriptPath, 'utf8');
const parsed = parseScript(md);
console.log(`   📄 标题: ${parsed.meta.title}`);
console.log(`   🎬 ${parsed.scenes.length} 个场景, 共 ${parsed.scenes.reduce((s, sc) => s + sc.durationInFrames, 0) / parsed.meta.fps}s`);

console.log('🤖 生成 React 代码...');
const compName = 'GeneratedVideo';
const result = generateComposition(parsed, compName);
const generatedJsx = path.join(repoRoot, 'src/_generated.jsx');
const generatedIndex = path.join(repoRoot, 'src/_generated_index.jsx');
fs.mkdirSync(path.dirname(generatedJsx), {recursive: true});
fs.writeFileSync(generatedJsx, result.compositionCode);
fs.writeFileSync(generatedIndex, result.indexCode);
console.log(`   ✓ 写入 src/_generated.jsx`);
console.log(`   ✓ 写入 src/_generated_index.jsx`);

fs.mkdirSync(path.dirname(outputPath), {recursive: true});

console.log('🎬 调用 Remotion 渲染...');
const startTime = Date.now();
try {
  execSync(`npx remotion render src/_generated_index.jsx ${compName} "${outputPath}" --concurrency=4`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 成片输出: ${outputPath}`);
  console.log(`   ⏱  渲染耗时 ${elapsed}s`);
} catch (e) {
  console.error('\n❌ 渲染失败');
  process.exit(1);
}

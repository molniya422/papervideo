// 简易 markdown 解析器:把 script.md 解析成 scene 列表
// 格式约定:
//   ---  (frontmatter, 可选)
//   key: value
//   ---
//
//   ## TemplateName
//   key: value
//   key: value
//   list:
//     - item1
//     - item2
//
//   ## NextTemplate
//   ...

const fs = require('fs');

function parseValue(s) {
  s = s.trim();
  if (s === '') return '';
  if (/^["'].*["']$/.test(s)) return s.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

// 解析单段 props(line-based 简易 YAML)
function parseProps(lines) {
  const props = {};
  let currentList = null;
  let currentKey = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') continue;

    // list item: 以 "- " 开头
    if (line.match(/^\s+-\s/)) {
      const item = line.replace(/^\s+-\s/, '');
      if (currentList === null) {
        if (currentKey) props[currentKey] = [];
        currentList = props[currentKey];
      }
      currentList.push(parseValue(item));
      continue;
    }

    // key: value 或 key:(开始 list)
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2];
      if (val === '') {
        // 准备接受 list
        currentKey = key;
        currentList = null;
      } else {
        props[key] = parseValue(val);
        currentKey = null;
        currentList = null;
      }
    }
  }

  return props;
}

function parseScript(mdText) {
  const lines = mdText.split('\n');
  const scenes = [];
  const meta = {fps: 30, width: 1280, height: 720, title: '未命名视频'};

  let i = 0;

  // frontmatter
  if (lines[0] && lines[0].trim() === '---') {
    const fmLines = [];
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') {
      fmLines.push(lines[i]);
      i++;
    }
    Object.assign(meta, parseProps(fmLines));
    i++;  // skip closing ---
  }

  // 场景:## TemplateName
  let curTemplate = null;
  let curBuf = [];

  for (; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(\w+)\s*$/);
    if (headerMatch) {
      // flush previous
      if (curTemplate) {
        const props = parseProps(curBuf);
        const duration = props.duration || 4;
        delete props.duration;
        scenes.push({template: curTemplate, props, durationInFrames: Math.round(duration * meta.fps)});
      }
      curTemplate = headerMatch[1];
      curBuf = [];
    } else if (curTemplate) {
      curBuf.push(line);
    }
  }
  // flush last
  if (curTemplate) {
    const props = parseProps(curBuf);
    const duration = props.duration || 4;
    delete props.duration;
    scenes.push({template: curTemplate, props, durationInFrames: Math.round(duration * meta.fps)});
  }

  return {meta, scenes};
}

module.exports = {parseScript};

// 命令行测试
if (require.main === module) {
  const path = process.argv[2];
  if (!path) {
    console.error('用法: node parser.js <script.md>');
    process.exit(1);
  }
  const md = fs.readFileSync(path, 'utf8');
  const result = parseScript(md);
  console.log(JSON.stringify(result, null, 2));
}

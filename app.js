/* ============================================================
   漫剧工坊 · 前端主逻辑
   ============================================================ */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

const S = {
  src: 'idea',
  refs: [],
  cfg: { baseURL: '', apiKey: '', model: '' },
  server: { baseURL: '', model: '', hasKey: false, ready: false },
  full: '',
  busy: false,
  lastRender: 0,
  streamStart: 0
};

/* ---------------- 系统提示词 ---------------- */
const SYS_PROMPT = `你是【AI漫剧专业剧本生成引擎】，同时具备【专业AI视频导演】与【金牌AI漫剧编剧】双重身份，服务对象是漫剧创作者。

【必须完整执行的流程，不许缺项】
一、剧情简介：写明本片主人公、核心人设、完整剧情走向概述，简洁清晰，供用户预览。
二、角色三视图提示词：适配AI绘图，正向提示词与反向负面提示词分开罗列，固定16:9白底角色设定图规格（正面全身、侧面全身、背面全身并排，同一角色一致性）。
三、场景图提示词：正向与反向分开罗列。
四、关键道具图提示词：正向与反向分开罗列。
五、分镜剧本：以导演+编剧双重身份先审核再输出，审核与修正要点为——剧情逻辑通顺度、镜头之间衔接是否卡顿、转场是否自然、人物动作连贯性、有无违和诡异镜头。
六、镜头禁止项清单。

【分镜必须自动补全并细化】
1. 人物音色参考描述（贴合人设：年龄感、音域、音色质地、语速、情绪底色）
2. 画面质感风格锁定（与用户指定风格一致）
3. 机位与运镜方式、构图方案：必须专业、可执行，优先烘托氛围感与电影质感
4. 光影方案：写明逆光/侧光/顶光/轮廓光/冷暖对比光/丁达尔光等，含色温与光比倾向
5. 特效渲染规范：标注特效类型（光效粒子、流体、实体能量、烟雾等）与特效状态（浓度、速度、方向、消散方式）
6. 细化人物完整动作、肢体细节、面部微表情（眉、眼、唇、下颌、呼吸、指尖）
7. 若用户提供参考图的空间位置描述，必须标注每张参考图的空间位置与场景前后空间关系；镜头切换严格遵守空间逻辑，杜绝跳轴穿帮

【红线，绝对遵守】
1. 不擅自改动用户主线剧情，只优化镜头表达、运镜、画面细节、衔接节奏。
2. 用户给出的原有关键台词、核心动作必须原样保留，只做润色细化，不得替换或删改其含义。
3. 若输入是旧分镜脚本，须先做审核修正，保留其原始镜序意图，只优化不合理处。

【输出格式，极其重要】
- 纯文本输出，禁止使用 markdown 的 #、*、\`、表格等任何排版符号。
- 必须严格按下列六个一级区块输出，区块标题必须原样写成中文方括号形式，不得改写、不得增删区块、不得调整顺序。
- 区块之间空一行。分镜的每一镜之间空一行。
- 不要在六个区块之外输出任何寒暄、说明、总结、致谢。

【剧情简介】
（一段或两段中文叙述：主人公是谁、核心人设什么样、故事从哪开始、关键转折、结局落点。200-400字。）

【角色三视图提示词】
角色名：xxx（身份/年龄/气质一句话）
正向提示词：（英文逗号分隔的绘图提示词，含 character turnaround sheet, front view side view back view, full body, white background, 16:9, consistent character design 等规格词，以及发型、五官、服装、配色、材质、身高比例）
反向负面提示词：（英文逗号分隔的负面清单）

角色名：xxx（若有多个角色，重复上述结构）

【场景图提示词】
场景名：xxx（在剧情中的作用）
正向提示词：（中英文混合的绘图提示词，含景别、时间、天气、建筑材质、色调、光源方向、镜头焦段、画幅）
反向负面提示词：（英文逗号分隔的负面清单）

【关键道具图提示词】
道具名：xxx（剧情功能）
正向提示词：
反向负面提示词：

【分镜剧本】
镜01 | 时长：3.5s
机位/运镜：
构图：
画面内容：
人物微表情&动作细节：
光影：
特效：
音色：
台词：
音效：

镜02 | 时长：4.0s
（同上九项，逐镜重复，镜号连续不跳号）

【镜头禁止项清单】
1. 
2. 
（逐条列出本次项目的硬性禁止项，覆盖：肢体穿模、角色面部崩坏、道具篡改、光影色温跳变、AI塑料质感、水印文字、非指定台词、机械配音、角色视线错位，并结合本项目具体补充）

现在开始，一次性完整输出全部六个区块。`;

/* ---------------- 工具 ---------------- */
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = 'toast'; }, 2600);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function copyText(text) {
  if (navigator.clipboard && location.protocol !== 'file:') {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

/* ---------------- 配置 ---------------- */
const IS_ONLINE_PREVIEW = /\.github\.io$/.test(location.hostname) || location.protocol === 'file:';

function loadCfg() {
  try {
    const raw = localStorage.getItem('manju.cfg');
    if (raw) S.cfg = Object.assign(S.cfg, JSON.parse(raw));
  } catch (e) {}
  updateStatus();
}

/* 生效配置：浏览器里填的优先，其次用服务端 config.json / 环境变量 */
function effectiveCfg() {
  return {
    baseURL: S.cfg.baseURL || S.server.baseURL || '',
    apiKey: S.cfg.apiKey || '',
    model: S.cfg.model || S.server.model || ''
  };
}

function isLocalEndpoint(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(String(url || ''));
}

function isReady() {
  const c = effectiveCfg();
  if (!c.baseURL || !c.model) return false;
  return !!(c.apiKey || S.server.hasKey || isLocalEndpoint(c.baseURL));
}

function updateStatus() {
  const dot = $('#statusDot');

  if (IS_ONLINE_PREVIEW) {
    dot.classList.remove('on');
    dot.style.cursor = 'help';
    $('#statusText').textContent = '在线预览';
    dot.title = '在线预览版只包含界面与内置示例。真实生成请在本地双击「启动.bat」运行';
    const g0 = $('#btnGoConfig');
    if (g0) g0.hidden = true;
    return;
  }

  if (isReady()) {
    const c = effectiveCfg();
    dot.classList.add('on');
    dot.style.cursor = 'default';
    $('#statusText').textContent = '已接入 ' + c.model;
    dot.title = c.baseURL + (S.server.hasKey && !S.cfg.apiKey ? '｜Key 来自服务端配置' : '');
  } else {
    dot.classList.remove('on');
    dot.style.cursor = 'pointer';
    $('#statusText').textContent = '演示模式';
    dot.title = '未配置模型，点击右上角「模型配置」';
  }

  const g = $('#btnGoConfig');
  if (g) g.hidden = isReady();
}
function saveCfg() {
  S.cfg = {
    baseURL: $('#cfgBase').value.trim(),
    apiKey: $('#cfgKey').value.trim(),
    model: $('#cfgModel').value.trim()
  };
  localStorage.setItem('manju.cfg', JSON.stringify(S.cfg));
  loadCfg();
  closeModal('#modal');
  toast(IS_ONLINE_PREVIEW ? '配置已保存，但在线预览无法真实调用，请本地运行' : '配置已保存');
}

const PRESETS = {
  local: { baseURL: 'http://127.0.0.1:1234/v1', model: 'deepseek/deepseek-r1-0528-qwen3-8b' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  moonshot: { baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-32k' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
};

async function testConn() {
  const btn = $('#btnTest');
  const out = $('#testResult');
  const c = {
    baseURL: $('#cfgBase').value.trim(),
    apiKey: $('#cfgKey').value.trim(),
    model: $('#cfgModel').value.trim()
  };

  if (!c.baseURL || !c.model) {
    out.textContent = '先填接口地址和模型名';
    out.className = 'test-result bad';
    return;
  }

  btn.disabled = true;
  out.textContent = '正在连接…';
  out.className = 'test-result';

  try {
    const r = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    });
    const j = await r.json();
    if (j.ok) {
      out.textContent = '✓ 连接成功，' + (j.model || c.model) + ' 可以用了';
      out.className = 'test-result good';
    } else {
      out.textContent = '✕ ' + j.error;
      out.className = 'test-result bad';
    }
  } catch (e) {
    out.textContent = '✕ 本地服务没响应，确认是用「启动.bat」打开的';
    out.className = 'test-result bad';
  } finally {
    btn.disabled = false;
  }
}

function openCfgModal() {
  if (IS_ONLINE_PREVIEW) { toast('在线预览版不支持真实生成，请在本地运行「启动.bat」', true); return; }
  $('#cfgBase').value = S.cfg.baseURL || S.server.baseURL || '';
  $('#cfgKey').value = S.cfg.apiKey || '';
  $('#cfgModel').value = S.cfg.model || S.server.model || '';
  $('#testResult').textContent = '';
  openModal('#modal');
}

/* ---------------- 弹窗 ---------------- */
function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal(sel) { $(sel).hidden = true; document.body.style.overflow = ''; }

/* ---------------- 参考图 ---------------- */
function renderRefs() {
  const box = $('#refList');
  box.innerHTML = S.refs.map((r, i) => `
    <div class="ref-item" data-id="${r.id}">
      <img class="ref-thumb" src="${r.dataUrl}" alt="" />
      <div class="ref-meta">
        <span class="ref-name">${esc(r.name)}</span>
        <input type="text" placeholder="空间位置，例：客厅主视角，沙发左靠窗" value="${esc(r.desc)}" data-desc="${r.id}" />
      </div>
      <button class="ref-del" data-del="${r.id}" title="移除">✕</button>
    </div>`).join('');

  $$('[data-desc]', box).forEach(inp => {
    inp.addEventListener('input', e => {
      const r = S.refs.find(x => String(x.id) === String(e.target.dataset.desc));
      if (r) r.desc = e.target.value;
    });
  });
  $$('[data-del]', box).forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.del;
      S.refs = S.refs.filter(x => String(x.id) !== String(id));
      renderRefs();
    });
  });
}
function addFiles(files) {
  Array.from(files).filter(f => f.type.startsWith('image/')).forEach(f => {
    if (S.refs.length >= 6) return;
    if (f.size > 6 * 1024 * 1024) { toast('图片超过 6MB，已跳过：' + f.name, true); return; }
    const rd = new FileReader();
    rd.onload = () => {
      S.refs.push({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 7), name: f.name, dataUrl: rd.result, desc: '' });
      renderRefs();
    };
    rd.readAsDataURL(f);
  });
  if (S.refs.length >= 6) toast('最多 6 张参考图');
}

/* ---------------- 构造请求 ---------------- */
function buildUserMessage(text) {
  const meta = [
    '【素材类型】' + ({ idea: '脑洞灵感（需要你补全为完整剧情）', novel: '小说原文（需要你提炼改编为漫剧，保留主线）', storyboard: '旧分镜脚本（需要你审核+修正优化，保留原有镜序意图与关键台词）' }[S.src]),
    '【画面风格锁定】' + $('#styleSel').value,
    '【画幅比例】' + $('#ratioSel').value,
    '【成片时长】' + $('#durSel').value,
    '【镜头节奏】' + $('#paceSel').value
  ];

  if (S.refs.length) {
    meta.push('【参考图空间位置】用户提供了 ' + S.refs.length + ' 张参考图，空间约定如下，分镜的机位与转场必须遵守这套空间关系，杜绝跳轴：');
    S.refs.forEach((r, i) => {
      meta.push('  参考图' + (i + 1) + '（' + r.name + '）：' + (r.desc.trim() || '未填写具体位置，请按画面内容自行推定合理空间关系，并保持全片一致'));
    });
  }

  return meta.join('\n') + '\n\n【原始素材】\n' + text + '\n\n请严格按六个区块格式一次性完整输出。';
}

function buildMessages(text) {
  const userText = buildUserMessage(text);
  const useVision = $('#visionChk').checked && S.refs.length > 0;
  if (!useVision) return [{ role: 'system', content: SYS_PROMPT }, { role: 'user', content: userText }];

  const content = [{ type: 'text', text: userText }];
  S.refs.forEach((r, i) => {
    content.push({ type: 'text', text: '参考图' + (i + 1) + '「' + r.name + '」空间位置：' + (r.desc || '未填写') });
    content.push({ type: 'image_url', image_url: { url: r.dataUrl } });
  });
  return [{ role: 'system', content: SYS_PROMPT }, { role: 'user', content }];
}

/* ---------------- 流式生成 ---------------- */
async function generate() {
  if (S.busy) return;
  const text = $('#srcText').value.trim();
  if (!text) { toast('先填写故事灵感或原文', true); $('#srcText').focus(); return; }

  if (IS_ONLINE_PREVIEW) {
    toast('在线预览无法调用模型，已为你展示示例成品', true);
    runDemo();
    return;
  }

  if (!isReady()) {
    toast('还没配置模型，填好 Key 才能真实生成', true);
    $('#cfgBase').value = S.cfg.baseURL || S.server.baseURL || '';
    $('#cfgKey').value = S.cfg.apiKey || '';
    $('#cfgModel').value = S.cfg.model || S.server.model || '';
    openModal('#modal');
    return;
  }

  const eff = effectiveCfg();

  S.busy = true; S.full = ''; S.streamStart = Date.now();
  $('#btnGenerate').classList.add('loading');
  $('#btnGenerate').disabled = true;
  $('#emptyState').hidden = true;
  $('#result').hidden = true;
  $('#streaming').hidden = false;
  $('#streamRaw').textContent = '';
  $('#streamCount').textContent = '0 字';
  $('#outActions').hidden = true;

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseURL: eff.baseURL,
        apiKey: eff.apiKey,
        model: eff.model,
        messages: buildMessages(text),
        temperature: 0.8,
        maxTokens: 8192
      })
    });

    if (!resp.ok) {
      let msg = '请求失败（' + resp.status + '）';
      try { const j = await resp.json(); if (j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const dec = new TextDecoder('utf-8');
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '').trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
          if (d) onChunk(d);
        } catch (e) { /* 忽略非 JSON 行 */ }
      }
    }

    if (!S.full.trim()) throw new Error('模型没有返回内容，请检查模型名与接口配置');
    finish();
  } catch (err) {
    console.error(err);
    toast(err.message || '生成失败', true);
    if (S.full.trim()) { finish(); }
    else {
      $('#streaming').hidden = true;
      $('#emptyState').hidden = false;
      $('#btnGenerate').classList.remove('loading');
      $('#btnGenerate').disabled = false;
      S.busy = false;
    }
  }
}

function onChunk(d) {
  S.full += d;
  $('#streamRaw').textContent = S.full;
  $('#streamCount').textContent = S.full.length + ' 字';
  const pre = $('#streamRaw');
  pre.scrollTop = pre.scrollHeight;

  const now = Date.now();
  if (now - S.lastRender > 260) {
    S.lastRender = now;
    liveRender();
  }
}

function liveRender() {
  const blocks = parseBlocks(S.full);
  if (!blocks.length) return;
  $('#streaming').hidden = true;
  const box = $('#result');
  box.hidden = false;
  renderBlocks(box, blocks, true);
}

function finish() {
  S.busy = false;
  $('#btnGenerate').classList.remove('loading');
  $('#btnGenerate').disabled = false;
  $('#streaming').hidden = true;

  const blocks = parseBlocks(S.full);
  const box = $('#result');
  box.hidden = false;
  renderBlocks(box, blocks, false);
  $('#outActions').hidden = false;

  const secs = ((Date.now() - S.streamStart) / 1000).toFixed(1);
  toast('交付完成 · ' + S.full.length + ' 字 · ' + secs + 's');
}

/* ---------------- 解析 ---------------- */
const BLOCK_KINDS = [
  { key: 'intro', badge: 'b1', label: '剧情简介', match: t => t.includes('剧情') || t.includes('简介') },
  { key: 'char', badge: 'b2', label: '角色三视图提示词', match: t => t.includes('角色') || t.includes('三视图') },
  { key: 'scene', badge: 'b3', label: '场景图提示词', match: t => t.includes('场景') },
  { key: 'prop', badge: 'b4', label: '关键道具图提示词', match: t => t.includes('道具') },
  { key: 'shots', badge: 'b5', label: '分镜剧本', match: t => t.includes('分镜') || t.includes('镜头脚本') },
  { key: 'ban', badge: 'b6', label: '镜头禁止项清单', match: t => t.includes('禁止') || t.includes('禁忌') || t.includes('避坑') }
];

function kindOf(title) {
  for (const k of BLOCK_KINDS) if (k.match(title)) return k;
  return null;
}

function parseBlocks(text) {
  const lines = String(text).split('\n');
  const out = [];
  let cur = null;

  for (const raw of lines) {
    const t = raw.trim();
    const m = t.match(/^[【\[]\s*([^】\]]{1,24})\s*[】\]]\s*$/);
    if (m) {
      const k = kindOf(m[1]);
      if (k) {
        cur = { kind: k, title: m[1], body: [] };
        out.push(cur);
        continue;
      }
      // 未知区块标题：并入上一块的正文（保持原样不丢内容）
      if (cur) cur.body.push(t);
      continue;
    }
    if (cur) cur.body.push(raw);
  }
  return out.filter(b => b.body.join('').trim().length > 0);
}

/* 提示词条目解析：以「正向提示词」「反向负面提示词」为锚点 */
const POS_RE = /^[【\[]?\s*(?:正向提示词|正面提示词|正向|positive)\s*[】\]]?\s*[:：]\s*(.*)$/i;
const NEG_RE = /^[【\[]?\s*(?:反向负面提示词|反向提示词|负面提示词|负面|negative)\s*[】\]]?\s*[:：]\s*(.*)$/i;

const NEW_ITEM_RE = /^(?:角色名|场景名|道具名|人物名|名称|角色|场景|道具)\s*[:：]/;
const NUM_ITEM_RE = /^[0-9]{1,2}\s*[.、)）]\s*\S/;
const cleanTitle = s => String(s).replace(/^(?:角色名|场景名|道具名|人物名|名称|角色|场景|道具)\s*[:：]\s*/, '').trim();

function parsePromptItems(bodyLines) {
  const items = [];
  let item = null;
  let mode = null;

  const push = () => {
    if (item && (item.pos.trim() || item.neg.trim())) {
      item.title = cleanTitle(item.title);
      items.push(item);
    }
  };

  for (const raw of bodyLines) {
    const t = raw.trim();
    if (!t) continue;

    // 新条目起始：强制断开上一段的提示词继承
    if (NEW_ITEM_RE.test(t) || NUM_ITEM_RE.test(t)) {
      push();
      item = { title: t, pos: '', neg: '' };
      mode = null;
      continue;
    }

    const pm = t.match(POS_RE);
    const nm = t.match(NEG_RE);
    if (pm) {
      if (!item || item.pos || item.neg) { push(); item = { title: item && !item.pos && !item.neg ? item.title : '', pos: '', neg: '' }; }
      mode = 'pos';
      item.pos = pm[1].trim();
      continue;
    }
    if (nm) {
      if (!item) { item = { title: '', pos: '', neg: '' }; }
      mode = 'neg';
      item.neg = nm[1].trim();
      continue;
    }
    if (mode === 'pos') item.pos += (item.pos ? '\n' : '') + t;
    else if (mode === 'neg') item.neg += (item.neg ? '\n' : '') + t;
    else {
      // 未进入提示词段：作为条目名
      if (item && !item.pos && !item.neg) item.title += (item.title ? ' ' : '') + t;
      else { push(); item = { title: t, pos: '', neg: '' }; }
    }
  }
  push();
  return items;
}

const SHOT_KEY_RE = /^([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9 \/&·、]{0,15})\s*[:：]\s*([\s\S]*)$/;

function parseShots(bodyLines) {
  const shots = [];
  let cur = null;

  for (const raw of bodyLines) {
    const t = raw.trim();
    if (!t) continue;

    if (/^镜\s*号?\s*[0-9０-９]/.test(t)) {
      const noM = t.match(/镜\s*号?\s*[:：]?\s*0*([0-9０-９]+)/);
      const durM = t.match(/(?:时长|duration)\s*[:：]?\s*([0-9.]+\s*(?:s|S|秒|s钟)?)/);
      cur = { no: noM ? noM[1] : String(shots.length + 1), dur: durM ? durM[1].trim() : '', rows: [] };
      shots.push(cur);
      continue;
    }
    if (!cur) continue;

    const kv = t.match(SHOT_KEY_RE);
    if (kv && kv[1].length <= 16) {
      cur.rows.push([kv[1].trim(), kv[2].trim()]);
    } else if (cur.rows.length) {
      cur.rows[cur.rows.length - 1][1] += '\n' + t;
    } else {
      cur.rows.push(['', t]);
    }
  }
  return shots;
}

/* ---------------- 渲染 ---------------- */
function rowClass(key) {
  if (/台词|对白|独白/.test(key)) return 'dlg';
  if (/音效|声音|配乐/.test(key)) return 'sfx';
  if (/机位|运镜|构图/.test(key)) return 'hl';
  return '';
}

function renderBlocks(box, blocks, isLive) {
  const parts = [];

  blocks.forEach((b, i) => {
    const k = b.kind;
    let inner = '';

    if (k.key === 'intro') {
      inner = `<div class="prose">${esc(b.body.join('\n').trim())}</div>`;

    } else if (k.key === 'char' || k.key === 'scene' || k.key === 'prop') {
      const items = parsePromptItems(b.body);
      if (items.length) {
        inner = items.map(it => `
          <div style="margin-bottom:14px">
            ${it.title ? `<div style="font-size:12.5px;font-weight:700;margin-bottom:8px;color:#2b2d35">${esc(it.title)}</div>` : ''}
            <div class="pmt-pair">
              <div class="pmt pos">
                <span class="pmt-label pos">正向提示词</span>
                <div class="pmt-box">${esc(it.pos || '—')}</div>
              </div>
              <div class="pmt neg">
                <span class="pmt-label neg">反向负面提示词</span>
                <div class="pmt-box">${esc(it.neg || '—')}</div>
              </div>
            </div>
          </div>`).join('');
      } else {
        inner = `<div class="prose">${esc(b.body.join('\n').trim())}</div>`;
      }

    } else if (k.key === 'shots') {
      const shots = parseShots(b.body);
      if (shots.length) {
        inner = shots.map(s => `
          <div class="shot">
            <div class="shot-head">
              <span class="shot-no">镜 ${esc(String(s.no).padStart(2, '0'))}</span>
              ${s.dur ? `<span class="shot-dur">${esc(s.dur)}</span>` : ''}
            </div>
            <div class="shot-body">
              ${s.rows.map(([key, val]) => key
                ? `<div class="shot-row ${rowClass(key)}"><span class="shot-key">${esc(key)}</span><span class="shot-val">${esc(val)}</span></div>`
                : `<div class="shot-row"><span class="shot-key"></span><span class="shot-val">${esc(val)}</span></div>`
              ).join('')}
            </div>
          </div>`).join('');
      } else {
        inner = `<div class="prose">${esc(b.body.join('\n').trim())}</div>`;
      }

    } else if (k.key === 'ban') {
      const lines = b.body.map(l => l.trim()).filter(Boolean)
        .map(l => l.replace(/^[-–—•·]\s*/, '').replace(/^[0-9]+[.、)]\s*/, '').trim())
        .filter(Boolean);
      inner = `<div class="ban-list">${lines.map(l => `<div class="ban-item"><span class="ban-mark">✕</span><span>${esc(l)}</span></div>`).join('')}</div>`;
    }

    parts.push(`
      <div class="card">
        <div class="card-head">
          <span class="card-badge ${k.badge}">${i + 1}</span>
          <span class="card-title">${esc(k.label)}</span>
          <div class="card-tools">
            <button class="btn ghost xs" data-copy="${i}">复制</button>
          </div>
        </div>
        <div class="card-body">${inner}</div>
      </div>`);
  });

  box.innerHTML = parts.join('');

  $$('[data-copy]', box).forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = Number(e.currentTarget.dataset.copy);
      const b = blocks[idx];
      copyText(b.body.join('\n').trim()).then(() => toast('已复制该区块'));
    });
  });

  if (!isLive) window.scrollTo({ top: $('#result').offsetTop - 90, behavior: 'smooth' });
}

/* ---------------- 演示模式 ---------------- */
function runDemo() {
  if (S.busy) return;
  S.busy = true; S.full = ''; S.streamStart = Date.now();
  $('#btnGenerate').classList.add('loading');
  $('#btnGenerate').disabled = true;
  $('#emptyState').hidden = true;
  $('#result').hidden = true;
  $('#streaming').hidden = false;
  $('#streamRaw').textContent = '';
  $('#outActions').hidden = true;

  const txt = window.DEMO_TEXT || '';
  let i = 0;
  const step = Math.max(6, Math.round(txt.length / 260));

  const timer = setInterval(() => {
    const next = txt.slice(i, i + step);
    i += step;
    if (next) onChunk(next);
    if (i >= txt.length) {
      clearInterval(timer);
      finish();
    }
  }, 22);
}

/* ---------------- 事件绑定 ---------------- */
function init() {
  loadCfg();

  // 读取服务端预置配置（config.json / 环境变量）
  fetch('/api/config')
    .then(r => r.json())
    .then(j => {
      S.server = Object.assign({ baseURL: '', model: '', hasKey: false, ready: false }, j);
      updateStatus();
    })
    .catch(() => {});

  if (location.protocol === 'file:') {
    setTimeout(() => toast('请用「启动.bat」打开，直接双击 html 无法调用模型', true), 700);
  }

  // tabs
  $$('#srcTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('#srcTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      S.src = tab.dataset.src;
      const ph = {
        idea: '例：深夜末班公交车上，加班的女孩发现自己每天都会遇到同一个男人，直到某天她提前一站下车……',
        novel: '粘贴小说原文段落，引擎会提炼主线并改编为漫剧，保留关键台词与核心情节。',
        storyboard: '粘贴旧版分镜脚本，引擎会做导演级审核修正：补运镜、修衔接、去违和镜头，同时保留你的原始镜序与台词。'
      }[S.src];
      $('#srcText').placeholder = ph;
    });
  });

  // 参考图
  const dz = $('#dropzone');
  const fi = $('#fileInput');
  dz.addEventListener('click', () => fi.click());
  fi.addEventListener('change', e => { addFiles(e.target.files); fi.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files) addFiles(e.dataTransfer.files); });

  // 生成
  $('#btnGenerate').addEventListener('click', generate);
  $('#btnDemo').addEventListener('click', runDemo);
  $('#btnClearInput').addEventListener('click', () => {
    $('#srcText').value = '';
    S.refs = []; renderRefs();
    toast('已清空输入');
  });

  // 输出操作
  $('#btnCopyAll').addEventListener('click', () => {
    if (!S.full) return;
    copyText(S.full).then(() => toast('全文已复制'));
  });
  $('#btnDownload').addEventListener('click', () => {
    if (!S.full) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    const blob = new Blob([S.full], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `漫剧分镜剧本_${stamp}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('已下载');
  });
  $('#btnNew').addEventListener('click', () => {
    $('#result').hidden = true;
    $('#emptyState').hidden = false;
    $('#outActions').hidden = true;
    S.full = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 配置弹窗
  $('#btnConfig').addEventListener('click', openCfgModal);
  $('#statusDot').addEventListener('click', openCfgModal);
  const goCfg = $('#btnGoConfig');
  if (goCfg) goCfg.addEventListener('click', openCfgModal);
  $('#btnTest').addEventListener('click', testConn);
  $('#btnGuide').addEventListener('click', () => openModal('#guideModal'));
  $('#btnSaveCfg').addEventListener('click', saveCfg);
  $$('[data-close]').forEach(el => el.addEventListener('click', e => {
    const m = e.target.closest('.modal');
    if (m) closeModal('#' + m.id);
  }));
  $$('.chip[data-preset]').forEach(c => c.addEventListener('click', () => {
    const p = PRESETS[c.dataset.preset];
    if (!p) return;
    $('#cfgBase').value = p.baseURL;
    $('#cfgModel').value = p.model;
    $('#cfgKey').focus();
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal('#modal'); closeModal('#guideModal'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
  });

  renderRefs();

  // 支持 ?demo=1 直达示例成品
  if (/[?&]demo=1/.test(location.search)) setTimeout(runDemo, 300);
}

document.addEventListener('DOMContentLoaded', init);

/* 告白气球 · Cupid 引擎与交互 v2 —— 全链路联动版 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 视图切换 ---------- */
function showView(id, btn) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $("#" + id).classList.add("active");
  $$(".nav button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => toast("已复制到剪贴板 ✨")).catch(() => {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove(); toast("已复制到剪贴板 ✨");
  });
}

/* ---------- 全局档案 ---------- */
const state = {
  emotion: { intensity: 5, feelings: [], story: "" },
  me: { name: "", mbti: "", score: 60 },
  targets: [],
  context: { met: "", months: "", events: "", invest: "", goal: "表白", relType: "异性" },
  facts: { fact: "", guess: "", unknown: "" },
  signals: {},
  risks: {},
  currentTarget: 0,
  analysis: null,
  maxStep: 1,
};
let currentStep = 1;

/* 联动枢纽：任何上游输入变化，都从这里实时回流到推演与台词 */
function markDirty() {
  if (state.maxStep >= 4) runAnalysis();
}

/* ---------- 步骤切换（带方向动画） ---------- */
function gotoStep(n) {
  const back = n < currentStep;
  $$(".step-chip").forEach((c, i) => {
    c.classList.toggle("current", i + 1 === n);
    c.classList.toggle("done", i + 1 < n);
  });
  $$(".wiz-panel").forEach(p => p.classList.remove("active", "back"));
  const panel = $("#wizStep" + n);
  if (back) panel.classList.add("back");
  panel.classList.add("active");
  currentStep = n;
  state.maxStep = Math.max(state.maxStep, n);
  if (n === 4) runAnalysis();
  if (n === 5) renderTactics();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 第一支箭 安放心事 ---------- */
const FEELINGS = ["心动", "紧张", "患得患失", "被冷落", "焦虑", "委屈", "愤怒", "失落", "兴奋", "自我怀疑", "不甘心", "想放弃"];
function initFeelings() {
  const box = $("#feelingChips");
  FEELINGS.forEach(f => {
    const c = document.createElement("span");
    c.className = "chip"; c.textContent = f;
    c.onclick = () => { c.classList.toggle("on"); markDirty(); };
    box.appendChild(c);
  });
  $("#emoSlider").oninput = (e) => {
    $("#emoVal").textContent = e.target.value + " / 10";
    markDirty();
  };
}
function readEmotions() {
  state.emotion.intensity = +$("#emoSlider").value;
  state.emotion.feelings = [...$$("#feelingChips .chip.on")].map(c => c.textContent);
  state.emotion.story = $("#emoStory").value.trim();
  renderReflection();
  gotoStep(2);
}
function renderReflection() {
  const e = state.emotion;
  const inten = e.intensity;
  const f = e.feelings.length ? e.feelings.slice(0, 3).join("、") : "一团说不清的情绪";
  let lead;
  if (inten >= 8) lead = "浪头很高（" + inten + "/10），先别做任何决定——尤其是别回消息。给自己 10 分钟，这 10 分钟里你什么都不欠谁。";
  else if (inten >= 5) lead = "心里的浪在 " + inten + "/10，扛得住，但需要先被看见。我们一起把它摊开，再决定动不动。";
  else lead = "浪很平（" + inten + "/10），正好是看清局面的好时候。";
  const mirror = e.story ? "你讲的事我记下了：" + (e.story.length > 60 ? e.story.slice(0, 60) + "……" : e.story) + " ——换成谁，遇上都难免" + (e.feelings[0] || "心乱") + "。" : "";
  const hold = "这些感受不丢人：它们说明你在认真对待一段感情。感受不用被纠正，先被承认，才有力气被安放。下面我们把事情拆开看。";
  $("#reflectionBox").innerHTML = `<div class="verdict wait" style="border-left-color:var(--pink-deep)"><h3>🏹 心事已安放</h3>${lead}<br>${mirror}<br>${hold}</div>`;
}

/* ---------- 第二支箭 写下你们 ---------- */
function addTarget() {
  const n = state.targets.length + 1;
  state.targets.push({ code: "对象" + String.fromCharCode(64 + n), mbti: "", score: 60, relation: "", gender: "" });
  renderTargets();
}
function renderTargets() {
  const box = $("#targetCards"); box.innerHTML = "";
  state.targets.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "person-card";
    div.innerHTML = `
      <h4>🎈 ${esc(t.code)} <button class="btn btn-ghost btn-sm" style="float:right" onclick="delTarget(${i})">移除</button></h4>
      <div class="grid3">
        <div class="field"><label>代号/称呼</label><input type="text" value="${esc(t.code)}" onchange="state.targets[${i}].code=this.value;renderTargets();markDirty()"></div>
        <div class="field"><label>TA 的性别 <span class="hint">（不预设）</span></label>
          <select onchange="state.targets[${i}].gender=this.value;markDirty()">
            <option value="">不预设/保密</option><option>男</option><option>女</option><option>非二元/其他</option>
          </select></div>
        <div class="field"><label>TA 的 MBTI <span class="hint">（选填）</span></label><input type="text" placeholder="如 INFP" value="${esc(t.mbti)}" onchange="state.targets[${i}].mbti=this.value;markDirty()"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>TA 目前的感情状态</label>
          <select onchange="state.targets[${i}].relation=this.value;markDirty()">
            <option value="">不清楚</option><option>单身</option><option>有伴侣</option><option>暧昧中（和我）</option><option>其他/复杂</option>
          </select></div>
        <div class="field"><label>你对 TA 的心动值 0–100 <span class="hint">（你的感受，不是TA的身价）</span></label>
          <input type="range" min="0" max="100" value="${t.score}" oninput="state.targets[${i}].score=+this.value;this.nextElementSibling.textContent=this.value;markDirty()">
          <div class="slider-val">${t.score}</div></div>
      </div>`;
    box.appendChild(div);
  });
}
function delTarget(i) { state.targets.splice(i, 1); state.currentTarget = 0; renderTargets(); markDirty(); }

function readProfile() {
  state.me.name = $("#myName").value.trim() || "你";
  state.me.mbti = $("#myMbti").value.trim();
  state.context.met = $("#ctxMet").value.trim();
  state.context.months = $("#ctxMonths").value;
  state.context.events = $("#ctxEvents").value.trim();
  state.context.invest = $("#ctxInvest").value;
  state.context.goal = $("#ctxGoal").value;
  state.context.relType = $("#ctxRelType").value;
  gotoStep(3);
}

/* ---------- 第三支箭 校准信号 ---------- */
const SIGNALS = [
  { k: "s1", w: 22, label: "TA 也会主动找你说话" },
  { k: "s2", w: 18, label: "答应过单独见面，之后还聊得热络" },
  { k: "s3", w: 16, label: "跟你说起过私人的事（家人/烦恼/打算）" },
  { k: "s4", w: 14, label: "记得你随口提过的小事" },
  { k: "s5", w: 12, label: "回复基本及时，少有长期敷衍" },
  { k: "s6", w: 10, label: "相处时距离在自然变近（眼神/坐姿）" },
  { k: "s7", w: 8, label: "在你在场时暴露过脆弱" },
];
const RISKS = [
  { k: "r1", w: 100, label: "⚠️ TA 已明确说过没这个意思" },
  { k: "r2", w: 45, label: "⚠️ TA 有伴侣" },
  { k: "r3", w: 30, label: "⚠️ 你们是直接上下级/利益强绑定" },
  { k: "r4", w: 25, label: "⚠️ 才认识不久（<2周）" },
  { k: "r5", w: 20, label: "⚠️ 一直只在网上聊，没见过面" },
  { k: "r6", w: 15, label: "⚠️ 长期异地，短期无见面计划" },
];
/* 信号分组：参考「多路信号同时亮才作数」——单一类别亮不算稳 */
const SIGNAL_GROUPS = [
  { name: "主动发起", keys: ["s1"] },
  { name: "见面意愿", keys: ["s2"] },
  { name: "自我暴露", keys: ["s3", "s7"] },
  { name: "稳定回应", keys: ["s4", "s5", "s6"] },
];
/* 关键词规则：从用户填写的事件/事实/猜测文本中识别，参与计分 */
const KEYWORD_RULES = [
  { re: /主动找我|主动发|主动约|ta主动|他主动|她主动/i, label: "对方主动", type: "signal", w: 8 },
  { re: /秒回|很快回|及时回|秒赞/, label: "回应及时", type: "signal", w: 6 },
  { re: /单独|就我们俩|两个人一起/, label: "单独相处", type: "signal", w: 6 },
  { re: /见面|吃饭|约会|散步|看电影|看展|逛街/, label: "线下见面", type: "signal", w: 6 },
  { re: /送礼|生日|惊喜|奶茶|请我/, label: "仪式投入", type: "signal", w: 4 },
  { re: /心事|烦恼|家里|家人|秘密/, label: "深度分享", type: "signal", w: 5 },
  { re: /吵架|冷战|矛盾|闹掰|生气/, label: "出现冲突", type: "risk", w: 8 },
  { re: /已读不回|不回我|敷衍|只回嗯|爱理不理/, label: "回应冷淡", type: "risk", w: 10 },
  { re: /拒绝|婉拒|没空|下次吧|再说吧/, label: "有过回避", type: "risk", w: 8 },
  { re: /别人|前任|前女友|前男友|暧昧对象/, label: "第三方变量", type: "risk", w: 6 },
  { re: /删好友|拉黑|屏蔽/, label: "关系受损", type: "risk", w: 10 },
];
function initSignals() {
  const sbox = $("#signalChips"), rbox = $("#riskChips");
  SIGNALS.forEach(s => {
    const c = document.createElement("span");
    c.className = "chip"; c.textContent = s.label;
    c.onclick = () => { c.classList.toggle("on"); state.signals[s.k] = c.classList.contains("on"); markDirty(); };
    sbox.appendChild(c);
  });
  RISKS.forEach(s => {
    const c = document.createElement("span");
    c.className = "chip"; c.textContent = s.label;
    c.onclick = () => { c.classList.toggle("on"); state.risks[s.k] = c.classList.contains("on"); markDirty(); };
    rbox.appendChild(c);
  });
  $("#sigFacts").oninput = e => { state.facts.fact = e.target.value; markDirty(); };
  $("#sigGuess").oninput = e => { state.facts.guess = e.target.value; markDirty(); };
  $("#sigUnknown").oninput = e => { state.facts.unknown = e.target.value; markDirty(); };
  ["ctxMet", "ctxMonths", "ctxEvents"].forEach(id => {
    $("#" + id).oninput = e => { state.context[id === "ctxMet" ? "met" : id === "ctxMonths" ? "months" : "events"] = e.target.value; markDirty(); };
  });
  $("#ctxInvest").onchange = e => { state.context.invest = e.target.value; markDirty(); };
  $("#ctxGoal").onchange = e => { state.context.goal = e.target.value; markDirty(); };
  $("#ctxRelType").onchange = e => { state.context.relType = e.target.value; markDirty(); };
  $("#myScore").oninput = e => { state.me.score = +e.target.value; markDirty(); };
}

/* ==========================================================
   第四支箭 缘分推演引擎 v2 —— 多因子联动计算
   规则设计参考行为证据方法论：
   · 互惠判断看趋势与多路信号，不看单点；
   · 事实与猜测分离，只有可复核事实才能加分；
   · 硬性风险（明确拒绝/有伴侣）一票否决；
   · 所有分数透明展示明细，随输入实时更新。
   ========================================================== */
function scanKeywords() {
  const text = [state.emotion.story, state.context.events, state.facts.fact, state.facts.guess].join(" ");
  if (!text.trim()) return [];
  return KEYWORD_RULES.filter(r => r.re.test(text));
}
/* 积极信号强度：原始加权 + 多路校验系数 + 可复核事实加成 */
function calcSignalPower() {
  const raw = SIGNALS.reduce((a, s) => a + (state.signals[s.k] ? s.w : 0), 0);
  const litGroups = SIGNAL_GROUPS.filter(g => g.keys.some(k => state.signals[k])).length;
  const coef = [0, 0.75, 0.9, 0.97, 1][Math.min(4, litGroups)];
  const factLen = (state.facts.fact || "").replace(/\s/g, "").length;
  const factBonus = factLen >= 15 ? 6 : 0; // 有截图级可复核事实才加分
  const power = clamp(Math.round(raw * coef) + factBonus, 0, 100);
  return { raw, litGroups, coef, factBonus, power };
}
/* 现实阻力：勾选风险 + 互动节奏失衡 + 关键词风险 + 时机 */
function calcResistance(kw) {
  let res = RISKS.reduce((a, s) => a + (state.risks[s.k] ? s.w : 0), 0);
  if (state.context.invest === "more") res += 12;      // 长期单方面主动
  else if (state.context.invest === "me") res += 5;    // 我主动偏多
  kw.filter(k => k.type === "risk").forEach(k => res += k.w);
  const m = parseFloat(state.context.months);
  if (!isNaN(m) && m >= 0 && m < 1) res += 8;          // 时机过早
  return Math.min(100, Math.round(res));
}
/* 命中率：透明加权合成，明细逐项展示 */
function calcReadiness(sp, res, target) {
  const meCap = Math.min(100, state.me.score + 20);
  const investFactor = { recip: 88, ta: 84, me: 56, more: 34 }[state.context.invest] || 50;
  const m = parseFloat(state.context.months);
  const durFactor = isNaN(m) ? 50 : m >= 6 ? 85 : m >= 3 ? 72 : m >= 1 ? 58 : 42;
  const parts = {
    signal: Math.round(sp.power * 0.42),
    target: Math.round((target.score || 50) * 0.14),
    me: Math.round(meCap * 0.14),
    invest: Math.round(investFactor * 0.14),
    dur: Math.round(durFactor * 0.06),
    fact: sp.factBonus,
  };
  const base = parts.signal + parts.target + parts.me + parts.invest + parts.dur;
  return { meCap, investFactor, durFactor, parts, base, value: clamp(Math.round(base - res * 0.55), 0, 100) };
}
const GOAL_TIP = {
  表白: "当前目标是表白：把「命中率」当参考而不是判决——真诚、具体、低压力的表达，永远比分数体面。",
  推进: "当前目标是推进关系：分数偏低时优先补信号（一对一见面、私人话题对等交换），而不是加码表白。",
  回复: "当前目标是把回复聊好：分数只是背景，重点是先接住对方情绪、一次只抛一个话题。",
  修复: "当前目标是修复关系：冲突修复的关键是 24 小时内主动伸手，分数不替你道歉。",
  退场: "当前目标是评估退场：如果现实阻力长期居高、积极信号持续偏低，体面止损本身就是赢。",
};
function runAnalysis() {
  const target = state.targets[state.currentTarget] || { score: 50, code: "对象" };
  const sp = calcSignalPower();
  const kw = scanKeywords();
  const riskPenalty = calcResistance(kw);
  const rd = calcReadiness(sp, riskPenalty, target);
  const hardStop = state.risks.r1 || state.risks.r2;

  let verdict, vTitle, reasons = [];
  if (hardStop) {
    verdict = "stop";
    vTitle = state.risks.r2 ? "⛔ 这一箭现在不能射：TA 身边已有人" : "⛔ 这一箭现在不能射：TA 已经给过答案";
    reasons.push(state.risks.r2 ? "TA 有伴侣（或已明确拒绝）。此时出手，伤的是三个人，赢的也不是你想要的那段感情。先把自己的日子过亮堂。" : "TA 明确表示过没有这个意思。答案是答案，不是谜语——再追问下去，消耗的是你在 TA 心里最后的好印象。");
    reasons.push("丘比特在这种局面下只递安全绳，不递箭。如果这段关系里已有让你害怕的部分（纠缠、威胁、勒索），直接去知识库【法律】和页脚求助通道。");
  } else if (rd.value >= 62) {
    verdict = "go";
    vTitle = "💚 顺风局：这一箭可以射了";
    reasons.push("积极信号 " + sp.power + "/100（原始 " + sp.raw + " × 多路校验 " + sp.coef + "）——多路信号同时亮，比任何一次「氛围很好的晚上」都作数。");
    reasons.push("你自己的状态（" + rd.meCap + "）也在线，表达出去的是底气，不是恳求。");
    reasons.push("别再铺垫了，铺垫过头反而把关系焊死在舒适区。领了台词，两周之内完成表达。");
  } else if (rd.value >= 38) {
    verdict = "wait";
    vTitle = "💛 半顺风局：先养一养信号，再射";
    reasons.push("当前积极信号 " + sp.power + "/100，射出去命中率一般，但不代表没戏。");
    reasons.push("接下来 2–4 周做「信号养护」：约 1–2 次低压力的一对一，主动分享一点私人的事，看 TA 接不接。");
    reasons.push("给自己一条止损线：窗口期内 TA 依旧零主动、两次邀约都被拒且不给别的说法——那就转入收束，把时间拿回来。");
  } else {
    verdict = "wait";
    vTitle = "🧡 逆风局：先看清，再心动";
    reasons.push("积极信号只有 " + sp.power + "/100。此时硬射，大概率连现有的好感一起烧掉。");
    reasons.push("警惕「盼望当证据」：回头检查你写的事实栏，只数 TA 稳定做过的行为，不算你的期待。");
    reasons.push("同样给你一条止损线：4 周信号纹丝不动，就调低投入。心动可以留着，成本要算清。");
  }
  reasons.unshift(GOAL_TIP[state.context.goal] || GOAL_TIP["表白"]);
  if (state.emotion.intensity >= 8) reasons.push("🌡 你的情绪浪头 " + state.emotion.intensity + "/10，此时所有分数都容易被情绪放大——先回第一支箭安放心事，冷静后再看一眼推演。");
  if (state.emotion.feelings.includes("想放弃") || state.emotion.feelings.includes("自我怀疑")) reasons.push("你勾选了「想放弃/自我怀疑」：分数低不代表你不好，只代表当前行为证据不足。人的价值不由任何人的回应定义。");

  state.analysis = { sp, kw, riskPenalty, readiness: rd.value, parts: rd.parts, meCap: rd.meCap, verdict, vTitle, reasons, target };
  renderAnalysis();
  if (state.maxStep >= 5) renderTactics();
}

function renderAnalysis() {
  const a = state.analysis;
  if (!a) return;
  let sel = "";
  if (state.targets.length > 1) {
    sel = `<div class="field"><label>推演对象</label><select onchange="state.currentTarget=+this.value;runAnalysis()">` +
      state.targets.map((x, i) => `<option value="${i}" ${i === state.currentTarget ? "selected" : ""}>${esc(x.code)}</option>`).join("") + `</select></div>`;
  }
  const bar = (label, v, cls) => `<div class="bar-item"><div class="bar-head"><b>${label}</b><span>${v}</span></div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${v}%"></div></div></div>`;
  const p = a.parts;
  const bdRows = [
    [`积极信号（原始 ${a.sp.raw} × 多路校验 ${a.sp.coef}）`, "+" + p.signal, "pos"],
    [`可复核事实加成（${a.sp.factBonus ? "你有 " + a.sp.factBonus + " 分证据分" : "事实栏写得再具体些可以 +6"}）`, "+" + p.fact, "pos"],
    [`TA 心动值 ${a.target.score} × 14%`, "+" + p.target, "pos"],
    [`你的状态 ${a.meCap} × 14%`, "+" + p.me, "pos"],
    [`互动节奏折算（${{ recip: "有来有往", ta: "TA 更主动", me: "我主动偏多", more: "几乎都是我主动" }[state.context.invest] || "未选择"}）`, "+" + p.invest, "pos"],
    [`相处时长折算`, "+" + p.dur, "pos"],
    [`现实阻力 × 55%（${a.riskPenalty} 分阻力）`, "−" + Math.round(a.riskPenalty * 0.55), "neg"],
    [`命中率（综合）`, a.readiness + " / 100", ""],
  ];
  const kwHtml = a.kw.length
    ? `<div class="kw-chips">` + a.kw.map(k => `<span class="kw ${k.type}">${k.type === "signal" ? "💚" : "⚠️"} ${k.label}（${k.type === "signal" ? "信号+" : "阻力+"}${k.w}）</span>`).join("") + `</div>
       <p class="meta" style="font-size:12px;color:var(--ink-soft)">这些关键词从你填写的「心事 / 难忘小事 / 事实 / 猜测」中自动识别，已实时参与计分——改一句话，分数就会变。</p>`
    : `<p class="meta" style="font-size:12px;color:var(--ink-soft)">在前面多写具体事件（如「TA 主动约我看展」「回消息总是秒到」），关键词会被自动识别并计入分数。</p>`;
  $("#analysisBox").innerHTML = sel + `
    <div class="bars">
      ${bar("积极信号强度", a.sp.power, a.sp.power >= 60 ? "good" : a.sp.power >= 35 ? "" : "warn")}
      ${bar("这一箭的命中率（综合）", a.readiness, a.readiness >= 60 ? "good" : a.readiness >= 38 ? "" : "warn")}
      ${bar("现实阻力", a.riskPenalty, a.riskPenalty > 0 ? "warn" : "good")}
    </div>
    <div class="breakdown"><h4>🧮 这一套分数是怎么算出来的（随你的填写实时变化）</h4>
      ${bdRows.map(r => `<div class="bd-row"><span>${r[0]}</span><span class="${r[2]}">${r[1]}</span></div>`).join("")}
    </div>
    ${kwHtml}
    <div class="verdict ${a.verdict}"><h3>${a.vTitle}</h3>${a.reasons.map(esc).join("<br>")}</div>
    <div class="fact-grid">
      <div class="fact-box f"><b>✅ 确定的事实</b>${esc(state.facts.fact) || "（暂无——建议把有截图、有见证的事写进来）"}</div>
      <div class="fact-box g"><b>🤔 我的猜测</b>${esc(state.facts.guess) || "（暂无）"}</div>
      <div class="fact-box u"><b>❓ 我不知道的</b>${esc(state.facts.unknown) || "（暂无）"}</div>
    </div>
    <p class="meta" style="font-size:12px;color:var(--ink-soft)">推演基于你的自述与勾选，不是对 TA 内心的窥探。TA 的下一步行为，才是最终裁判。</p>`;
}
function esc(s) { return (s || "").replace(/</g, "&lt;"); }

/* ==========================================================
   第五支箭 爱的台词 —— 基于你填写的信息动态生成
   ========================================================== */
const TIER_LABEL = { steady: "🤍 真诚档 · 稳", playful: "💗 灵动档 · 活", bold: "🔥 勇气档 · 直" };
const TIER_TITLE = { steady: "散步收尾版 · 半私密低压力", playful: "细节心动版 · 用你们的小事砸中", bold: "直接邀约版 · 把选择权交给 TA" };

function firstEvent() {
  return (state.context.events || "").split(/[\n;；,，。]/).map(s => s.trim()).filter(Boolean)[0] || "";
}
function periodText() {
  const m = parseFloat(state.context.months);
  return (!isNaN(m) && m > 0) ? (m >= 1 ? `这 ${m % 1 === 0 ? m : m.toFixed(1)} 个月` : "这阵子") : "这段日子";
}
function traitText() {
  if (state.signals.s3 || state.signals.s7) return "愿意跟你说心里话、也认真接住我的话的那种真诚";
  if (state.signals.s4) return "把别人随口一提的小事都记在心上的细心";
  if (state.signals.s5 || state.signals.s1) return "始终稳稳接住我的可靠";
  return "认真对待身边人的样子";
}
function strongestSignal() {
  const lit = SIGNALS.filter(s => state.signals[s.k]).sort((a, b) => b.w - a.w);
  return lit[0] || null;
}
function buildSpeech(tier) {
  const t = state.targets[state.currentTarget] || { code: "TA" };
  const name = t.code || "TA";
  const ev = firstEvent();
  const per = periodText();
  const trait = traitText();
  const sig = strongestSignal();
  if (tier === "steady") {
    return `其实今天想跟你说件事。${per}里，${ev ? `特别是「${ev}」那次之后` : "一起经历的那些小事"}，我越来越确定：我喜欢你——喜欢的是你${trait}。不是朋友的那种喜欢。你不用现在回答我，也不用有负担。我就是觉得，不告诉${name}的话，对不起我自己。`;
  }
  if (tier === "playful") {
    return `跟${name}坦白个秘密：我手机备忘录里，${ev ? `存着「${ev}」这条` : "存着你说过的不少小事"}。别问为什么记——喜欢一个人的时候，TA 的事都会自动保存。${sig ? `而且我早就注意到：${sig.label.replace(/^TA /, "")}。这算不算双向奔赴的实锤？` : ""}总之——我喜欢你，比${per}更早。`;
  }
  return `认真说，不绕弯子：我喜欢${name}。${ev ? `从「${ev}」那阵子起` : "这不是一时冲动"}，我想认真追你。如果你觉得不行，现在告诉我，我完全接受、也绝不纠缠；如果你没意见——那我就当你默认了，咱们下周找个时间，把${ev ? "那顿说好" : "一直说"}要吃的饭补上。`;
}
function tierMeta(tier) {
  const code = (state.targets[state.currentTarget] || {}).code || "TA";
  const v = state.analysis ? state.analysis.verdict : "wait";
  const timing = {
    steady: `你们已经${state.signals.s2 ? "有过单独相处" : "相处了一段时间"}，选一次自然的散步或送${code}到楼下时说；${v === "go" ? "推演显示窗口已开，两周内落地。" : "推演显示信号未满，先养护 2–4 周再用。"}`,
    playful: `氛围好的线下时刻或深夜聊天，${v === "go" ? "现在就用正合适" : "等信号养起来再用更稳"}；细节必须真实，编造一旦识破直接出局。`,
    bold: `${v === "go" ? "信号够了，用它把模糊变清晰" : "推演偏保守，这句火力猛，建议先补几周信号再上"}；说完记得补一句「你不用马上答」。`,
  }[tier];
  const cost = {
    steady: "最稳但推进慢；适合偏慢热或熟人圈（同学/同事）的情况。",
    playful: "对方接梗不接情，就当一次成功的调情，改日再正式说。",
    bold: "强势是清晰和筛选，不是施压——拒绝的完整权利始终在对方手里。",
  }[tier];
  return { timing, cost };
}
function renderTactics() {
  if (!state.analysis) { runAnalysis(); }
  const a = state.analysis;
  const goal = state.context.goal;
  let html = "";
  ["steady", "playful", "bold"].forEach(tier => {
    const speech = buildSpeech(tier);
    const meta = tierMeta(tier);
    html += `<div class="tactic" data-tier="${tier}">
      <span class="copy-btn btn btn-ghost btn-sm" onclick="copyText(this.closest('.tactic').querySelector('.speech').textContent)">复制</span>
      <h4>${TIER_TITLE[tier]}</h4>
      <div class="tag-row"><span class="tag">${TIER_LABEL[tier]}</span><span class="tag">场景：${goal}</span><span class="tag">推演：${a.vTitle.split("：")[1] || a.vTitle}</span></div>
      <div class="speech">${esc(speech)}</div>
      <div class="meta">⏰ <b>什么时候说：</b>${meta.timing}<br>⚖️ <b>代价与分寸：</b>${meta.cost}</div>
      <div class="branches">
        <div class="branch ${AFTER_BRANCH["积极"].cls}"><b>${AFTER_BRANCH["积极"].title}</b>${AFTER_BRANCH["积极"].text}</div>
        <div class="branch ${AFTER_BRANCH["含糊"].cls}"><b>${AFTER_BRANCH["含糊"].title}</b>${AFTER_BRANCH["含糊"].text}</div>
        <div class="branch ${AFTER_BRANCH["沉默"].cls}"><b>${AFTER_BRANCH["沉默"].title}</b>${AFTER_BRANCH["沉默"].text}</div>
      </div>
    </div>`;
  });
  html += `<div class="tactic" id="aiTactic" style="display:none">
      <span class="copy-btn btn btn-ghost btn-sm" onclick="copyText(this.closest('.tactic').querySelector('.speech').textContent)">复制</span>
      <h4>🤖 AI 为你定制</h4>
      <div class="tag-row"><span class="tag">基于你填写的全部信息生成</span></div>
      <div class="speech" id="aiSpeech"></div>
    </div>
    <div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="openAIModal()">🤖 让 AI 按你们的故事重写台词（可选，自备 OpenAI 兼容接口）</button></div>`;
  html += `<div class="verdict wait"><h3>🏹 收弓条件（先读再射）</h3>TA 拒绝、闪躲、或请你停止——立刻收弓，不加解释不再纠缠。观察窗口内毫无回应，视同拒绝。<b>把这一箭收回来，箭还在你手上；追着射出去，就什么都没有了。</b></div>`;
  $("#tacticBox").innerHTML = html;
}

/* ---------- AI 台词生成（可选，OpenAI 兼容接口） ---------- */
const AI_CFG_KEY = "cupid-ai-config";
function loadAICfg() { try { return JSON.parse(localStorage.getItem(AI_CFG_KEY)) || {}; } catch (e) { return {}; } }
function openAIModal() {
  const cfg = loadAICfg();
  $("#aiBase").value = cfg.base || "https://api.deepseek.com/v1";
  $("#aiModel").value = cfg.model || "deepseek-chat";
  $("#aiKey").value = cfg.key || "";
  $("#aiModal").hidden = false;
}
function closeAIModal() { $("#aiModal").hidden = true; }
function buildAIPrompt() {
  const t = state.targets[state.currentTarget] || { code: "TA" };
  const lit = SIGNALS.filter(s => state.signals[s.k]).map(s => s.label);
  const rsk = RISKS.filter(s => state.risks[s.k]).map(s => s.label);
  return `请基于以下真实信息，为用户写三段告白/表达台词（JSON 输出）。
【我】${state.me.name || "用户"}，状态自评 ${state.me.score}/100${state.me.mbti ? "，MBTI " + state.me.mbti : ""}
【TA】${t.code}${t.relation ? "，目前" + t.relation : ""}
【来路】${state.context.met || "未填"}；认识约 ${state.context.months || "?"} 个月；互动节奏：${ { recip: "有来有往", me: "我主动偏多", more: "几乎都是我主动", ta: "TA 更主动" }[state.context.invest] || "未填"}
【难忘小事】${state.context.events || "未填"}
【积极信号】${lit.join("；") || "暂无勾选"}
【现实阻力】${rsk.join("；") || "暂无勾选"}
【确定的事实】${state.facts.fact || "无"}
【我的猜测】${state.facts.guess || "无"}
【目标】${state.context.goal}；推演结论：${state.analysis ? state.analysis.vTitle : ""}
要求：三段分别是 steady（真诚稳重）、playful（灵动俏皮）、bold（勇敢直接）；每段 80–150 字；必须引用上面真实的「难忘小事」或「确定的事实」；低压力、给对方留退路、不得施压。
只输出 JSON：{"steady":"...","playful":"...","bold":"..."}`;
}
async function aiGenerate() {
  if (!state.analysis) { toast("先走完前三支箭再来找丘比特"); return; }
  const cfg = { base: $("#aiBase").value.trim(), model: $("#aiModel").value.trim(), key: $("#aiKey").value.trim() };
  if (!cfg.key) { toast("请先填 API Key（只存在你的浏览器本地）"); return; }
  localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg));
  if (state.maxStep < 5) gotoStep(5);
  $("#aiTactic").style.display = "block";
  $("#aiSpeech").textContent = "丘比特正在按你们的故事打磨台词……";
  try {
    const resp = await fetch(cfg.base.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify({
        model: cfg.model || "deepseek-chat",
        messages: [
          { role: "system", content: "你是温柔、克制、尊重边界的中文情感表达教练。只输出 JSON，不要多余解释。" },
          { role: "user", content: buildAIPrompt() },
        ],
        temperature: 0.9,
      }),
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    let text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const obj = JSON.parse(m[0]);
      text = ["steady", "playful", "bold"].map(k => obj[k] ? `【${TIER_LABEL[k].slice(2)}】${obj[k]}` : "").filter(Boolean).join("\n\n") || text;
    }
    $("#aiSpeech").textContent = text || "（模型没有返回内容，换个模型试试）";
    toast("AI 台词已生成 🤖✨");
  } catch (e) {
    $("#aiSpeech").textContent = "生成失败：" + e.message + "。请检查接口地址 / Key / 网络；若服务商不允许浏览器跨域（CORS），请换支持 CORS 的服务商。";
  }
}

/* ---------- 知识库 ---------- */
function renderKB(filter = "", cat = "全部") {
  const grid = $("#kbGrid"); grid.innerHTML = "";
  const cats = ["全部", ...new Set(KNOWLEDGE.map(k => k.cat))];
  $("#kbCats").innerHTML = cats.map(c => `<span class="chip ${c === cat ? "on" : ""}" onclick="renderKB('${filter}', '${c}')">${c}</span>`).join("");
  KNOWLEDGE
    .filter(k => (cat === "全部" || k.cat === cat))
    .filter(k => !filter || k.title.includes(filter) || k.body.includes(filter) || k.cat.includes(filter))
    .forEach(k => {
      const g = { A: ["a", "A · 证据充分"], B: ["b", "B · 理论框架"], C: ["c", "C · 经验之谈"], D: ["d", "D · 风险警示"] }[k.grade];
      const card = document.createElement("div");
      card.className = "kb-card";
      card.onclick = () => card.classList.toggle("open");
      card.innerHTML = `<div class="kb-tags"><span class="tag">${k.cat}</span><span class="grade ${g[0]}">${g[1]}</span></div>
        <h4>${k.title}</h4><p>${k.brief}</p><div class="kb-body">${k.body}</div>`;
      grid.appendChild(card);
    });
  if (!grid.children.length) grid.innerHTML = `<p style="color:var(--ink-soft)">没找到相关卡片，换个关键词试试～</p>`;
}

/* ---------- 告白气球工作台 ---------- */
const BSTYLES = {
  sakura:  { name: "🌸 樱花粉",   bg1: "#ffe3ec", bg2: "#fff7f5", balloon: ["#ff7ba9", "#ffb3c8", "#e8558a"], text: "#5a2a3d" },
  starry:  { name: "🌌 星夜蓝",   bg1: "#1a2456", bg2: "#0e1230", balloon: ["#7fa8ff", "#a88fff", "#5b8def"], text: "#e8edff" },
  sunset:  { name: "🌅 落日橙",   bg1: "#ffe8cc", bg2: "#fff6ea", balloon: ["#ff9a5b", "#ff6f91", "#ffc46b"], text: "#5a3226" },
  mint:    { name: "🌿 薄荷苏打", bg1: "#dff7ee", bg2: "#f4fffa", balloon: ["#59c9a5", "#8fdcbf", "#3fae8c"], text: "#23554a" },
  grape:   { name: "🍇 葡萄气泡", bg1: "#efe3ff", bg2: "#faf6ff", balloon: ["#8f6ed5", "#b79ae8", "#6f4fb0"], text: "#4a3470" },
  peach:   { name: "🍑 蜜桃乌龙", bg1: "#ffe9e0", bg2: "#fff8f4", balloon: ["#ff9a8b", "#ffb8a6", "#f2705f"], text: "#5d342b" },
  lemon:   { name: "🍋 奶油柠檬", bg1: "#fff6d9", bg2: "#fffdf2", balloon: ["#ffd166", "#ffe3a3", "#f4b942"], text: "#5c4a1e" },
  ocean:   { name: "🌊 海盐蓝调", bg1: "#d8efff", bg2: "#f2faff", balloon: ["#5b8def", "#8ab4ff", "#3f6fd1"], text: "#274066" },
  mono:    { name: "🖤 黑白经典", bg1: "#f2f2f2", bg2: "#fafafa", balloon: ["#3a3a3a", "#6e6e6e", "#a5a5a5"], text: "#222222" },
  neon:    { name: "⚡ 赛博霓虹", bg1: "#12082b", bg2: "#1d0f45", balloon: ["#ff4fd8", "#4fd8ff", "#b44fff"], text: "#e8d9ff" },
  forest:  { name: "🌲 森林晨雾", bg1: "#e3efdc", bg2: "#f6faf2", balloon: ["#7aa874", "#a3c9a0", "#5c8a58"], text: "#33492f" },
  rose:    { name: "🌹 玫瑰金",   bg1: "#f9e8e6", bg2: "#fff6f4", balloon: ["#e0a180", "#f0c3ab", "#c98268"], text: "#5f4038" },
};
let balloonStyle = "sakura";

/* 背景音乐状态 */
const music = { mode: "none", src: "", name: "" };
function handleMusicFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) {
    toast("音乐超过 12MB，内嵌会让文件很大，建议用链接或换小文件");
  }
  const reader = new FileReader();
  reader.onload = () => {
    music.mode = "local"; music.src = reader.result; music.name = file.name;
    $("#bMusicUrl").value = "";
    $("#musicStatus").textContent = "🎧 已内嵌：" + file.name + "（" + (file.size / 1024 / 1024).toFixed(1) + "MB，会随 HTML 一起发送）";
    renderBalloonPreview();
  };
  reader.readAsDataURL(file);
}
function handleMusicUrl(url) {
  url = (url || "").trim();
  if (url) {
    music.mode = "url";
    music.src = url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E");
    music.name = "链接音乐";
    $("#bMusicFile").value = "";
    $("#musicStatus").textContent = "🔗 已挂载直链音乐";
  } else if (music.mode === "url") {
    music.mode = "none"; music.src = ""; music.name = "";
    $("#musicStatus").textContent = "未添加音乐";
  }
  renderBalloonPreview();
}

function renderStylePicker() {
  const box = $("#stylePick"); box.innerHTML = "";
  Object.entries(BSTYLES).forEach(([k, s]) => {
    const el = document.createElement("span");
    el.className = "bstyle" + (k === balloonStyle ? " on" : "");
    el.dataset.k = k; el.textContent = s.name;
    el.onclick = () => pickStyle(k);
    box.appendChild(el);
  });
}
function pickStyle(k) {
  balloonStyle = k;
  $$(".bstyle").forEach(b => b.classList.toggle("on", b.dataset.k === k));
  renderBalloonPreview();
}
function balloonHTML(data) {
  const s = BSTYLES[data.style];
  const lines = (data.letter || "").split("\n").map(l => `<p>${l.replace(/</g, "&lt;") || "&nbsp;"}</p>`).join("");
  const audioTag = data.music && data.music.src
    ? `<audio id="bgm" loop preload="auto" src="${data.music.src}"></audio>`
    : "";
  const musicUI = data.music && data.music.src
    ? `<div class="music-btn" id="musicBtn" title="开/关音乐">♪</div>
       <div class="music-hint" id="musicHint">♪ 点我打开音乐</div>`
    : "";
  const musicCSS = data.music && data.music.src
    ? `.music-btn{position:fixed;right:22px;bottom:22px;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.85);color:${s.text};font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.18);z-index:9;transition:transform .2s}
.music-btn.playing{animation:spin 3.5s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.music-hint{position:fixed;right:86px;bottom:34px;font-size:12px;color:${s.text};background:rgba(255,255,255,.8);padding:6px 12px;border-radius:999px;z-index:9;transition:opacity .3s}`
    : "";
  const musicJS = data.music && data.music.src
    ? `<script>
(function(){
  var a=document.getElementById('bgm'),b=document.getElementById('musicBtn'),h=document.getElementById('musicHint');
  var on=false;
  function start(){a.play().then(function(){on=true;b.classList.add('playing');if(h)h.style.opacity=0;}).catch(function(){});}
  document.addEventListener('click',function once(){ if(!on) start(); document.removeEventListener('click',once); });
  a.addEventListener('canplay',function(){ start(); });
  if(b)b.addEventListener('click',function(e){e.stopPropagation();if(on){a.pause();on=false;b.classList.remove('playing');}else{start();}});
})();
<\/script>`
    : "";
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>给你的告白气球</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:linear-gradient(170deg,${s.bg1},${s.bg2});font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:${s.text};overflow-x:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px}
.balloon{position:fixed;bottom:-180px;width:64px;height:80px;border-radius:50% 50% 48% 52%;opacity:.85;animation:float 11s linear infinite}
.balloon::after{content:"";position:absolute;bottom:-14px;left:50%;width:2px;height:46px;background:${s.text}55;transform:translateX(-50%)}
@keyframes float{0%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-115vh) rotate(4deg)}100%{transform:translateY(-115vh)}}
.wrap{max-width:640px;width:100%;background:rgba(255,255,255,.78);backdrop-filter:blur(10px);border-radius:24px;padding:44px 36px;box-shadow:0 20px 60px rgba(0,0,0,.12);text-align:center;position:relative;z-index:2}
.to{font-size:14px;letter-spacing:4px;opacity:.7}
h1{font-size:34px;margin:14px 0 6px}
.heart{font-size:40px;display:inline-block;animation:beat 1.2s ease infinite}
@keyframes beat{0%,100%{transform:scale(1)}25%{transform:scale(1.25)}40%{transform:scale(1)}}
.letter{margin-top:24px;text-align:left;font-size:16px;line-height:2.2}
.from{margin-top:28px;font-size:14px;opacity:.75;text-align:right}
.tip{margin-top:30px;font-size:12px;opacity:.5}
@media (max-width:480px){.letter{font-size:15px}}
${musicCSS}
</style></head><body>
${[0,1,2,3,4,5,6].map(i => `<div class="balloon" style="left:${6 + i * 13}%;background:${s.balloon[i % 3]};animation-delay:${-i * 1.7}s;animation-duration:${9 + (i % 4)}s"></div>`).join("")}
${audioTag}${musicUI}
<div class="wrap">
  <div class="to">TO ${data.to.replace(/</g, "&lt;") || "亲爱的你"}</div>
  <h1><span class="heart">🎈</span> ${data.title.replace(/</g, "&lt;") || "我喜欢你"}</h1>
  <div class="letter">${lines}</div>
  <div class="from">—— ${data.from.replace(/</g, "&lt;") || "一个喜欢你的人"}</div>
  <div class="tip">🎈 这颗气球来自「告白气球」 · ${new Date().toLocaleDateString("zh-CN")}</div>
</div>
${musicJS}
</body></html>`;
}
function renderBalloonPreview() {
  const data = {
    to: $("#bTo").value.trim(), title: $("#bTitle").value.trim(),
    letter: $("#bLetter").value.trim() || "有些话，当面说不出口。\n所以我把它系在气球上，让它替我飞到你面前。\n我喜欢你。",
    from: $("#bFrom").value.trim(), style: balloonStyle,
    music: music.mode === "none" ? null : { src: music.src },
  };
  const html = balloonHTML(data);
  $("#balloonFrame").srcdoc = html;
  window.__balloonHTML = html;
}
function downloadBalloon() {
  if (!window.__balloonHTML) renderBalloonPreview();
  const blob = new Blob([window.__balloonHTML], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "给你的告白气球.html";
  a.click(); URL.revokeObjectURL(a.href);
  toast(music.mode === "none" ? "告白气球已生成，发给 TA 吧 🎈" : "带音乐的告白气球已生成 🎈🎵");
}
function importFromTactic() {
  const sp = $("#tacticBox .speech");
  if (sp) { $("#bLetter").value = sp.textContent.trim(); renderBalloonPreview(); showView("view-balloon", $$('.nav button')[2]); toast("台词已带上气球 🎈"); }
  else toast("先在丘比特之箭里生成台词哦");
}

/* ---------- 初始化 ---------- */
window.addEventListener("DOMContentLoaded", () => {
  initFeelings();
  addTarget();
  initSignals();
  renderKB();
  renderStylePicker();
  renderBalloonPreview();
  $("#entryGo").onclick = () => showView("view-wizard", $$('.nav button')[1]);
  $("#entryBalloon").onclick = () => showView("view-balloon", $$('.nav button')[2]);
  $("#entryKB").onclick = () => showView("view-kb", $$('.nav button')[3]);
  $("#kbSearch").oninput = e => renderKB(e.target.value.trim(), "全部");
});

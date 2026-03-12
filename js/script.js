let ip = [192,168,10,25];
let mask = [255,255,255,0];

function cidrToMask(c) {
  return [0,1,2,3].map(i => {
    let b = Math.min(8, Math.max(0, c - i*8));
    return b===8 ? 255 : b===0 ? 0 : (256-(1<<(8-b)))&255;
  });
}
function maskToCidr(m) { return m.reduce((a,o)=>a+toBin8(o).split('').filter(b=>b==='1').length,0); }
function clamp(v) { return Math.max(0, Math.min(255, parseInt(v)||0)); }
function toBin8(n) { return n.toString(2).padStart(8,'0'); }
function fmt(a) { return a.join('.'); }
function fmtB(a) { return a.map(toBin8).join('.'); }

function buildSelect() {
  const sel = document.getElementById('cidr-sel');
  const cur = maskToCidr(mask);
  sel.innerHTML = '';
  for(let c=1;c<=30;c++){
    const m = cidrToMask(c);
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = '/'+c+' — '+fmt(m);
    if(c===cur) opt.selected = true;
    sel.appendChild(opt);
  }
}

function onCidrChange() {
  const c = parseInt(document.getElementById('cidr-sel').value);
  mask = cidrToMask(c);
  syncMaskInputs();
  render();
}

function syncMaskInputs() {
  mask.forEach((v,i)=>{ const e=document.getElementById('mk'+i); if(e) e.value=v; });
}

function calcSz() {
  const card = document.querySelector('.card');
  if(!card) return 14;
  const W = card.offsetWidth - (window.innerWidth < 540 ? 24 : 40);
  const labelW = window.innerWidth < 540 ? 52 : 70;
  const avail = W - labelW - 36;
  return Math.max(10, Math.min(22, Math.floor(avail/34)));
}

function getBitClass(type, bit, isNetPart) {
  if(type==='ip')    return bit==='1' ? 'b-ip1' : 'b-ip0';
  if(type==='mask')  return isNetPart ? 'b-mn1' : 'b-mn0';
  if(type==='net')   return isNetPart ? (bit==='1' ? 'b-net-r1' : 'b-net-r0') : 'b-net-h0';
  if(type==='bcast') return isNetPart ? (bit==='1' ? 'b-bcast-r1' : 'b-bcast-r0') : 'b-bcast-h1';
  return '';
}

function renderBits() {
  const container = document.getElementById('bits-container');
  container.innerHTML = '';
  const cidr = maskToCidr(mask);
  const net = ip.map((v,i)=>v&mask[i]);
  const bcast = ip.map((v,i)=>net[i]|(255^mask[i]));
  const sz = calcSz();
  const fsz = Math.max(8, sz-6)+'px';

  const rows = [
    {label:'IP',arr:ip,type:'ip'},
    {label:'Máscara',arr:mask,type:'mask'},
    {label:'Rede',arr:net,type:'net'},
    {label:'Broadcast',arr:bcast,type:'bcast'}
  ];

  rows.forEach(({label,arr,type}) => {
    const row = document.createElement('div'); row.className='brow';
    const lbl = document.createElement('div'); lbl.className='brow-lbl'; lbl.textContent=label; row.appendChild(lbl);
    const octs = document.createElement('div'); octs.className='bocts';

    arr.forEach((oct,oi) => {
      if(oi>0){ const s=document.createElement('div'); s.className='bsep'; s.textContent='.'; octs.appendChild(s); }
      const unit=document.createElement('div'); unit.className='boct';
      const dec=document.createElement('div'); dec.className='boct-dec'; dec.textContent=oct; unit.appendChild(dec);
      const brow=document.createElement('div'); brow.className='bbits';

      toBin8(oct).split('').forEach((bit,bi) => {
        const gb=oi*8+bi;
        const isNetPart=gb<cidr;
        if(type==='mask' && gb===cidr && cidr>0 && cidr<32){
          const d=document.createElement('div'); d.className='cdiv';
          d.style.width='2px'; d.style.height=sz+'px'; brow.appendChild(d);
        }
        const box=document.createElement('div');
        box.className='bit '+getBitClass(type,bit,isNetPart);
        box.style.width=sz+'px'; box.style.height=sz+'px'; box.style.fontSize=fsz;
        box.textContent=bit;
        if(type==='ip')   box.onclick=()=>toggleIPBit(oi,bi);
        if(type==='mask') box.onclick=()=>toggleMaskBit(oi,bi);
        brow.appendChild(box);
      });

      unit.appendChild(brow); octs.appendChild(unit);
    });

    row.appendChild(octs); container.appendChild(row);
  });

  document.getElementById('cidr-display').textContent='/'+cidr;
  renderLegend();
}

function renderLegend() {
  const items = [
    {color:'#4f8ef7',label:'IP = 1'},{color:'#1e2d4d',label:'IP = 0',text:'#4f8ef7'},
    {color:'#8b7cf8',label:'Máscara rede'},{color:'#1e1a3a',label:'Máscara host',text:'#8b7cf8'},
    {color:'#22c987',label:'Rede rede=1'},{color:'#102820',label:'Rede rede=0',text:'#22c987'},{color:'#1e2028',label:'Rede host=0',text:'#3a3e50'},
    {color:'#f59e42',label:'Bcast rede=1'},{color:'#2a1f0e',label:'Bcast rede=0',text:'#f59e42'},{color:'#ef4444',label:'Bcast host=1'}
  ];
  document.getElementById('legend-row').innerHTML = items.map(l =>
    `<div class="leg"><div class="leg-sw" style="background:${l.color};border:1px solid rgba(255,255,255,.08)"></div><span>${l.label}</span></div>`
  ).join('');
}

function renderSteps() {
  const cidr = maskToCidr(mask);
  const net = ip.map((v,i)=>v&mask[i]);
  const bcast = ip.map((v,i)=>net[i]|(255^mask[i]));
  const fh=[...net]; fh[3]++;
  const lh=[...bcast]; lh[3]--;
  const total = Math.pow(2, 32-cidr);
  const usable = Math.max(0, total-2);
  const ipB=ip.map(toBin8), mB=mask.map(toBin8), nB=net.map(toBin8), bB=bcast.map(toBin8);
  const invMB=mask.map(v=>toBin8(255^v));

  const stepsData = [
    {
      num:1, title:'Representação binária do IP e da máscara',
      body:`<p class="explain">Convertemos cada octeto (0–255) para 8 bits. Os primeiros <strong>${cidr} bits</strong> da máscara são <strong>1</strong> (parte de rede) e os últimos <strong>${32-cidr}</strong> são <strong>0</strong> (parte de host).</p>
      <table class="and-table">
        <tr><th>Campo</th><th>Oct 1</th><th>Oct 2</th><th>Oct 3</th><th>Oct 4</th><th>Decimal</th></tr>
        <tr><td>IP</td>${ipB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(ip)}</td></tr>
        <tr><td>Máscara /${cidr}</td>${mB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(mask)}</td></tr>
      </table>`
    },
    {
      num:2, title:'Endereço de rede — AND bit a bit',
      body:`<p class="explain"><strong>IP AND Máscara</strong>: resultado é 1 somente quando ambos os bits são 1. A parte de host é zerada, preservando apenas a parte de rede.</p>
      <table class="and-table">
        <tr><th>Campo</th><th>Oct 1</th><th>Oct 2</th><th>Oct 3</th><th>Oct 4</th><th>Decimal</th></tr>
        <tr><td>IP</td>${ipB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(ip)}</td></tr>
        <tr><td>Máscara</td>${mB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(mask)}</td></tr>
        <tr class="and-result"><td>AND = Rede</td>${nB.map(b=>'<td class="hl-net">'+b+'</td>').join('')}<td><span class="result-pill pill-net">${fmt(net)}</span></td></tr>
      </table>`
    },
    {
      num:3, title:'Endereço de broadcast — OR com máscara invertida',
      body:`<p class="explain"><strong>Passo 3a</strong> — Inverter a máscara (NOT): cada 0 vira 1 e cada 1 vira 0. Isso cria a máscara wildcard.</p>
      <table class="and-table">
        <tr><th>Campo</th><th>Oct 1</th><th>Oct 2</th><th>Oct 3</th><th>Oct 4</th></tr>
        <tr><td>Máscara</td>${mB.map(b=>'<td>'+b+'</td>').join('')}</tr>
        <tr class="and-result"><td>NOT Máscara</td>${invMB.map(b=>'<td>'+b+'</td>').join('')}</tr>
      </table>
      <p class="explain" style="margin-top:10px"><strong>Passo 3b</strong> — Rede OR wildcard: a parte de host é preenchida com 1s.</p>
      <table class="and-table">
        <tr><th>Campo</th><th>Oct 1</th><th>Oct 2</th><th>Oct 3</th><th>Oct 4</th><th>Decimal</th></tr>
        <tr><td>Rede</td>${nB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(net)}</td></tr>
        <tr><td>NOT Máscara</td>${invMB.map(b=>'<td>'+b+'</td>').join('')}<td>${fmt(mask.map(v=>255^v))}</td></tr>
        <tr class="and-result"><td>OR = Broadcast</td>${bB.map(b=>'<td class="hl-bcast">'+b+'</td>').join('')}<td><span class="result-pill pill-bcast">${fmt(bcast)}</span></td></tr>
      </table>`
    },
    {
      num:4, title:'Hosts usáveis e intervalo de endereços',
      body:`<p class="explain">Os hosts usáveis são todos os endereços entre a rede e o broadcast, excluindo ambos. Fórmula: <strong>2^(32−${cidr}) − 2</strong>.</p>
      <table class="and-table">
        <tr><th>Cálculo</th><th>Valor</th></tr>
        <tr><td>Bits de host (32 − ${cidr})</td><td>${32-cidr}</td></tr>
        <tr><td>Total de endereços (2^${32-cidr})</td><td>${total.toLocaleString()}</td></tr>
        <tr><td>− Rede e Broadcast</td><td>− 2</td></tr>
        <tr class="and-result"><td>Hosts usáveis</td><td>${usable.toLocaleString()}</td></tr>
      </table>
      <p class="explain" style="margin-top:10px">
        Primeiro host: <span class="result-pill pill-net">${cidr>=31?'N/A':fmt(fh)}</span> &nbsp;
        Último host: <span class="result-pill pill-net">${cidr>=31?'N/A':fmt(lh)}</span>
      </p>`
    }
  ];

  const container = document.getElementById('steps-container');
  container.innerHTML = '';
  stepsData.forEach((s,idx) => {
    const step=document.createElement('div'); step.className='step';
    const hdr=document.createElement('div'); hdr.className='step-hdr';
    const arrow=document.createElement('div'); arrow.className='step-arrow'+(idx===0?' open':''); arrow.textContent='▾';
    hdr.innerHTML=`<div class="step-num">${s.num}</div><div class="step-title">${s.title}</div>`;
    hdr.appendChild(arrow);
    const body=document.createElement('div'); body.className='step-body'+(idx===0?' open':''); body.innerHTML=s.body;
    hdr.onclick=()=>{ body.classList.toggle('open'); arrow.classList.toggle('open'); };
    step.appendChild(hdr); step.appendChild(body);
    container.appendChild(step);
  });
}

function calcResults() {
  const cidr = maskToCidr(mask);
  const net = ip.map((v,i)=>v&mask[i]);
  const bcast = ip.map((v,i)=>net[i]|(255^mask[i]));
  const fh=[...net]; fh[3]++;
  const lh=[...bcast]; lh[3]--;
  const total = Math.pow(2, 32-cidr);
  const usable = Math.max(0, total-2);
  document.getElementById('results').innerHTML=`
    <div class="ri"><div class="rl">Endereço IP</div><div class="rv">${fmt(ip)}</div><div class="rb">${fmtB(ip)}</div></div>
    <div class="ri"><div class="rl">Máscara /${cidr}</div><div class="rv">${fmt(mask)}</div><div class="rb">${fmtB(mask)}</div></div>
    <div class="ri"><div class="rl">Rede</div><div class="rv">${fmt(net)}</div><div class="rb">${fmtB(net)}</div></div>
    <div class="ri"><div class="rl">Broadcast</div><div class="rv">${fmt(bcast)}</div><div class="rb">${fmtB(bcast)}</div></div>
    <div class="ri"><div class="rl">1º Host</div><div class="rv">${cidr>=31?'N/A':fmt(fh)}</div></div>
    <div class="ri"><div class="rl">Último Host</div><div class="rv">${cidr>=31?'N/A':fmt(lh)}</div></div>
    <div class="ri"><div class="rl">Total Hosts</div><div class="rv">${total.toLocaleString()}</div></div>
    <div class="ri"><div class="rl">Hosts Usáveis</div><div class="rv">${usable.toLocaleString()}</div></div>`;
}

function render() {
  renderBits();
  renderSteps();
  calcResults();
  buildSelect();
  syncMaskInputs();
  ['ip0','ip1','ip2','ip3'].forEach((id,i)=>{ const e=document.getElementById(id); if(e) e.value=ip[i]; });
  mask.forEach((v,i)=>{ const e=document.getElementById('mk'+i); if(e) e.value=v; });
}

function syncFromInputs() {
  ip = [0,1,2,3].map(i=>clamp(document.getElementById('ip'+i).value));
  mask = [0,1,2,3].map(i=>clamp(document.getElementById('mk'+i).value));
  render();
}

function toggleIPBit(oi, bi) {
  const b=toBin8(ip[oi]).split('');
  b[bi]=b[bi]==='1'?'0':'1';
  ip[oi]=parseInt(b.join(''),2);
  render();
}

function toggleMaskBit(oi, bi) {
  let flat = mask.map(toBin8).join('');
  const gb = oi*8 + bi;
  if(flat[gb] === '0') {
    flat = flat.split('').map((b,i) => i <= gb ? '1' : b).join('');
  } else {
    flat = flat.split('').map((b,i) => i >= gb ? '0' : b).join('');
  }
  mask = [0,1,2,3].map(o => parseInt(flat.slice(o*8, o*8+8), 2));
  render();
}

function loadPreset(ipStr, c) {
  ip=ipStr.split('.').map(Number);
  mask=cidrToMask(c);
  render();
}

['ip0','ip1','ip2','ip3','mk0','mk1','mk2','mk3'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('keydown', e=>{ if(e.key==='Enter') syncFromInputs(); });
  el.addEventListener('change', syncFromInputs);
});

let resizeTimer;
window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(render,80); });

buildSelect();
render();

// ─── IPv6 Quiz ────────────────────────────────────────────────
let v6Full = [];        // 8 groups as numbers
let v6Correct = 0, v6Tries = 0, v6Streak = 0;
let v6DColonStart = -1, v6DColonLen = 0;  // position of :: in full address

function v6RandGroup() { return Math.floor(Math.random() * 0x10000); } // 0x0000–0xffff

function v6FindBestRun(groups) {
  let best = {start:-1, len:0}, cur = {start:-1, len:0};
  groups.forEach((g,i) => {
    if(g === 0) {
      if(cur.start === -1) cur = {start:i, len:1};
      else cur.len++;
      if(cur.len > best.len) best = {...cur};
    } else { cur = {start:-1, len:0}; }
  });
  return best.len >= 2 ? best : {start:-1, len:0};
}

function v6Simplify(groups) {
  const run = v6FindBestRun(groups);
  let parts = [];
  if(run.start === -1) {
    return groups.map(g => g.toString(16)).join(':');
  }
  const before = groups.slice(0, run.start).map(g => g.toString(16));
  const after  = groups.slice(run.start + run.len).map(g => g.toString(16));
  return (before.length ? before.join(':') : '') + '::' + (after.length ? after.join(':') : '');
}

function v6FormatFull(groups) {
  return groups.map(g => g.toString(16).padStart(4,'0')).join(':');
}

function v6Generate() {
  // Guarantee at least one run of 2+ zeros for interesting compression
  v6Full = Array.from({length:8}, v6RandGroup);
  // force a zero run somewhere
  const pos = Math.floor(Math.random()*6);
  const len = 2 + Math.floor(Math.random()*4);
  for(let i=0;i<len&&pos+i<8;i++) v6Full[pos+i]=0;
  // also sometimes add leading zeros in other groups
  v6Full = v6Full.map(g => g);
  const run = v6FindBestRun(v6Full);
  v6DColonStart = run.start;
  v6DColonLen   = run.len;
}

function v6BuildInputs() {
  const container = document.getElementById('v6-inputs');
  container.innerHTML = '';
  const run = v6FindBestRun(v6Full);
  // We'll build input slots matching the simplified structure:
  // groups before ::, a readonly "::" slot, groups after ::
  // If no run, just 8 input slots

  const addColon = () => {
    const c = document.createElement('div');
    c.className = 'v6-colon'; c.textContent = ':';
    container.appendChild(c);
  };

  const addInput = (idx, isDC) => {
    if(isDC) {
      const dc = document.createElement('input');
      dc.className = 'v6-inp dc';
      dc.value = '::'; dc.readOnly = true;
      dc.style.width = '42px';
      container.appendChild(dc);
    } else {
      const inp = document.createElement('input');
      inp.className = 'v6-inp';
      inp.maxLength = 4;
      inp.dataset.idx = idx;
      inp.placeholder = '????';
      inp.spellcheck = false;
      inp.autocomplete = 'off';
      inp.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9a-fA-F]/g,'').slice(0,4);
      });
      inp.addEventListener('keydown', function(e) {
        if(e.key === 'Enter') v6Check();
      });
      container.appendChild(inp);
    }
  };

  if(run.start === -1) {
    // no :: — 8 plain inputs
    for(let i=0;i<8;i++) {
      if(i>0) addColon();
      addInput(i, false);
    }
  } else {
    const before = run.start;
    const after  = 8 - run.start - run.len;
    for(let i=0;i<before;i++) { if(i>0) addColon(); addInput(i,false); }
    if(before>0) addColon();
    addInput(-1, true);  // :: slot
    for(let i=0;i<after;i++) { addColon(); addInput(run.start+run.len+i,false); }
  }
}

function v6RenderFull() {
  const run = v6FindBestRun(v6Full);
  let html = '';
  v6Full.forEach((g,i) => {
    if(i>0) html += '<span style="color:var(--text3)">:</span>';
    const full4 = g.toString(16).padStart(4,'0');
    if(run.start !== -1 && i >= run.start && i < run.start + run.len) {
      html += `<span class="g-elided">${full4}</span>`;
    } else if(g === 0) {
      html += `<span class="g-normal">0000</span>`;
    } else {
      // show leading zeros in dim, rest normal
      const stripped = g.toString(16);
      const leadCount = 4 - stripped.length;
      const leadPart = leadCount > 0 ? `<span class="g-leading">${'0'.repeat(leadCount)}</span>` : '';
      html += leadPart + `<span class="g-normal">${stripped}</span>`;
    }
  });
  document.getElementById('v6-full').innerHTML = html;
}

function v6CollectAnswer() {
  const run = v6FindBestRun(v6Full);
  const inputs = [...document.querySelectorAll('#v6-inputs .v6-inp:not(.dc)')];
  let result = [];
  if(run.start === -1) {
    result = inputs.map(inp => parseInt(inp.value || 'x', 16));
  } else {
    // fill before, zeros for ::, fill after
    const before = run.start;
    const dcLen  = run.len;
    const after  = 8 - before - dcLen;
    const beforeInputs = inputs.slice(0, before);
    const afterInputs  = inputs.slice(before);
    result = [
      ...beforeInputs.map(i => parseInt(i.value||'x',16)),
      ...Array(dcLen).fill(0),
      ...afterInputs.map(i => parseInt(i.value||'x',16))
    ];
  }
  return result;
}

function v6MarkInputs(answer) {
  const run = v6FindBestRun(v6Full);
  const inputs = [...document.querySelectorAll('#v6-inputs .v6-inp:not(.dc)')];
  if(run.start === -1) {
    inputs.forEach((inp,i) => {
      inp.classList.remove('ok','err');
      const val = parseInt(inp.value||'x',16);
      inp.classList.add(val === v6Full[i] ? 'ok' : 'err');
    });
  } else {
    const before = run.start;
    const after  = 8 - before - run.len;
    const beforeInputs = inputs.slice(0, before);
    const afterInputs  = inputs.slice(before);
    beforeInputs.forEach((inp,i) => {
      inp.classList.remove('ok','err');
      const val = parseInt(inp.value||'x',16);
      inp.classList.add(val === v6Full[i] ? 'ok' : 'err');
    });
    afterInputs.forEach((inp,i) => {
      inp.classList.remove('ok','err');
      const val = parseInt(inp.value||'x',16);
      inp.classList.add(val === v6Full[run.start+run.len+i] ? 'ok' : 'err');
    });
  }
}

function v6Check() {
  v6Tries++;
  document.getElementById('v6-tries').textContent = v6Tries;

  const answer = v6CollectAnswer();
  const correct = answer.every((g,i) => g === v6Full[i]);

  v6MarkInputs(answer);

  const fb = document.getElementById('v6-fb');
  fb.className = 'v6-fb show ' + (correct ? 'ok' : 'err');

  if(correct) {
    v6Correct++; v6Streak++;
    document.getElementById('v6-correct').textContent = v6Correct;
    document.getElementById('v6-streak').textContent = v6Streak;
    fb.textContent = '✓ Correto! O endereço foi simplificado corretamente.';
    document.getElementById('v6-diff').style.display = 'none';
  } else {
    v6Streak = 0;
    document.getElementById('v6-streak').textContent = v6Streak;
    fb.textContent = '✗ Resposta incorreta — verifique os campos marcados em vermelho.';
    showDiff(answer);
  }
}

function showDiff(answer) {
  const diffEl = document.getElementById('v6-diff');
  diffEl.style.display = 'block';
  const correct = v6Simplify(v6Full);
  const given = answer.every(n=>!isNaN(n)) ? v6Simplify(answer) : '(inválido)';
  diffEl.innerHTML = `
    <div><div class="v6-diff-lbl">Sua resposta</div><div class="v6-diff-val" style="color:#ef4444">${given}</div></div>
    <div><div class="v6-diff-lbl">Resposta correta</div><div class="v6-diff-val" style="color:#22c987">${correct}</div></div>
    <div><div class="v6-diff-lbl">Endereço completo</div><div class="v6-diff-val" style="color:var(--text2)">${v6FormatFull(v6Full)}</div></div>
  `;
}

function v6Show() {
  const fb = document.getElementById('v6-fb');
  fb.className = 'v6-fb show info';
  fb.textContent = 'Resposta: ' + v6Simplify(v6Full);

  // Fill inputs with correct values
  const run = v6FindBestRun(v6Full);
  const inputs = [...document.querySelectorAll('#v6-inputs .v6-inp:not(.dc)')];
  if(run.start === -1) {
    inputs.forEach((inp,i) => { inp.value = v6Full[i].toString(16); inp.className='v6-inp ok'; });
  } else {
    const beforeInputs = inputs.slice(0, run.start);
    const afterInputs  = inputs.slice(run.start);
    beforeInputs.forEach((inp,i) => { inp.value = v6Full[i].toString(16); inp.className='v6-inp ok'; });
    afterInputs.forEach((inp,i) => { inp.value = v6Full[run.start+run.len+i].toString(16); inp.className='v6-inp ok'; });
  }
  showDiff(v6Full);
}

function v6New() {
  v6Generate();
  v6BuildInputs();
  v6RenderFull();
  document.getElementById('v6-fb').className = 'v6-fb';
  document.getElementById('v6-diff').style.display = 'none';
}

// Init
v6New();

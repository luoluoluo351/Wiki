// 法宝图鉴

const TREASURE_STORAGE = 'treasures';
const TREASURE_TYPES = { attack:{label:'攻击类',sub:['剑','枪','斧','针','盾','扇']}, defense:{label:'防具类',sub:['甲','胄','袍']}, accessory:{label:'饰品类',sub:['环','玺','镜','珠','印']} };
const TREASURE_GRADES = ['下品法器','中品法器','上品法器','极品法器'];
const ENTRY2_STATS = ['生命','攻击','防御','暴击率','暴击伤害','金抗','木抗','水抗','火抗','土抗','金伤加成','木伤加成','水伤加成','火伤加成','土伤加成'];

function createEmptyTreasure() { return { id:'',name:'',image:'',type:'attack',subtype:'剑',grade:'下品法器',entry1:{lv1:0,lv60:0},entry2:{stat:'攻击',lv1:0,lv60:0},passiveSkills:[] }; }
function growthColor(lv1,lvMax,mx){ return ((lvMax-lv1)/(mx-1))<0?'color:var(--red);':''; }
function calcTreasureCombat(t) {
  let pts = 0;
  if (t.type === 'attack') pts += (t.entry1.lv60||0) / 2;
  else if (t.type === 'defense') pts += (t.entry1.lv60||0) / 10;
  const s = t.entry2.stat; const v = t.entry2.lv60 || 0;
  if (s==='生命') pts += v / 0.1;
  else if (s==='攻击') pts += v / 0.1;
  else if (s==='防御') pts += v / 0.1;
  else if (s==='暴击率'||s==='暴击伤害') pts += v;
  else if (s.includes('抗性')||s.includes('伤害加成')) pts += v / 0.8;
  return Math.round(pts);
}

const Treasures = {

  renderList() {
    const list = Storage.list(TREASURE_STORAGE);
    const cf = this._currentFilter || 'all';
    const filtered = cf === 'all' ? list : list.filter(t => t.type === cf);
    let rows = '';
    if (filtered.length === 0) { rows = '<div class="placeholder">暂无法宝，点击右上角按钮添加</div>'; }
    else {
      const anyAttack = filtered.some(t => t.type === 'attack' || t.type === 'defense');
      rows = `<div class="row-list">
      <div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:120px;">名称</span>
        <span class="row-h-col" style="width:130px;">品阶·类型</span>
        ${anyAttack ? '<span class="row-h-col" style="width:105px;">词条一</span>' : ''}
        <span class="row-h-col" style="width:100px;">词条二</span>
        <span class="row-h-col" style="width:55px;">战力</span>
      </div>`;
      filtered.forEach(t => {
        const tSrc=(t.image||'').startsWith('data:')?t.image:(t.image?'img/treasures/'+t.image:'');const imgHtml=tSrc?`<img src="${tSrc}" alt="${t.name}">`:'<div class="row-noimg">无图</div>';
        const hasEntry1 = t.type === 'attack' || t.type === 'defense';
        const e1Label = t.type === 'attack' ? '基础攻击' : '基础生命';
        const skillsEsc = JSON.stringify(t.passiveSkills||[]).replace(/'/g,'&#39;');
        rows += `<div class="row-item">
          ${imgHtml}
          <span class="row-name" style="width:120px;">${t.name||'未命名'}</span>
          <span style="color:var(--text-dim);width:130px;font-size:14px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.grade}·${TREASURE_TYPES[t.type]?.sub.find(s=>s===t.subtype)||t.subtype}</span>
          ${anyAttack ? (hasEntry1 ? `<span class="row-stat" style="width:105px;">${e1Label}+${t.entry1.lv60}</span>` : '<span style="width:105px;text-align:center;">—</span>') : ''}
          <span class="row-stat" style="width:100px;">${t.entry2.stat}+${t.entry2.lv60}%</span>
          <span style="color:var(--gold);width:55px;font-size:14px;text-align:center;white-space:nowrap;">${calcTreasureCombat(t)}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('treasures/detail?id=${t.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-skills='${skillsEsc}' onclick="event.stopPropagation();showAbilityModal('${t.name||'法宝'} 特性',JSON.parse(this.dataset.skills))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm('确定删除「${t.name||'未命名'}」？')){Storage.deleteById('treasures','${t.id}');App.navigate('treasures');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    const filterBtns = Object.entries(TREASURE_TYPES).map(([k,v]) => `<button data-filter="${k}" ${cf===k?'style="background:var(--gold);color:#fff;"':''} onclick="Treasures.setFilter('${k}');App.navigate('treasures')">${v.label}</button>`).join('');
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">法宝图鉴</h2><div style="display:flex;gap:6px;"><button data-filter="all" ${cf==='all'?'style="background:var(--gold);color:#fff;"':''} onclick="Treasures.setFilter('all');App.navigate('treasures')">全部</button>${filterBtns}</div><button class="btn-primary" onclick="App.navigate('treasures/detail')">+ 添加法宝</button></div>${rows}`;
  },

  bindListEvents() {},
  _currentFilter: 'all',

  renderDetail(id) {
    const t = id ? Storage.findById(TREASURE_STORAGE, id) : createEmptyTreasure();
    if (id && !t) return '<div class="placeholder">法宝不存在</div>';
    const isNew = !id;
    const subOptions = TREASURE_TYPES[t.type]?.sub || [];
    const hasEntry1 = t.type === 'attack' || t.type === 'defense';
    const e1Label = t.type === 'attack' ? '基础攻击力' : '基础生命值';
    const e1g = ((t.entry1.lv60 - t.entry1.lv1) / 59);
    const e2g = ((t.entry2.lv60 - t.entry2.lv1) / 59);
    let skillsHtml = ''; (t.passiveSkills||[]).forEach((sk,i)=>{ skillsHtml += `<div class="entry-item"><div class="entry-header"><span>特性 #${i+1}</span><button class="btn-delete" data-action="del-skill" data-idx="${i}">×</button></div><input type="text" value="${sk.name||''}" data-field="tskill_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="tskill_desc_${i}" placeholder="技能描述" style="width:100%;">${sk.desc||''}</textarea></div>`; });
    return `<div class="detail-page" data-treasure-id="${t.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('treasures')">← 返回列表</button><button class="btn-primary" id="btn-save">保存</button><button class="btn-danger" id="btn-del" ${isNew?'style="display:none"':''}>删除法宝</button></div>
      <fieldset class="fieldset"><legend>基本信息</legend><div class="form-row"><div style="flex:0 0 200px;"><label>法宝图片</label><div id="treasure-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;"><div class="form-group"><label>名称</label><input type="text" id="treasure-name" value="${t.name}" style="width:100%;font-size:18px;"></div><div class="form-row"><div style="flex:1;"><label>类型</label><select id="treasure-type">${Object.entries(TREASURE_TYPES).map(([k,v])=>`<option value="${k}" ${t.type===k?'selected':''}>${v.label}</option>`).join('')}</select></div><div style="flex:1;"><label>子类型</label><select id="treasure-subtype">${subOptions.map(s=>`<option value="${s}" ${t.subtype===s?'selected':''}>${s}</option>`).join('')}</select></div><div style="flex:1;"><label>品阶</label><select id="treasure-grade">${TREASURE_GRADES.map(g=>`<option value="${g}" ${t.grade===g?'selected':''}>${g}</option>`).join('')}</select></div></div></div></div></fieldset>
      <fieldset class="fieldset" id="entry1-section" ${hasEntry1?'':'style="display:none;"'}><legend>词条1 — ${e1Label}（1级→60级，线性成长）</legend><div class="form-row"><div style="flex:1;"><label>1级值</label><input type="number" id="entry1-lv1" value="${t.entry1.lv1}"></div><div style="flex:1;"><label>60级值</label><input type="number" id="entry1-lv60" value="${t.entry1.lv60}"></div><div style="flex:1;"><label>每级成长</label><span id="entry1-growth" style="${e1g<0?'color:var(--red);':''}">${e1g.toFixed(2)}</span></div></div></fieldset>
      <fieldset class="fieldset"><legend>词条2 — 可选属性（1级→60级，线性成长，百分比值）</legend><div class="form-row"><div style="flex:1;"><label>属性</label><select id="entry2-stat">${ENTRY2_STATS.map(s=>`<option value="${s}" ${t.entry2.stat===s?'selected':''}>${s}</option>`).join('')}</select></div><div style="flex:1;"><label>1级值 (%)</label><input type="number" id="entry2-lv1" value="${t.entry2.lv1}" step="0.01"></div><div style="flex:1;"><label>60级值 (%)</label><input type="number" id="entry2-lv60" value="${t.entry2.lv60}" step="0.01"></div><div style="flex:1;"><label>每级成长</label><span id="entry2-growth" style="${e2g<0?'color:var(--red);':''}">${e2g.toFixed(2)}</span></div></div></fieldset>
      <fieldset class="fieldset"><legend>特性 <button class="btn-add" id="btn-add-skill">+</button></legend><div id="skills-container">${skillsHtml||'<div style="color:var(--text-dim);">暂无特性</div>'}</div></fieldset>
      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save2">保存</button><button class="btn-danger" id="btn-del2" ${isNew?'style="display:none"':''}>删除法宝</button></div>
    </div>`;
  },

  bindDetailEvents() {
    const self=this; const el=document.querySelector('.detail-page'); if(!el)return;
    const tid=el.dataset.treasureId; const isNew=el.dataset.isNew==='true';
    const iz=document.getElementById('treasure-img-zone'); if(iz){let cur=tid?Storage.findById(TREASURE_STORAGE,tid):null;ImageUpload.setup(iz,cur?.image||'',(v)=>{},'treasures/');}
    const save=()=>{const d=self._collect(tid);if(!d.name.trim()){alert('请输入法宝名称');return;}if(!d.id)d.id=Storage.uid();Storage.save(TREASURE_STORAGE,d);App.navigate('treasures');};
    document.getElementById('btn-save')?.addEventListener('click',save); document.getElementById('btn-save2')?.addEventListener('click',save);
    const del=()=>{if(confirm('确定删除该法宝？')){Storage.deleteById(TREASURE_STORAGE,tid);App.navigate('treasures');}};
    document.getElementById('btn-del')?.addEventListener('click',del); document.getElementById('btn-del2')?.addEventListener('click',del);
    document.getElementById('treasure-type')?.addEventListener('change',function(){const nt=this.value;const sub=TREASURE_TYPES[nt]?.sub||[];const ss=document.getElementById('treasure-subtype');if(ss)ss.innerHTML=sub.map(s=>`<option>${s}</option>`).join('');const e1=document.getElementById('entry1-section');if(e1)e1.style.display=(nt==='attack'||nt==='defense')?'':'none';const leg=document.querySelector('#entry1-section legend');if(leg)leg.innerHTML=`词条1 — ${nt==='attack'?'基础攻击力':'基础生命值'}（1级→60级，线性成长）`;});
    function ug(){const e1lv1=parseFloat(document.getElementById('entry1-lv1')?.value)||0,e1lv60=parseFloat(document.getElementById('entry1-lv60')?.value)||0,e2lv1=parseFloat(document.getElementById('entry2-lv1')?.value)||0,e2lv60=parseFloat(document.getElementById('entry2-lv60')?.value)||0;const g1=document.getElementById('entry1-growth'),g2=document.getElementById('entry2-growth');if(g1){const v=(e1lv60-e1lv1)/59;g1.textContent=v.toFixed(2);g1.style.color=v<0?'var(--red)':'';}if(g2){const v=(e2lv60-e2lv1)/59;g2.textContent=v.toFixed(2);g2.style.color=v<0?'var(--red)':'';}}
    ['entry1-lv1','entry1-lv60','entry2-lv1','entry2-lv60'].forEach(id=>{document.getElementById(id)?.addEventListener('input',ug);});
    document.getElementById('btn-add-skill')?.addEventListener('click',()=>{const c=document.getElementById('skills-container');const idx=c.querySelectorAll('.entry-item').length;const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span>特性 #${idx+1}</span><button class="btn-delete sd2">×</button></div><input type="text" data-field="tskill_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="tskill_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>`;const em=c.querySelector(':scope > div:not(.entry-item)');if(em)em.remove();c.appendChild(div);div.querySelector('.sd2').addEventListener('click',()=>{div.remove();if(c.children.length===0)c.innerHTML='<div style="color:var(--text-dim);">暂无特性</div>';});});
    document.querySelectorAll('[data-action="del-skill"]').forEach(b=>{b.addEventListener('click',function(){this.closest('.entry-item').remove();const c=document.getElementById('skills-container');if(c.children.length===0)c.innerHTML='<div style="color:var(--text-dim);">暂无特性</div>';});});
  },

  _collect(tid){let d=tid?Storage.findById(TREASURE_STORAGE,tid):createEmptyTreasure();if(!d)d=createEmptyTreasure();d.id=tid||'';d.name=document.getElementById('treasure-name')?.value||'';d.type=document.getElementById('treasure-type')?.value||'attack';d.subtype=document.getElementById('treasure-subtype')?.value||'剑';d.grade=document.getElementById('treasure-grade')?.value||'下品法器';d.entry1={lv1:parseFloat(document.getElementById('entry1-lv1')?.value)||0,lv60:parseFloat(document.getElementById('entry1-lv60')?.value)||0};d.entry2={stat:document.getElementById('entry2-stat')?.value||'攻击',lv1:parseFloat(document.getElementById('entry2-lv1')?.value)||0,lv60:parseFloat(document.getElementById('entry2-lv60')?.value)||0};d.image=document.querySelector('#treasure-img-zone .img-filename-input')?.value?.trim()||'';d.passiveSkills=[];document.querySelectorAll('#skills-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.passiveSkills.push({name:n?.value||'',desc:t?.value||''});});return d;}
};
Treasures.setFilter = function(f) { Treasures._currentFilter = f; };

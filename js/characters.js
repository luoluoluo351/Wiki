// 角色图鉴

const REALMS = ['练气初期','练气中期','练气后期','筑基初期','筑基中期','筑基后期','金丹初期','金丹中期','金丹后期','元婴初期','元婴中期','元婴后期','化神初期','化神中期','化神后期'];
const ELEMENTS = ['金','木','水','火','土'];
const STORAGE_KEY = 'characters';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX'];

function realmToLevel(r) { const i = REALMS.indexOf(r); return i >= 0 ? i + 1 : 1; }
function calcGrowth(lv1, lvMax, maxLv) { return (lvMax - lv1) / (maxLv - 1); }
function isYuanYing(realm) { return REALMS.indexOf(realm) >= 9; }
function displayRealm(baseRealm, advCount) {
  const idx = REALMS.indexOf(baseRealm);
  if (idx < 0) return baseRealm;
  return REALMS[Math.min(idx + advCount, REALMS.length - 1)];
}

// 战力计算（满级值）
function calcCombatPower(c) {
  let pts = 0;
  const ba = c.basicAttr || {hp:{lv100:0},atk:{lv100:0},def:{lv100:0}};
  pts += (ba.hp.lv100 || 0) / 10;
  pts += (ba.atk.lv100 || 0) / 2;
  pts += (ba.def.lv100 || 0) / 2;
  const aa = c.advancedAttr || {critRate:0,critDmg:0,resist:{},dmgBonus:{}};
  pts += (aa.critRate || 0);
  pts += (aa.critDmg || 0);
  const resist = aa.resist || {};
  const dmg = aa.dmgBonus || {};
  ['metal','wood','water','fire','earth'].forEach(k => {
    pts += (resist[k] || 0) / 0.8;
    pts += (dmg[k] || 0) / 0.8;
  });
  return Math.round(pts);
}

function createEmptyChar() {
  return {
    id:'', name:'', avatar:'', realm:'练气初期', sect:'', spiritRoots:[],
    basicAttr:{hp:{lv1:0,lv100:0},atk:{lv1:0,lv100:0},def:{lv1:0,lv100:0}},
    advancedAttr:{critRate:5,critDmg:150,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}},
    passiveSkills:[], breakthroughs:[], advancements:[],
    mainSkills:[], yuanYingSkill:null, learnedAbilities:[],
    equippedAttack:null, equippedDefense:null, equippedAccessory:null
  };
}
function nextBreakLevel(el) { for (let lv=20;lv<=100;lv+=20) if (!el.includes(lv)) return lv; return 0; }
function nextAdvRank(el) { for (let i=1;i<=30;i++) if (!el.includes(i)) return i; return 0; }

// 根据 ID 查找功法/神通名称
function skillNameById(id) {
  const gongfa = Storage.findById('skills_gongfa', id);
  if (gongfa) return { name: gongfa.name, type: 'gongfa', combat: gongfa.combat || 0 };
  const shentong = Storage.findById('skills_shentong', id);
  if (shentong) return { name: shentong.name, type: 'shentong', combat: shentong.combat || 0 };
  return null;
}

const Characters = {

  renderList() {
    const list = Storage.list(STORAGE_KEY);
    let rows = '';
    if (list.length === 0) { rows = '<div class="placeholder">暂无角色，点击右上角按钮添加</div>'; }
    else {
      rows = `<div class="row-list">
      <div class="row-header" style="gap:18px;padding:10px 28px;">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:80px;">名称</span>
        <span class="row-h-col" style="width:65px;">修为</span>
        <span class="row-h-col" style="width:55px;">宗门</span>
        <span class="row-h-col" style="width:65px;">灵根</span>
        <span class="row-h-col" style="width:55px;">100生命</span>
        <span class="row-h-col" style="width:55px;">100攻击</span>
        <span class="row-h-col" style="width:55px;">100防御</span>
        <span class="row-h-col" style="width:90px;">主修功法</span>
        <span class="row-h-col" style="width:50px;">战力</span>
        <span class="row-h-col" style="width:100px;"></span>
      </div>`;
      list.forEach(c => {
        if (!c.advancements) c.advancements = [];
        if (!c.breakthroughs) c.breakthroughs = [];
        if (!c.mainSkills) c.mainSkills = [];
        if (!c.learnedAbilities) c.learnedAbilities = [];
        if (!c.basicAttr) c.basicAttr = {hp:{lv1:0,lv100:0},atk:{lv1:0,lv100:0},def:{lv1:0,lv100:0}};
        if (!c.advancedAttr) c.advancedAttr = {critRate:5,critDmg:150,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}};
        const avatarHtml = c.avatar ? `<img src="${c.avatar}" alt="${c.name}">` : '<div class="row-noimg">无图</div>';
        const tags = c.spiritRoots.map(e => `<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        const cp = calcCombatPower(c);
        // 主修功法显示
        let mainSkillText = '—';
        if (c.mainSkills.length > 0) {
          const names = c.mainSkills.map(id => {
            const s = skillNameById(id);
            if (!s) return '';
            if (id === c.yuanYingSkill) return s.name + '(元婴)';
            return s.name;
          }).filter(Boolean);
          mainSkillText = names.join('、') || '—';
        }
        // 弹窗数据：被动技能 + 主修功法 + 习得神通
        const modalData = [...c.passiveSkills];
        (c.mainSkills||[]).forEach(skId => {
          const sk = skillNameById(skId);
          if (sk) modalData.push({ name: '主修功法：' + sk.name, desc: (Storage.findById('skills_gongfa',skId)||{}).desc || '' });
        });
        (c.learnedAbilities||[]).forEach(skId => {
          const sk = skillNameById(skId);
          if (sk) modalData.push({ name: '习得神通：' + sk.name, desc: (Storage.findById('skills_shentong',skId)||{}).desc || '' });
        });
        const modalEsc = JSON.stringify(modalData).replace(/'/g,'&#39;');
        rows += `<div class="row-item" style="gap:18px;padding:22px 28px;min-height:140px;">
          ${avatarHtml}
          <span class="row-name" style="width:80px;">${c.name||'未命名'}</span>
          <span style="color:var(--text-dim);width:65px;font-size:13px;text-align:center;white-space:nowrap;overflow:hidden;">${displayRealm(c.realm, (c.advancements||[]).length)}</span>
          <span style="color:var(--text-dim);width:55px;font-size:13px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.sect||'—'}</span>
          <span class="row-tags" style="width:65px;overflow:hidden;">${tags}</span>
          <span class="row-stat" style="width:55px;">${c.basicAttr.hp.lv100}</span>
          <span class="row-stat" style="width:55px;">${c.basicAttr.atk.lv100}</span>
          <span class="row-stat" style="width:55px;">${c.basicAttr.def.lv100}</span>
          <span style="color:var(--text-dim);width:90px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mainSkillText}</span>
          <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${cp}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('characters/detail?id=${c.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-skills='${modalEsc}' onclick="event.stopPropagation();showAbilityModal('${c.name||'角色'} 详情',JSON.parse(this.dataset.skills))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm('确定删除「${c.name||'未命名'}」？')){Storage.deleteById('characters','${c.id}');App.navigate('characters');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">角色图鉴</h2><button class="btn-primary" onclick="App.navigate('characters/detail')">+ 添加角色</button></div>${rows}`;
  },

  bindListEvents() {},

  renderDetail(id) {
    const char = id ? Storage.findById(STORAGE_KEY, id) : createEmptyChar();
    if (id && !char) return '<div class="placeholder">角色不存在</div>';
    const isNew = !id;
    if (!char.breakthroughs) char.breakthroughs = [];
    if (!char.advancements) char.advancements = [];
    if (!char.mainSkills) char.mainSkills = [];
    if (!char.learnedAbilities) char.learnedAbilities = [];

    const rootsHtml = ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${char.spiritRoots.includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
    const yuanyingOk = isYuanYing(char.realm);

    function basicRow(label, key) {
      const a = char.basicAttr[key]; const g = calcGrowth(a.lv1,a.lv100,100);
      return `<div class="form-row">
        <div style="flex:1;"><label>${label} 1级值</label><input type="number" value="${a.lv1}" data-field="basic_${key}_lv1" style="width:100%;"></div>
        <div style="flex:1;"><label>${label} 100级值</label><input type="number" value="${a.lv100}" data-field="basic_${key}_lv100" style="width:100%;"></div>
        <div style="flex:1;"><label>每级成长</label><span class="growth-display" data-basic="${key}" style="${g<0?'color:var(--red);':''}">${g.toFixed(2)}</span></div>
      </div>`;
    }
    if (!char.basicAttr) char.basicAttr = {hp:{lv1:0,lv100:0},atk:{lv1:0,lv100:0},def:{lv1:0,lv100:0}};
    if (!char.advancedAttr) char.advancedAttr = {critRate:5,critDmg:150,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}};
    const adv = char.advancedAttr;
    function elemInputs(prefix, obj) { return ELEMENTS.map(e => { const km={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'}; return `<div style="flex:1;"><label>${e}${prefix}</label><input type="number" value="${obj[km[e]]}" data-field="adv_${prefix}_${km[e]}" step="0.01" style="width:100%;"></div>`; }).join(''); }

    let skillsHtml = ''; char.passiveSkills.forEach((sk,i)=>{skillsHtml+=`<div class="entry-item"><div class="entry-header"><span>被动技能 #${i+1}</span><button class="btn-delete" data-action="del-skill" data-idx="${i}">×</button></div><input type="text" value="${sk.name||''}" data-field="skill_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_${i}" placeholder="技能描述" style="width:100%;">${sk.desc||''}</textarea></div>`;});
    let btHtml = ''; char.breakthroughs.forEach((b,i)=>{btHtml+=`<div class="entry-item"><div class="entry-header"><span class="bt-level-title">LV.${b.level}</span><button class="btn-delete" data-action="del-bt" data-idx="${i}">×</button></div><textarea data-field="bt_${i}" placeholder="属性加成描述" style="width:100%;">${b.desc||''}</textarea></div>`;});
    let advHtml2 = ''; char.advancements.forEach((a,i)=>{advHtml2+=`<div class="entry-item"><div class="entry-header"><span class="bt-level-title">${ROMAN[a.rank-1]||a.rank}阶</span><button class="btn-delete" data-action="del-adv" data-idx="${i}">×</button></div><textarea data-field="adv_${i}" placeholder="属性加成描述" style="width:100%;">${a.desc||''}</textarea></div>`;});

    // 主修功法
    const gongfaList = Storage.list('skills_gongfa');
    let mainSkillHtml = '';
    char.mainSkills.forEach((skId, i) => {
      const sk = skillNameById(skId);
      const name = sk ? sk.name : '(已删除)';
      const isYY = (skId === char.yuanYingSkill);
      mainSkillHtml += `<div class="entry-item"><div class="entry-header"><span>${isYY?'元婴功法':(i===0?'主修功法':'其他功法')}：${name}</span><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:var(--text-dim);">元婴功法</span><input type="checkbox" class="yy-check" data-skid="${skId}" ${isYY?'checked':''} ${yuanyingOk?'':'disabled'}></div><button class="btn-delete ms-del">×</button></div>
      </div>`;
    });

    // 习得神通
    const shentongList = Storage.list('skills_shentong');
    let learnedHtml = '';
    char.learnedAbilities.forEach((skId, i) => {
      const sk = skillNameById(skId);
      learnedHtml += `<div class="entry-item"><div class="entry-header"><span>${sk?sk.name:'(已删除)'}</span><button class="btn-delete la-del">×</button></div></div>`;
    });

    return `<div class="detail-page" data-char-id="${char.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('characters')">← 返回列表</button><button class="btn-primary" id="btn-save-char">保存</button><button class="btn-danger" id="btn-del-char" ${isNew?'style="display:none"':''}>删除角色</button></div>
      <fieldset class="fieldset"><legend>基本信息</legend><div class="form-row"><div style="flex:0 0 200px;"><label>立绘</label><div id="char-avatar-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;"><div class="form-group"><label>姓名</label><input type="text" id="char-name" value="${char.name}" style="width:100%;font-size:18px;"></div><div class="form-row"><div style="flex:1;"><label>宗门</label><input type="text" id="char-sect" value="${char.sect||''}" placeholder="如：青云宗" style="width:100%;"></div><div style="flex:1;"><label>境界</label><select id="char-realm" style="width:100%;">${REALMS.map(r=>`<option value="${r}" ${char.realm===r?'selected':''}>${r}</option>`).join('')}</select></div></div><div class="form-group"><label>灵根（可多选，最多3个）</label><div class="checkbox-group" id="char-roots">${rootsHtml}</div></div></div></div></fieldset>
      <fieldset class="fieldset"><legend>基础属性（1级→100级，线性成长）</legend>${basicRow('生命','hp')}${basicRow('攻击','atk')}${basicRow('防御','def')}</fieldset>
      <fieldset class="fieldset"><legend>进阶属性（固定值，不随等级成长）</legend><div class="form-row"><div style="flex:1;"><label>暴击率 (%)</label><input type="number" id="adv-critRate" value="${adv.critRate}" step="0.01" style="width:100%;"></div><div style="flex:1;"><label>暴击伤害 (%)</label><input type="number" id="adv-critDmg" value="${adv.critDmg}" step="0.01" style="width:100%;"></div></div><div style="margin-top:12px;"><label style="color:var(--gold);">五行抗性 (%)</label></div><div class="form-row">${elemInputs('抗性',adv.resist)}</div><div style="margin-top:12px;"><label style="color:var(--gold);">五行伤害加成 (%)</label></div><div class="form-row">${elemInputs('伤害加成',adv.dmgBonus)}</div></fieldset>
      <fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend><div id="skills-container">${skillsHtml||'<div style="color:var(--text-dim);">暂无被动技能</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>突破 <button class="btn-add" id="btn-add-bt">+</button></legend><div id="bt-container">${btHtml||'<div style="color:var(--text-dim);">暂无突破</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>进阶 <button class="btn-add" id="btn-add-adv">+</button></legend><div id="adv-container">${advHtml2||'<div style="color:var(--text-dim);">暂无进阶</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>装备法宝</legend><div class="form-row">${(()=>{const atkList=Storage.list('treasures').filter(t=>t.type==='attack');const defList=Storage.list('treasures').filter(t=>t.type==='defense');const accList=Storage.list('treasures').filter(t=>t.type==='accessory');return`<div style="flex:1;"><label>攻击类</label><select id="equip-attack"><option value="">不装备</option>${atkList.map(t=>`<option value="${t.id}" ${char.equippedAttack===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div><div style="flex:1;"><label>防具类</label><select id="equip-defense"><option value="">不装备</option>${defList.map(t=>`<option value="${t.id}" ${char.equippedDefense===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div><div style="flex:1;"><label>饰品类</label><select id="equip-accessory"><option value="">不装备</option>${accList.map(t=>`<option value="${t.id}" ${char.equippedAccessory===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div>`;})()}</div></fieldset>
      <fieldset class="fieldset"><legend>主修功法 <button class="btn-add" id="btn-add-ms">+</button></legend><div id="ms-container">${mainSkillHtml||'<div style="color:var(--text-dim);">暂无主修功法</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>习得神通 <button class="btn-add" id="btn-add-la">+</button></legend><div id="la-container">${learnedHtml||'<div style="color:var(--text-dim);">暂无习得神通</div>'}</div></fieldset>
      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save-char2">保存</button><button class="btn-danger" id="btn-del-char2" ${isNew?'style="display:none"':''}>删除角色</button></div>
    </div>`;
  },

  bindDetailEvents() {
    const self = this; const el = document.querySelector('.detail-page'); if (!el) return;
    const charId = el.dataset.charId;
    const az = document.getElementById('char-avatar-zone'); if (az) { let cur = charId ? Storage.findById(STORAGE_KEY, charId) : createEmptyChar(); if (cur?.avatar) ImageUpload.setPreview(az, cur.avatar); ImageUpload.create(az, () => {}); }
    const save = () => { const d = self._collect(charId); if (!d.name.trim()) { alert('请输入角色姓名'); return; } if (!d.id) d.id = Storage.uid(); Storage.save(STORAGE_KEY, d); App.navigate('characters'); };
    document.getElementById('btn-save-char')?.addEventListener('click', save);
    document.getElementById('btn-save-char2')?.addEventListener('click', save);
    const del = () => { if (confirm('确定删除该角色？此操作不可恢复。')) { Storage.deleteById(STORAGE_KEY, charId); App.navigate('characters'); } };
    document.getElementById('btn-del-char')?.addEventListener('click', del);
    document.getElementById('btn-del-char2')?.addEventListener('click', del);
    document.getElementById('char-realm')?.addEventListener('change', function () {
      self._updateGrowth();
      const yuanyingOk = REALMS.indexOf(this.value) >= 9;
      document.querySelectorAll('.yy-check').forEach(cb => { cb.disabled = !yuanyingOk; if (!yuanyingOk && cb.checked) { cb.checked = false; } });
    });
    document.querySelectorAll('[data-field^="basic_"]').forEach(inp => inp.addEventListener('input', () => self._updateGrowth()));

    // 被动技能
    document.getElementById('btn-add-skill')?.addEventListener('click', () => { const c = document.getElementById('skills-container'); const idx = c.querySelectorAll('.entry-item').length; const div = document.createElement('div'); div.className='entry-item'; div.innerHTML=`<div class="entry-header"><span>被动技能 #${idx+1}</span><button class="btn-delete sd">×</button></div><input type="text" data-field="skill_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>`; self._clearEmpty(c); c.appendChild(div); div.querySelector('.sd').addEventListener('click',()=>{div.remove();self._checkEmpty(c,'暂无被动技能');}); });
    document.querySelectorAll('[data-action="del-skill"]').forEach(b=>{b.addEventListener('click',function(){this.closest('.entry-item').remove();self._checkEmpty(document.getElementById('skills-container'),'暂无被动技能');});});

    // 突破
    document.getElementById('btn-add-bt')?.addEventListener('click', () => { const c = document.getElementById('bt-container'); const existing = Array.from(c.querySelectorAll('.bt-level-title')).map(s=>parseInt(s.textContent.replace('LV.',''))); const nl = nextBreakLevel(existing); if (nl===0) { alert('已达上限 LV.100'); return; } const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span class="bt-level-title">LV.${nl}</span><button class="btn-delete bd">×</button></div><textarea data-field="bt_${c.querySelectorAll('.entry-item').length}" placeholder="属性加成描述" style="width:100%;"></textarea>`;self._clearEmpty(c);c.appendChild(div);div.querySelector('.bd').addEventListener('click',()=>{div.remove();self._checkEmpty(c,'暂无突破');}); });
    document.querySelectorAll('[data-action="del-bt"]').forEach(b=>{b.addEventListener('click',function(){this.closest('.entry-item').remove();self._checkEmpty(document.getElementById('bt-container'),'暂无突破');});});

    // 进阶
    document.getElementById('btn-add-adv')?.addEventListener('click', () => { const c = document.getElementById('adv-container'); const existing = Array.from(c.querySelectorAll('.bt-level-title')).map(s=>{const r=ROMAN.indexOf(s.textContent.replace('阶',''));return r>=0?r+1:0;}); const nr = nextAdvRank(existing); if (nr===0) { alert('已达上限 XXX阶'); return; } const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span class="bt-level-title">${ROMAN[nr-1]}阶</span><button class="btn-delete ad">×</button></div><textarea data-field="adv_${c.querySelectorAll('.entry-item').length}" placeholder="属性加成描述" style="width:100%;"></textarea>`;self._clearEmpty(c);c.appendChild(div);div.querySelector('.ad').addEventListener('click',()=>{div.remove();self._checkEmpty(c,'暂无进阶');}); });
    document.querySelectorAll('[data-action="del-adv"]').forEach(b=>{b.addEventListener('click',function(){this.closest('.entry-item').remove();self._checkEmpty(document.getElementById('adv-container'),'暂无进阶');});});

    // 主修功法
    document.getElementById('btn-add-ms')?.addEventListener('click', () => {
      const gongfaList = Storage.list('skills_gongfa');
      if (gongfaList.length === 0) { alert('请先在功法与神通中添加功法'); return; }
      const names = gongfaList.map((g,i) => `${i+1}. ${g.name||'未命名'}`).join('\n');
      const idx = prompt('选择功法（输入序号）：\n' + names);
      if (!idx) return;
      const gi = parseInt(idx) - 1;
      if (gi < 0 || gi >= gongfaList.length) { alert('无效序号'); return; }
      const skId = gongfaList[gi].id;
      const cur = self._collect(charId); // 快速收集当前数据
      if (!cur.mainSkills) cur.mainSkills = [];
      if (cur.mainSkills.includes(skId)) { alert('该功法已添加'); return; }
      cur.mainSkills.push(skId);
      Storage.save(STORAGE_KEY, cur);
      App.navigate('characters/detail?id=' + (cur.id || charId));
    });
    // 元婴功法互斥
    document.querySelectorAll('.yy-check').forEach(cb => {
      cb.addEventListener('change', function () {
        if (this.checked) {
          document.querySelectorAll('.yy-check').forEach(other => { if (other !== this) other.checked = false; });
        }
      });
    });
    document.querySelectorAll('.ms-del').forEach(b => {
      b.addEventListener('click', function () {
        const cur = self._collect(charId);
        const skId = this.closest('.entry-item').querySelector('.yy-check')?.dataset.skid;
        if (skId) {
          cur.mainSkills = (cur.mainSkills||[]).filter(id => id !== skId);
          if (cur.yuanYingSkill === skId) cur.yuanYingSkill = null;
          Storage.save(STORAGE_KEY, cur);
        }
        App.navigate('characters/detail?id=' + (cur.id || charId));
      });
    });

    // 习得神通
    document.getElementById('btn-add-la')?.addEventListener('click', () => {
      const shentongList = Storage.list('skills_shentong');
      if (shentongList.length === 0) { alert('请先在功法与神通中添加神通'); return; }
      const names = shentongList.map((s,i) => `${i+1}. ${s.name||'未命名'}`).join('\n');
      const idx = prompt('选择神通（输入序号）：\n' + names);
      if (!idx) return;
      const si = parseInt(idx) - 1;
      if (si < 0 || si >= shentongList.length) { alert('无效序号'); return; }
      const skId = shentongList[si].id;
      const cur = self._collect(charId);
      if (!cur.learnedAbilities) cur.learnedAbilities = [];
      if (cur.learnedAbilities.includes(skId)) { alert('该神通已添加'); return; }
      cur.learnedAbilities.push(skId);
      Storage.save(STORAGE_KEY, cur);
      App.navigate('characters/detail?id=' + (cur.id || charId));
    });
    document.querySelectorAll('.la-del').forEach(b => {
      b.addEventListener('click', function () {
        const cur = self._collect(charId);
        const item = this.closest('.entry-item');
        const nameSpan = item.querySelector('.entry-header span');
        // 根据名称找到对应的 skill ID
        const curIds = cur.learnedAbilities || [];
        const gongfaList = Storage.list('skills_shentong');
        for (const skId of curIds) {
          const sk = gongfaList.find(g => g.id === skId);
          if (sk && nameSpan && nameSpan.textContent.trim() === (sk.name||'')) {
            cur.learnedAbilities = curIds.filter(id => id !== skId);
            break;
          }
        }
        Storage.save(STORAGE_KEY, cur);
        App.navigate('characters/detail?id=' + (cur.id || charId));
      });
    });
  },
  _clearEmpty(c) { const e = c.querySelector(':scope > div:not(.entry-item)'); if (e) e.remove(); },
  _checkEmpty(c, txt) { if (c && c.querySelectorAll('.entry-item').length === 0) c.innerHTML = `<div style="color:var(--text-dim);">${txt}</div>`; },

  _collect(charId) {
    let d = charId ? Storage.findById(STORAGE_KEY, charId) : createEmptyChar(); if (!d) d = createEmptyChar();
    if (!d.breakthroughs) d.breakthroughs = []; if (!d.advancements) d.advancements = [];
    if (!d.mainSkills) d.mainSkills = []; if (!d.learnedAbilities) d.learnedAbilities = [];
    d.id = charId || ''; d.name = document.getElementById('char-name')?.value || '';
    d.sect = document.getElementById('char-sect')?.value || '';
    d.realm = document.getElementById('char-realm')?.value || '练气初期';
    d.spiritRoots = Array.from(document.querySelectorAll('#char-roots input:checked')).map(cb=>cb.value);
    if (!d.basicAttr) d.basicAttr = {hp:{lv1:0,lv100:0},atk:{lv1:0,lv100:0},def:{lv1:0,lv100:0}};
    ['hp','atk','def'].forEach(k=>{ const l1=document.querySelector(`[data-field="basic_${k}_lv1"]`); const l100=document.querySelector(`[data-field="basic_${k}_lv100"]`); if(l1)d.basicAttr[k].lv1=parseFloat(l1.value)||0; if(l100)d.basicAttr[k].lv100=parseFloat(l100.value)||0; });
    const cr=document.getElementById('adv-critRate'); const cd=document.getElementById('adv-critDmg'); if(cr)d.advancedAttr.critRate=parseFloat(cr.value)||0; if(cd)d.advancedAttr.critDmg=parseFloat(cd.value)||0;
    ['metal','wood','water','fire','earth'].forEach(ek=>{ const r=document.querySelector(`[data-field="adv_抗性_${ek}"]`); const db=document.querySelector(`[data-field="adv_伤害加成_${ek}"]`); if(r)d.advancedAttr.resist[ek]=parseFloat(r.value)||0; if(db)d.advancedAttr.dmgBonus[ek]=parseFloat(db.value)||0; });
    d.avatar = document.querySelector('#char-avatar-zone img')?.src || '';
    d.passiveSkills = []; document.querySelectorAll('#skills-container .entry-item').forEach(item=>{ const n=item.querySelector('input'); const t=item.querySelector('textarea'); d.passiveSkills.push({name:n?.value||'',desc:t?.value||''}); });
    d.breakthroughs = []; document.querySelectorAll('#bt-container .entry-item').forEach(item=>{ const s=item.querySelector('.bt-level-title'); const t=item.querySelector('textarea'); if(s)d.breakthroughs.push({level:parseInt(s.textContent.replace('LV.',''))||0,desc:t?.value||''}); });
    d.advancements = []; document.querySelectorAll('#adv-container .entry-item').forEach(item=>{ const s=item.querySelector('.bt-level-title'); const t=item.querySelector('textarea'); if(s){const r=ROMAN.indexOf(s.textContent.replace('阶',''));d.advancements.push({rank:r>=0?r+1:0,desc:t?.value||''});} });
    // 元婴功法
    const yyCheck = document.querySelector('.yy-check:checked');
    d.yuanYingSkill = yyCheck ? yyCheck.dataset.skid : null;
    d.equippedAttack = document.getElementById('equip-attack')?.value || null;
    d.equippedDefense = document.getElementById('equip-defense')?.value || null;
    d.equippedAccessory = document.getElementById('equip-accessory')?.value || null;
    return d;
  },

  _updateGrowth() {
    ['hp','atk','def'].forEach(k=>{ const l1=document.querySelector(`[data-field="basic_${k}_lv1"]`); const l100=document.querySelector(`[data-field="basic_${k}_lv100"]`); const realm=document.getElementById('char-realm')?.value||'练气初期'; const v1=parseFloat(l1?.value)||0; const v100=parseFloat(l100?.value)||0; const g=calcGrowth(v1,v100,100); const cur=v1+(realmToLevel(realm)-1)*g; const gEl=document.querySelector(`.growth-display[data-basic="${k}"]`); const cEl=document.querySelector(`.current-display[data-basic="${k}"]`); if(gEl){gEl.textContent=g.toFixed(2);gEl.style.color=g<0?'var(--red)':'';} if(cEl)cEl.textContent=cur.toFixed(2); });
  }
};

// 角色图鉴

const REALMS = [
  '练气初期','练气中期','练气后期','练气巅峰',
  '筑基初期','筑基中期','筑基后期','筑基巅峰',
  '金丹初期','金丹中期','金丹后期','金丹巅峰',
  '元婴初期','元婴中期','元婴后期','元婴巅峰',
  '化神初期','化神中期','化神后期','化神巅峰'
];
const MAJOR_NAMES = ['练气','筑基','金丹','元婴','化神'];
const ELEMENTS = ['金','木','水','火','土'];
const STORAGE_KEY = 'characters';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX'];

function realmToLevel(r) { const i=REALMS.indexOf(r); return i>=0?i+1:1; }
function majorIndex(realm) { const i=REALMS.indexOf(realm); return i>=0?Math.floor(i/4):0; }
function majorName(realm) { return MAJOR_NAMES[majorIndex(realm)]||'练气'; }
function isYuanYing(realm) { return REALMS.indexOf(realm)>=12; }
function displayRealm(baseRealm, advCount) { const idx=REALMS.indexOf(baseRealm); if(idx<0)return baseRealm; return REALMS[Math.min(idx+advCount,REALMS.length-1)]; }
function nextBreakLevel(el){for(let lv=20;lv<=100;lv+=20)if(!el.includes(lv))return lv;return 0;}
function nextAdvRank(el){for(let i=1;i<=4;i++)if(!el.includes(i))return i;return 0;}

// 创建空领域阶段
function emptyStage(realm) {
  return {
    realm: realm,
    hp:0, atk:0, def:0, critRate:0, critDmg:0,
    resist:{metal:0,wood:0,water:0,fire:0,earth:0},
    dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}
  };
}

// 计算满级总属性
function totalAttr(c) {
  let t = { hp:0,atk:0,def:0,critRate:0,critDmg:0,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0} };
  (c.realmStages||[]).forEach(s => {
    t.hp += s.hp||0; t.atk += s.atk||0; t.def += s.def||0;
    t.critRate += s.critRate||0; t.critDmg += s.critDmg||0;
    ['metal','wood','water','fire','earth'].forEach(k => { t.resist[k] += (s.resist||{})[k]||0; t.dmgBonus[k] += (s.dmgBonus||{})[k]||0; });
  });
  return t;
}

// 战力
function calcCombatPower(c) {
  const t = totalAttr(c);
  let pts = 0;
  pts += t.hp/10 + t.atk/2 + t.def/2 + t.critRate + t.critDmg;
  ['metal','wood','water','fire','earth'].forEach(k => { pts += t.resist[k]/0.8 + t.dmgBonus[k]/0.8; });
  return Math.round(pts);
}

function createEmptyChar() {
  return {
    id:'', name:'', avatar:'', realm:'练气初期', sect:'', spiritRoots:[],
    realmStages:[],
    passiveSkills:[],
    mainSkills:[], yuanYingSkill:null, learnedAbilities:[],
    equippedAttack:null, equippedDefense:null, equippedAccessory:null
  };
}

function skillNameById(id) {
  const g=Storage.findById('skills_gongfa',id); if(g)return{name:g.name,type:'gongfa',combat:g.combat||0};
  const s=Storage.findById('skills_shentong',id); if(s)return{name:s.name,type:'shentong',combat:s.combat||0};
  return null;
}

const Characters = {

  renderList() {
    const list = Storage.list(STORAGE_KEY);
    let rows = '';
    if (list.length===0) { rows='<div class="placeholder">暂无角色，点击右上角按钮添加</div>'; }
    else {
      rows = `<div class="row-list">
      <div class="row-header" style="gap:18px;padding:10px 28px;">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:80px;">名称</span>
        <span class="row-h-col" style="width:85px;">初始/当前</span>
        <span class="row-h-col" style="width:50px;">宗门</span>
        <span class="row-h-col" style="width:55px;">灵根</span>
        <span class="row-h-col" style="width:55px;">生命</span>
        <span class="row-h-col" style="width:55px;">攻击</span>
        <span class="row-h-col" style="width:55px;">防御</span>
        <span class="row-h-col" style="width:90px;">主修功法</span>
        <span class="row-h-col" style="width:50px;">战力</span>
        <span class="row-h-col" style="width:100px;"></span>
      </div>`;
      list.forEach(c => {
        // 兼容旧数据
        if (!c.realmStages||c.realmStages.length===0) {
          c.realmStages = [];
          if (c.basicAttr) {
            const s = emptyStage(c.realm||'练气初期');
            s.hp = c.basicAttr.hp?.lv100||0;
            s.atk = c.basicAttr.atk?.lv100||0;
            s.def = c.basicAttr.def?.lv100||0;
            if (c.advancedAttr) {
              s.critRate = c.advancedAttr.critRate||0;
              s.critDmg = c.advancedAttr.critDmg||0;
              ['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=c.advancedAttr.resist?.[k]||0;s.dmgBonus[k]=c.advancedAttr.dmgBonus?.[k]||0;});
            }
            c.realmStages.push(s);
          }
        }
        if(!c.advancements)c.advancements=[];
        if(!c.mainSkills)c.mainSkills=[]; if(!c.learnedAbilities)c.learnedAbilities=[];

        const aSrc=(c.avatar||'').startsWith('data:')?c.avatar:(c.avatar?'img/characters/'+c.avatar:'');const avatarHtml=aSrc?`<img src="${aSrc}" alt="${c.name}">`:'<div class="row-noimg">无图</div>';
        const tags = c.spiritRoots.map(e=>`<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        const total = totalAttr(c);
        const cp = calcCombatPower(c);
        const stages=c.realmStages||[];const curRealmName=majorName(stages.length>0?stages[stages.length-1].realm:c.realm)+'期';const dispRealm=majorName(c.realm)+'期/'+curRealmName;
        let mainSkillText = '—';
        if (c.mainSkills.length>0) {
          const names = c.mainSkills.map(id=>{const s=skillNameById(id);if(!s)return'';return id===c.yuanYingSkill?s.name+'(元婴)':s.name;}).filter(Boolean);
          mainSkillText = names.join('、')||'—';
        }
        // 弹窗
        const modalData = [...c.passiveSkills];
        (c.mainSkills||[]).forEach(skId=>{const sk=skillNameById(skId);if(sk)modalData.push({name:'主修功法：'+sk.name,desc:(Storage.findById('skills_gongfa',skId)||{}).desc||''});});
        (c.learnedAbilities||[]).forEach(skId=>{const sk=skillNameById(skId);if(sk)modalData.push({name:'习得神通：'+sk.name,desc:(Storage.findById('skills_shentong',skId)||{}).desc||''});});
        const modalEsc = JSON.stringify(modalData).replace(/'/g,'&#39;');

        rows += `<div class="row-item" style="gap:18px;padding:22px 28px;min-height:140px;">
          ${avatarHtml}
          <span class="row-name" style="width:80px;">${c.name||'未命名'}</span>
          <span style="color:var(--text-dim);width:85px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;">${dispRealm}</span>
          <span style="color:var(--text-dim);width:50px;font-size:13px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.sect||'—'}</span>
          <span class="row-tags" style="width:55px;overflow:hidden;">${tags}</span>
          <span class="row-stat" style="width:55px;">${total.hp}</span>
          <span class="row-stat" style="width:55px;">${total.atk}</span>
          <span class="row-stat" style="width:55px;">${total.def}</span>
          <span style="color:var(--text-dim);width:90px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mainSkillText}</span>
          <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${cp}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('characters/detail?id=${c.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-skills='${modalEsc}' onclick="event.stopPropagation();showAbilityModal('${c.name||'角色'} 详情',JSON.parse(this.dataset.skills))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm(\`确定删除此角色? \`)){Storage.deleteById('characters','${c.id}');App.navigate('characters');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">角色图鉴</h2><button class="btn-primary" onclick="App.navigate('characters/detail')">+ 添加角色</button></div>${rows}`;
  },

  renderDetail(id) {
    const char = id ? Storage.findById(STORAGE_KEY, id) : createEmptyChar();
    if (id&&!char) return '<div class="placeholder">角色不存在</div>';
    const isNew = !id;
    // 兼容旧数据
    if (!char.realmStages||char.realmStages.length===0) {
      char.realmStages = [];
      if (char.basicAttr) {
        const s = emptyStage(char.realm||'练气初期');
        s.hp=char.basicAttr.hp?.lv100||0; s.atk=char.basicAttr.atk?.lv100||0; s.def=char.basicAttr.def?.lv100||0;
        if (char.advancedAttr) {
          s.critRate=char.advancedAttr.critRate||0; s.critDmg=char.advancedAttr.critDmg||0;
          ['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=char.advancedAttr.resist?.[k]||0;s.dmgBonus[k]=char.advancedAttr.dmgBonus?.[k]||0;});
        }
        char.realmStages.push(s);
      }
    }
    if(!char.breakthroughs)char.breakthroughs=[]; if(!char.advancements)char.advancements=[];
    if(!char.mainSkills)char.mainSkills=[]; if(!char.learnedAbilities)char.learnedAbilities=[];

    const rootsHtml = ELEMENTS.map(e=>`<label><input type="checkbox" value="${e}" ${char.spiritRoots.includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
    const yuanyingOk = isYuanYing(char.realm);
    const total = totalAttr(char);

    // 修为阶段 HTML
    let stagesHtml = '';
    char.realmStages.forEach((s,i)=>{
      stagesHtml += `<fieldset class="fieldset"><legend><span style="cursor:pointer;" onclick="var b=this.parentElement.nextElementSibling;b.style.display=b.style.display==='none'?'':'none';this.textContent=this.textContent.startsWith('▸')?this.textContent.replace('▸','▾'):this.textContent.replace('▾','▸')">▸ ${s.realm}</span></legend>
        <div class="stage-body" style="display:none"><div class="form-row">
          <div style="flex:1;"><label>生命</label><input type="number" value="${s.hp}" data-field="stage_hp_${i}"></div>
          <div style="flex:1;"><label>攻击</label><input type="number" value="${s.atk}" data-field="stage_atk_${i}"></div>
          <div style="flex:1;"><label>防御</label><input type="number" value="${s.def}" data-field="stage_def_${i}"></div>
        </div>
        <div class="form-row" style="margin-top:8px;">
          <div style="flex:1;"><label>暴击率(%)</label><input type="number" value="${s.critRate}" data-field="stage_cr_${i}" step="0.01"></div>
          <div style="flex:1;"><label>暴击伤害(%)</label><input type="number" value="${s.critDmg}" data-field="stage_cd_${i}" step="0.01"></div>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label style="color:var(--gold);">五行抗性(%)</label>${ELEMENTS.map(e=>{const m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return`<div style="margin-top:4px;"><label>${e}</label><input type="number" value="${(s.resist||{})[m[e]]||0}" data-field="stage_res_${m[e]}_${i}" step="0.01"></div>`;}).join('')}</div>
          <div><label style="color:var(--gold);">伤害加成(%)</label>${ELEMENTS.map(e=>{const m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return`<div style="margin-top:4px;"><label>${e}</label><input type="number" value="${(s.dmgBonus||{})[m[e]]||0}" data-field="stage_dmg_${m[e]}_${i}" step="0.01"></div>`;}).join('')}</div>
        </div>
        ${char.realmStages.length>1&&i===char.realmStages.length-1?`<button class="btn-danger" style="margin-top:10px;font-size:12px;" onclick="Characters.delStage(${i},'${char.id||''}')">删除此阶段</button>`:''}
        </div></fieldset>`;
    });

    let skillsHtml=''; char.passiveSkills.forEach((sk,i)=>{skillsHtml+=`<div class="entry-item"><div class="entry-header"><span>被动技能 #${i+1}</span><button class="btn-delete" data-action="del-skill" data-idx="${i}">×</button></div><input type="text" value="${sk.name||''}" data-field="skill_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_${i}" placeholder="技能描述" style="width:100%;">${sk.desc||''}</textarea></div>`;});
    let advHtml=''; char.advancements.forEach((a,i)=>{advHtml+=`<div class="entry-item"><div class="entry-header"><span class="bt-level-title">${ROMAN[a.rank-1]||a.rank}阶</span><button class="btn-delete" data-action="del-adv" data-idx="${i}">×</button></div><textarea data-field="adv_${i}" placeholder="属性加成描述" style="width:100%;">${a.desc||''}</textarea></div>`;});

    // 主修功法
    const gongfaList=Storage.list('skills_gongfa');
    let mainSkillHtml='';
    char.mainSkills.forEach((skId,i)=>{
      const sk=skillNameById(skId); const name=sk?sk.name:'(已删除)'; const isYY=(skId===char.yuanYingSkill);
      mainSkillHtml+=`<div class="entry-item"><div class="entry-header"><span>${isYY?'元婴功法':(i===0?'主修功法':'其他功法')}：${name}</span><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:var(--text-dim);">元婴功法</span><input type="checkbox" class="yy-check" data-skid="${skId}" ${isYY?'checked':''} ${yuanyingOk?'':'disabled'}></div><button class="btn-delete ms-del">×</button></div></div>`;
    });

    // 习得神通
    let learnedHtml='';
    char.learnedAbilities.forEach((skId,i)=>{const sk=skillNameById(skId);learnedHtml+=`<div class="entry-item"><div class="entry-header"><span>${sk?sk.name:'(已删除)'}</span><button class="btn-delete la-del">×</button></div></div>`;});

    return `<div class="detail-page" data-char-id="${char.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('characters')">← 返回列表</button><button class="btn-primary" id="btn-save-char">保存</button><button class="btn-danger" id="btn-del-char" ${isNew?'style="display:none"':''}>删除角色</button></div>

      <fieldset class="fieldset"><legend>基本信息</legend>
        <div class="form-row"><div style="flex:0 0 200px;"><label>立绘</label><div id="char-avatar-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;">
        <div class="form-group"><label>姓名</label><input type="text" id="char-name" value="${char.name}" style="width:100%;font-size:18px;"></div>
        <div class="form-row"><div style="flex:1;"><label>宗门</label><input type="text" id="char-sect" value="${char.sect||''}" placeholder="如：青云宗" style="width:100%;"></div><div style="flex:1;"><label>初始修为</label><select id="char-realm" style="width:100%;">${REALMS.map(r=>`<option value="${r}" ${char.realm===r?'selected':''}>${r}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>灵根（可多选，最多3个）</label><div class="checkbox-group" id="char-roots">${rootsHtml}</div></div></div></div>
      </fieldset>

      <!-- 满级总属性 -->
      <fieldset class="fieldset" style="background:#fefcf2;border-color:var(--gold);">
        <legend style="font-size:16px;">满级总属性</legend>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;">${(()=>{let h=`
          <div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">生命</div><div style="font-size:18px;">${total.hp}</div></div>
          <div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">攻击</div><div style="font-size:18px;">${total.atk}</div></div>
          <div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">防御</div><div style="font-size:18px;">${total.def}</div></div>
        `;if(total.critRate)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击率</div><div style="font-size:18px;">${total.critRate}%</div></div>`;if(total.critDmg)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击伤害</div><div style="font-size:18px;">${total.critDmg}%</div></div>`;['金','木','水','火','土'].forEach(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};const v=total.resist[m[e]];if(v)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">${e}抗性</div><div style="font-size:18px;">${v}%</div></div>`;});['金','木','水','火','土'].forEach(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};const v=total.dmgBonus[m[e]];if(v)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">${e}伤害加成</div><div style="font-size:18px;">${v}%</div></div>`;});h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">战力</div><div style="font-size:22px;color:var(--gold);">${calcCombatPower(char)}</div></div>`;return h;})()}</div>
      </fieldset>

      <!-- 修为阶段 -->
      <fieldset class="fieldset"><legend>修为阶段 <button class="btn-add" id="btn-add-stage">+</button></legend>
        <div id="stages-container">${stagesHtml||'<div style="color:var(--text-dim);">暂无阶段</div>'}</div>
      </fieldset>

      <fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend><div id="skills-container">${skillsHtml||'<div style="color:var(--text-dim);">暂无被动技能</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>突破 <button class="btn-add" id="btn-add-adv">+</button></legend><div id="adv-container">${advHtml||'<div style="color:var(--text-dim);">暂无突破</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>装备法宝</legend><div class="form-row">${(()=>{const al=Storage.list('treasures').filter(t=>t.type==='attack');const dl=Storage.list('treasures').filter(t=>t.type==='defense');const acl=Storage.list('treasures').filter(t=>t.type==='accessory');return`<div style="flex:1;"><label>攻击类</label><select id="equip-attack"><option value="">不装备</option>${al.map(t=>`<option value="${t.id}" ${char.equippedAttack===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div><div style="flex:1;"><label>防具类</label><select id="equip-defense"><option value="">不装备</option>${dl.map(t=>`<option value="${t.id}" ${char.equippedDefense===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div><div style="flex:1;"><label>饰品类</label><select id="equip-accessory"><option value="">不装备</option>${acl.map(t=>`<option value="${t.id}" ${char.equippedAccessory===t.id?'selected':''}>${t.name||'未命名'}(${t.grade})</option>`).join('')}</select></div>`;})()}</div></fieldset>
      <fieldset class="fieldset"><legend>主修功法 <button class="btn-add" id="btn-add-ms">+</button></legend><div id="ms-container">${mainSkillHtml||'<div style="color:var(--text-dim);">暂无主修功法</div>'}</div></fieldset>
      <fieldset class="fieldset"><legend>习得神通 <button class="btn-add" id="btn-add-la">+</button></legend><div id="la-container">${learnedHtml||'<div style="color:var(--text-dim);">暂无习得神通</div>'}</div></fieldset>
      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save-char2">保存</button><button class="btn-danger" id="btn-del-char2" ${isNew?'style="display:none"':''}>删除角色</button></div>
    </div>`;
  },

  bindDetailEvents() {
    const self=this; const el=document.querySelector('.detail-page'); if(!el)return;
    const charId=el.dataset.charId; const isNew=el.dataset.isNew==='true';
    const az=document.getElementById('char-avatar-zone'); if(az){let cur=charId?Storage.findById(STORAGE_KEY,charId):createEmptyChar();ImageUpload.setup(az,cur?.avatar||'',(v)=>{},'characters/');az.addEventListener('click',function(){const i=this.querySelector('img');if(i){const o=document.getElementById('skill-modal');document.getElementById('modal-title').textContent='立绘预览';document.getElementById('modal-body').innerHTML=`<img src="${i.src}" style="max-width:100%;max-height:70vh;">`;o.style.display='flex';}});}
    const save=()=>{const d=self._collect(charId);if(!d.name.trim()){alert('请输入角色姓名');return;}if(!d.id)d.id=Storage.uid();if(!d.realmStages||d.realmStages.length===0){d.realmStages=[emptyStage(d.realm)];}Storage.save(STORAGE_KEY,d);App.navigate('characters');};
    document.getElementById('btn-save-char')?.addEventListener('click',save);
    document.getElementById('btn-save-char2')?.addEventListener('click',save);
    // 添加修为阶段
    document.getElementById('btn-add-stage')?.addEventListener('click',()=>{
      const cur=self._quickCollect(charId);
      if(!cur.realmStages)cur.realmStages=[];
      if(!cur.id)cur.id=Storage.uid();
      const advCount=(cur.advancements||[]).length;
      const baseMajor=majorIndex(cur.realm);
      const unlockedMajor=baseMajor+advCount;
      const maxIdx=(unlockedMajor+1)*4-1;
      const baseIdx=REALMS.indexOf(cur.realm);
      const nextIdx=baseIdx+cur.realmStages.length;
      if(nextIdx>maxIdx||nextIdx>=REALMS.length){alert('已达可解锁的最高阶段');return;}
      cur.realmStages.push(emptyStage(REALMS[nextIdx]));
      Storage.save(STORAGE_KEY,cur);
      App.navigate('characters/detail?id='+cur.id);
    });
    const del=()=>{if(confirm('确定删除该角色？')){Storage.deleteById(STORAGE_KEY,charId);App.navigate('characters');}};
    document.getElementById('btn-del-char')?.addEventListener('click',del);
    document.getElementById('btn-del-char2')?.addEventListener('click',del);

    document.getElementById('btn-add-skill')?.addEventListener('click',()=>{const c=document.getElementById('skills-container');const idx=c.querySelectorAll('.entry-item').length;const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span>被动技能 #${idx+1}</span><button class="btn-delete sd">×</button></div><input type="text" data-field="skill_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>`;self._clearEmpty(c);c.appendChild(div);div.querySelector('.sd').addEventListener('click',()=>{div.remove();self._checkEmpty(c,'暂无被动技能');});});
    document.querySelectorAll('[data-action="del-skill"]').forEach(b=>{b.addEventListener('click',function(){this.closest('.entry-item').remove();self._checkEmpty(document.getElementById('skills-container'),'暂无被动技能');});});
    document.getElementById('btn-add-adv')?.addEventListener('click',()=>{const cur=self._quickCollect(charId);const existing=cur.advancements||[];const nr=nextAdvRank(existing.map(a=>a.rank));if(nr===0){alert('已达上限 IV阶');return;}cur.advancements.push({rank:nr,desc:''});self._addRealmStage(cur);Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});
    document.querySelectorAll('[data-action="del-adv"]').forEach(b=>{b.addEventListener('click',function(){const cur=self._quickCollect(charId);const idx=parseInt(this.dataset.idx);cur.advancements.splice(idx,1);if(cur.realmStages&&cur.realmStages.length>1)cur.realmStages.pop();Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});});

    // 元婴互斥
    document.querySelectorAll('.yy-check').forEach(cb=>{cb.addEventListener('change',function(){if(this.checked){document.querySelectorAll('.yy-check').forEach(o=>{if(o!==this)o.checked=false;});}});});

    // 主修功法删除
    document.querySelectorAll('.ms-del').forEach(b=>{b.addEventListener('click',function(){const cur=self._quickCollect(charId);const skId=this.closest('.entry-item').querySelector('.yy-check')?.dataset.skid;if(skId){cur.mainSkills=(cur.mainSkills||[]).filter(id=>id!==skId);if(cur.yuanYingSkill===skId)cur.yuanYingSkill=null;Storage.save(STORAGE_KEY,cur);}App.navigate('characters/detail?id='+(cur.id||charId));});});
    document.getElementById('btn-add-ms')?.addEventListener('click',()=>{const gl=Storage.list('skills_gongfa');if(gl.length===0){alert('请先添加功法');return;}const names=gl.map((g,i)=>`${i+1}. ${g.name||'未命名'}`).join('\n');const idx=prompt('选择功法（输入序号）：\n'+names);if(!idx)return;const gi=parseInt(idx)-1;if(gi<0||gi>=gl.length){alert('无效序号');return;}const cur=self._quickCollect(charId);if(!cur.mainSkills)cur.mainSkills=[];if(cur.mainSkills.includes(gl[gi].id)){alert('已添加');return;}cur.mainSkills.push(gl[gi].id);Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});

    // 习得神通
    document.querySelectorAll('.la-del').forEach(b=>{b.addEventListener('click',function(){const cur=self._quickCollect(charId);const item=this.closest('.entry-item');const nameSpan=item.querySelector('.entry-header span');const curIds=cur.learnedAbilities||[];const sl=Storage.list('skills_shentong');for(const skId of curIds){const sk=sl.find(g=>g.id===skId);if(sk&&nameSpan&&nameSpan.textContent.trim()===(sk.name||'')){cur.learnedAbilities=curIds.filter(id=>id!==skId);break;}}Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});});
    document.getElementById('btn-add-la')?.addEventListener('click',()=>{const sl=Storage.list('skills_shentong');if(sl.length===0){alert('请先添加神通');return;}const names=sl.map((s,i)=>`${i+1}. ${s.name||'未命名'}`).join('\n');const idx=prompt('选择神通（输入序号）：\n'+names);if(!idx)return;const si=parseInt(idx)-1;if(si<0||si>=sl.length){alert('无效序号');return;}const cur=self._quickCollect(charId);if(!cur.learnedAbilities)cur.learnedAbilities=[];if(cur.learnedAbilities.includes(sl[si].id)){alert('已添加');return;}cur.learnedAbilities.push(sl[si].id);Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});

    document.getElementById('char-realm')?.addEventListener('change',function(){const yuanyingOk=REALMS.indexOf(this.value)>=12;document.querySelectorAll('.yy-check').forEach(cb=>{cb.disabled=!yuanyingOk;if(!yuanyingOk&&cb.checked)cb.checked=false;});});
  },

  delStage(idx, charId) {
    const cur = Storage.findById(STORAGE_KEY, charId);
    if (!cur) return;
    if (!cur.realmStages) cur.realmStages = [];
    cur.realmStages.splice(idx, 1);
    Storage.save(STORAGE_KEY, cur);
    App.navigate('characters/detail?id=' + (cur.id || charId));
  },

  _clearEmpty(c){const e=c.querySelector(':scope > div:not(.entry-item)');if(e)e.remove();},
  _checkEmpty(c,txt){if(c&&c.querySelectorAll('.entry-item').length===0)c.innerHTML=`<div style="color:var(--text-dim);">${txt}</div>`;},
  _addRealmStage(cur){if(!cur.realmStages)cur.realmStages=[];const base=cur.realm;let startIdx=REALMS.indexOf(base);if(startIdx<0)startIdx=0;let nextIdx=startIdx+cur.realmStages.length;if(nextIdx>=REALMS.length){alert('已达最高境界');return;}cur.realmStages.push(emptyStage(REALMS[nextIdx]));},

  _quickCollect(charId){
    let d=charId?Storage.findById(STORAGE_KEY,charId):createEmptyChar(); if(!d)d=createEmptyChar();
    if(!d.realmStages)d.realmStages=[]; if(!d.advancements)d.advancements=[];
    if(!d.mainSkills)d.mainSkills=[]; if(!d.learnedAbilities)d.learnedAbilities=[];
    d.id=charId||''; d.name=document.getElementById('char-name')?.value||'';
    d.sect=document.getElementById('char-sect')?.value||'';
    d.realm=document.getElementById('char-realm')?.value||'练气初期';
    d.spiritRoots=Array.from(document.querySelectorAll('#char-roots input:checked')).map(cb=>cb.value);
    // 同时收集当前阶段数据
    this._collectStages(d);
    return d;
  },

  _collectStages(d){
    d.realmStages=[];
    const sc=document.querySelectorAll('[data-field^="stage_hp_"]').length;
    for(let i=0;i<sc;i++){const fel=document.querySelector(`#stages-container .fieldset:nth-child(${i+1}) legend span`);const realm=fel?fel.textContent.replace(/^[▾▸]\s*/,'').trim():REALMS[0];const s=emptyStage(realm);s.hp=parseFloat(document.querySelector(`[data-field="stage_hp_${i}"]`)?.value)||0;s.atk=parseFloat(document.querySelector(`[data-field="stage_atk_${i}"]`)?.value)||0;s.def=parseFloat(document.querySelector(`[data-field="stage_def_${i}"]`)?.value)||0;s.critRate=parseFloat(document.querySelector(`[data-field="stage_cr_${i}"]`)?.value)||0;s.critDmg=parseFloat(document.querySelector(`[data-field="stage_cd_${i}"]`)?.value)||0;['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=parseFloat(document.querySelector(`[data-field="stage_res_${k}_${i}"]`)?.value)||0;s.dmgBonus[k]=parseFloat(document.querySelector(`[data-field="stage_dmg_${k}_${i}"]`)?.value)||0;});d.realmStages.push(s);}
  },

  _collect(charId){
    let d=this._quickCollect(charId);

    // 收集修为阶段
    d.realmStages=[];
    const stageCount=document.querySelectorAll('[data-field^="stage_hp_"]').length;
    for(let i=0;i<stageCount;i++){
      const realmEl=document.querySelector(`#stages-container .fieldset:nth-child(${i+1}) legend`);
      const realm=realmEl?realmEl.textContent.replace(/^[▾▸]\s*/,'').trim():REALMS[0];
      const s=emptyStage(realm);
      s.hp=parseFloat(document.querySelector(`[data-field="stage_hp_${i}"]`)?.value)||0;
      s.atk=parseFloat(document.querySelector(`[data-field="stage_atk_${i}"]`)?.value)||0;
      s.def=parseFloat(document.querySelector(`[data-field="stage_def_${i}"]`)?.value)||0;
      s.critRate=parseFloat(document.querySelector(`[data-field="stage_cr_${i}"]`)?.value)||0;
      s.critDmg=parseFloat(document.querySelector(`[data-field="stage_cd_${i}"]`)?.value)||0;
      ['metal','wood','water','fire','earth'].forEach(k=>{
        s.resist[k]=parseFloat(document.querySelector(`[data-field="stage_res_${k}_${i}"]`)?.value)||0;
        s.dmgBonus[k]=parseFloat(document.querySelector(`[data-field="stage_dmg_${k}_${i}"]`)?.value)||0;
      });
      d.realmStages.push(s);
    }

    d.avatar=document.querySelector('#char-avatar-zone .img-filename-input')?.value?.trim()||'';
    d.passiveSkills=[]; document.querySelectorAll('#skills-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.passiveSkills.push({name:n?.value||'',desc:t?.value||''});});
    d.advancements=[]; document.querySelectorAll('#adv-container .entry-item').forEach(item=>{const s=item.querySelector('.bt-level-title');const t=item.querySelector('textarea');if(s){const r=ROMAN.indexOf(s.textContent.replace('阶',''));d.advancements.push({rank:r>=0?r+1:0,desc:t?.value||''});}});
    const yyCheck=document.querySelector('.yy-check:checked'); d.yuanYingSkill=yyCheck?yyCheck.dataset.skid:null;
    d.equippedAttack=document.getElementById('equip-attack')?.value||null;
    d.equippedDefense=document.getElementById('equip-defense')?.value||null;
    d.equippedAccessory=document.getElementById('equip-accessory')?.value||null;
    return d;
  },

  bindListEvents(){}
};

// 灵宠图鉴

const PET_STORAGE = 'pets';

function calcPetCombat(p) {
  let pts = 0;
  pts += (p.basicAttr.hp.lv60||0)/10 + (p.basicAttr.atk.lv60||0)/2 + (p.basicAttr.def.lv60||0)/2;
  const a = p.advancedAttr;
  pts += (a.critRate?.lv60||0) + (a.critDmg?.lv60||0);
  ['resist_metal','resist_wood','resist_water','resist_fire','resist_earth'].forEach(k => { pts += (a[k]?.lv60||0)/0.8; });
  ['dmg_metal','dmg_wood','dmg_water','dmg_fire','dmg_earth'].forEach(k => { pts += (a[k]?.lv60||0)/0.8; });
  return Math.round(pts);
}

function createEmptyPet() {
  return {
    id:'', name:'', image:'', realm:'练气初期', spiritRoots:[],
    basicAttr: { hp:{lv1:0,lv60:0}, atk:{lv1:0,lv60:0}, def:{lv1:0,lv60:0} },
    advancedAttr: {
      critRate:{lv1:5,lv60:5}, critDmg:{lv1:150,lv60:150},
      resist_metal:{lv1:0,lv60:0}, resist_wood:{lv1:0,lv60:0}, resist_water:{lv1:0,lv60:0}, resist_fire:{lv1:0,lv60:0}, resist_earth:{lv1:0,lv60:0},
      dmg_metal:{lv1:0,lv60:0}, dmg_wood:{lv1:0,lv60:0}, dmg_water:{lv1:0,lv60:0}, dmg_fire:{lv1:0,lv60:0}, dmg_earth:{lv1:0,lv60:0}
    },
    activeSkills:[], passiveSkills:[]
  };
}

const Pets = {

  renderList() {
    const list = Storage.list(PET_STORAGE);
    let rows = '';
    if (list.length === 0) {
      rows = '<div class="placeholder">暂无灵宠，点击右上角按钮添加</div>';
    } else {
      rows = `<div class="row-list">
      <div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:110px;">名称</span>
        <span class="row-h-col" style="width:90px;">修为</span>
        <span class="row-h-col" style="width:70px;">五行</span>
        <span class="row-h-col" style="width:65px;">60生命</span>
        <span class="row-h-col" style="width:65px;">60攻击</span>
        <span class="row-h-col" style="width:65px;">60防御</span>
        <span class="row-h-col" style="width:50px;">战力</span>
      </div>`;
      list.forEach(p => {
        const imgHtml = p.image ? `<img src="${p.image}" alt="${p.name}">` : '<div class="row-noimg">无图</div>';
        const tags = p.spiritRoots.map(e => `<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        const activeEsc = JSON.stringify(p.activeSkills||[]).replace(/'/g,'&#39;');
        const passiveEsc = JSON.stringify(p.passiveSkills||[]).replace(/'/g,'&#39;');
        rows += `<div class="row-item">
          ${imgHtml}
          <span class="row-name" style="width:110px;">${p.name||'未命名'}</span>
          <span style="color:var(--text-dim);width:90px;font-size:14px;text-align:center;white-space:nowrap;">${p.realm}</span>
          <span class="row-tags" style="width:70px;justify-content:center;">${tags}</span>
          <span class="row-stat" style="width:65px;">${p.basicAttr.hp.lv60}</span>
          <span class="row-stat" style="width:65px;">${p.basicAttr.atk.lv60}</span>
          <span class="row-stat" style="width:65px;">${p.basicAttr.def.lv60}</span>
          <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${calcPetCombat(p)}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('pets/detail?id=${p.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-active='${activeEsc}' data-passive='${passiveEsc}' onclick="event.stopPropagation();showAbilityModal('${p.name||'灵宠'} 技能',JSON.parse(this.dataset.active),JSON.parse(this.dataset.passive))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm('确定删除「${p.name||'未命名'}」？')){Storage.deleteById('pets','${p.id}');App.navigate('pets');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">灵宠图鉴</h2><button class="btn-primary" onclick="App.navigate('pets/detail')">+ 添加灵宠</button></div>${rows}`;
  },

  bindListEvents() {},

  renderDetail(id) {
    const pet = id ? Storage.findById(PET_STORAGE, id) : createEmptyPet();
    if (id && !pet) return '<div class="placeholder">灵宠不存在</div>';
    const isNew = !id;
    const rootsHtml = ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${pet.spiritRoots.includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
    function basicRow(label, key) { const a=pet.basicAttr[key]; const g=(a.lv60-a.lv1)/59; const lv=realmToLevel(pet.realm); const cur=a.lv1+(lv-1)*g; const red=g<0?'color:var(--red);':''; return `<div class="form-row"><div style="flex:1;"><label>${label} 1级值</label><input type="number" value="${a.lv1}" data-field="basic_${key}_lv1"></div><div style="flex:1;"><label>${label} 60级值</label><input type="number" value="${a.lv60}" data-field="basic_${key}_lv60"></div><div style="flex:1;"><label>每级成长</label><span class="growth-display" data-basic="${key}" style="${red}">${g.toFixed(2)}</span></div><div style="flex:1;"><label>当前境界值(Lv${lv})</label><span class="current-display" data-basic="${key}">${cur.toFixed(2)}</span></div></div>`; }
    function advRow(label, key) { const val=pet.advancedAttr[key]||{lv1:0,lv60:0}; const g=(val.lv60-val.lv1)/59; const red=g<0?'color:var(--red);':''; return `<div class="form-row"><div style="flex:1;"><label>${label} 1级值(%)</label><input type="number" value="${val.lv1}" data-field="adv_${key}_lv1" step="0.01"></div><div style="flex:1;"><label>${label} 60级值(%)</label><input type="number" value="${val.lv60}" data-field="adv_${key}_lv60" step="0.01"></div><div style="flex:1;"><label>每级成长</label><span class="adv-growth-display" data-adv="${key}" style="${red}">${g.toFixed(2)}</span></div></div>`; }
    function skillHtml(skills, label) { let h=''; skills.forEach((s,i)=>{ h+=`<div class="entry-item"><div class="entry-header"><span>${label} #${i+1}</span><button class="btn-delete pet-skill-del">×</button></div><input type="text" value="${s.name||''}" data-field="${label}_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="${label}_desc_${i}" placeholder="技能描述">${s.desc||''}</textarea></div>`; }); return h||`<div class="empty-hint">暂无${label}</div>`; }
    return `<div class="detail-page" data-pet-id="${pet.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('pets')">← 返回列表</button><button class="btn-primary" id="btn-save">保存</button><button class="btn-danger" id="btn-del" ${isNew?'style="display:none"':''}>删除灵宠</button></div>
      <fieldset class="fieldset"><legend>基本信息</legend><div class="form-row"><div style="flex:0 0 200px;"><label>图片</label><div id="pet-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;"><div class="form-group"><label>名称</label><input type="text" id="pet-name" value="${pet.name}" style="width:100%;font-size:18px;"></div><div class="form-group"><label>境界</label><select id="pet-realm">${REALMS.map(r=>`<option value="${r}" ${pet.realm===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="form-group"><label>五行属性（可多选，最多3个）</label><div class="checkbox-group" id="pet-roots">${rootsHtml}</div></div></div></div></fieldset>
      <fieldset class="fieldset"><legend>基础属性（1级→60级，线性成长）</legend>${basicRow('生命','hp')}${basicRow('攻击','atk')}${basicRow('防御','def')}</fieldset>
      <fieldset class="fieldset"><legend>进阶属性（1级→60级，线性成长）</legend>${advRow('暴击率','critRate')}${advRow('暴击伤害','critDmg')}<div style="margin-top:12px;color:var(--gold);font-weight:bold;">五行抗性</div>${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return advRow(e+'抗性','resist_'+m[e]);}).join('')}<div style="margin-top:12px;color:var(--gold);font-weight:bold;">五行伤害加成</div>${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return advRow(e+'伤害加成','dmg_'+m[e]);}).join('')}</fieldset>
      <fieldset class="fieldset"><legend>主动技能 <button class="btn-add" id="btn-add-active">+</button></legend><div id="active-container">${skillHtml(pet.activeSkills,'主动技能')}</div></fieldset>
      <fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-passive">+</button></legend><div id="passive-container">${skillHtml(pet.passiveSkills,'被动技能')}</div></fieldset>
      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save2">保存</button><button class="btn-danger" id="btn-del2" ${isNew?'style="display:none"':''}>删除灵宠</button></div>
    </div>`;
  },

  bindDetailEvents() {
    const self=this; const el=document.querySelector('.detail-page'); if(!el)return;
    const petId=el.dataset.petId; const isNew=el.dataset.isNew==='true';
    const iz=document.getElementById('pet-img-zone'); if(iz){let cur=petId?Storage.findById(PET_STORAGE,petId):null;if(cur?.image)ImageUpload.setPreview(iz,cur.image);ImageUpload.create(iz,()=>{});}
    const save=()=>{const d=self._collect(petId);if(!d.name.trim()){alert('请输入灵宠名称');return;}if(!d.id)d.id=Storage.uid();Storage.save(PET_STORAGE,d);App.navigate('pets');};
    document.getElementById('btn-save')?.addEventListener('click',save); document.getElementById('btn-save2')?.addEventListener('click',save);
    const del=()=>{if(confirm('确定删除该灵宠？')){Storage.deleteById(PET_STORAGE,petId);App.navigate('pets');}};
    document.getElementById('btn-del')?.addEventListener('click',del); document.getElementById('btn-del2')?.addEventListener('click',del);
    document.getElementById('pet-realm')?.addEventListener('change',()=>self._updateGrowth());
    document.querySelectorAll('[data-field^="basic_"]').forEach(inp=>inp.addEventListener('input',()=>self._updateGrowth()));
    document.querySelectorAll('[data-field^="adv_"]').forEach(inp=>{inp.addEventListener('input',function(){const key=this.dataset.field.replace('adv_','').replace('_lv1','').replace('_lv60','');const lv1=parseFloat(document.querySelector(`[data-field="adv_${key}_lv1"]`)?.value)||0;const lv60=parseFloat(document.querySelector(`[data-field="adv_${key}_lv60"]`)?.value)||0;const gEl=document.querySelector(`.adv-growth-display[data-adv="${key}"]`);if(gEl){const v=(lv60-lv1)/59;gEl.textContent=v.toFixed(2);gEl.style.color=v<0?'var(--red)':'';}});});
    self._bindSkillBtn('active','主动技能'); self._bindSkillBtn('passive','被动技能');
    document.querySelectorAll('.pet-skill-del').forEach(btn=>{btn.addEventListener('click',function(){const item=this.closest('.entry-item');const c=item.parentElement;item.remove();if(c.querySelectorAll('.entry-item').length===0){const label=c.id.includes('active')?'主动技能':'被动技能';c.innerHTML=`<div class="empty-hint">暂无${label}</div>`;}});});
  },

  _bindSkillBtn(type, label) { document.getElementById(`btn-add-${type}`)?.addEventListener('click',()=>{const c=document.getElementById(`${type}-container`);const idx=c.querySelectorAll('.entry-item').length;const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span>${label} #${idx+1}</span><button class="btn-delete pet-skill-del">×</button></div><input type="text" data-field="${label}_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="${label}_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>`;const em=c.querySelector('.empty-hint');if(em)em.remove();c.appendChild(div);div.querySelector('.pet-skill-del').addEventListener('click',()=>{div.remove();if(c.querySelectorAll('.entry-item').length===0)c.innerHTML=`<div class="empty-hint">暂无${label}</div>`;});}); },

  _updateGrowth() { const realm=document.getElementById('pet-realm')?.value||'练气初期'; const level=realmToLevel(realm); ['hp','atk','def'].forEach(key=>{const lv1=parseFloat(document.querySelector(`[data-field="basic_${key}_lv1"]`)?.value)||0;const lv60=parseFloat(document.querySelector(`[data-field="basic_${key}_lv60"]`)?.value)||0;const g=(lv60-lv1)/59;const cur=lv1+(level-1)*g;const gEl=document.querySelector(`.growth-display[data-basic="${key}"]`);const cEl=document.querySelector(`.current-display[data-basic="${key}"]`);if(gEl){gEl.textContent=g.toFixed(2);gEl.style.color=g<0?'var(--red)':'';}if(cEl)cEl.textContent=cur.toFixed(2);}); },

  _collect(petId) { let d=petId?Storage.findById(PET_STORAGE,petId):createEmptyPet();if(!d)d=createEmptyPet();d.id=petId||'';d.name=document.getElementById('pet-name')?.value||'';d.realm=document.getElementById('pet-realm')?.value||'练气初期';d.spiritRoots=Array.from(document.querySelectorAll('#pet-roots input:checked')).map(cb=>cb.value);d.image=document.querySelector('#pet-img-zone img')?.src||'';['hp','atk','def'].forEach(key=>{const lv1=document.querySelector(`[data-field="basic_${key}_lv1"]`);const lv60=document.querySelector(`[data-field="basic_${key}_lv60"]`);if(lv1)d.basicAttr[key].lv1=parseFloat(lv1.value)||0;if(lv60)d.basicAttr[key].lv60=parseFloat(lv60.value)||0;});const af=['critRate','critDmg','resist_metal','resist_wood','resist_water','resist_fire','resist_earth','dmg_metal','dmg_wood','dmg_water','dmg_fire','dmg_earth'];af.forEach(key=>{const l1=document.querySelector(`[data-field="adv_${key}_lv1"]`);const l60=document.querySelector(`[data-field="adv_${key}_lv60"]`);if(!d.advancedAttr[key])d.advancedAttr[key]={lv1:0,lv60:0};if(l1)d.advancedAttr[key].lv1=parseFloat(l1.value)||0;if(l60)d.advancedAttr[key].lv60=parseFloat(l60.value)||0;});d.activeSkills=[];document.querySelectorAll('#active-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.activeSkills.push({name:n?.value||'',desc:t?.value||''});});d.passiveSkills=[];document.querySelectorAll('#passive-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.passiveSkills.push({name:n?.value||'',desc:t?.value||''});});return d; }
};

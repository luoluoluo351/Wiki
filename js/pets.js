// 灵宠图鉴

const PET_STORAGE = 'pets';

function emptyPetStage(realm) {
  return {realm,hp:0,atk:0,def:0,critRate:0,critDmg:0,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}};
}

function petTotalAttr(p) {
  let t={hp:0,atk:0,def:0,critRate:0,critDmg:0,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}};
  (p.realmStages||[]).forEach(s=>{
    t.hp+=s.hp||0;t.atk+=s.atk||0;t.def+=s.def||0;t.critRate+=s.critRate||0;t.critDmg+=s.critDmg||0;
    ['metal','wood','water','fire','earth'].forEach(k=>{t.resist[k]+=(s.resist||{})[k]||0;t.dmgBonus[k]+=(s.dmgBonus||{})[k]||0;});
  });
  return t;
}

function calcPetCombat(p) {
  const t=petTotalAttr(p);let pts=0;
  pts+=t.hp/10+t.atk/2+t.def/2+t.critRate+t.critDmg;
  ['metal','wood','water','fire','earth'].forEach(k=>{pts+=t.resist[k]/0.8+t.dmgBonus[k]/0.8;});
  return Math.round(pts);
}

function createEmptyPet() {
  return {id:'',name:'',image:'',realm:'练气初期',spiritRoots:[],realmStages:[],activeSkills:[],passiveSkills:[]};
}

const Pets={

  renderList(){
    const list=Storage.list(PET_STORAGE);let rows='';
    if(list.length===0){rows='<div class="placeholder">暂无灵宠，点击右上角按钮添加</div>';}
    else{
      rows=`<div class="row-list"><div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:85px;">名称</span>
        <span class="row-h-col" style="width:65px;">修为</span>
        <span class="row-h-col" style="width:50px;">五行</span>
        <span class="row-h-col" style="width:55px;">生命</span>
        <span class="row-h-col" style="width:55px;">攻击</span>
        <span class="row-h-col" style="width:55px;">防御</span>
        <span class="row-h-col" style="width:50px;">战力</span>
        <span class="row-h-col" style="width:100px;"></span>
      </div>`;
      list.forEach(p=>{
        // 兼容旧数据
        if(!p.realmStages||p.realmStages.length===0){p.realmStages=[];if(p.basicAttr){const s=emptyPetStage(p.realm||'练气初期');s.hp=p.basicAttr.hp?.lv60||0;s.atk=p.basicAttr.atk?.lv60||0;s.def=p.basicAttr.def?.lv60||0;if(p.advancedAttr){s.critRate=p.advancedAttr.critRate?.lv60||0;s.critDmg=p.advancedAttr.critDmg?.lv60||0;['metal','wood','water','fire','earth'].forEach(k=>{const rk='resist_'+k;s.resist[k]=p.advancedAttr[rk]?.lv60||0;const dk='dmg_'+k;s.dmgBonus[k]=p.advancedAttr[dk]?.lv60||0;});}p.realmStages.push(s);}}
        const pSrc=(p.image||'').startsWith('data:')?p.image:(p.image?'img/pets/'+p.image:'');const imgHtml=pSrc?`<img src="${pSrc}" alt="${p.name}">`:'<div class="row-noimg">无图</div>';
        const tags=p.spiritRoots.map(e=>`<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        const total=petTotalAttr(p);const cp=calcPetCombat(p);
        const activeEsc=JSON.stringify(p.activeSkills||[]).replace(/'/g,'&#39;');
        const passiveEsc=JSON.stringify(p.passiveSkills||[]).replace(/'/g,'&#39;');
        rows+=`<div class="row-item">
          ${imgHtml}
          <span class="row-name" style="width:85px;">${p.name||'未命名'}</span>
          <span style="color:var(--text-dim);width:65px;font-size:13px;text-align:center;white-space:nowrap;">${majorName(p.realm)}期</span>
          <span class="row-tags" style="width:50px;justify-content:center;">${tags}</span>
          <span class="row-stat" style="width:55px;">${total.hp}</span>
          <span class="row-stat" style="width:55px;">${total.atk}</span>
          <span class="row-stat" style="width:55px;">${total.def}</span>
          <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${cp}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('pets/detail?id=${p.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-active='${activeEsc}' data-passive='${passiveEsc}' onclick="event.stopPropagation();showAbilityModal('${p.name||'灵宠'} 技能',JSON.parse(this.dataset.active),JSON.parse(this.dataset.passive))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm('确定删除此灵宠？')){Storage.deleteById('pets','${p.id}');App.navigate('pets');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows+='</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">灵宠图鉴</h2><button class="btn-primary" onclick="App.navigate('pets/detail')">+ 添加灵宠</button></div>${rows}`;
  },

  renderDetail(id){
    const pet=id?Storage.findById(PET_STORAGE,id):createEmptyPet();
    if(id&&!pet)return'<div class="placeholder">灵宠不存在</div>';
    const isNew=!id;
    // 兼容
    if(!pet.realmStages||pet.realmStages.length===0){pet.realmStages=[];if(pet.basicAttr){const s=emptyPetStage(pet.realm||'练气初期');s.hp=pet.basicAttr.hp?.lv60||0;s.atk=pet.basicAttr.atk?.lv60||0;s.def=pet.basicAttr.def?.lv60||0;if(pet.advancedAttr){s.critRate=pet.advancedAttr.critRate?.lv60||0;s.critDmg=pet.advancedAttr.critDmg?.lv60||0;['metal','wood','water','fire','earth'].forEach(k=>{const rk='resist_'+k;s.resist[k]=pet.advancedAttr[rk]?.lv60||0;const dk='dmg_'+k;s.dmgBonus[k]=pet.advancedAttr[dk]?.lv60||0;});}pet.realmStages.push(s);}}
    const rootsHtml=ELEMENTS.map(e=>`<label><input type="checkbox" value="${e}" ${pet.spiritRoots.includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
    const total=petTotalAttr(pet);

    let stagesHtml='';
    pet.realmStages.forEach((s,i)=>{
      stagesHtml+=`<fieldset class="fieldset"><legend><span style="cursor:pointer;" onclick="this.parentElement.nextElementSibling.style.display=this.parentElement.nextElementSibling.style.display==='none'?'':'none';this.textContent=this.textContent.startsWith('▸')?this.textContent.replace('▸','▾'):this.textContent.replace('▾','▸')">▾ ${s.realm}</span></legend>
        <div class="stage-body"><div class="form-row">
          <div style="flex:1;"><label>生命</label><input type="number" value="${s.hp}" data-field="ph_${i}"></div>
          <div style="flex:1;"><label>攻击</label><input type="number" value="${s.atk}" data-field="pa_${i}"></div>
          <div style="flex:1;"><label>防御</label><input type="number" value="${s.def}" data-field="pd_${i}"></div>
        </div>
        <div class="form-row" style="margin-top:8px;">
          <div style="flex:1;"><label>暴击率(%)</label><input type="number" value="${s.critRate}" data-field="pcr_${i}" step="0.01"></div>
          <div style="flex:1;"><label>暴击伤害(%)</label><input type="number" value="${s.critDmg}" data-field="pcd_${i}" step="0.01"></div>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return`<div style="margin-top:4px;"><label>${e}抗性(%)</label><input type="number" value="${(s.resist||{})[m[e]]||0}" data-field="pr_${m[e]}_${i}" step="0.01"></div>`;}).join('')}</div>
          <div>${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return`<div style="margin-top:4px;"><label>${e}伤害加成(%)</label><input type="number" value="${(s.dmgBonus||{})[m[e]]||0}" data-field="pdmg_${m[e]}_${i}" step="0.01"></div>`;}).join('')}</div>
        </div>
        ${pet.realmStages.length>1&&i===pet.realmStages.length-1?`<button class="btn-danger" style="margin-top:10px;font-size:12px;" onclick="Pets.delStage(${i},'${pet.id||''}')">删除此阶段</button>`:''}
        </div></fieldset>`;
    });

    function skillHtml(skills,label){let h='';skills.forEach((s,i)=>{h+=`<div class="entry-item"><div class="entry-header"><span>${label} #${i+1}</span><button class="btn-delete pet-skill-del">×</button></div><input type="text" value="${s.name||''}" data-field="${label}_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="${label}_desc_${i}" placeholder="技能描述">${s.desc||''}</textarea></div>`;});return h||`<div class="empty-hint">暂无${label}</div>`;}

    return `<div class="detail-page" data-pet-id="${pet.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('pets')">← 返回列表</button><button class="btn-primary" id="btn-save">保存</button><button class="btn-danger" id="btn-del" ${isNew?'style="display:none"':''}>删除灵宠</button></div>
      <fieldset class="fieldset"><legend>基本信息</legend>
        <div class="form-row"><div style="flex:0 0 200px;"><label>图片</label><div id="pet-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;">
        <div class="form-group"><label>名称</label><input type="text" id="pet-name" value="${pet.name}" style="width:100%;font-size:18px;"></div>
        <div class="form-row"><div style="flex:1;"><label>初始境界</label><select id="pet-realm" style="width:100%;">${REALMS.map(r=>`<option value="${r}" ${pet.realm===r?'selected':''}>${r}</option>`).join('')}</select></div><div style="flex:1;"><label>五行属性（可多选，最多3个）</label><div class="checkbox-group" id="pet-roots">${rootsHtml}</div></div></div></div></div></fieldset>

      <fieldset class="fieldset" style="background:#fefcf2;border-color:var(--gold);"><legend style="font-size:16px;">满级总属性</legend>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;">${(()=>{let h=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">生命</div><div style="font-size:18px;">${total.hp}</div></div><div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">攻击</div><div style="font-size:18px;">${total.atk}</div></div><div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">防御</div><div style="font-size:18px;">${total.def}</div></div>`;if(total.critRate)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击率</div><div style="font-size:18px;">${total.critRate}%</div></div>`;if(total.critDmg)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击伤害</div><div style="font-size:18px;">${total.critDmg}%</div></div>`;['金','木','水','火','土'].forEach(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};const v=total.resist[m[e]];if(v)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">${e}抗性</div><div style="font-size:18px;">${v}%</div></div>`;});['金','木','水','火','土'].forEach(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};const v=total.dmgBonus[m[e]];if(v)h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">${e}伤害加成</div><div style="font-size:18px;">${v}%</div></div>`;});h+=`<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">战力</div><div style="font-size:22px;color:var(--gold);">${calcPetCombat(pet)}</div></div>`;return h;})()}</div>
      </fieldset>

      <fieldset class="fieldset"><legend>修为阶段 <button class="btn-add" id="btn-add-stage">+</button></legend>
        <div id="stages-container">${stagesHtml||'<div style="color:var(--text-dim);">暂无阶段</div>'}</div>
      </fieldset>

      <fieldset class="fieldset"><legend>主动技能 <button class="btn-add" id="btn-add-active">+</button></legend><div id="active-container">${skillHtml(pet.activeSkills,'主动技能')}</div></fieldset>
      <fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-passive">+</button></legend><div id="passive-container">${skillHtml(pet.passiveSkills,'被动技能')}</div></fieldset>
      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save2">保存</button><button class="btn-danger" id="btn-del2" ${isNew?'style="display:none"':''}>删除灵宠</button></div>
    </div>`;
  },

  bindDetailEvents(){
    const self=this;const el=document.querySelector('.detail-page');if(!el)return;
    const petId=el.dataset.petId;const isNew=el.dataset.isNew==='true';
    const iz=document.getElementById('pet-img-zone');if(iz){let cur=petId?Storage.findById(PET_STORAGE,petId):null;ImageUpload.setup(iz,cur?.image||'',(v)=>{},'pets/');}

    const save=()=>{const d=self._collect(petId);if(!d.name.trim()){alert('请输入灵宠名称');return;}if(!d.id)d.id=Storage.uid();if(!d.realmStages||d.realmStages.length===0){d.realmStages=[emptyPetStage(d.realm)];}Storage.save(PET_STORAGE,d);App.navigate('pets');};
    document.getElementById('btn-save')?.addEventListener('click',save);
    document.getElementById('btn-save2')?.addEventListener('click',save);
    const del=()=>{if(confirm('确定删除该灵宠？')){Storage.deleteById(PET_STORAGE,petId);App.navigate('pets');}};
    document.getElementById('btn-del')?.addEventListener('click',del);
    document.getElementById('btn-del2')?.addEventListener('click',del);

    // 添加阶段
    document.getElementById('btn-add-stage')?.addEventListener('click',()=>{
      const cur=self._quickCollect(petId);
      if(!cur.realmStages)cur.realmStages=[];
      if(!cur.id)cur.id=Storage.uid();
      const baseIdx=REALMS.indexOf(cur.realm);
      const nextIdx=baseIdx+cur.realmStages.length;
      if(nextIdx>=REALMS.length){alert('已达最高阶段');return;}
      cur.realmStages.push(emptyPetStage(REALMS[nextIdx]));
      Storage.save(PET_STORAGE,cur);
      App.navigate('pets/detail?id='+cur.id);
    });

    self._bindSkillBtn('active','主动技能');self._bindSkillBtn('passive','被动技能');
    document.querySelectorAll('.pet-skill-del').forEach(btn=>{btn.addEventListener('click',function(){const item=this.closest('.entry-item');const c=item.parentElement;item.remove();if(c.querySelectorAll('.entry-item').length===0){const label=c.id.includes('active')?'主动技能':'被动技能';c.innerHTML=`<div class="empty-hint">暂无${label}</div>`;}});});
  },

  _bindSkillBtn(type,label){document.getElementById(`btn-add-${type}`)?.addEventListener('click',()=>{const c=document.getElementById(`${type}-container`);const idx=c.querySelectorAll('.entry-item').length;const div=document.createElement('div');div.className='entry-item';div.innerHTML=`<div class="entry-header"><span>${label} #${idx+1}</span><button class="btn-delete pet-skill-del">×</button></div><input type="text" data-field="${label}_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="${label}_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>`;const em=c.querySelector('.empty-hint');if(em)em.remove();c.appendChild(div);div.querySelector('.pet-skill-del').addEventListener('click',()=>{div.remove();if(c.querySelectorAll('.entry-item').length===0)c.innerHTML=`<div class="empty-hint">暂无${label}</div>`;});});},

  delStage(idx,charId){const cur=Storage.findById(PET_STORAGE,charId);if(!cur)return;if(!cur.realmStages)cur.realmStages=[];cur.realmStages.splice(idx,1);Storage.save(PET_STORAGE,cur);App.navigate('pets/detail?id='+(cur.id||charId));},

  _quickCollect(petId){let d=petId?Storage.findById(PET_STORAGE,petId):createEmptyPet();if(!d)d=createEmptyPet();if(!d.realmStages)d.realmStages=[];d.id=petId||'';d.name=document.getElementById('pet-name')?.value||'';d.realm=document.getElementById('pet-realm')?.value||'练气初期';d.spiritRoots=Array.from(document.querySelectorAll('#pet-roots input:checked')).map(cb=>cb.value);d.image=document.querySelector('#pet-img-zone .img-filename-input')?.value?.trim()||'';this._collectPetStages(d);return d;},
  _collectPetStages(d){d.realmStages=[];const sc=document.querySelectorAll('[data-field^="ph_"]').length;for(let i=0;i<sc;i++){const fel=document.querySelector(`#stages-container .fieldset:nth-child(${i+1}) legend span`);const realm=fel?fel.textContent.replace(/^[▾▸]\s*/,'').trim():REALMS[0];const s=emptyPetStage(realm);s.hp=parseFloat(document.querySelector(`[data-field="ph_${i}"]`)?.value)||0;s.atk=parseFloat(document.querySelector(`[data-field="pa_${i}"]`)?.value)||0;s.def=parseFloat(document.querySelector(`[data-field="pd_${i}"]`)?.value)||0;s.critRate=parseFloat(document.querySelector(`[data-field="pcr_${i}"]`)?.value)||0;s.critDmg=parseFloat(document.querySelector(`[data-field="pcd_${i}"]`)?.value)||0;['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=parseFloat(document.querySelector(`[data-field="pr_${k}_${i}"]`)?.value)||0;s.dmgBonus[k]=parseFloat(document.querySelector(`[data-field="pdmg_${k}_${i}"]`)?.value)||0;});d.realmStages.push(s);}},

  _collect(petId){let d=this._quickCollect(petId);
    d.realmStages=[];const sc=document.querySelectorAll('[data-field^="ph_"]').length;for(let i=0;i<sc;i++){const fel=document.querySelector(`#stages-container .fieldset:nth-child(${i+1}) legend span`);const realm=fel?fel.textContent.replace(/^[▾▸]\s*/,'').trim():REALMS[0];const s=emptyPetStage(realm);s.hp=parseFloat(document.querySelector(`[data-field="ph_${i}"]`)?.value)||0;s.atk=parseFloat(document.querySelector(`[data-field="pa_${i}"]`)?.value)||0;s.def=parseFloat(document.querySelector(`[data-field="pd_${i}"]`)?.value)||0;s.critRate=parseFloat(document.querySelector(`[data-field="pcr_${i}"]`)?.value)||0;s.critDmg=parseFloat(document.querySelector(`[data-field="pcd_${i}"]`)?.value)||0;['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=parseFloat(document.querySelector(`[data-field="pr_${k}_${i}"]`)?.value)||0;s.dmgBonus[k]=parseFloat(document.querySelector(`[data-field="pdmg_${k}_${i}"]`)?.value)||0;});d.realmStages.push(s);}
    d.activeSkills=[];document.querySelectorAll('#active-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.activeSkills.push({name:n?.value||'',desc:t?.value||''});});
    d.passiveSkills=[];document.querySelectorAll('#passive-container .entry-item').forEach(item=>{const n=item.querySelector('input');const t=item.querySelector('textarea');d.passiveSkills.push({name:n?.value||'',desc:t?.value||''});});
    return d;},
  bindListEvents(){}
};

// 灵宠图鉴

const PET_STORAGE = 'pets';

function createEmptyPet() {
  return {
    id: '',
    name: '',
    image: '',
    realm: '练气初期',
    spiritRoots: [],
    basicAttr: { hp:{lv1:0,lv60:0}, atk:{lv1:0,lv60:0}, def:{lv1:0,lv60:0} },
    advancedAttr: {
      critRate: {lv1:5,lv60:5}, critDmg: {lv1:150,lv60:150},
      resist_metal:{lv1:0,lv60:0}, resist_wood:{lv1:0,lv60:0}, resist_water:{lv1:0,lv60:0}, resist_fire:{lv1:0,lv60:0}, resist_earth:{lv1:0,lv60:0},
      dmg_metal:{lv1:0,lv60:0}, dmg_wood:{lv1:0,lv60:0}, dmg_water:{lv1:0,lv60:0}, dmg_fire:{lv1:0,lv60:0}, dmg_earth:{lv1:0,lv60:0}
    },
    activeSkills: [],
    passiveSkills: []
  };
}

const Pets = {

  renderList() {
    const list = Storage.list(PET_STORAGE);
    let cards = '';
    if (list.length === 0) {
      cards = '<div class="placeholder">暂无灵宠，点击右上角按钮添加</div>';
    } else {
      cards = '<div class="card-grid">';
      list.forEach(p => {
        const imgHtml = p.image
          ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;">`
          : `<div style="width:100%;height:180px;background:#eef5e6;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#95a385;">无图片</div>`;
        const tags = p.spiritRoots.map(e => `<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        cards += `<div class="card" onclick="App.navigate('pets/detail?id=${p.id}')">${imgHtml}<div style="margin-top:8px;font-weight:bold;">${p.name||'未命名'}</div><div style="color:#6b7a5e;font-size:13px;">${p.realm}</div><div style="margin-top:4px;">${tags}</div></div>`;
      });
      cards += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:#b8944c;flex:1;">灵宠图鉴</h2><button class="btn-primary" onclick="App.navigate('pets/detail')">+ 添加灵宠</button></div>${cards}`;
  },

  bindListEvents() {
    // 所有点击已通过 inline onclick 处理
  },

  renderDetail(id) {
    const pet = id ? Storage.findById(PET_STORAGE, id) : createEmptyPet();
    if (id && !pet) return '<div class="placeholder">灵宠不存在</div>';
    const isNew = !id;

    const rootsHtml = ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${pet.spiritRoots.includes(e)?'checked':''}> ${e}</label>`).join('');

    function basicRow(label, key) {
      const a = pet.basicAttr[key];
      const growth = (a.lv60 - a.lv1) / 59;
      const level = realmToLevel(pet.realm);
      const current = a.lv1 + (level - 1) * growth;
      return `<div class="form-row">
        <div style="flex:1;"><label>${label} 1级值</label><input type="number" value="${a.lv1}" data-field="basic_${key}_lv1"></div>
        <div style="flex:1;"><label>${label} 60级值</label><input type="number" value="${a.lv60}" data-field="basic_${key}_lv60"></div>
        <div style="flex:1;"><label>每级成长</label><span class="growth-display" data-basic="${key}">${growth.toFixed(2)}</span></div>
        <div style="flex:1;"><label>当前境界值(Lv${level})</label><span class="current-display" data-basic="${key}">${current.toFixed(2)}</span></div>
      </div>`;
    }

    function advRow(label, key) {
      const val = pet.advancedAttr[key] || {lv1:0,lv60:0};
      const growth = (val.lv60 - val.lv1) / 59;
      return `<div class="form-row">
        <div style="flex:1;"><label>${label} 1级值(%)</label><input type="number" value="${val.lv1}" data-field="adv_${key}_lv1" step="0.01"></div>
        <div style="flex:1;"><label>${label} 60级值(%)</label><input type="number" value="${val.lv60}" data-field="adv_${key}_lv60" step="0.01"></div>
        <div style="flex:1;"><label>每级成长</label><span class="adv-growth-display" data-adv="${key}">${growth.toFixed(2)}</span></div>
      </div>`;
    }

    function skillHtml(skills, label) {
      let h = '';
      skills.forEach((s, i) => {
        h += `<div class="entry-item">
          <div class="entry-header"><span>${label} #${i+1}</span><button class="btn-delete pet-skill-del">×</button></div>
          <div style="margin-bottom:8px;"><input type="text" value="${s.name||''}" data-field="${label}_name_${i}" placeholder="技能名称" style="width:100%;"></div>
          <div><textarea data-field="${label}_desc_${i}" placeholder="技能描述">${s.desc||''}</textarea></div>
        </div>`;
      });
      return h || `<div class="empty-hint">暂无${label}</div>`;
    }

    return `<div class="detail-page" data-pet-id="${pet.id||''}" data-is-new="${isNew}">
      <div class="toolbar">
        <button class="btn-primary" onclick="App.navigate('pets')">← 返回列表</button>
        <button class="btn-primary" id="btn-save">保存</button>
        ${!isNew?'<button class="btn-danger" id="btn-del">删除灵宠</button>':''}
      </div>

      <fieldset class="fieldset"><legend>基本信息</legend>
        <div class="form-row">
          <div style="flex:0 0 200px;"><label>图片</label><div id="pet-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div>
          <div style="flex:1;">
            <div class="form-group"><label>名称</label><input type="text" id="pet-name" value="${pet.name}" style="width:100%;font-size:18px;"></div>
            <div class="form-group"><label>境界</label><select id="pet-realm">${REALMS.map(r=>`<option value="${r}" ${pet.realm===r?'selected':''}>${r}</option>`).join('')}</select></div>
            <div class="form-group"><label>五行属性（可多选）</label><div class="checkbox-group" id="pet-roots">${rootsHtml}</div></div>
          </div>
        </div>
      </fieldset>

      <fieldset class="fieldset"><legend>基础属性（1级→60级，线性成长）</legend>
        ${basicRow('生命','hp')}${basicRow('攻击','atk')}${basicRow('防御','def')}
      </fieldset>

      <fieldset class="fieldset"><legend>进阶属性（1级→60级，线性成长）</legend>
        ${advRow('暴击率','critRate')}${advRow('暴击伤害','critDmg')}
        <div style="margin-top:12px;color:#b8944c;font-weight:bold;">五行抗性</div>
        ${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return advRow(e+'抗性','resist_'+m[e]);}).join('')}
        <div style="margin-top:12px;color:#b8944c;font-weight:bold;">五行伤害加成</div>
        ${ELEMENTS.map(e=>{const m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};return advRow(e+'伤害加成','dmg_'+m[e]);}).join('')}
      </fieldset>

      <fieldset class="fieldset"><legend>主动技能 <button class="btn-add" id="btn-add-active">+</button></legend>
        <div id="active-container">${skillHtml(pet.activeSkills,'主动技能')}</div>
      </fieldset>

      <fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-passive">+</button></legend>
        <div id="passive-container">${skillHtml(pet.passiveSkills,'被动技能')}</div>
      </fieldset>

      <div class="toolbar" style="margin-top:20px;">
        <button class="btn-primary" id="btn-save2">保存</button>
        ${!isNew?'<button class="btn-danger" id="btn-del2">删除灵宠</button>':''}
      </div>
    </div>`;
  },

  bindDetailEvents() {
    const self = this;
    const el = document.querySelector('.detail-page');
    if (!el) return;
    const petId = el.dataset.petId;
    const isNew = el.dataset.isNew === 'true';

    const imgZone = document.getElementById('pet-img-zone');
    if (imgZone) {
      let cur = petId ? Storage.findById(PET_STORAGE, petId) : null;
      if (cur?.image) ImageUpload.setPreview(imgZone, cur.image);
      ImageUpload.create(imgZone, () => {});
    }

    // Back button uses inline onclick

    const save = () => {
      const data = self._collect(petId);
      if (!data.name.trim()) { alert('请输入灵宠名称'); return; }
      if (!data.id) data.id = Storage.uid();
      Storage.save(PET_STORAGE, data);
      App.navigate('pets');
    };
    document.getElementById('btn-save')?.addEventListener('click', save);
    document.getElementById('btn-save2')?.addEventListener('click', save);

    const del = () => {
      if (confirm('确定删除该灵宠？')) { Storage.deleteById(PET_STORAGE, petId); App.navigate('pets'); }
    };
    document.getElementById('btn-del')?.addEventListener('click', del);
    document.getElementById('btn-del2')?.addEventListener('click', del);

    document.getElementById('pet-realm')?.addEventListener('change', () => self._updateGrowth());
    document.querySelectorAll('[data-field^="basic_"]').forEach(inp => inp.addEventListener('input', () => self._updateGrowth()));
    document.querySelectorAll('[data-field^="adv_"]').forEach(inp => {
      inp.addEventListener('input', function () {
        const key = this.dataset.field.replace('adv_','').replace('_lv1','').replace('_lv60','');
        const lv1 = parseFloat(document.querySelector(`[data-field="adv_${key}_lv1"]`)?.value) || 0;
        const lv60 = parseFloat(document.querySelector(`[data-field="adv_${key}_lv60"]`)?.value) || 0;
        const gEl = document.querySelector(`.adv-growth-display[data-adv="${key}"]`);
        if (gEl) gEl.textContent = ((lv60 - lv1) / 59).toFixed(2);
      });
    });

    // 技能添加
    self._bindSkillBtn('active', '主动技能');
    self._bindSkillBtn('passive', '被动技能');
    // 已有删除
    document.querySelectorAll('.pet-skill-del').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.closest('.entry-item');
        const container = item.parentElement;
        item.remove();
        if (container.querySelectorAll('.entry-item').length === 0) {
          const label = container.id.includes('active') ? '主动技能' : '被动技能';
          container.innerHTML = `<div class="empty-hint">暂无${label}</div>`;
        }
      });
    });
  },

  _bindSkillBtn(type, label) {
    document.getElementById(`btn-add-${type}`)?.addEventListener('click', () => {
      const container = document.getElementById(`${type}-container`);
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `<div class="entry-header"><span>${label} #${idx+1}</span><button class="btn-delete pet-skill-del">×</button></div>
        <div style="margin-bottom:8px;"><input type="text" data-field="${label}_name_${idx}" placeholder="技能名称" style="width:100%;"></div>
        <div><textarea data-field="${label}_desc_${idx}" placeholder="技能描述"></textarea></div>`;
      const empty = container.querySelector('.empty-hint');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.pet-skill-del').addEventListener('click', () => {
        div.remove();
        if (container.querySelectorAll('.entry-item').length === 0) container.innerHTML = `<div class="empty-hint">暂无${label}</div>`;
      });
    });
  },

  _updateGrowth() {
    const realm = document.getElementById('pet-realm')?.value || '练气初期';
    const level = realmToLevel(realm);
    ['hp','atk','def'].forEach(key => {
      const lv1 = parseFloat(document.querySelector(`[data-field="basic_${key}_lv1"]`)?.value) || 0;
      const lv60 = parseFloat(document.querySelector(`[data-field="basic_${key}_lv60"]`)?.value) || 0;
      const growth = (lv60 - lv1) / 59;
      const current = lv1 + (level - 1) * growth;
      const gEl = document.querySelector(`.growth-display[data-basic="${key}"]`);
      const cEl = document.querySelector(`.current-display[data-basic="${key}"]`);
      if (gEl) gEl.textContent = growth.toFixed(2);
      if (cEl) cEl.textContent = current.toFixed(2);
    });
  },

  _collect(petId) {
    let data = petId ? Storage.findById(PET_STORAGE, petId) : createEmptyPet();
    if (!data) data = createEmptyPet();
    data.id = petId || '';
    data.name = document.getElementById('pet-name')?.value || '';
    data.realm = document.getElementById('pet-realm')?.value || '练气初期';
    data.spiritRoots = Array.from(document.querySelectorAll('#pet-roots input:checked')).map(cb => cb.value);
    data.image = document.querySelector('#pet-img-zone img')?.src || '';

    ['hp','atk','def'].forEach(key => {
      const lv1 = document.querySelector(`[data-field="basic_${key}_lv1"]`);
      const lv60 = document.querySelector(`[data-field="basic_${key}_lv60"]`);
      if (lv1) data.basicAttr[key].lv1 = parseFloat(lv1.value) || 0;
      if (lv60) data.basicAttr[key].lv60 = parseFloat(lv60.value) || 0;
    });

    // Collect all advancedAttr fields
    const advFields = ['critRate','critDmg',
      'resist_metal','resist_wood','resist_water','resist_fire','resist_earth',
      'dmg_metal','dmg_wood','dmg_water','dmg_fire','dmg_earth'];
    advFields.forEach(key => {
      const lv1El = document.querySelector(`[data-field="adv_${key}_lv1"]`);
      const lv60El = document.querySelector(`[data-field="adv_${key}_lv60"]`);
      if (!data.advancedAttr[key]) data.advancedAttr[key] = {lv1:0,lv60:0};
      if (lv1El) data.advancedAttr[key].lv1 = parseFloat(lv1El.value) || 0;
      if (lv60El) data.advancedAttr[key].lv60 = parseFloat(lv60El.value) || 0;
    });

    data.activeSkills = [];
    document.querySelectorAll('#active-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input');
      const descEl = item.querySelector('textarea');
      data.activeSkills.push({ name: nameEl?.value || '', desc: descEl?.value || '' });
    });
    data.passiveSkills = [];
    document.querySelectorAll('#passive-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input');
      const descEl = item.querySelector('textarea');
      data.passiveSkills.push({ name: nameEl?.value || '', desc: descEl?.value || '' });
    });
    return data;
  }
};

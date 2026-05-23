// 角色图鉴

const REALMS = [
  '练气初期','练气中期','练气后期',
  '筑基初期','筑基中期','筑基后期',
  '金丹初期','金丹中期','金丹后期',
  '元婴初期','元婴中期','元婴后期',
  '化神初期','化神中期','化神后期'
];
const ELEMENTS = ['金','木','水','火','土'];

const STORAGE_KEY = 'characters';

// 修为 → 等级
function realmToLevel(realm) {
  const idx = REALMS.indexOf(realm);
  return idx >= 0 ? idx + 1 : 1;
}

// 等级 → 修为
function levelToRealm(level) {
  return REALMS[Math.min(Math.max(level - 1, 0), REALMS.length - 1)];
}

// 计算成长值（每级）
function calcGrowth(lv1, lvMax, maxLevel) {
  return (lvMax - lv1) / (maxLevel - 1);
}

// 创建空角色数据
function createEmptyChar() {
  return {
    id: '',
    name: '',
    avatar: '',
    realm: '练气初期',
    spiritRoots: [],
    basicAttr: {
      hp:  { lv1: 0, lv100: 0 },
      atk: { lv1: 0, lv100: 0 },
      def: { lv1: 0, lv100: 0 }
    },
    advancedAttr: {
      critRate: 5,
      critDmg: 150,
      resist:  { metal:0, wood:0, water:0, fire:0, earth:0 },
      dmgBonus: { metal:0, wood:0, water:0, fire:0, earth:0 }
    },
    passiveSkills: [],
    breakthroughRecords: [],
    breakthroughAttrs: []
  };
}

const Characters = {

  // === 列表页 ===
  renderList() {
    const list = Storage.list(STORAGE_KEY);
    let cards = '';
    if (list.length === 0) {
      cards = '<div class="placeholder">暂无角色，点击右上角按钮添加</div>';
    } else {
      cards = '<div class="card-grid">';
      list.forEach(c => {
        const avatarHtml = c.avatar
          ? `<img src="${c.avatar}" alt="${c.name}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;">`
          : `<div style="width:100%;height:180px;background:#0f0f23;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#555;">无立绘</div>`;
        const tags = c.spiritRoots.map(e => `<span class="tag tag-${e === '金' ? 'gold' : e === '木' ? 'wood' : e === '水' ? 'water' : e === '火' ? 'fire' : 'earth'}">${e}</span>`).join('');
        cards += `
          <div class="card" data-id="${c.id}">
            ${avatarHtml}
            <div style="margin-top:8px;font-weight:bold;">${c.name || '未命名'}</div>
            <div style="color:#a0a0a0;font-size:13px;">${c.realm}</div>
            <div style="margin-top:4px;">${tags}</div>
          </div>`;
      });
      cards += '</div>';
    }
    return `
      <div class="toolbar">
        <h2 style="color:#e2b04a;flex:1;">角色图鉴</h2>
        <button class="btn-primary" id="btn-add-char">+ 添加角色</button>
      </div>
      ${cards}
    `;
  },

  bindListEvents() {
    const self = this;
    // 添加按钮
    const btnAdd = document.getElementById('btn-add-char');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        App.render('characters', 'detail', {}); location.hash = 'characters/detail';
      });
    }
    // 卡片点击
    document.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        App.render('characters', 'detail', { id: card.dataset.id });
        location.hash = 'characters/detail?id=' + card.dataset.id;
      });
    });
  },

  // === 详情页 ===
  renderDetail(id) {
    const char = id ? Storage.findById(STORAGE_KEY, id) : createEmptyChar();
    if (id && !char) {
      return '<div class="placeholder">角色不存在</div>';
    }
    const isNew = !id;

    // 灵根复选框
    const rootsHtml = ELEMENTS.map(e => {
      const checked = char.spiritRoots.includes(e) ? 'checked' : '';
      return `<label><input type="checkbox" value="${e}" data-field="spiritRoot" ${checked}> ${e}</label>`;
    }).join('');

    // 基础属性输入
    function basicRow(label, key) {
      const a = char.basicAttr[key];
      return `
        <div class="form-row">
          <div style="flex:1;">
            <label>${label} 1级值</label>
            <input type="number" value="${a.lv1}" data-field="basic_${key}_lv1" data-label="${label}">
          </div>
          <div style="flex:1;">
            <label>${label} 100级值</label>
            <input type="number" value="${a.lv100}" data-field="basic_${key}_lv100" data-label="${label}">
          </div>
          <div style="flex:1;">
            <label>每级成长</label>
            <span class="growth-display" data-basic="${key}">${calcGrowth(a.lv1, a.lv100, 100).toFixed(2)}</span>
          </div>
          <div style="flex:1;">
            <label>当前境界值 (Lv${realmToLevel(char.realm)})</label>
            <span class="current-display" data-basic="${key}">${(a.lv1 + (realmToLevel(char.realm) - 1) * calcGrowth(a.lv1, a.lv100, 100)).toFixed(2)}</span>
          </div>
        </div>`;
    }

    // 进阶属性
    const adv = char.advancedAttr;
    function elemInputs(prefix, obj) {
      return ELEMENTS.map(e => {
        const keyMap = { '金':'metal','木':'wood','水':'water','火':'fire','土':'earth' };
        return `<div style="flex:1;"><label>${e}${prefix}</label><input type="number" value="${obj[keyMap[e]]}" data-field="adv_${prefix}_${keyMap[e]}" step="0.01"></div>`;
      }).join('');
    }

    // 被动技能
    let skillsHtml = '';
    char.passiveSkills.forEach((sk, i) => {
      skillsHtml += `
        <div class="entry-item">
          <div class="entry-header">
            <span>被动技能 #${i + 1}</span>
            <button class="btn-delete" data-action="del-skill" data-idx="${i}">×</button>
          </div>
          <div style="margin-bottom:8px;"><input type="text" value="${sk.name || ''}" data-field="skill_name_${i}" placeholder="技能名称" style="width:100%;"></div>
          <div><textarea data-field="skill_desc_${i}" placeholder="技能描述">${sk.desc || ''}</textarea></div>
        </div>`;
    });

    // 突破记录
    let brHtml = '';
    char.breakthroughRecords.forEach((r, i) => {
      brHtml += `
        <div class="entry-item">
          <div class="entry-header">
            <span>突破记录 #${i + 1}</span>
            <button class="btn-delete" data-action="del-br" data-idx="${i}">×</button>
          </div>
          <textarea data-field="br_${i}">${r}</textarea>
        </div>`;
    });

    // 突破属性
    let baHtml = '';
    char.breakthroughAttrs.forEach((a, i) => {
      baHtml += `
        <div class="entry-item">
          <div class="entry-header">
            <span>突破属性 #${i + 1}</span>
            <button class="btn-delete" data-action="del-ba" data-idx="${i}">×</button>
          </div>
          <input type="text" value="${a}" data-field="ba_${i}" placeholder="如：LV.20 生命+200, 攻击+50" style="width:100%;">
        </div>`;
    });

    return `
      <div class="detail-page" data-char-id="${char.id || ''}" data-is-new="${isNew}">
        <div class="toolbar">
          <button class="btn-primary" id="btn-back-list">← 返回列表</button>
          <button class="btn-primary" id="btn-save-char">保存</button>
          ${!isNew ? '<button class="btn-danger" id="btn-del-char">删除角色</button>' : ''}
        </div>

        <!-- 立绘 + 基本信息 -->
        <fieldset class="fieldset">
          <legend>基本信息</legend>
          <div class="form-row">
            <div style="flex:0 0 200px;">
              <label>立绘</label>
              <div id="char-avatar-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div>
            </div>
            <div style="flex:1;">
              <div class="form-group">
                <label>姓名</label>
                <input type="text" id="char-name" value="${char.name}" style="width:100%;font-size:18px;">
              </div>
              <div class="form-group">
                <label>境界</label>
                <select id="char-realm">${REALMS.map(r => `<option value="${r}" ${char.realm === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
              </div>
              <div class="form-group">
                <label>灵根（可多选）</label>
                <div class="checkbox-group" id="char-roots">${rootsHtml}</div>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- 基础属性 -->
        <fieldset class="fieldset">
          <legend>基础属性（1级 → 100级，线性成长）</legend>
          ${basicRow('生命', 'hp')}
          ${basicRow('攻击', 'atk')}
          ${basicRow('防御', 'def')}
        </fieldset>

        <!-- 进阶属性 -->
        <fieldset class="fieldset">
          <legend>进阶属性（固定值，不随等级成长）</legend>
          <div class="form-row">
            <div style="flex:1;"><label>暴击率 (%)</label><input type="number" id="adv-critRate" value="${adv.critRate}" step="0.01"></div>
            <div style="flex:1;"><label>暴击伤害 (%)</label><input type="number" id="adv-critDmg" value="${adv.critDmg}" step="0.01"></div>
          </div>
          <div style="margin-top:12px;"><label style="color:#e2b04a;">五行抗性 (%)</label></div>
          <div class="form-row">${elemInputs('抗性', adv.resist)}</div>
          <div style="margin-top:12px;"><label style="color:#e2b04a;">五行伤害加成 (%)</label></div>
          <div class="form-row">${elemInputs('伤害加成', adv.dmgBonus)}</div>
        </fieldset>

        <!-- 被动技能 -->
        <fieldset class="fieldset">
          <legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend>
          <div id="skills-container">${skillsHtml || '<div style="color:#a0a0a0;">暂无被动技能</div>'}</div>
        </fieldset>

        <!-- 突破记录 -->
        <fieldset class="fieldset">
          <legend>突破记录 <button class="btn-add" id="btn-add-br">+</button></legend>
          <div id="br-container">${brHtml || '<div style="color:#a0a0a0;">暂无突破记录</div>'}</div>
        </fieldset>

        <!-- 突破属性 -->
        <fieldset class="fieldset">
          <legend>突破属性 <button class="btn-add" id="btn-add-ba">+</button></legend>
          <div id="ba-container">${baHtml || '<div style="color:#a0a0a0;">暂无突破属性</div>'}</div>
        </fieldset>

        <div class="toolbar" style="margin-top:20px;">
          <button class="btn-primary" id="btn-save-char2">保存</button>
          ${!isNew ? '<button class="btn-danger" id="btn-del-char2">删除角色</button>' : ''}
        </div>
      </div>
    `;
  },

  bindDetailEvents() {
    const self = this;
    const el = document.querySelector('.detail-page');
    if (!el) return;
    const charId = el.dataset.charId;
    const isNew = el.dataset.isNew === 'true';

    // 立绘
    const avatarZone = document.getElementById('char-avatar-zone');
    if (avatarZone) {
      let currentChar = charId ? Storage.findById(STORAGE_KEY, charId) : createEmptyChar();
      if (currentChar && currentChar.avatar) {
        ImageUpload.setPreview(avatarZone, currentChar.avatar);
      }
      ImageUpload.create(avatarZone, (base64) => {
        // 立绘变化不立即保存，等用户点保存时读取
      });
    }

    // 返回列表
    const goBack = () => { App.render('characters', '', {}); location.hash = 'characters'; };
    document.getElementById('btn-back-list')?.addEventListener('click', goBack);

    // 保存
    const saveChar = () => {
      const data = self._collectFormData(charId);
      if (!data.name.trim()) {
        alert('请输入角色姓名');
        return;
      }
      // 如果没有 id，生成一个
      if (!data.id) data.id = Storage.uid();
      Storage.save(STORAGE_KEY, data);
      App.render('characters', '', {}); location.hash = 'characters';
    };
    document.getElementById('btn-save-char')?.addEventListener('click', saveChar);
    document.getElementById('btn-save-char2')?.addEventListener('click', saveChar);

    // 删除
    const delChar = () => {
      if (confirm('确定要删除该角色吗？此操作不可恢复。')) {
        Storage.deleteById(STORAGE_KEY, charId);
        App.render('characters', '', {}); location.hash = 'characters';
      }
    };
    document.getElementById('btn-del-char')?.addEventListener('click', delChar);
    document.getElementById('btn-del-char2')?.addEventListener('click', delChar);

    // 境界变化时，更新当前值显示
    document.getElementById('char-realm')?.addEventListener('change', function () {
      self._updateCurrentDisplay(this.value);
    });

    // 基础属性输入变化时，更新成长值和当前值
    document.querySelectorAll('[data-field^="basic_"]').forEach(input => {
      input.addEventListener('input', () => {
        self._updateGrowthDisplay();
      });
    });

    // 添加被动技能
    document.getElementById('btn-add-skill')?.addEventListener('click', () => {
      const container = document.getElementById('skills-container');
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span>被动技能 #${idx + 1}</span><button class="btn-delete del-skill-btn">×</button></div>
        <div style="margin-bottom:8px;"><input type="text" data-field="skill_name_${idx}" placeholder="技能名称" style="width:100%;"></div>
        <div><textarea data-field="skill_desc_${idx}" placeholder="技能描述"></textarea></div>
      `;
      // 移除空状态提示
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-skill-btn').addEventListener('click', () => { div.remove(); if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无被动技能</div>'; });
      // 重新索引
      self._reindexEntries(container, 'skill');
    });

    // 添加突破记录
    document.getElementById('btn-add-br')?.addEventListener('click', () => {
      const container = document.getElementById('br-container');
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span>突破记录 #${idx + 1}</span><button class="btn-delete del-br-btn">×</button></div>
        <textarea data-field="br_${idx}"></textarea>
      `;
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-br-btn').addEventListener('click', () => { div.remove(); if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无突破记录</div>'; });
      self._reindexEntries(container, 'br');
    });

    // 添加突破属性
    document.getElementById('btn-add-ba')?.addEventListener('click', () => {
      const container = document.getElementById('ba-container');
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span>突破属性 #${idx + 1}</span><button class="btn-delete del-ba-btn">×</button></div>
        <input type="text" data-field="ba_${idx}" placeholder="如：LV.20 生命+200, 攻击+50" style="width:100%;">
      `;
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-ba-btn').addEventListener('click', () => { div.remove(); if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无突破属性</div>'; });
      self._reindexEntries(container, 'ba');
    });

    // 绑定已有删除按钮
    document.querySelectorAll('[data-action="del-skill"]').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.closest('.entry-item');
        item.remove();
        const container = document.getElementById('skills-container');
        if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无被动技能</div>';
        self._reindexEntries(container, 'skill');
      });
    });
    document.querySelectorAll('[data-action="del-br"]').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.closest('.entry-item');
        item.remove();
        const container = document.getElementById('br-container');
        if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无突破记录</div>';
        self._reindexEntries(container, 'br');
      });
    });
    document.querySelectorAll('[data-action="del-ba"]').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.closest('.entry-item');
        item.remove();
        const container = document.getElementById('ba-container');
        if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无突破属性</div>';
        self._reindexEntries(container, 'ba');
      });
    });
  },

  // 收集表单数据
  _collectFormData(charId) {
    const isNew = !charId;
    let data = isNew ? createEmptyChar() : Storage.findById(STORAGE_KEY, charId);
    if (!data) data = createEmptyChar();
    data.id = charId || '';

    data.name = document.getElementById('char-name')?.value || '';
    data.realm = document.getElementById('char-realm')?.value || '练气初期';

    // 灵根
    const rootChecks = document.querySelectorAll('#char-roots input[type="checkbox"]:checked');
    data.spiritRoots = Array.from(rootChecks).map(cb => cb.value);

    // 基础属性
    ['hp','atk','def'].forEach(key => {
      const lv1El = document.querySelector(`[data-field="basic_${key}_lv1"]`);
      const lv100El = document.querySelector(`[data-field="basic_${key}_lv100"]`);
      if (lv1El) data.basicAttr[key].lv1 = parseFloat(lv1El.value) || 0;
      if (lv100El) data.basicAttr[key].lv100 = parseFloat(lv100El.value) || 0;
    });

    // 进阶属性
    const critRate = document.getElementById('adv-critRate');
    const critDmg = document.getElementById('adv-critDmg');
    if (critRate) data.advancedAttr.critRate = parseFloat(critRate.value) || 0;
    if (critDmg) data.advancedAttr.critDmg = parseFloat(critDmg.value) || 0;

    const elemKeys = ['metal','wood','water','fire','earth'];
    elemKeys.forEach((ek, i) => {
      const rEl = document.querySelector(`[data-field="adv_抗性_${ek}"]`);
      const dEl = document.querySelector(`[data-field="adv_伤害加成_${ek}"]`);
      if (rEl) data.advancedAttr.resist[ek] = parseFloat(rEl.value) || 0;
      if (dEl) data.advancedAttr.dmgBonus[ek] = parseFloat(dEl.value) || 0;
    });

    // 立绘
    const avatarImg = document.querySelector('#char-avatar-zone img');
    data.avatar = avatarImg ? avatarImg.src : '';

    // 被动技能
    data.passiveSkills = [];
    document.querySelectorAll('#skills-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input[type="text"]');
      const descEl = item.querySelector('textarea');
      data.passiveSkills.push({
        name: nameEl?.value || '',
        desc: descEl?.value || ''
      });
    });

    // 突破记录
    data.breakthroughRecords = [];
    document.querySelectorAll('#br-container .entry-item textarea').forEach(ta => {
      if (ta.value.trim()) data.breakthroughRecords.push(ta.value);
    });

    // 突破属性
    data.breakthroughAttrs = [];
    document.querySelectorAll('#ba-container .entry-item input[type="text"]').forEach(input => {
      if (input.value.trim()) data.breakthroughAttrs.push(input.value);
    });

    return data;
  },

  // 更新成长显示
  _updateGrowthDisplay() {
    ['hp','atk','def'].forEach(key => {
      const lv1El = document.querySelector(`[data-field="basic_${key}_lv1"]`);
      const lv100El = document.querySelector(`[data-field="basic_${key}_lv100"]`);
      const realmSelect = document.getElementById('char-realm');
      const lv1 = parseFloat(lv1El?.value) || 0;
      const lv100 = parseFloat(lv100El?.value) || 0;
      const growth = calcGrowth(lv1, lv100, 100);
      const level = realmToLevel(realmSelect?.value || '练气初期');
      const current = lv1 + (level - 1) * growth;

      const growthEl = document.querySelector(`.growth-display[data-basic="${key}"]`);
      const currentEl = document.querySelector(`.current-display[data-basic="${key}"]`);
      if (growthEl) growthEl.textContent = growth.toFixed(2);
      if (currentEl) currentEl.textContent = current.toFixed(2);
    });
  },

  // 更新当前值显示（境界变化时）
  _updateCurrentDisplay(realm) {
    this._updateGrowthDisplay();
  },

  // 重新索引动态列表
  _reindexEntries(container, prefix) {
    const items = container.querySelectorAll('.entry-item');
    items.forEach((item, i) => {
      const span = item.querySelector('.entry-header span');
      if (span) {
        const labelMap = { skill: '被动技能', br: '突破记录', ba: '突破属性' };
        span.textContent = `${labelMap[prefix] || ''} #${i + 1}`;
      }
      const input = item.querySelector(`[data-field^="${prefix}_"]`);
      if (input) {
        if (prefix === 'skill') {
          const nameInp = item.querySelector('input[type="text"]');
          const descTa = item.querySelector('textarea');
          if (nameInp) nameInp.dataset.field = `skill_name_${i}`;
          if (descTa) descTa.dataset.field = `skill_desc_${i}`;
        } else {
          input.dataset.field = `${prefix}_${i}`;
        }
      }
    });
  }
};

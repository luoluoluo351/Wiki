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

function realmToLevel(realm) {
  const idx = REALMS.indexOf(realm);
  return idx >= 0 ? idx + 1 : 1;
}

function levelToRealm(level) {
  return REALMS[Math.min(Math.max(level - 1, 0), REALMS.length - 1)];
}

function calcGrowth(lv1, lvMax, maxLevel) {
  return (lvMax - lv1) / (maxLevel - 1);
}

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
    breakthroughs: []  // [{level: 20, desc: ''}, ...]
  };
}

// 计算下一个突破等级
function nextBreakLevel(existingLevels) {
  for (let lv = 20; lv <= 100; lv += 20) {
    if (!existingLevels.includes(lv)) return lv;
  }
  return 0; // 已满
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
        // 兼容旧数据
        if (!c.breakthroughs) c.breakthroughs = [];
        const avatarHtml = c.avatar
          ? `<img src="${c.avatar}" alt="${c.name}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;">`
          : `<div style="width:100%;height:180px;background:#eef5e6;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#95a385;">无立绘</div>`;
        const tags = c.spiritRoots.map(e => `<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        cards += `
          <div class="card" onclick="App.navigate('characters/detail?id=${c.id}')">
            ${avatarHtml}
            <div style="margin-top:8px;font-weight:bold;">${c.name || '未命名'}</div>
            <div style="color:#6b7a5e;font-size:13px;">${c.realm}</div>
            <div style="margin-top:4px;">${tags}</div>
          </div>`;
      });
      cards += '</div>';
    }
    return `
      <div class="toolbar">
        <h2 style="color:#b8944c;flex:1;">角色图鉴</h2>
        <button class="btn-primary" onclick="App.navigate('characters/detail')">+ 添加角色</button>
      </div>
      ${cards}
    `;
  },

  bindListEvents() {
    // 所有点击已通过 inline onclick 处理
  },

  // === 详情页 ===
  renderDetail(id) {
    const char = id ? Storage.findById(STORAGE_KEY, id) : createEmptyChar();
    if (id && !char) return '<div class="placeholder">角色不存在</div>';
    const isNew = !id;

    // 兼容旧数据格式
    if (!char.breakthroughs) {
      char.breakthroughs = [];
      if (char.breakthroughRecords || char.breakthroughAttrs) {
        // 旧数据迁移——丢失具体等级，按顺序分配
        const oldRecords = char.breakthroughRecords || [];
        const oldAttrs = char.breakthroughAttrs || [];
        const maxLen = Math.max(oldRecords.length, oldAttrs.length);
        for (let i = 0; i < maxLen; i++) {
          const r = oldRecords[i] || '';
          const a = oldAttrs[i] || '';
          char.breakthroughs.push({ level: (i + 1) * 20, desc: (r + '\n' + a).trim() });
        }
      }
    }

    // 灵根复选框
    const rootsHtml = ELEMENTS.map(e => {
      const checked = char.spiritRoots.includes(e) ? 'checked' : '';
      return `<label><input type="checkbox" value="${e}" ${checked}> ${e}</label>`;
    }).join('');

    // 基础属性输入
    function basicRow(label, key) {
      const a = char.basicAttr[key];
      return `
        <div class="form-row">
          <div style="flex:1;"><label>${label} 1级值</label><input type="number" value="${a.lv1}" data-field="basic_${key}_lv1" style="width:100%;"></div>
          <div style="flex:1;"><label>${label} 100级值</label><input type="number" value="${a.lv100}" data-field="basic_${key}_lv100" style="width:100%;"></div>
          <div style="flex:1;"><label>每级成长</label><span class="growth-display" data-basic="${key}">${calcGrowth(a.lv1, a.lv100, 100).toFixed(2)}</span></div>
          <div style="flex:1;"><label>当前境界值 (Lv${realmToLevel(char.realm)})</label><span class="current-display" data-basic="${key}">${(a.lv1 + (realmToLevel(char.realm) - 1) * calcGrowth(a.lv1, a.lv100, 100)).toFixed(2)}</span></div>
        </div>`;
    }

    // 进阶属性
    const adv = char.advancedAttr;
    function elemInputs(prefix, obj) {
      return ELEMENTS.map(e => {
        const keyMap = { '金':'metal','木':'wood','水':'water','火':'fire','土':'earth' };
        return `<div style="flex:1;"><label>${e}${prefix}</label><input type="number" value="${obj[keyMap[e]]}" data-field="adv_${prefix}_${keyMap[e]}" step="0.01" style="width:100%;"></div>`;
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
          <input type="text" value="${sk.name || ''}" data-field="skill_name_${i}" placeholder="技能名称" style="width:100%;margin-bottom:8px;">
          <textarea data-field="skill_desc_${i}" placeholder="技能描述" style="width:100%;">${sk.desc || ''}</textarea>
        </div>`;
    });

    // 突破
    let btHtml = '';
    char.breakthroughs.forEach((b, i) => {
      btHtml += `
        <div class="entry-item">
          <div class="entry-header">
            <span class="bt-level-title">LV.${b.level}</span>
            <button class="btn-delete" data-action="del-bt" data-idx="${i}">×</button>
          </div>
          <textarea data-field="bt_${i}" placeholder="属性加成描述" style="width:100%;">${b.desc || ''}</textarea>
        </div>`;
    });

    return `
      <div class="detail-page" data-char-id="${char.id || ''}" data-is-new="${isNew}">
        <div class="toolbar">
          <button class="btn-primary" onclick="App.navigate('characters')">← 返回列表</button>
          <button class="btn-primary" id="btn-save-char">保存</button>
          ${!isNew ? '<button class="btn-danger" id="btn-del-char">删除角色</button>' : ''}
        </div>

        <!-- 基本信息 -->
        <fieldset class="fieldset">
          <legend>基本信息</legend>
          <div class="form-row">
            <div style="flex:0 0 200px;">
              <label>立绘</label>
              <div id="char-avatar-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div>
            </div>
            <div style="flex:1;">
              <div class="form-group"><label>姓名</label><input type="text" id="char-name" value="${char.name}" style="width:100%;font-size:18px;"></div>
              <div class="form-group"><label>境界</label><select id="char-realm" style="width:100%;">${REALMS.map(r => `<option value="${r}" ${char.realm === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
              <div class="form-group"><label>灵根（可多选）</label><div class="checkbox-group" id="char-roots">${rootsHtml}</div></div>
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
            <div style="flex:1;"><label>暴击率 (%)</label><input type="number" id="adv-critRate" value="${adv.critRate}" step="0.01" style="width:100%;"></div>
            <div style="flex:1;"><label>暴击伤害 (%)</label><input type="number" id="adv-critDmg" value="${adv.critDmg}" step="0.01" style="width:100%;"></div>
          </div>
          <div style="margin-top:12px;"><label style="color:#b8944c;">五行抗性 (%)</label></div>
          <div class="form-row">${elemInputs('抗性', adv.resist)}</div>
          <div style="margin-top:12px;"><label style="color:#b8944c;">五行伤害加成 (%)</label></div>
          <div class="form-row">${elemInputs('伤害加成', adv.dmgBonus)}</div>
        </fieldset>

        <!-- 被动技能 -->
        <fieldset class="fieldset">
          <legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend>
          <div id="skills-container">${skillsHtml || '<div style="color:#6b7a5e;">暂无被动技能</div>'}</div>
        </fieldset>

        <!-- 突破（合并） -->
        <fieldset class="fieldset">
          <legend>突破 <button class="btn-add" id="btn-add-bt">+</button></legend>
          <div id="bt-container">${btHtml || '<div style="color:#6b7a5e;">暂无突破</div>'}</div>
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
      ImageUpload.create(avatarZone, () => {});
    }

    // 保存
    const saveChar = () => {
      const data = self._collectFormData(charId);
      if (!data.name.trim()) { alert('请输入角色姓名'); return; }
      if (!data.id) data.id = Storage.uid();
      Storage.save(STORAGE_KEY, data);
      App.navigate('characters');
    };
    document.getElementById('btn-save-char')?.addEventListener('click', saveChar);
    document.getElementById('btn-save-char2')?.addEventListener('click', saveChar);

    // 删除
    const delChar = () => {
      if (confirm('确定要删除该角色吗？此操作不可恢复。')) {
        Storage.deleteById(STORAGE_KEY, charId);
        App.navigate('characters');
      }
    };
    document.getElementById('btn-del-char')?.addEventListener('click', delChar);
    document.getElementById('btn-del-char2')?.addEventListener('click', delChar);

    // 境界变化更新当前值
    document.getElementById('char-realm')?.addEventListener('change', function () {
      self._updateGrowthDisplay();
    });

    // 基础属性输入更新
    document.querySelectorAll('[data-field^="basic_"]').forEach(input => {
      input.addEventListener('input', () => { self._updateGrowthDisplay(); });
    });

    // 添加被动技能
    document.getElementById('btn-add-skill')?.addEventListener('click', () => {
      const container = document.getElementById('skills-container');
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span>被动技能 #${idx + 1}</span><button class="btn-delete del-skill-btn2">×</button></div>
        <input type="text" data-field="skill_name_${idx}" placeholder="技能名称" style="width:100%;margin-bottom:8px;">
        <textarea data-field="skill_desc_${idx}" placeholder="技能描述" style="width:100%;"></textarea>
      `;
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-skill-btn2').addEventListener('click', () => { div.remove(); self._checkEmpty(container, '暂无被动技能'); });
    });

    // 添加突破
    document.getElementById('btn-add-bt')?.addEventListener('click', () => {
      const container = document.getElementById('bt-container');
      const existing = container.querySelectorAll('.entry-item').length;
      const nextLv = nextBreakLevel(
        Array.from(container.querySelectorAll('.bt-level-title')).map(s => parseInt(s.textContent.replace('LV.','')))
      );
      if (nextLv === 0) { alert('已达上限 LV.100'); return; }
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span class="bt-level-title">LV.${nextLv}</span><button class="btn-delete del-bt-btn2">×</button></div>
        <textarea data-field="bt_${existing}" placeholder="属性加成描述" style="width:100%;"></textarea>
      `;
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-bt-btn2').addEventListener('click', () => { div.remove(); self._checkEmpty(container, '暂无突破'); });
    });

    // 已有删除按钮绑定
    document.querySelectorAll('[data-action="del-skill"]').forEach(btn => {
      btn.addEventListener('click', function () {
        this.closest('.entry-item').remove();
        self._checkEmpty(document.getElementById('skills-container'), '暂无被动技能');
      });
    });
    document.querySelectorAll('[data-action="del-bt"]').forEach(btn => {
      btn.addEventListener('click', function () {
        this.closest('.entry-item').remove();
        self._checkEmpty(document.getElementById('bt-container'), '暂无突破');
      });
    });
  },

  _checkEmpty(container, placeholder) {
    if (container && container.querySelectorAll('.entry-item').length === 0) {
      container.innerHTML = `<div style="color:#6b7a5e;">${placeholder}</div>`;
    }
  },

  // 收集表单数据
  _collectFormData(charId) {
    let data = charId ? Storage.findById(STORAGE_KEY, charId) : createEmptyChar();
    if (!data) data = createEmptyChar();
    if (!data.breakthroughs) data.breakthroughs = [];
    data.id = charId || '';

    data.name = document.getElementById('char-name')?.value || '';
    data.realm = document.getElementById('char-realm')?.value || '练气初期';

    // 灵根
    data.spiritRoots = Array.from(document.querySelectorAll('#char-roots input:checked')).map(cb => cb.value);

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

    ['metal','wood','water','fire','earth'].forEach(ek => {
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
      const nameEl = item.querySelector('input');
      const descEl = item.querySelector('textarea');
      data.passiveSkills.push({ name: nameEl?.value || '', desc: descEl?.value || '' });
    });

    // 突破（合并）
    data.breakthroughs = [];
    document.querySelectorAll('#bt-container .entry-item').forEach(item => {
      const levelSpan = item.querySelector('.bt-level-title');
      const descTa = item.querySelector('textarea');
      if (levelSpan) {
        const lv = parseInt(levelSpan.textContent.replace('LV.', '')) || 0;
        data.breakthroughs.push({ level: lv, desc: descTa?.value || '' });
      }
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
  }
};

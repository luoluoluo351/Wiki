// 法宝图鉴

const TREASURE_STORAGE = 'treasures';

const TREASURE_TYPES = {
  attack: { label: '攻击类', sub: ['剑','枪','斧','针','盾'] },
  defense: { label: '防具类', sub: ['甲','胄','袍'] },
  accessory: { label: '饰品类', sub: ['环','玺','镜','珠','印'] }
};

const TREASURE_GRADES = ['下品法器','中品法器','上品法器','极品法器'];

const ENTRY2_STATS = [
  '生命','攻击','防御',
  '暴击率','暴击伤害',
  '金抗','木抗','水抗','火抗','土抗',
  '金伤加成','木伤加成','水伤加成','火伤加成','土伤加成'
];

function createEmptyTreasure() {
  return {
    id: '',
    name: '',
    image: '',
    type: 'attack',
    subtype: '剑',
    grade: '下品法器',
    entry1: { lv1: 0, lv60: 0 },
    entry2: {
      stat: '攻击',
      lv1: 0,
      lv60: 0
    },
    passiveSkills: []
  };
}

const Treasures = {

  renderList() {
    const list = Storage.list(TREASURE_STORAGE);
    const currentFilter = this._currentFilter || 'all';

    let cards = '';
    const filtered = currentFilter === 'all' ? list : list.filter(t => t.type === currentFilter);
    if (filtered.length === 0) {
      cards = '<div class="placeholder">暂无法宝，点击右上角按钮添加</div>';
    } else {
      cards = '<div class="card-grid">';
      filtered.forEach(t => {
        const imgHtml = t.image
          ? `<img src="${t.image}" alt="${t.name}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;">`
          : `<div style="width:100%;height:180px;background:#0f0f23;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#555;">无法宝图</div>`;
        cards += `
          <div class="card" data-id="${t.id}">
            ${imgHtml}
            <div style="margin-top:8px;font-weight:bold;">${t.name || '未命名'}</div>
            <div style="color:#a0a0a0;font-size:13px;">${t.grade} · ${TREASURE_TYPES[t.type]?.sub.find(s => s === t.subtype) || t.subtype}</div>
          </div>`;
      });
      cards += '</div>';
    }

    const filterBtns = Object.entries(TREASURE_TYPES).map(([k, v]) => {
      const active = currentFilter === k ? 'style="background:#e2b04a;color:#1a1a2e;"' : '';
      return `<button data-filter="${k}" ${active}>${v.label}</button>`;
    }).join('');

    return `
      <div class="toolbar">
        <h2 style="color:#e2b04a;flex:1;">法宝图鉴</h2>
        <div style="display:flex;gap:6px;">
          <button data-filter="all" ${currentFilter === 'all' ? 'style="background:#e2b04a;color:#1a1a2e;"' : ''}>全部</button>
          ${filterBtns}
        </div>
        <button class="btn-primary" id="btn-add-treasure">+ 添加法宝</button>
      </div>
      ${cards}
    `;
  },

  bindListEvents() {
    document.getElementById('btn-add-treasure')?.addEventListener('click', () => {
      location.hash = 'treasures/detail';
    });
    document.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        location.hash = 'treasures/detail?id=' + card.dataset.id;
      });
    });
    // 筛选按钮
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentFilter = btn.dataset.filter;
        App.navigate('treasures');
      });
    });
  },

  _currentFilter: 'all',

  // === 详情页 ===
  renderDetail(id) {
    const treasure = id ? Storage.findById(TREASURE_STORAGE, id) : createEmptyTreasure();
    if (id && !treasure) return '<div class="placeholder">法宝不存在</div>';
    const isNew = !id;

    // 类型决定子类型列表
    const subOptions = TREASURE_TYPES[treasure.type]?.sub || [];

    // 词条1（仅攻击类和防具类）
    const hasEntry1 = treasure.type === 'attack' || treasure.type === 'defense';
    const entry1Label = treasure.type === 'attack' ? '基础攻击力' : '基础生命值';

    // 词条2
    const e2 = treasure.entry2;

    // 被动技能
    let skillsHtml = '';
    treasure.passiveSkills.forEach((sk, i) => {
      skillsHtml += `
        <div class="entry-item">
          <div class="entry-header">
            <span>被动技能 #${i + 1}</span>
            <button class="btn-delete" data-action="del-skill" data-idx="${i}">×</button>
          </div>
          <div style="margin-bottom:8px;"><input type="text" value="${sk.name || ''}" data-field="tskill_name_${i}" placeholder="技能名称" style="width:100%;"></div>
          <div><textarea data-field="tskill_desc_${i}" placeholder="技能描述">${sk.desc || ''}</textarea></div>
        </div>`;
    });

    return `
      <div class="detail-page" data-treasure-id="${treasure.id || ''}" data-is-new="${isNew}">
        <div class="toolbar">
          <button class="btn-primary" id="btn-back-list">← 返回列表</button>
          <button class="btn-primary" id="btn-save">保存</button>
          ${!isNew ? '<button class="btn-danger" id="btn-del">删除法宝</button>' : ''}
        </div>

        <!-- 基本信息 -->
        <fieldset class="fieldset">
          <legend>基本信息</legend>
          <div class="form-row">
            <div style="flex:0 0 200px;">
              <label>法宝图片</label>
              <div id="treasure-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div>
            </div>
            <div style="flex:1;">
              <div class="form-group"><label>名称</label><input type="text" id="treasure-name" value="${treasure.name}" style="width:100%;font-size:18px;"></div>
              <div class="form-row">
                <div style="flex:1;"><label>类型</label><select id="treasure-type">${Object.entries(TREASURE_TYPES).map(([k,v]) => `<option value="${k}" ${treasure.type === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
                <div style="flex:1;"><label>子类型</label><select id="treasure-subtype">${subOptions.map(s => `<option value="${s}" ${treasure.subtype === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                <div style="flex:1;"><label>品阶</label><select id="treasure-grade">${TREASURE_GRADES.map(g => `<option value="${g}" ${treasure.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- 词条1 -->
        <fieldset class="fieldset" id="entry1-section" ${hasEntry1 ? '' : 'style="display:none;"'}>
          <legend>词条1 — ${entry1Label}（1级→60级，线性成长）</legend>
          <div class="form-row">
            <div style="flex:1;"><label>1级值</label><input type="number" id="entry1-lv1" value="${treasure.entry1.lv1}"></div>
            <div style="flex:1;"><label>60级值</label><input type="number" id="entry1-lv60" value="${treasure.entry1.lv60}"></div>
            <div style="flex:1;"><label>每级成长</label><span id="entry1-growth">${((treasure.entry1.lv60 - treasure.entry1.lv1) / 59).toFixed(2)}</span></div>
          </div>
        </fieldset>

        <!-- 词条2 -->
        <fieldset class="fieldset">
          <legend>词条2 — 可选属性（1级→60级，线性成长，百分比值）</legend>
          <div class="form-row">
            <div style="flex:1;"><label>属性</label><select id="entry2-stat">${ENTRY2_STATS.map(s => `<option value="${s}" ${e2.stat === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div style="flex:1;"><label>1级值 (%)</label><input type="number" id="entry2-lv1" value="${e2.lv1}" step="0.01"></div>
            <div style="flex:1;"><label>60级值 (%)</label><input type="number" id="entry2-lv60" value="${e2.lv60}" step="0.01"></div>
            <div style="flex:1;"><label>每级成长</label><span id="entry2-growth">${((e2.lv60 - e2.lv1) / 59).toFixed(2)}</span></div>
          </div>
        </fieldset>

        <!-- 被动技能 -->
        <fieldset class="fieldset">
          <legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend>
          <div id="skills-container">${skillsHtml || '<div style="color:#a0a0a0;">暂无被动技能</div>'}</div>
        </fieldset>

        <div class="toolbar" style="margin-top:20px;">
          <button class="btn-primary" id="btn-save2">保存</button>
          ${!isNew ? '<button class="btn-danger" id="btn-del2">删除法宝</button>' : ''}
        </div>
      </div>
    `;
  },

  bindDetailEvents() {
    const self = this;
    const el = document.querySelector('.detail-page');
    if (!el) return;
    const treasureId = el.dataset.treasureId;
    const isNew = el.dataset.isNew === 'true';

    // 立绘预览
    const imgZone = document.getElementById('treasure-img-zone');
    if (imgZone) {
      let current = treasureId ? Storage.findById(TREASURE_STORAGE, treasureId) : null;
      if (current?.image) ImageUpload.setPreview(imgZone, current.image);
      ImageUpload.create(imgZone, () => {});
    }

    // 返回
    document.getElementById('btn-back-list')?.addEventListener('click', () => { location.hash = 'treasures'; });

    // 保存
    const save = () => {
      const data = self._collectForm(treasureId);
      if (!data.name.trim()) { alert('请输入法宝名称'); return; }
      if (!data.id) data.id = Storage.uid();
      Storage.save(TREASURE_STORAGE, data);
      location.hash = 'treasures';
    };
    document.getElementById('btn-save')?.addEventListener('click', save);
    document.getElementById('btn-save2')?.addEventListener('click', save);

    // 删除
    const del = () => {
      if (confirm('确定要删除该法宝吗？')) { Storage.deleteById(TREASURE_STORAGE, treasureId); location.hash = 'treasures'; }
    };
    document.getElementById('btn-del')?.addEventListener('click', del);
    document.getElementById('btn-del2')?.addEventListener('click', del);

    // 类型切换 → 更新子类型 + 词条1显示
    document.getElementById('treasure-type')?.addEventListener('change', function () {
      const newType = this.value;
      const sub = TREASURE_TYPES[newType]?.sub || [];
      const subSelect = document.getElementById('treasure-subtype');
      if (subSelect) subSelect.innerHTML = sub.map(s => `<option>${s}</option>`).join('');
      // 词条1
      const e1Section = document.getElementById('entry1-section');
      const needEntry1 = (newType === 'attack' || newType === 'defense');
      if (e1Section) e1Section.style.display = needEntry1 ? '' : 'none';
      const labelEl = document.querySelector('#entry1-section legend');
      if (labelEl) labelEl.innerHTML = `词条1 — ${newType === 'attack' ? '基础攻击力' : '基础生命值'}（1级→60级，线性成长）`;
    });

    // 词条成长计算
    function updateGrowth() {
      const e1lv1 = parseFloat(document.getElementById('entry1-lv1')?.value) || 0;
      const e1lv60 = parseFloat(document.getElementById('entry1-lv60')?.value) || 0;
      const e2lv1 = parseFloat(document.getElementById('entry2-lv1')?.value) || 0;
      const e2lv60 = parseFloat(document.getElementById('entry2-lv60')?.value) || 0;
      const g1 = document.getElementById('entry1-growth');
      const g2 = document.getElementById('entry2-growth');
      if (g1) g1.textContent = ((e1lv60 - e1lv1) / 59).toFixed(2);
      if (g2) g2.textContent = ((e2lv60 - e2lv1) / 59).toFixed(2);
    }
    ['entry1-lv1','entry1-lv60','entry2-lv1','entry2-lv60'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateGrowth);
    });

    // 被动技能
    document.getElementById('btn-add-skill')?.addEventListener('click', () => {
      const container = document.getElementById('skills-container');
      const idx = container.querySelectorAll('.entry-item').length;
      const div = document.createElement('div');
      div.className = 'entry-item';
      div.innerHTML = `
        <div class="entry-header"><span>被动技能 #${idx + 1}</span><button class="btn-delete del-skill-btn2">×</button></div>
        <div style="margin-bottom:8px;"><input type="text" data-field="tskill_name_${idx}" placeholder="技能名称" style="width:100%;"></div>
        <div><textarea data-field="tskill_desc_${idx}" placeholder="技能描述"></textarea></div>
      `;
      const empty = container.querySelector(':scope > div:not(.entry-item)');
      if (empty) empty.remove();
      container.appendChild(div);
      div.querySelector('.del-skill-btn2').addEventListener('click', () => { div.remove(); if (container.children.length === 0) container.innerHTML = '<div style="color:#a0a0a0;">暂无被动技能</div>'; });
      self._reindexSkills(container);
    });

    document.querySelectorAll('[data-action="del-skill"]').forEach(btn => {
      btn.addEventListener('click', function () {
        this.closest('.entry-item').remove();
        const c = document.getElementById('skills-container');
        if (c.children.length === 0) c.innerHTML = '<div style="color:#a0a0a0;">暂无被动技能</div>';
        self._reindexSkills(c);
      });
    });
  },

  _collectForm(treasureId) {
    let data = treasureId ? Storage.findById(TREASURE_STORAGE, treasureId) : createEmptyTreasure();
    if (!data) data = createEmptyTreasure();
    data.id = treasureId || '';
    data.name = document.getElementById('treasure-name')?.value || '';
    data.type = document.getElementById('treasure-type')?.value || 'attack';
    data.subtype = document.getElementById('treasure-subtype')?.value || '剑';
    data.grade = document.getElementById('treasure-grade')?.value || '下品法器';
    data.entry1 = {
      lv1: parseFloat(document.getElementById('entry1-lv1')?.value) || 0,
      lv60: parseFloat(document.getElementById('entry1-lv60')?.value) || 0
    };
    data.entry2 = {
      stat: document.getElementById('entry2-stat')?.value || '攻击',
      lv1: parseFloat(document.getElementById('entry2-lv1')?.value) || 0,
      lv60: parseFloat(document.getElementById('entry2-lv60')?.value) || 0
    };
    // Image
    const img = document.querySelector('#treasure-img-zone img');
    data.image = img ? img.src : '';

    // Skills
    data.passiveSkills = [];
    document.querySelectorAll('#skills-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input[type="text"]');
      const descEl = item.querySelector('textarea');
      data.passiveSkills.push({ name: nameEl?.value || '', desc: descEl?.value || '' });
    });
    return data;
  },

  _reindexSkills(container) {
    container.querySelectorAll('.entry-item').forEach((item, i) => {
      const span = item.querySelector('.entry-header span');
      if (span) span.textContent = `被动技能 #${i + 1}`;
    });
  }
};

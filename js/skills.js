// 功法与神通

const SKILL_GONGFA = 'skills_gongfa';
const SKILL_SHENTONG = 'skills_shentong';

const SKILL_GRADES = ['人阶下','人阶中','人阶上'];

function createEmptySkill() {
  return {
    id: '',
    name: '',
    image: '',
    element: '金',
    grade: '人阶下',
    desc: '',
    cd: ''  // 仅神通使用
  };
}

const Skills = {

  _currentTab: 'gongfa',  // 'gongfa' | 'shentong'

  renderList() {
    const key = this._currentTab === 'gongfa' ? SKILL_GONGFA : SKILL_SHENTONG;
    const list = Storage.list(key);
    const label = this._currentTab === 'gongfa' ? '功法' : '神通';

    let rows = '';
    if (list.length === 0) {
      rows = `<div class="placeholder">暂无${label}，点击右上角按钮添加</div>`;
    } else {
      rows = '<div class="row-list">';
      list.forEach(s => {
        const imgHtml = s.image
          ? `<img src="${s.image}" alt="${s.name}">`
          : `<div style="width:40px;height:40px;background:#eef5e6;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#95a385;font-size:10px;">无图</div>`;
        const elTag = `<span class="tag tag-${s.element==='金'?'gold':s.element==='木'?'wood':s.element==='水'?'water':s.element==='火'?'fire':'earth'}">${s.element}</span>`;
        rows += `
          <div class="row-item" onclick="App.navigate('skills/detail?id=${s.id}&type=${Skills._currentTab}')">
            ${imgHtml}
            <span style="font-weight:bold;flex:1;">${s.name || '未命名'}</span>
            ${elTag}
            <span style="color:#6b7a5e;">${s.grade}</span>
          </div>`;
      });
      rows += '</div>';
    }

    const gongfaActive = this._currentTab === 'gongfa' ? 'active' : '';
    const shentongActive = this._currentTab === 'shentong' ? 'active' : '';

    return `
      <div class="toolbar">
        <h2 style="color:#b8944c;flex:1;">功法与神通</h2>
        <div style="display:flex;gap:6px;">
          <button class="tab-btn ${gongfaActive}" data-tab="gongfa" style="background:${this._currentTab==='gongfa'?'#b8944c':'#d4c8b0'};color:${this._currentTab==='gongfa'?'#f5f0e6':'#3d3226'};border-radius:6px 0 0 6px;">功法</button>
          <button class="tab-btn ${shentongActive}" data-tab="shentong" style="background:${this._currentTab==='shentong'?'#b8944c':'#d4c8b0'};color:${this._currentTab==='shentong'?'#f5f0e6':'#3d3226'};border-radius:0 6px 6px 0;">神通</button>
        </div>
        <button class="btn-primary" onclick="App.navigate('skills/detail?type=' + Skills._currentTab)">+ 添加${label}</button>
      </div>
      ${rows}
    `;
  },

  bindListEvents() {
    const self = this;
    // Tab 切换按钮（需要先切换 _currentTab 再导航）
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        self._currentTab = btn.dataset.tab;
        App.navigate('skills');
      });
    });
  },

  // === 详情页 ===
  renderDetail(id, type) {
    const storageKey = type === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
    const skill = id ? Storage.findById(storageKey, id) : createEmptySkill();
    if (id && !skill) return '<div class="placeholder">不存在</div>';
    const isNew = !id;
    const label = type === 'shentong' ? '神通' : '功法';
    const isShentong = type === 'shentong';

    return `
      <div class="detail-page" data-skill-id="${skill.id||''}" data-skill-type="${type}" data-is-new="${isNew}">
        <div class="toolbar">
          <button class="btn-primary" onclick="App.navigate('skills')">← 返回列表</button>
          <button class="btn-primary" id="btn-save">保存</button>
          ${!isNew?'<button class="btn-danger" id="btn-del">删除</button>':''}
        </div>

        <fieldset class="fieldset"><legend>基本信息</legend>
          <div class="form-row">
            <div style="flex:0 0 200px;"><label>图片</label><div id="skill-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div>
            <div style="flex:1;">
              <div class="form-group"><label>名称</label><input type="text" id="skill-name" value="${skill.name}" style="width:100%;font-size:18px;"></div>
              <div class="form-row">
                <div style="flex:1;"><label>五行属性</label><select id="skill-element">${ELEMENTS.map(e=>`<option value="${e}" ${skill.element===e?'selected':''}>${e}</option>`).join('')}</select></div>
                <div style="flex:1;"><label>等阶</label><select id="skill-grade">${SKILL_GRADES.map(g=>`<option value="${g}" ${skill.grade===g?'selected':''}>${g}</option>`).join('')}</select></div>
                ${isShentong?`<div style="flex:1;"><label>冷却时间(CD)</label><input type="text" id="skill-cd" value="${skill.cd||''}" placeholder="如：3回合"></div>`:''}
              </div>
              <div class="form-group"><label>详细描述</label><textarea id="skill-desc" style="width:100%;min-height:120px;">${skill.desc||''}</textarea></div>
            </div>
          </div>
        </fieldset>

        <div class="toolbar" style="margin-top:20px;">
          <button class="btn-primary" id="btn-save2">保存</button>
          ${!isNew?'<button class="btn-danger" id="btn-del2">删除</button>':''}
        </div>
      </div>
    `;
  },

  bindDetailEvents() {
    const self = this;
    const el = document.querySelector('.detail-page');
    if (!el) return;
    const skillId = el.dataset.skillId;
    const skillType = el.dataset.skillType;
    const isNew = el.dataset.isNew === 'true';

    const imgZone = document.getElementById('skill-img-zone');
    if (imgZone) {
      const storageKey = skillType === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
      let cur = skillId ? Storage.findById(storageKey, skillId) : null;
      if (cur?.image) ImageUpload.setPreview(imgZone, cur.image);
      ImageUpload.create(imgZone, () => {});
    }

    // Back button uses inline onclick

    const save = () => {
      const data = self._collect(skillId, skillType);
      if (!data.name.trim()) { alert('请输入名称'); return; }
      if (!data.id) data.id = Storage.uid();
      const storageKey = skillType === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
      Storage.save(storageKey, data);
      // 恢复当前 tab
      this._currentTab = skillType;
      App.navigate('skills');
    };
    document.getElementById('btn-save')?.addEventListener('click', save);
    document.getElementById('btn-save2')?.addEventListener('click', save);

    const del = () => {
      if (confirm('确定删除？')) {
        const storageKey = skillType === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
        Storage.deleteById(storageKey, skillId);
        this._currentTab = skillType;
        App.navigate('skills');
      }
    };
    document.getElementById('btn-del')?.addEventListener('click', del);
    document.getElementById('btn-del2')?.addEventListener('click', del);
  },

  _collect(skillId, type) {
    let data = { id: skillId || '' };
    data.name = document.getElementById('skill-name')?.value || '';
    data.element = document.getElementById('skill-element')?.value || '金';
    data.grade = document.getElementById('skill-grade')?.value || '人阶下';
    data.desc = document.getElementById('skill-desc')?.value || '';
    data.image = document.querySelector('#skill-img-zone img')?.src || '';
    if (type === 'shentong') {
      data.cd = document.getElementById('skill-cd')?.value || '';
    } else {
      data.cd = '';
    }
    return data;
  }
};

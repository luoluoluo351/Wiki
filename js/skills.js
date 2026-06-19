// 功法与神通

const SKILL_GONGFA = 'skills_gongfa';
const SKILL_SHENTONG = 'skills_shentong';
const SKILL_GRADES = ['人阶下','人阶中','人阶上'];
const SKILL_TYPES = ['攻击','防御','增益','辅助'];

function createEmptySkill() {
  return { id: '', name: '', image: '', elements: [], grade: '人阶下', type: '攻击', desc: '', cd: '', combat: 0, lingli: 0 };
}

const Skills = {

  _currentTab: 'gongfa',

  renderList() {
    const key = this._currentTab === 'gongfa' ? SKILL_GONGFA : SKILL_SHENTONG;
    const list = Storage.list(key);
    const label = this._currentTab === 'gongfa' ? '功法' : '神通';

    let rows = '';
    if (list.length === 0) {
      rows = `<div class="placeholder">暂无${label}，点击右上角按钮添加</div>`;
    } else {
      rows = `<div class="row-list">
      <div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:155px;">名称</span>
        <span class="row-h-col" style="width:90px;">五行</span>
        <span class="row-h-col" style="width:75px;">等阶</span>
        <span class="row-h-col" style="width:60px;">类型</span>
        ${this._currentTab==='shentong'?'<span class="row-h-col" style="width:100px;">消耗灵力</span>':''}
        <span class="row-h-col" style="width:50px;">战力</span>
      </div>`;
      list.forEach(s => {
        const sSrc=(s.image||'').startsWith('data:')?s.image:(s.image?'img/skills/'+s.image:'');const imgHtml=sSrc?`<img src="${sSrc}" alt="${s.name}">`:'<div class="row-noimg">无图</div>';
        const els = Array.isArray(s.elements) ? s.elements : (s.element ? [s.element] : []);
        const elTag = els.map(e => `<span class="tag tag-${e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth'}">${e}</span>`).join('');
        // 详情弹窗 — 不显示"描述"标签
        const detailArr = [{ name: '', desc: s.desc || '(无描述)' }];
        if (s.cd) detailArr.push({ name: '冷却时间', desc: s.cd + '秒' });
        const detailEsc = JSON.stringify(detailArr).replace(/'/g,'&#39;');
        rows += `
          <div class="row-item">
            ${imgHtml}
            <span class="row-name" style="width:155px;">${s.name || '未命名'}</span>
            <span class="row-tags" style="width:90px;justify-content:center;">${elTag}</span>
            <span style="color:var(--text-dim);width:75px;font-size:13px;text-align:center;white-space:nowrap;">${s.grade}</span>
            <span style="color:var(--text-dim);width:60px;font-size:13px;text-align:center;white-space:nowrap;">${s.type||'攻击'}类</span>
            ${Skills._currentTab==='shentong'?`<span style="color:var(--text-dim);width:100px;font-size:13px;text-align:center;white-space:nowrap;">消耗${s.lingli||0}</span>`:''}
            <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${s.combat||0}</span>
            <span class="row-actions">
              <button class="row-icon-btn" onclick="App.navigate('skills/detail?id=${s.id}&type=${Skills._currentTab}')" title="编辑">✎</button>
              <button class="row-icon-btn" data-detail='${detailEsc}' onclick="event.stopPropagation();showAbilityModal('${s.name||'功法'} 详情',JSON.parse(this.dataset.detail))" title="查看详情">👁</button>
            </span>
          </div>`;
      });
      rows += '</div>';
    }

    return `
      <div class="toolbar">
        <h2 style="color:var(--gold);flex:1;">功法与神通</h2>
        <div style="display:flex;gap:6px;">
          <button class="tab-btn" data-tab="gongfa" style="background:${this._currentTab==='gongfa'?'var(--gold)':'var(--border)'};color:${this._currentTab==='gongfa'?'#fff':'var(--text)'};border-radius:6px 0 0 6px;">功法</button>
          <button class="tab-btn" data-tab="shentong" style="background:${this._currentTab==='shentong'?'var(--gold)':'var(--border)'};color:${this._currentTab==='shentong'?'#fff':'var(--text)'};border-radius:0 6px 6px 0;">神通</button>
        </div>
        <button class="btn-primary" onclick="App.navigate('skills/detail?type=' + Skills._currentTab)">+ 添加${label}</button>
      </div>
      ${rows}
    `;
  },

  bindListEvents() {
    const self = this;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { self._currentTab = btn.dataset.tab; App.navigate('skills'); });
    });
  },

  renderDetail(id, type) {
    const storageKey = type === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
    const skill = id ? Storage.findById(storageKey, id) : createEmptySkill();
    if (id && !skill) return '<div class="placeholder">不存在</div>';
    const isNew = !id;
    const isShentong = type === 'shentong';
    const els = Array.isArray(skill.elements) ? skill.elements : (skill.element ? [skill.element] : []);

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
                <div style="flex:1;"><label>五行属性（可多选，最多3个）</label><div class="checkbox-group" id="skill-elements">${ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${els.includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('')}</div></div>
                <div style="flex:1;"><label>等阶</label><select id="skill-grade">${SKILL_GRADES.map(g=>`<option value="${g}" ${skill.grade===g?'selected':''}>${g}</option>`).join('')}</select></div>
              </div>
              <div class="form-row">
                <div style="flex:1;"><label>类型</label><select id="skill-type">${SKILL_TYPES.map(t=>`<option value="${t}" ${(skill.type||'攻击')===t?'selected':''}>${t}</option>`).join('')}</select></div>
                ${isShentong?`<div style="flex:1;"><label>冷却时间(CD)</label><input type="text" id="skill-cd" value="${skill.cd||''}" placeholder="如：30秒"></div>`:''}
                <div style="flex:1;"><label>战力</label><input type="number" id="skill-combat" value="${skill.combat||0}"></div>
              </div>
              ${isShentong?`<div class="form-row"><div style="flex:1;"><label>消耗灵力</label><input type="number" id="skill-lingli" value="${skill.lingli||0}"></div><div style="flex:1;"></div></div>`:''}
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
    const el = document.querySelector('.detail-page'); if (!el) return;
    const skillId = el.dataset.skillId; const skillType = el.dataset.skillType;

    const imgZone = document.getElementById('skill-img-zone');
    if (imgZone) {
      const storageKey = skillType === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
      let cur = skillId ? Storage.findById(storageKey, skillId) : null;
      ImageUpload.setup(imgZone, cur?.image||'', (v)=>{}, 'skills/');
    }

    const save = () => {
      const data = this._collect(skillId, skillType);
      if (!data.name.trim()) { alert('请输入名称'); return; }
      if (!data.id) data.id = Storage.uid();
      const storageKey = skillType === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
      if (!Storage.save(storageKey, data)) { alert('保存失败，数据过大，请压缩图片后重试'); return; }
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
    const storageKey = type === 'shentong' ? SKILL_SHENTONG : SKILL_GONGFA;
    let data = skillId ? (Storage.findById(storageKey, skillId) || createEmptySkill()) : createEmptySkill();
    data.id = skillId || '';
    data.name = document.getElementById('skill-name')?.value || '';
    data.elements = Array.from(document.querySelectorAll('#skill-elements input:checked')).map(cb => cb.value);
    data.grade = document.getElementById('skill-grade')?.value || '人阶下';
    data.type = document.getElementById('skill-type')?.value || '攻击';
    data.desc = document.getElementById('skill-desc')?.value || '';
    data.image = document.querySelector('#skill-img-zone .img-filename-input')?.value?.trim() || '';
    data.cd = type === 'shentong' ? (document.getElementById('skill-cd')?.value || '') : '';
    data.combat = parseInt(document.getElementById('skill-combat')?.value) || 0;
    if (type === 'shentong') {
      data.lingli = parseInt(document.getElementById('skill-lingli')?.value) || 0;
    }
    return data;
  }
};

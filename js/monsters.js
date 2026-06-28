// 怪物图鉴

const MONSTER_STORAGE = 'monsters';

const MONSTER_ELEMENTS = ['金','木','水','火','土','光','暗'];
const MONSTER_EL_MAP = { '金':'metal', '木':'wood', '水':'water', '火':'fire', '土':'earth', '光':'light', '暗':'dark' };
const MONSTER_SKILL_GRADES = ['人阶下','人阶中','人阶上','未知'];
const MONSTER_TREASURE_GRADES = ['下品法器','中品法器','上品法器','极品法器','未知'];

function createEmptyMonster() {
  return {
    id: '', name: '', image: '', fullBody: '',
    realm: '练气初期',
    spiritRoots: [],
    hp: 0, atk: 0, def: 0,
    critRate: 0, critDmg: 0,
    resist: { metal:0, wood:0, water:0, fire:0, earth:0, light:0, dark:0 },
    dmgBonus: { metal:0, wood:0, water:0, fire:0, earth:0, light:0, dark:0 },
    gongfa: [],
    shentong: [],
    treasures: []
  };
}

function calcMonsterCombat(m) {
  let pts = 0;
  pts += (m.hp || 0) / 10 + (m.atk || 0) / 2 + (m.def || 0) / 1.5;
  pts += ((m.critRate || 0) / 100) * (((m.critDmg || 0) - 100) / 100) * 100;
  ['metal','wood','water','fire','earth','light','dark'].forEach(k => {
    pts += (m.resist?.[k] || 0) / 0.8 + (m.dmgBonus?.[k] || 0) / 0.8;
  });
  return Math.round(pts);
}

// 元素标签 CSS class 映射
function monsterElTag(el) {
  const m = { '金':'gold', '木':'wood', '水':'water', '火':'fire', '土':'earth', '光':'light', '暗':'dark' };
  return m[el] || 'earth';
}

const Monsters = {

  renderList() {
    const list = Storage.list(MONSTER_STORAGE);
    let rows = '';
    if (list.length === 0) {
      rows = '<div class="placeholder">暂无怪物，点击右上角按钮添加</div>';
    } else {
      rows = `<div class="row-list"><div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:85px;">名称</span>
        <span class="row-h-col" style="width:65px;">修为</span>
        <span class="row-h-col" style="width:60px;">五行</span>
        <span class="row-h-col" style="width:50px;">生命</span>
        <span class="row-h-col" style="width:50px;">攻击</span>
        <span class="row-h-col" style="width:50px;">防御</span>
        <span class="row-h-col" style="width:50px;">战力</span>
        <span class="row-h-col" style="width:100px;"></span>
      </div>`;
      list.forEach(m => {
        const mSrc = (m.image || '').startsWith('data:') ? m.image : (m.image ? 'img/monsters/' + m.image : '');
        const imgHtml = mSrc ? `<img src="${mSrc}" alt="${m.name}" class="thumb-clickable" style="cursor:pointer;">` : '<div class="row-noimg">无图</div>';
        const tags = (m.spiritRoots || []).map(e => `<span class="tag tag-${monsterElTag(e)}">${e}</span>`).join('');
        const cp = calcMonsterCombat(m);
        const gongfaEsc = JSON.stringify(m.gongfa || []).replace(/'/g, '&#39;');
        const shentongEsc = JSON.stringify(m.shentong || []).replace(/'/g, '&#39;');
        const treasuresEsc = JSON.stringify(m.treasures || []).replace(/'/g, '&#39;');
        const nameEsc = (m.name || '怪物').replace(/'/g, "\\'");
        rows += `<div class="row-item">
          ${imgHtml}
          <span class="row-name" style="width:85px;">${m.name || '未命名'}</span>
          <span style="color:var(--text-dim);width:65px;font-size:13px;text-align:center;white-space:nowrap;">${m.realm==='未知'?'未知':majorName(m.realm)+'期'}</span>
          <span class="row-tags" style="width:60px;justify-content:center;">${tags}</span>
          <span class="row-stat" style="width:50px;">${fmtNum(m.hp || 0)}</span>
          <span class="row-stat" style="width:50px;">${fmtNum(m.atk || 0)}</span>
          <span class="row-stat" style="width:50px;">${fmtNum(m.def || 0)}</span>
          <span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">${fmtNum(cp)}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('monsters/detail?id=${m.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" data-gongfa='${gongfaEsc}' data-shentong='${shentongEsc}' data-treasures='${treasuresEsc}' onclick="event.stopPropagation();Monsters.showSkillsModal('${nameEsc} 详情',JSON.parse(this.dataset.gongfa),JSON.parse(this.dataset.shentong),JSON.parse(this.dataset.treasures))" title="查看能力">👁</button>
            <button class="row-icon-btn" onclick="event.stopPropagation();if(confirm('确定删除「${m.name||'未命名'}」？')){Storage.deleteById('monsters','${m.id}');App.navigate('monsters');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">怪物图鉴</h2><button class="btn-primary" onclick="App.navigate('monsters/detail')">+ 添加怪物</button></div>${rows}`;
  },

  // 查看怪物技能弹窗（功法+神通+法宝）
  showSkillsModal(title, gongfa, shentong, treasures) {
    let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
    function renderSection(label, list, showGrade, showElements, showCD, showType) {
      if (!list || list.length === 0) return '';
      let h = `<div style="color:var(--gold);font-weight:bold;font-size:16px;margin-bottom:4px;">${label}</div>`;
      list.forEach(s => {
        let meta = [];
        if (showGrade && s.grade) meta.push(s.grade);
        if (showType) {
          if (s.type) meta.push(s.type + (s.subtype ? '·' + s.subtype : ''));
        }
        if (showElements && s.elements && s.elements.length > 0) meta.push(s.elements.join(' '));
        if (showCD) {
          if (s.cd) meta.push('CD:' + s.cd);
          if (s.lingli) meta.push('灵力:' + s.lingli);
        }
        h += `<div class="entry-item" style="margin-bottom:6px;">
          <div style="font-weight:bold;margin-bottom:2px;">${s.name || ''}</div>
          ${meta.length > 0 ? `<div style="color:var(--text-light);font-size:11px;margin-bottom:4px;">${meta.join(' | ')}</div>` : ''}
          <div style="color:var(--text-dim);font-size:14px;white-space:pre-line;">${s.desc || ''}</div>
        </div>`;
      });
      return h;
    }
    html += renderSection('功法', gongfa, true, true, false, false);
    html += renderSection('神通', shentong, true, true, true, false);
    html += renderSection('法宝', treasures, true, true, false, true);
    html += '</div>';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('skill-modal').style.display = 'flex';
  },

  renderDetail(id) {
    const m = id ? Storage.findById(MONSTER_STORAGE, id) : createEmptyMonster();
    if (id && !m) return '<div class="placeholder">怪物不存在</div>';
    const isNew = !id;

    // 灵根复选框（7元素）
    const rootsHtml = MONSTER_ELEMENTS.map(e =>
      `<label><input type="checkbox" value="${e}" ${(m.spiritRoots||[]).includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`
    ).join('');

    // 7元素抗性输入
    const resistHtml = MONSTER_ELEMENTS.map(e => {
      const k = MONSTER_EL_MAP[e];
      return `<div style="margin-top:4px;"><label>${e}抗性(%)</label><input type="number" value="${(m.resist||{})[k]||0}" data-field="res_${k}" step="0.01"></div>`;
    }).join('');

    // 7元素增伤输入
    const dmgHtml = MONSTER_ELEMENTS.map(e => {
      const k = MONSTER_EL_MAP[e];
      return `<div style="margin-top:4px;"><label>${e}伤害加成(%)</label><input type="number" value="${(m.dmgBonus||{})[k]||0}" data-field="dmg_${k}" step="0.01"></div>`;
    }).join('');

    // 功法条目渲染
    function renderGongfaEntries(gongfa) {
      let h = '';
      (gongfa || []).forEach((g, i) => {
        const gradeOpts = MONSTER_SKILL_GRADES.map(gr => `<option value="${gr}" ${g.grade===gr?'selected':''}>${gr}</option>`).join('');
        const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${(g.elements||[]).includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
        h += `<div class="entry-item">
          <div class="entry-header"><span>功法 #${i+1}</span><button class="btn-delete monster-gongfa-del">×</button></div>
          <div class="form-row" style="margin-bottom:8px;">
            <div style="flex:0.6;"><label>名称</label><input type="text" value="${g.name||''}" data-field="gongfa_name_${i}" placeholder="功法名称"></div>
            <div style="flex:0.4;"><label>等阶</label><select data-field="gongfa_grade_${i}">${gradeOpts}</select></div>
          </div>
          <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
          <label>描述</label><textarea data-field="gongfa_desc_${i}" placeholder="功法描述">${g.desc||''}</textarea>
        </div>`;
      });
      return h || '<div class="empty-hint">暂无功法</div>';
    }

    // 神通条目渲染
    function renderShentongEntries(shentong) {
      let h = '';
      (shentong || []).forEach((s, i) => {
        const gradeOpts = MONSTER_SKILL_GRADES.map(gr => `<option value="${gr}" ${s.grade===gr?'selected':''}>${gr}</option>`).join('');
        const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${(s.elements||[]).includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
        h += `<div class="entry-item">
          <div class="entry-header"><span>神通 #${i+1}</span><button class="btn-delete monster-shentong-del">×</button></div>
          <div class="form-row" style="margin-bottom:8px;">
            <div style="flex:0.6;"><label>名称</label><input type="text" value="${s.name||''}" data-field="shentong_name_${i}" placeholder="神通名称"></div>
            <div style="flex:0.4;"><label>等阶</label><select data-field="shentong_grade_${i}">${gradeOpts}</select></div>
          </div>
          <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
          <div class="form-row" style="margin-bottom:8px;">
            <div style="flex:1;"><label>冷却时间(CD)</label><input type="text" value="${s.cd||''}" data-field="shentong_cd_${i}" placeholder="如：30秒"></div>
            <div style="flex:1;"><label>消耗灵力</label><input type="number" value="${s.lingli||0}" data-field="shentong_lingli_${i}"></div>
          </div>
          <label>描述</label><textarea data-field="shentong_desc_${i}" placeholder="神通描述">${s.desc||''}</textarea>
        </div>`;
      });
      return h || '<div class="empty-hint">暂无神通</div>';
    }

    // 法宝条目渲染
    function renderTreasureEntries(treasures) {
      let h = '';
      (treasures || []).forEach((t, i) => {
        const gradeOpts = MONSTER_TREASURE_GRADES.map(gr => `<option value="${gr}" ${t.grade===gr?'selected':''}>${gr}</option>`).join('');
        const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" ${(t.elements||[]).includes(e)?'checked':''} onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
        const typeOpts = Object.entries(TREASURE_TYPES).map(([k,v]) => `<option value="${k}" ${t.type===k?'selected':''}>${v.label}</option>`).join('');
        const curType = t.type || 'attack';
        const subTypes = TREASURE_TYPES[curType]?.sub || TREASURE_TYPES['attack'].sub;
        const subOpts = subTypes.map(s => `<option value="${s}" ${t.subtype===s?'selected':''}>${s}</option>`).join('');
        h += `<div class="entry-item">
          <div class="entry-header"><span>法宝 #${i+1}</span><button class="btn-delete monster-treasure-del">×</button></div>
          <div class="form-row" style="margin-bottom:8px;">
            <div style="flex:0.6;"><label>名称</label><input type="text" value="${t.name||''}" data-field="treasure_name_${i}" placeholder="法宝名称"></div>
            <div style="flex:0.4;"><label>等阶</label><select data-field="treasure_grade_${i}">${gradeOpts}</select></div>
          </div>
          <div class="form-row" style="margin-bottom:8px;">
            <div style="flex:0.5;"><label>类型</label><select data-field="treasure_type_${i}" onchange="const v=this.value;const sub=TREASURE_TYPES[v]?.sub||[];const sel=this.closest('.entry-item').querySelector('[data-field^=\\'treasure_subtype_\\']');if(sel){sel.innerHTML=sub.map(s=>'<option>'+s+'</option>').join('');}">${typeOpts}</select></div>
            <div style="flex:0.5;"><label>子类型</label><select data-field="treasure_subtype_${i}">${subOpts}</select></div>
          </div>
          <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
          <label>描述</label><textarea data-field="treasure_desc_${i}" placeholder="法宝描述">${t.desc||''}</textarea>
        </div>`;
      });
      return h || '<div class="empty-hint">暂无法宝</div>';
    }

    const cp = calcMonsterCombat(m);

    return `<div class="detail-page" data-monster-id="${m.id||''}" data-is-new="${isNew}">
      <div class="toolbar"><button class="btn-primary" onclick="App.navigate('monsters')">← 返回列表</button><button class="btn-primary" id="btn-save">保存</button><button class="btn-danger" id="btn-del" ${isNew?'style="display:none"':''}>删除怪物</button></div>

      <!-- 1. 基本信息 -->
      <fieldset class="fieldset"><legend>基本信息</legend>
        <div class="form-row"><div style="flex:0 0 200px;"><label>半身头像（列表展示）</label><div id="monster-img-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:0 0 200px;"><label>全身立绘</label><div id="monster-fullbody-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;">
        <div class="form-group"><label>名称</label><input type="text" id="monster-name" value="${m.name||''}" style="width:100%;font-size:18px;"></div>
        <div class="form-row"><div style="flex:1;"><label>修为</label><select id="monster-realm" style="width:100%;">${REALMS.map(r=>`<option value="${r}" ${m.realm===r?'selected':''}>${r}</option>`).join('')}<option value="未知" ${m.realm==='未知'?'selected':''}>未知</option></select></div><div style="flex:1;"><label>灵根属性（可多选，最多3个）</label><div class="checkbox-group" id="monster-roots">${rootsHtml}</div></div></div></div></div></fieldset>

      <!-- 2. 属性数值 -->
      <fieldset class="fieldset"><legend>属性数值</legend>
        <div class="form-row">
          <div style="flex:1;"><label>生命(HP)</label><input type="number" id="m-hp" value="${m.hp||0}"></div>
          <div style="flex:1;"><label>攻击(ATK)</label><input type="number" id="m-atk" value="${m.atk||0}"></div>
          <div style="flex:1;"><label>防御(DEF)</label><input type="number" id="m-def" value="${m.def||0}"></div>
        </div>
        <div class="form-row" style="margin-top:8px;">
          <div style="flex:1;"><label>暴击率(%)</label><input type="number" id="m-critrate" value="${m.critRate||0}" step="0.01"></div>
          <div style="flex:1;"><label>暴击伤害(%)</label><input type="number" id="m-critdmg" value="${m.critDmg||0}" step="0.01"></div>
        </div>
        <div style="text-align:center;margin-top:12px;padding:8px;background:var(--input-bg);border-radius:6px;">
          <span style="color:var(--gold);font-weight:bold;">战力：</span>
          <span id="monster-combat-display" style="font-size:22px;color:var(--gold);">${cp}</span>
        </div>
      </fieldset>

      <!-- 3. 五行光暗抗性 -->
      <fieldset class="fieldset"><legend>五行光暗抗性</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${resistHtml}</div>
      </fieldset>

      <!-- 4. 五行光暗增伤 -->
      <fieldset class="fieldset"><legend>五行光暗增伤</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${dmgHtml}</div>
      </fieldset>

      <!-- 5. 功法 -->
      <fieldset class="fieldset"><legend>功法 <button class="btn-add" id="btn-add-gongfa">+</button></legend>
        <div id="gongfa-container">${renderGongfaEntries(m.gongfa||[])}</div>
      </fieldset>

      <!-- 6. 神通 -->
      <fieldset class="fieldset"><legend>神通 <button class="btn-add" id="btn-add-shentong">+</button></legend>
        <div id="shentong-container">${renderShentongEntries(m.shentong||[])}</div>
      </fieldset>

      <!-- 7. 法宝 -->
      <fieldset class="fieldset"><legend>法宝 <button class="btn-add" id="btn-add-treasure">+</button></legend>
        <div id="treasure-container">${renderTreasureEntries(m.treasures||[])}</div>
      </fieldset>

      <div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save2">保存</button><button class="btn-danger" id="btn-del2" ${isNew?'style="display:none"':''}>删除怪物</button></div>
    </div>`;
  },

  bindDetailEvents() {
    const self = this; const el = document.querySelector('.detail-page'); if (!el) return;
    const monsterId = el.dataset.monsterId; const isNew = el.dataset.isNew === 'true';
    const iz = document.getElementById('monster-img-zone');
    if (iz) { let cur = monsterId ? Storage.findById(MONSTER_STORAGE, monsterId) : null; ImageUpload.setup(iz, cur?.image || '', (v) => {}, 'monsters/'); iz.addEventListener('click', function () { const i = this.querySelector('img'); if (i) { const o = document.getElementById('skill-modal'); document.getElementById('modal-title').textContent = '立绘预览'; document.getElementById('modal-body').innerHTML = `<img src="${i.src}" style="max-width:100%;max-height:70vh;">`; o.style.display = 'flex'; } }); }
    const fz = document.getElementById('monster-fullbody-zone');
    if (fz) { let cur = monsterId ? Storage.findById(MONSTER_STORAGE, monsterId) : null; ImageUpload.setup(fz, cur?.fullBody || '', (v) => {}, 'monsters/'); fz.addEventListener('click', function () { const i = this.querySelector('img'); if (i) { const o = document.getElementById('skill-modal'); document.getElementById('modal-title').textContent = '全身立绘预览'; document.getElementById('modal-body').innerHTML = `<img src="${i.src}" style="max-width:100%;max-height:70vh;">`; o.style.display = 'flex'; } }); }

    const save = () => {
      const d = self._collect(monsterId);
      if (!d.name.trim()) { alert('请输入怪物名称'); return; }
      if (!d.id) d.id = Storage.uid();
      Storage.save(MONSTER_STORAGE, d);
      App.navigate('monsters');
    };
    document.getElementById('btn-save')?.addEventListener('click', save);
    document.getElementById('btn-save2')?.addEventListener('click', save);
    const del = () => { if (confirm('确定删除该怪物？')) { Storage.deleteById(MONSTER_STORAGE, monsterId); App.navigate('monsters'); } };
    document.getElementById('btn-del')?.addEventListener('click', del);
    document.getElementById('btn-del2')?.addEventListener('click', del);

    // 实时战力更新
    const updateCombat = () => {
      const hp = parseInt(document.getElementById('m-hp')?.value) || 0;
      const atk = parseInt(document.getElementById('m-atk')?.value) || 0;
      const def = parseInt(document.getElementById('m-def')?.value) || 0;
      const cr = parseFloat(document.getElementById('m-critrate')?.value) || 0;
      const cd = parseFloat(document.getElementById('m-critdmg')?.value) || 0;
      let pts = hp / 10 + atk / 2 + def / 1.5;
      pts += (cr / 100) * ((cd - 100) / 100) * 100;
      ['metal','wood','water','fire','earth','light','dark'].forEach(k => {
        pts += (parseFloat(document.querySelector(`[data-field="res_${k}"]`)?.value) || 0) / 0.8;
        pts += (parseFloat(document.querySelector(`[data-field="dmg_${k}"]`)?.value) || 0) / 0.8;
      });
      const display = document.getElementById('monster-combat-display');
      if (display) display.textContent = Math.round(pts);
    };
    ['m-hp','m-atk','m-def','m-critrate','m-critdmg'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateCombat);
    });
    document.querySelectorAll('[data-field^="res_"], [data-field^="dmg_"]').forEach(inp => {
      inp.addEventListener('input', updateCombat);
    });

    // 添加功法
    document.getElementById('btn-add-gongfa')?.addEventListener('click', () => {
      const c = document.getElementById('gongfa-container');
      const idx = c.querySelectorAll('.entry-item').length;
      const gradeOpts = MONSTER_SKILL_GRADES.map(gr => `<option value="${gr}">${gr}</option>`).join('');
      const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
      const div = document.createElement('div'); div.className = 'entry-item';
      div.innerHTML = `<div class="entry-header"><span>功法 #${idx+1}</span><button class="btn-delete monster-gongfa-del">×</button></div>
        <div class="form-row" style="margin-bottom:8px;">
          <div style="flex:0.6;"><label>名称</label><input type="text" data-field="gongfa_name_${idx}" placeholder="功法名称"></div>
          <div style="flex:0.4;"><label>等阶</label><select data-field="gongfa_grade_${idx}">${gradeOpts}</select></div>
        </div>
        <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
        <label>描述</label><textarea data-field="gongfa_desc_${idx}" placeholder="功法描述"></textarea>`;
      const em = c.querySelector('.empty-hint'); if (em) em.remove();
      c.appendChild(div);
      div.querySelector('.monster-gongfa-del').addEventListener('click', () => { div.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无功法</div>'; });
    });

    // 添加神通
    document.getElementById('btn-add-shentong')?.addEventListener('click', () => {
      const c = document.getElementById('shentong-container');
      const idx = c.querySelectorAll('.entry-item').length;
      const gradeOpts = MONSTER_SKILL_GRADES.map(gr => `<option value="${gr}">${gr}</option>`).join('');
      const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
      const div = document.createElement('div'); div.className = 'entry-item';
      div.innerHTML = `<div class="entry-header"><span>神通 #${idx+1}</span><button class="btn-delete monster-shentong-del">×</button></div>
        <div class="form-row" style="margin-bottom:8px;">
          <div style="flex:0.6;"><label>名称</label><input type="text" data-field="shentong_name_${idx}" placeholder="神通名称"></div>
          <div style="flex:0.4;"><label>等阶</label><select data-field="shentong_grade_${idx}">${gradeOpts}</select></div>
        </div>
        <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
        <div class="form-row" style="margin-bottom:8px;">
          <div style="flex:1;"><label>冷却时间(CD)</label><input type="text" data-field="shentong_cd_${idx}" placeholder="如：30秒"></div>
          <div style="flex:1;"><label>消耗灵力</label><input type="number" data-field="shentong_lingli_${idx}"></div>
        </div>
        <label>描述</label><textarea data-field="shentong_desc_${idx}" placeholder="神通描述"></textarea>`;
      const em = c.querySelector('.empty-hint'); if (em) em.remove();
      c.appendChild(div);
      div.querySelector('.monster-shentong-del').addEventListener('click', () => { div.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无神通</div>'; });
    });

    // 添加法宝
    document.getElementById('btn-add-treasure')?.addEventListener('click', () => {
      const c = document.getElementById('treasure-container');
      const idx = c.querySelectorAll('.entry-item').length;
      const gradeOpts = MONSTER_TREASURE_GRADES.map(gr => `<option value="${gr}">${gr}</option>`).join('');
      const elChecks = MONSTER_ELEMENTS.map(e => `<label><input type="checkbox" value="${e}" onchange="limitCheckbox(event,3)"> ${e}</label>`).join('');
      const typeOpts = Object.entries(TREASURE_TYPES).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
      const subOpts = (TREASURE_TYPES['attack']?.sub || []).map(s => `<option>${s}</option>`).join('');
      const div = document.createElement('div'); div.className = 'entry-item';
      div.innerHTML = `<div class="entry-header"><span>法宝 #${idx+1}</span><button class="btn-delete monster-treasure-del">×</button></div>
        <div class="form-row" style="margin-bottom:8px;">
          <div style="flex:0.6;"><label>名称</label><input type="text" data-field="treasure_name_${idx}" placeholder="法宝名称"></div>
          <div style="flex:0.4;"><label>等阶</label><select data-field="treasure_grade_${idx}">${gradeOpts}</select></div>
        </div>
        <div class="form-row" style="margin-bottom:8px;">
          <div style="flex:0.5;"><label>类型</label><select data-field="treasure_type_${idx}" onchange="const v=this.value;const sub=TREASURE_TYPES[v]?.sub||[];const sel=this.closest('.entry-item').querySelector('[data-field^=\\'treasure_subtype_\\']');if(sel){sel.innerHTML=sub.map(s=>'<option>'+s+'</option>').join('');}">${typeOpts}</select></div>
          <div style="flex:0.5;"><label>子类型</label><select data-field="treasure_subtype_${idx}">${subOpts}</select></div>
        </div>
        <div style="margin-bottom:8px;"><label>五行属性（最多3个）</label><div class="checkbox-group">${elChecks}</div></div>
        <label>描述</label><textarea data-field="treasure_desc_${idx}" placeholder="法宝描述"></textarea>`;
      const em = c.querySelector('.empty-hint'); if (em) em.remove();
      c.appendChild(div);
      div.querySelector('.monster-treasure-del').addEventListener('click', () => { div.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无法宝</div>'; });
    });

    // 已有条目的删除按钮
    document.querySelectorAll('.monster-gongfa-del').forEach(btn => { btn.addEventListener('click', function () { const item = this.closest('.entry-item'); const c = item.parentElement; item.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无功法</div>'; }); });
    document.querySelectorAll('.monster-shentong-del').forEach(btn => { btn.addEventListener('click', function () { const item = this.closest('.entry-item'); const c = item.parentElement; item.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无神通</div>'; }); });
    document.querySelectorAll('.monster-treasure-del').forEach(btn => { btn.addEventListener('click', function () { const item = this.closest('.entry-item'); const c = item.parentElement; item.remove(); if (c.querySelectorAll('.entry-item').length === 0) c.innerHTML = '<div class="empty-hint">暂无法宝</div>'; }); });
  },

  _collect(id) {
    let d = id ? Storage.findById(MONSTER_STORAGE, id) : createEmptyMonster();
    if (!d) d = createEmptyMonster();
    d.id = id || '';
    d.name = document.getElementById('monster-name')?.value?.trim() || '';
    d.realm = document.getElementById('monster-realm')?.value || '练气初期';
    d.spiritRoots = Array.from(document.querySelectorAll('#monster-roots input:checked')).map(cb => cb.value);
    d.image = document.querySelector('#monster-img-zone .img-filename-input')?.value?.trim() || '';
    d.fullBody = document.querySelector('#monster-fullbody-zone .img-filename-input')?.value?.trim() || '';

    // 平面属性
    d.hp = parseInt(document.getElementById('m-hp')?.value) || 0;
    d.atk = parseInt(document.getElementById('m-atk')?.value) || 0;
    d.def = parseInt(document.getElementById('m-def')?.value) || 0;
    d.critRate = parseFloat(document.getElementById('m-critrate')?.value) || 0;
    d.critDmg = parseFloat(document.getElementById('m-critdmg')?.value) || 0;

    // 7元素抗性和增伤
    ['metal','wood','water','fire','earth','light','dark'].forEach(k => {
      d.resist[k] = parseFloat(document.querySelector(`[data-field="res_${k}"]`)?.value) || 0;
      d.dmgBonus[k] = parseFloat(document.querySelector(`[data-field="dmg_${k}"]`)?.value) || 0;
    });

    // 功法
    d.gongfa = [];
    document.querySelectorAll('#gongfa-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input[type="text"]');
      const gradeEl = item.querySelector('select');
      const descEl = item.querySelector('textarea');
      const elements = Array.from(item.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      d.gongfa.push({ name: nameEl?.value || '', grade: gradeEl?.value || '未知', elements, desc: descEl?.value || '' });
    });

    // 神通
    d.shentong = [];
    document.querySelectorAll('#shentong-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input[type="text"]');
      const selects = item.querySelectorAll('select');
      const gradeEl = selects[0];
      const cdEl = item.querySelector('[data-field^="shentong_cd_"]');
      const lingliEl = item.querySelector('[data-field^="shentong_lingli_"]');
      const descEl = item.querySelector('textarea');
      const elements = Array.from(item.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      d.shentong.push({ name: nameEl?.value || '', grade: gradeEl?.value || '未知', elements, desc: descEl?.value || '', cd: cdEl?.value || '', lingli: parseInt(lingliEl?.value) || 0 });
    });

    // 法宝
    d.treasures = [];
    document.querySelectorAll('#treasure-container .entry-item').forEach(item => {
      const nameEl = item.querySelector('input[type="text"]');
      const selects = item.querySelectorAll('select');
      const gradeEl = selects[0];
      const typeEl = selects[1];
      const subtypeEl = selects[2];
      const descEl = item.querySelector('textarea');
      const elements = Array.from(item.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
      d.treasures.push({ name: nameEl?.value || '', grade: gradeEl?.value || '未知', type: typeEl?.value || 'attack', subtype: subtypeEl?.value || '剑', elements, desc: descEl?.value || '' });
    });

    return d;
  },

  bindListEvents() {}
};

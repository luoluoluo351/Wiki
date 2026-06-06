// 伤害计算器

const ELEM_CYCLE = { '金':'木', '木':'水', '水':'火', '火':'土', '土':'金' };
const DMG_SESSION = 'damage_form';

function majorIndex(realm) { const idx = REALMS.indexOf(realm); if (idx < 0) return 0; return Math.floor(idx / 4); }
function totalLevel(realm) { const idx = REALMS.indexOf(realm); return idx >= 0 ? idx + 1 : 1; }
function treasureValueAtLevel(entry, level) { if (!entry) return 0; const growth = (entry.lv60 - entry.lv1) / 59; return entry.lv1 + (level - 1) * growth; }

const Damage = {

  _restore() {
    try { return JSON.parse(sessionStorage.getItem(DMG_SESSION)) || {}; } catch(e) { return {}; }
  },
  _save(obj) { sessionStorage.setItem(DMG_SESSION, JSON.stringify(obj)); },

  render() {
    const saved = this._restore();
    const treasures = Storage.list('treasures');
    const atkTreasures = treasures.filter(t => t.type === 'attack');
    const accTreasures = treasures.filter(t => t.type === 'accessory');
    const realmOpts = REALMS.map(r => `<option value="${r}">${r}</option>`).join('');

    function treasureOpts(list) { return `<option value="">不选择</option>` + list.map(t => `<option value="${t.id}">${t.name || '未命名'}(${t.grade})</option>`).join(''); }

    function elemInputs(idPrefix, label, defs) {
      return ELEMENTS.map(e => {
        const val = (defs && defs[e] !== undefined) ? defs[e] : 0;
        return `<div style="flex:1;"><label>${e}${label}</label><input type="number" id="dam-${idPrefix}-${e}" value="${val}" step="0.01"></div>`;
      }).join('');
    }

    function elemCheckboxes(id, defs) {
      return ELEMENTS.map(e => { const ch = (defs && defs[e]!==undefined) ? (defs[e]?'checked':'') : ''; return `<label><input type="checkbox" value="${e}" ${ch} onchange="limitCheckbox(event,3)"> ${e}</label>`; }).join('');
    }

    return `
      <div class="toolbar"><h2 style="color:var(--gold);">伤害计算器</h2></div>
      <div class="two-col">
        <div class="col">
          <h3>攻击方</h3>
          <div class="form-group"><label>修为</label><select id="dam-atk-realm">${realmOpts}</select></div>
          <div class="form-group"><label>攻击属性（可多选，最多3个）</label><div class="checkbox-group" id="dam-atk-elements">${elemCheckboxes('atkElem',saved.atkElem)}</div></div>
          <div class="form-group"><label>角色基础攻击力</label><input type="number" id="dam-atk-atk" value="${saved.atkAtk||0}"></div>

          <fieldset class="fieldset" style="margin-bottom:16px;"><legend>装备法宝</legend>
            <div class="form-group"><label>攻击类法宝</label><select id="dam-atk-treasure">${treasureOpts(atkTreasures)}</select></div>
            <div class="form-group" id="atk-treasure-level-group" style="display:none;"><label>法宝等级(1-60)</label><input type="number" id="dam-atk-treasure-level" value="${saved.atkTLevel||60}" min="1" max="60"><div style="color:var(--text-dim);font-size:12px;margin-top:4px;">法宝基础攻击力加成：<span id="atk-treasure-bonus">0</span></div></div>
            <div class="form-group"><label>饰品类法宝</label><select id="dam-acc-treasure">${treasureOpts(accTreasures)}</select></div>
            <div class="form-group" id="acc-treasure-level-group" style="display:none;"><label>法宝等级(1-60)</label><input type="number" id="dam-acc-treasure-level" value="${saved.accTLevel||60}" min="1" max="60"><div style="color:var(--text-dim);font-size:12px;margin-top:4px;">词条加成：<span id="acc-treasure-bonus">—</span></div></div>
          </fieldset>

          <div class="form-group"><label>攻击力%加成</label><input type="number" id="dam-atk-pct" value="${saved.atkPct||0}" step="0.01"> %</div>
          <div class="form-group"><label>固定值加成</label><input type="number" id="dam-atk-flat" value="${saved.atkFlat||0}"></div>
          <div class="form-group"><label>技能倍率</label><input type="number" id="dam-skill-mult" value="${saved.skillMult||100}" step="1"> %</div>

          <div class="form-row">
            <div style="flex:1;"><label>暴击率(%)</label><input type="number" id="dam-atk-critrate" value="${saved.atkCrit||5}" step="0.01"></div>
            <div style="flex:1;"><label>暴击伤害(%)</label><input type="number" id="dam-atk-critdmg" value="${saved.atkCritDmg||150}" step="0.01"></div>
            <div style="flex:1;"><label>防御穿透(%)</label><input type="number" id="dam-atk-pen" value="${saved.atkPen||0}" step="0.01"></div>
          </div>

          <div style="margin-top:12px;"><label style="color:var(--gold);">一类增伤 — 全增伤(%)</label></div>
          <div class="form-row"><div style="flex:1;"><input type="number" id="dam-dmg-all" value="${saved.dmgAll||0}" step="0.01"></div></div>

          <div style="margin-top:12px;"><label style="color:var(--gold);">二类增伤 — 五行属性增伤(%)</label></div>
          <div class="form-row">${elemInputs('dmg2','伤害加成',saved.dmg2)}</div>

          <div style="margin-top:12px;"><label style="color:var(--gold);">三类增伤 — 攻击类型增伤(%)</label></div>
          <div class="form-row"><div style="flex:1;"><input type="number" id="dam-dmg-type" value="${saved.dmgType||0}" step="0.01"></div></div>

          <fieldset class="fieldset" style="margin-top:16px;"><legend>灵宠伤害计算器</legend><div style="color:var(--text-dim);padding:12px;">待开发</div></fieldset>
        </div>

        <div class="col">
          <h3>防御方</h3>
          <div class="form-group"><label>修为</label><select id="dam-def-realm">${realmOpts}</select></div>
          <div class="form-group"><label>五行属性（可多选，最多3个）</label><div class="checkbox-group" id="dam-def-elements">${elemCheckboxes('defElem',saved.defElem)}</div></div>
          <div class="form-group"><label>防御力</label><input type="number" id="dam-def-def" value="${saved.defDef||0}"></div>
          <div style="margin-top:12px;"><label style="color:var(--gold);">各属性抗性(%)</label></div>
          <div class="form-row">${elemInputs('resist','抗性',saved.resist)}</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;"><button class="btn-primary" id="btn-calc" style="font-size:18px;padding:12px 40px;">计算伤害</button></div>
      <div class="result-box" id="result-box" style="display:none;"><h3>计算结果</h3><div id="result-content"></div></div>
    `;
  },

  bindEvents() {
    const self = this;
    // 恢复上次选项
    const saved = this._restore();

    const atkTSel = document.getElementById('dam-atk-treasure');
    if (saved.atkTId && atkTSel) { atkTSel.value = saved.atkTId; document.getElementById('atk-treasure-level-group').style.display = ''; self._updateTreasureBonus(); }
    const accTSel = document.getElementById('dam-acc-treasure');
    if (saved.accTId && accTSel) { accTSel.value = saved.accTId; document.getElementById('acc-treasure-level-group').style.display = ''; self._updateAccBonus(); }

    document.getElementById('dam-atk-realm')?.addEventListener('change', () => self._persist());
    document.getElementById('dam-def-realm')?.addEventListener('change', () => self._persist());

    atkTSel?.addEventListener('change', function () {
      document.getElementById('atk-treasure-level-group').style.display = this.value ? '' : 'none';
      if (this.value) self._updateTreasureBonus(); else document.getElementById('atk-treasure-bonus').textContent = '0';
      self._persist();
    });
    accTSel?.addEventListener('change', function () {
      document.getElementById('acc-treasure-level-group').style.display = this.value ? '' : 'none';
      if (this.value) self._updateAccBonus(); else document.getElementById('acc-treasure-bonus').textContent = '—';
      self._persist();
    });

    document.getElementById('dam-atk-treasure-level')?.addEventListener('input', () => { self._updateTreasureBonus(); self._persist(); });
    document.getElementById('dam-acc-treasure-level')?.addEventListener('input', () => { self._updateAccBonus(); self._persist(); });
    document.getElementById('btn-calc')?.addEventListener('click', () => { self._persist(); self._calculate(); });

    // 所有输入变化时自动保存
    document.querySelectorAll('.col input, .col select').forEach(el => el.addEventListener('change', () => self._persist()));
    document.querySelectorAll('.col input').forEach(el => el.addEventListener('input', () => self._persist()));
  },

  _persist() {
    const d = {};
    d.atkElem = {}; ELEMENTS.forEach(e => { d.atkElem[e] = document.getElementById('dam-atk-elements')?.querySelector(`input[value="${e}"]`)?.checked || false; });
    d.defElem = {}; ELEMENTS.forEach(e => { d.defElem[e] = document.getElementById('dam-def-elements')?.querySelector(`input[value="${e}"]`)?.checked || false; });
    d.atkRealm = document.getElementById('dam-atk-realm')?.value;
    d.defRealm = document.getElementById('dam-def-realm')?.value;
    d.atkAtk = document.getElementById('dam-atk-atk')?.value;
    d.atkTId = document.getElementById('dam-atk-treasure')?.value;
    d.atkTLevel = document.getElementById('dam-atk-treasure-level')?.value;
    d.accTId = document.getElementById('dam-acc-treasure')?.value;
    d.accTLevel = document.getElementById('dam-acc-treasure-level')?.value;
    d.atkPct = document.getElementById('dam-atk-pct')?.value;
    d.atkFlat = document.getElementById('dam-atk-flat')?.value;
    d.skillMult = document.getElementById('dam-skill-mult')?.value;
    d.atkCrit = document.getElementById('dam-atk-critrate')?.value;
    d.atkCritDmg = document.getElementById('dam-atk-critdmg')?.value;
    d.atkPen = document.getElementById('dam-atk-pen')?.value;
    d.dmgAll = document.getElementById('dam-dmg-all')?.value;
    d.dmgType = document.getElementById('dam-dmg-type')?.value;
    d.dmg2 = {}; ELEMENTS.forEach(e => { d.dmg2[e] = document.getElementById(`dam-dmg2-${e}`)?.value || 0; });
    d.resist = {}; ELEMENTS.forEach(e => { d.resist[e] = document.getElementById(`dam-resist-${e}`)?.value || 0; });
    d.defDef = document.getElementById('dam-def-def')?.value;
    this._save(d);
  },

  _updateTreasureBonus() {
    const id = document.getElementById('dam-atk-treasure')?.value;
    const level = parseInt(document.getElementById('dam-atk-treasure-level')?.value) || 60;
    const bonusEl = document.getElementById('atk-treasure-bonus');
    if (!id || !bonusEl) return;
    const t = Storage.findById('treasures', id);
    if (t) bonusEl.textContent = treasureValueAtLevel(t.entry1, Math.min(Math.max(level, 1), 60)).toFixed(2);
  },
  _updateAccBonus() {
    const id = document.getElementById('dam-acc-treasure')?.value;
    const level = parseInt(document.getElementById('dam-acc-treasure-level')?.value) || 60;
    const bonusEl = document.getElementById('acc-treasure-bonus');
    if (!id || !bonusEl) return;
    const t = Storage.findById('treasures', id);
    if (t && t.entry2) bonusEl.textContent = t.entry2.stat + ': +' + treasureValueAtLevel(t.entry2, Math.min(Math.max(level, 1), 60)).toFixed(2) + '%';
  },

  _calculate() {
    const atkRealm = document.getElementById('dam-atk-realm')?.value || '练气初期';
    const atkElements = Array.from(document.querySelectorAll('#dam-atk-elements input:checked')).map(cb => cb.value);
    let baseAtk = parseFloat(document.getElementById('dam-atk-atk')?.value) || 0;

    const atkTid = document.getElementById('dam-atk-treasure')?.value;
    const atkTLevel = parseInt(document.getElementById('dam-atk-treasure-level')?.value) || 60;
    if (atkTid) { const at = Storage.findById('treasures', atkTid); if (at) baseAtk += treasureValueAtLevel(at.entry1, Math.min(Math.max(atkTLevel, 1), 60)); }

    let atkPctBonus = parseFloat(document.getElementById('dam-atk-pct')?.value) || 0;
    const accTid = document.getElementById('dam-acc-treasure')?.value;
    const accTLevel = parseInt(document.getElementById('dam-acc-treasure-level')?.value) || 60;
    if (accTid) { const acc = Storage.findById('treasures', accTid); if (acc && acc.entry2 && acc.entry2.stat === '攻击') atkPctBonus += treasureValueAtLevel(acc.entry2, Math.min(Math.max(accTLevel, 1), 60)); }
    const flatBonus = parseFloat(document.getElementById('dam-atk-flat')?.value) || 0;
    const totalAtk = baseAtk * (1 + atkPctBonus / 100) + flatBonus;

    let critRate = parseFloat(document.getElementById('dam-atk-critrate')?.value) || 5;
    let critDmg = parseFloat(document.getElementById('dam-atk-critdmg')?.value) || 150;
    let pen = parseFloat(document.getElementById('dam-atk-pen')?.value) || 0;
    if (accTid) { const acc = Storage.findById('treasures', accTid); if (acc && acc.entry2 && acc.entry2.stat !== '攻击') { const val = treasureValueAtLevel(acc.entry2, Math.min(Math.max(accTLevel, 1), 60)); const stat = acc.entry2.stat; if (stat === '暴击率') critRate += val; else if (stat === '暴击伤害') critDmg += val; } }

    const atkDmgBonus = {}; ELEMENTS.forEach(e => { atkDmgBonus[e] = parseFloat(document.getElementById(`dam-dmg2-${e}`)?.value) || 0; });

    const defRealm = document.getElementById('dam-def-realm')?.value || '练气初期';
    const defElements = Array.from(document.querySelectorAll('#dam-def-elements input:checked')).map(cb => cb.value);
    let defDef = parseFloat(document.getElementById('dam-def-def')?.value) || 0;
    const defResist = {}; ELEMENTS.forEach(e => { defResist[e] = parseFloat(document.getElementById(`dam-resist-${e}`)?.value) || 0; });

    // 1. 修为压制
    const atkLevel = totalLevel(atkRealm); const defLevel = totalLevel(defRealm);
    let minorBonus = 1; if (atkLevel > defLevel) minorBonus = 1 + (atkLevel - defLevel) * 0.08;

    // 2. 大境界穿透
    const atkMajor = majorIndex(atkRealm); const defMajor = majorIndex(defRealm);
    if (atkMajor > defMajor) pen += (atkMajor - defMajor) * 10;

    // 3. 防御免伤
    const effectiveDef = Math.max(defDef * (1 - pen / 100), 0);
    const defReduction = effectiveDef / (effectiveDef + 800);

    // 4. 五行克制
    const countered = atkElements.some(ae => defElements.some(de => ELEM_CYCLE[ae] === de));
    const elementBonus = countered ? 1.2 : 1.0;

    // 5. 三类增伤（独立乘区）
    const dmgAll = 1 + (parseFloat(document.getElementById('dam-dmg-all')?.value) || 0) / 100;
    let bestDmg2 = 0, bestResist = 0;
    atkElements.forEach(ae => { bestDmg2 = Math.max(bestDmg2, atkDmgBonus[ae] || 0); bestResist = Math.max(bestResist, defResist[ae] || 0); });
    const dmg2 = 1 + (bestDmg2 / 100) - (bestResist / 100);
    const dmgType = 1 + (parseFloat(document.getElementById('dam-dmg-type')?.value) || 0) / 100;

    // 6. 技能倍率
    const skillMult = (parseFloat(document.getElementById('dam-skill-mult')?.value) || 100) / 100;

    const nonCrit = totalAtk * (1 - defReduction) * minorBonus * elementBonus * dmgAll * dmg2 * dmgType * skillMult;
    const crit = nonCrit * (critDmg / 100);

    document.getElementById('result-box').style.display = '';
    document.getElementById('result-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><strong>基础攻击力</strong><br>${baseAtk.toFixed(2)}</div>
        <div><strong>总攻击力</strong><br>${totalAtk.toFixed(2)}</div>
        <div><strong>有效防御</strong><br>${effectiveDef.toFixed(2)}（穿透${pen.toFixed(1)}%）</div>
        <div><strong>防御免伤比例</strong><br>${(defReduction * 100).toFixed(2)}%</div>
        <div><strong>修为压制加成</strong><br>×${minorBonus.toFixed(2)} ${atkLevel > defLevel ? '(攻方高' + (atkLevel - defLevel) + '个小境界)' : '(无)'}</div>
        <div><strong>五行克制</strong><br>×${elementBonus.toFixed(1)} ${countered ? '可克制' : '无克制'}（攻${atkElements.join('/')} vs 守${defElements.join('/')}）</div>
        <div><strong>全增伤</strong><br>×${dmgAll.toFixed(2)}</div>
        <div><strong>属性增伤</strong><br>×${dmg2.toFixed(2)}</div>
        <div><strong>类型增伤</strong><br>×${dmgType.toFixed(2)}</div>
        <div><strong>暴击率 / 暴击伤害</strong><br>${critRate.toFixed(1)}% / ${critDmg.toFixed(1)}%</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--gold);">
        <div style="text-align:center;"><div style="font-size:24px;color:var(--gold);">${nonCrit.toFixed(2)}</div><div style="color:var(--text-dim);">非暴击伤害</div></div>
        <div style="text-align:center;"><div style="font-size:24px;color:var(--red);">${crit.toFixed(2)}</div><div style="color:var(--text-dim);">暴击伤害</div></div>
      </div>
      <div style="margin-top:12px;color:var(--text-dim);font-size:12px;">
        期望伤害 = ${(nonCrit * (1 - critRate/100) + crit * critRate/100).toFixed(2)}
      </div>
    `;
  }
};

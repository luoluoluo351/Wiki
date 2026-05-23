// 伤害计算器

const ELEM_CYCLE = { '金':'木', '木':'水', '水':'火', '火':'土', '土':'金' };

// 获取大境界索引 0=练气 1=筑基 2=金丹 3=元婴 4=化神
function majorIndex(realm) {
  const idx = REALMS.indexOf(realm);
  if (idx < 0) return 0;
  return Math.floor(idx / 3);
}

// 获取小境界索引 0=初期 1=中期 2=后期
function minorIndex(realm) {
  const idx = REALMS.indexOf(realm);
  if (idx < 0) return 0;
  return idx % 3;
}

// 获取境界总等级 1-15
function totalLevel(realm) {
  const idx = REALMS.indexOf(realm);
  return idx >= 0 ? idx + 1 : 1;
}

// 法宝词条值在指定等级的值（需传入lv1和lv60数据）
function treasureValueAtLevel(entry, level) {
  if (!entry) return 0;
  const growth = (entry.lv60 - entry.lv1) / 59;
  return entry.lv1 + (level - 1) * growth;
}

const Damage = {

  render() {
    const treasures = Storage.list('treasures');
    const atkTreasures = treasures.filter(t => t.type === 'attack');
    const accTreasures = treasures.filter(t => t.type === 'accessory');

    const realmOpts = REALMS.map(r => `<option value="${r}">${r}</option>`).join('');
    const elemOpts = ELEMENTS.map(e => `<option value="${e}">${e}</option>`).join('');

    function treasureOpts(list) {
      return `<option value="">不选择</option>` + list.map(t => `<option value="${t.id}">${t.name || '未命名'}(${t.grade})</option>`).join('');
    }

    function elemInputs(prefix, defaults) {
      return ELEMENTS.map(e => {
        const val = defaults ? (defaults[e] || 0) : 0;
        return `<div style="flex:1;"><label>${e}${prefix}</label><input type="number" id="dam-${prefix}-${e}" value="${val}" step="0.01"></div>`;
      }).join('');
    }

    return `
      <div class="toolbar"><h2 style="color:#e2b04a;">伤害计算器</h2></div>

      <div class="two-col">
        <!-- 左：攻击方 -->
        <div class="col" style="background:#16213e;border-radius:8px;padding:20px;">
          <h3>攻击方</h3>

          <div class="form-group"><label>修为</label><select id="dam-atk-realm">${realmOpts}</select></div>

          <div class="form-group"><label>攻击属性（用于克制判定）</label><select id="dam-atk-element">${elemOpts}</select></div>

          <div class="form-group"><label>角色基础攻击力</label><input type="number" id="dam-atk-atk" value="0"></div>

          <fieldset class="fieldset" style="margin-bottom:16px;">
            <legend>装备法宝</legend>
            <div class="form-group">
              <label>攻击类法宝</label>
              <select id="dam-atk-treasure">${treasureOpts(atkTreasures)}</select>
            </div>
            <div class="form-group" id="atk-treasure-level-group" style="display:none;">
              <label>法宝等级(1-60)</label>
              <input type="number" id="dam-atk-treasure-level" value="1" min="1" max="60">
              <div style="color:#a0a0a0;font-size:12px;margin-top:4px;">法宝基础攻击力加成：<span id="atk-treasure-bonus">0</span></div>
            </div>
            <div class="form-group">
              <label>饰品类法宝</label>
              <select id="dam-acc-treasure">${treasureOpts(accTreasures)}</select>
            </div>
            <div class="form-group" id="acc-treasure-level-group" style="display:none;">
              <label>法宝等级(1-60)</label>
              <input type="number" id="dam-acc-treasure-level" value="1" min="1" max="60">
              <div style="color:#a0a0a0;font-size:12px;margin-top:4px;">词条加成：<span id="acc-treasure-bonus">—</span></div>
            </div>
          </fieldset>

          <div class="form-group"><label>攻击力%加成</label><input type="number" id="dam-atk-pct" value="0" step="0.01"> %</div>
          <div class="form-group"><label>固定值加成</label><input type="number" id="dam-atk-flat" value="0"></div>

          <div class="form-row">
            <div style="flex:1;"><label>暴击率(%)</label><input type="number" id="dam-atk-critrate" value="5" step="0.01"></div>
            <div style="flex:1;"><label>暴击伤害(%)</label><input type="number" id="dam-atk-critdmg" value="150" step="0.01"></div>
            <div style="flex:1;"><label>防御穿透(%)</label><input type="number" id="dam-atk-pen" value="0" step="0.01"></div>
          </div>

          <div style="margin-top:12px;"><label style="color:#e2b04a;">五行伤害加成(%)</label></div>
          <div class="form-row">${elemInputs('dmg', null)}</div>

          <fieldset class="fieldset" style="margin-top:16px;">
            <legend>灵宠伤害计算器</legend>
            <div style="color:#a0a0a0;padding:12px;">待开发</div>
          </fieldset>
        </div>

        <!-- 右：防御方 -->
        <div class="col" style="background:#16213e;border-radius:8px;padding:20px;">
          <h3>防御方</h3>

          <div class="form-group"><label>修为</label><select id="dam-def-realm">${realmOpts}</select></div>

          <div class="form-group"><label>五行属性（用于克制判定）</label><select id="dam-def-element">${elemOpts}</select></div>

          <div class="form-group"><label>防御力</label><input type="number" id="dam-def-def" value="0"></div>

          <div style="margin-top:12px;"><label style="color:#e2b04a;">各属性抗性(%)</label></div>
          <div class="form-row">${elemInputs('resist', null)}</div>
        </div>
      </div>

      <div style="text-align:center;margin-top:20px;">
        <button class="btn-primary" id="btn-calc" style="font-size:18px;padding:12px 40px;">计算伤害</button>
      </div>

      <div class="result-box" id="result-box" style="display:none;">
        <h3>计算结果</h3>
        <div id="result-content"></div>
      </div>
    `;
  },

  bindEvents() {
    const self = this;

    // 攻击法宝选择 → 显示等级输入
    document.getElementById('dam-atk-treasure')?.addEventListener('change', function () {
      const group = document.getElementById('atk-treasure-level-group');
      if (this.value) {
        group.style.display = '';
        self._updateTreasureBonus();
      } else {
        group.style.display = 'none';
        document.getElementById('atk-treasure-bonus').textContent = '0';
      }
    });

    document.getElementById('dam-acc-treasure')?.addEventListener('change', function () {
      const group = document.getElementById('acc-treasure-level-group');
      if (this.value) {
        group.style.display = '';
        self._updateAccBonus();
      } else {
        group.style.display = 'none';
        document.getElementById('acc-treasure-bonus').textContent = '—';
      }
    });

    // 法宝等级变化 → 更新加成显示
    document.getElementById('dam-atk-treasure-level')?.addEventListener('input', () => self._updateTreasureBonus());
    document.getElementById('dam-acc-treasure-level')?.addEventListener('input', () => self._updateAccBonus());

    // 计算按钮
    document.getElementById('btn-calc')?.addEventListener('click', () => self._calculate());

    // 初始状态：如果默认有值，显示
    if (document.getElementById('dam-atk-treasure')?.value) {
      document.getElementById('atk-treasure-level-group').style.display = '';
      self._updateTreasureBonus();
    }
    if (document.getElementById('dam-acc-treasure')?.value) {
      document.getElementById('acc-treasure-level-group').style.display = '';
      self._updateAccBonus();
    }
  },

  _updateTreasureBonus() {
    const id = document.getElementById('dam-atk-treasure')?.value;
    const level = parseInt(document.getElementById('dam-atk-treasure-level')?.value) || 1;
    const bonusEl = document.getElementById('atk-treasure-bonus');
    if (!id || !bonusEl) return;
    const t = Storage.findById('treasures', id);
    if (t) {
      const val = treasureValueAtLevel(t.entry1, Math.min(Math.max(level, 1), 60));
      bonusEl.textContent = val.toFixed(2);
    }
  },

  _updateAccBonus() {
    const id = document.getElementById('dam-acc-treasure')?.value;
    const level = parseInt(document.getElementById('dam-acc-treasure-level')?.value) || 1;
    const bonusEl = document.getElementById('acc-treasure-bonus');
    if (!id || !bonusEl) return;
    const t = Storage.findById('treasures', id);
    if (t && t.entry2) {
      const val = treasureValueAtLevel(t.entry2, Math.min(Math.max(level, 1), 60));
      bonusEl.textContent = `${t.entry2.stat}: +${val.toFixed(2)}%`;
    }
  },

  _calculate() {
    // 读取攻击方数据
    const atkRealm = document.getElementById('dam-atk-realm')?.value || '练气初期';
    const atkElement = document.getElementById('dam-atk-element')?.value || '金';
    let baseAtk = parseFloat(document.getElementById('dam-atk-atk')?.value) || 0;

    // 攻击法宝加成
    const atkTid = document.getElementById('dam-atk-treasure')?.value;
    const atkTLevel = parseInt(document.getElementById('dam-atk-treasure-level')?.value) || 1;
    if (atkTid) {
      const at = Storage.findById('treasures', atkTid);
      if (at) baseAtk += treasureValueAtLevel(at.entry1, Math.min(Math.max(atkTLevel, 1), 60));
    }

    // ATK%加成（基础 + 饰品类法宝词条2如果是"攻击"）
    let atkPctBonus = parseFloat(document.getElementById('dam-atk-pct')?.value) || 0;
    const accTid = document.getElementById('dam-acc-treasure')?.value;
    const accTLevel = parseInt(document.getElementById('dam-acc-treasure-level')?.value) || 1;
    if (accTid) {
      const acc = Storage.findById('treasures', accTid);
      if (acc && acc.entry2 && acc.entry2.stat === '攻击') {
        atkPctBonus += treasureValueAtLevel(acc.entry2, Math.min(Math.max(accTLevel, 1), 60));
      }
    }
    const flatBonus = parseFloat(document.getElementById('dam-atk-flat')?.value) || 0;
    const totalAtk = baseAtk * (1 + atkPctBonus / 100) + flatBonus;

    // 进阶属性（从饰品词条2中获取，如果不是"攻击"）
    let critRate = parseFloat(document.getElementById('dam-atk-critrate')?.value) || 5;
    let critDmg = parseFloat(document.getElementById('dam-atk-critdmg')?.value) || 150;
    let pen = parseFloat(document.getElementById('dam-atk-pen')?.value) || 0;

    // 饰品词条2的非攻击属性
    if (accTid) {
      const acc = Storage.findById('treasures', accTid);
      if (acc && acc.entry2 && acc.entry2.stat !== '攻击') {
        const val = treasureValueAtLevel(acc.entry2, Math.min(Math.max(accTLevel, 1), 60));
        const stat = acc.entry2.stat;
        if (stat === '暴击率') critRate += val;
        else if (stat === '暴击伤害') critDmg += val;
        else if (stat === '防御') pen += val; // 简化处理：防御穿透？
        // Other stats like 生命 not relevant for damage calc
      }
    }

    // 五行伤害加成
    const atkDmgBonus = {};
    ELEMENTS.forEach(e => {
      atkDmgBonus[e] = parseFloat(document.getElementById(`dam-dmg-${e}`)?.value) || 0;
    });

    // 读取防御方数据
    const defRealm = document.getElementById('dam-def-realm')?.value || '练气初期';
    const defElement = document.getElementById('dam-def-element')?.value || '金';
    let defDef = parseFloat(document.getElementById('dam-def-def')?.value) || 0;

    const defResist = {};
    ELEMENTS.forEach(e => {
      defResist[e] = parseFloat(document.getElementById(`dam-resist-${e}`)?.value) || 0;
    });

    // === 计算 ===

    // 1. 修为压制（小境界差）
    const atkLevel = totalLevel(atkRealm);
    const defLevel = totalLevel(defRealm);
    let minorBonus = 1;
    if (atkLevel > defLevel) {
      minorBonus = 1 + (atkLevel - defLevel) * 0.08;
    }

    // 2. 大境界穿透
    const atkMajor = majorIndex(atkRealm);
    const defMajor = majorIndex(defRealm);
    if (atkMajor > defMajor) {
      pen += 10;  // 大境界高 → +10%穿透
    }

    // 3. 防御免伤
    const effectiveDef = Math.max(defDef * (1 - pen / 100), 0);
    const defReduction = effectiveDef / (effectiveDef + 800);

    // 4. 五行克制
    const countered = ELEM_CYCLE[atkElement] === defElement;
    const elementBonus = countered ? 1.2 : 1.0;

    // 5. 伤害加成
    const dmgMultiplier = 1 + (atkDmgBonus[atkElement] / 100) - (defResist[atkElement] / 100);

    // 6. 最终伤害
    const nonCrit = totalAtk * (1 - defReduction) * minorBonus * elementBonus * dmgMultiplier;
    const crit = nonCrit * (critDmg / 100);

    // 显示结果
    document.getElementById('result-box').style.display = '';
    document.getElementById('result-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><strong>基础攻击力</strong><br>${baseAtk.toFixed(2)}</div>
        <div><strong>总攻击力</strong><br>${totalAtk.toFixed(2)}</div>
        <div><strong>有效防御</strong><br>${effectiveDef.toFixed(2)}（穿透${pen.toFixed(1)}%）</div>
        <div><strong>防御免伤比例</strong><br>${(defReduction * 100).toFixed(2)}%</div>
        <div><strong>修为压制加成</strong><br>×${minorBonus.toFixed(2)} ${atkLevel > defLevel ? '(攻方高' + (atkLevel - defLevel) + '个小境界)' : '(无)'}</div>
        <div><strong>五行克制</strong><br>×${elementBonus.toFixed(1)} ${countered ? '(克制!)' : '(无克制)'}</div>
        <div><strong>伤害加成系数</strong><br>×${dmgMultiplier.toFixed(2)}</div>
        <div><strong>暴击率 / 暴击伤害</strong><br>${critRate.toFixed(1)}% / ${critDmg.toFixed(1)}%</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid #e2b04a;">
        <div style="text-align:center;">
          <div style="font-size:24px;color:#e2b04a;">${nonCrit.toFixed(2)}</div>
          <div style="color:#a0a0a0;">非暴击伤害</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;color:#e74c3c;">${crit.toFixed(2)}</div>
          <div style="color:#a0a0a0;">暴击伤害</div>
        </div>
      </div>
      <div style="margin-top:12px;color:#a0a0a0;font-size:12px;">
        期望伤害 = 非暴击 × (1 - ${critRate.toFixed(1)}%) + 暴击 × ${critRate.toFixed(1)}%
        = ${(nonCrit * (1 - critRate/100) + crit * critRate/100).toFixed(2)}
      </div>
    `;
  }
};

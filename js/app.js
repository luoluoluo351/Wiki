// 应用入口：路由 + 导航 + 初始化

// 数值超过1万显示为 xx万
function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  var v = Math.abs(n);
  if (v >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return String(Math.round(n));
}

// 全局技能查看弹窗
function showAbilityModal(title, skills, extraSkills) {
  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  function renderList(list, label) {
    if (!list || list.length === 0) return '';
    let h = label ? `<div style="color:var(--gold);font-weight:bold;font-size:16px;margin-bottom:4px;">${label}</div>` : '';
    list.forEach(s => {
      h += `<div class="entry-item" style="margin-bottom:6px;">
        <div style="font-weight:bold;margin-bottom:4px;">${s.name || ''}</div>
        <div style="color:var(--text-dim);font-size:14px;white-space:pre-line;">${s.desc || ''}</div>
      </div>`;
    });
    return h;
  }
  // skills 参数：true 为显示标签，false 为隐藏标签
  // 灵宠分主动/被动，用 extraSkills 区分
  if (skills && Array.isArray(skills)) {
    html += renderList(skills, extraSkills ? '主动技能' : '');
  }
  if (extraSkills && Array.isArray(extraSkills)) {
    html += renderList(extraSkills, skills ? '被动技能' : '');
  }
  html += '</div>';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('skill-modal').style.display = 'flex';
}

const App = {
  _suppressHashChange: false,

  init() {
    this._bindNav();
    this._bindDataActions();
    // 全局委托：列表缩略图点击放大
    document.getElementById('app').addEventListener('click', function (e) {
      const img = e.target.closest('.thumb-clickable');
      if (!img) return;
      e.stopPropagation();
      const modal = document.getElementById('skill-modal');
      document.getElementById('modal-title').textContent = img.alt || '图片预览';
      document.getElementById('modal-body').innerHTML = '<img src="' + img.src + '" style="max-width:100%;max-height:70vh;">';
      modal.style.display = 'flex';
    });
    window.addEventListener('hashchange', () => {
      if (this._suppressHashChange) { this._suppressHashChange = false; return; }
      this._route(location.hash.slice(1));
    });
    this.navigate(location.hash.slice(1) || 'home');
  },




  _bindDataActions() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const json = Storage.exportAll();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiki-data-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (Storage.importAll(reader.result)) {
            alert('导入成功！页面将刷新。');
            App.navigate('home');
          } else {
            alert('导入失败，请检查文件格式。');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },

  _bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => { this.navigate(link.dataset.route); });
    });
  },

  navigate(hash) {
    this._suppressHashChange = true;
    location.hash = hash;
    this._route(hash);
  },

  _route(hash) {
    const { module, action, params } = this._parseHash(hash);
    const app = document.getElementById('app');

    // 首页使用全屏透明布局，不需要白色矩形背景；其他页面统一加上
    if (module === 'home') {
      app.style.background = 'none';
      app.style.borderRadius = '0';
    } else {
      app.style.background = 'rgba(255,255,255,0.8)';
      app.style.borderRadius = '16px';
      app.style.padding = '28px 24px';
      app.style.marginTop = '58px';
      app.style.maxWidth = '1200px';
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === module);
    });

    try {
      if (action === 'detail') {
        switch (module) {
          case 'characters': app.innerHTML = Characters.renderDetail(params.id || ''); Characters.bindDetailEvents(); return;
          case 'treasures':  app.innerHTML = Treasures.renderDetail(params.id || '');  Treasures.bindDetailEvents();  return;
          case 'pets':       app.innerHTML = Pets.renderDetail(params.id || '');       Pets.bindDetailEvents();       return;
          case 'monsters':   app.innerHTML = Monsters.renderDetail(params.id || '');   Monsters.bindDetailEvents();   return;
          case 'skills':     app.innerHTML = Skills.renderDetail(params.id || '', params.type || ''); Skills.bindDetailEvents(); return;
          case 'items':      app.innerHTML = Items.renderDetail(params.id || '');      Items.bindDetailEvents();      return;
          case 'gacha':      app.innerHTML = Gacha.renderPoolDetail(params.id || '');  Gacha.bindPoolDetailEvents();  return;
        }
      }
      if (module === 'gacha' && action === 'edit') {
        app.innerHTML = Gacha.renderPoolEdit(params.id || '');
        Gacha.bindPoolEditEvents();
        return;
      }

      switch (module) {
        case 'home':
          app.innerHTML = HomePage.render();
          if (HomePage.bindEvents) HomePage.bindEvents();
          break;
        case 'characters':
          app.innerHTML = Characters.renderList(); Characters.bindListEvents(); break;
        case 'treasures':
          app.innerHTML = Treasures.renderList();  Treasures.bindListEvents();  break;
        case 'monsters':
          app.innerHTML = Monsters.renderList(); Monsters.bindListEvents(); break;
        case 'items':
          app.innerHTML = Items.renderList();       Items.bindListEvents();       break;
        case 'pets':
          app.innerHTML = Pets.renderList();       Pets.bindListEvents();       break;
        case 'skills':
          app.innerHTML = Skills.renderList();      Skills.bindListEvents();      break;
        case 'map':
          app.innerHTML = MapModule.render(); if (MapModule.bindEvents) MapModule.bindEvents(); break;
        case 'guide':
          app.innerHTML = Guide.render(); if (Guide.bindEvents) Guide.bindEvents(); break;
        case 'damage':
          app.innerHTML = Damage.render();   if (Damage.bindEvents)   Damage.bindEvents();   break;
        case 'leaderboard':
          app.innerHTML = Leaderboard.render(); Leaderboard.bindEvents(); break;
        case 'gacha-normal':
          app.innerHTML = Gacha.renderPoolList('character', 'normal'); Gacha.bindPoolListEvents(); break;
        case 'gacha-up':
          app.innerHTML = Gacha.renderPoolList('character', 'up');     Gacha.bindPoolListEvents(); break;
        case 'gacha-skill':
          app.innerHTML = Gacha.renderPoolList('skill', 'normal');     Gacha.bindPoolListEvents(); break;
        default:
          app.innerHTML = Placeholder.render('页面不存在');
      }
    } catch (e) {
      app.innerHTML = `<div class="placeholder">页面出错: ${e.message}<br><pre>${e.stack}</pre></div>`;
      console.error('路由错误:', e);
    }
  },

  _parseHash(hash) {
    const [path, query] = hash.split('?');
    const parts = path.split('/');
    const params = {};
    if (query) {
      query.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { module: parts[0] || 'home', action: parts[1] || '', params };
  }
};

// 排行榜模块
const Leaderboard = {
  STORAGE: 'leaderboard',

  render() {
    const list = Storage.list(this.STORAGE);
    let rows = '';
    if (list.length === 0) {
      rows = '<div class="placeholder">暂无排行，点击右上角添加角色</div>';
    } else {
      rows = `<div class="row-list">
      <div class="row-header">
        <span class="row-h-col" style="width:72px;">排名</span>
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:100px;">名称</span>
        <span class="row-h-col" style="width:80px;">修为</span>
        <span class="row-h-col" style="width:80px;">宗门</span>
        <span class="row-h-col" style="width:150px;">主修功法</span>
        <span class="row-h-col" style="width:70px;">战力</span>
      </div>`;
      // 按战力排序
      const sorted = [...list].sort((a,b) => {
        const ca = Storage.findById('characters', a.charId);
        const cb = Storage.findById('characters', b.charId);
        if (!ca || !cb) return 0;
        let ta = calcCombatPower(ca), tb = calcCombatPower(cb);
        (ca.mainSkills||[]).forEach(id => { const s=skillNameById(id); if(s) ta+=s.combat||0; });
        (cb.mainSkills||[]).forEach(id => { const s=skillNameById(id); if(s) tb+=s.combat||0; });
        (ca.learnedAbilities||[]).forEach(id => { const s=skillNameById(id); if(s) ta+=s.combat||0; });
        (cb.learnedAbilities||[]).forEach(id => { const s=skillNameById(id); if(s) tb+=s.combat||0; });
        [ca.equippedAttack,ca.equippedDefense,ca.equippedAccessory].forEach(tid=>{if(tid){const t=Storage.findById('treasures',tid);if(t)ta+=calcTreasureCombat(t);}});
        [cb.equippedAttack,cb.equippedDefense,cb.equippedAccessory].forEach(tid=>{if(tid){const t=Storage.findById('treasures',tid);if(t)tb+=calcTreasureCombat(t);}});
        return tb - ta;
      });
      // 始终至少显示 10 名，无上限
      const totalRows = Math.max(sorted.length, 10);
      for (let rank = 1; rank <= totalRows; rank++) {
        const entry = sorted[rank - 1];
        const c = entry ? Storage.findById('characters', entry.charId) : null;
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
        const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        if (!c) {
          rows += `<div class="row-item" style="min-height:130px;opacity:0.35;">
            <span class="rank-badge ${rankClass}">${rankLabel}</span>
            <div class="row-noimg">虚位</div>
            <span class="row-name" style="width:100px;">虚位以待</span>
            <span style="color:var(--text-dim);width:80px;font-size:13px;text-align:center;">—</span>
            <span style="color:var(--text-dim);width:80px;font-size:13px;text-align:center;">—</span>
            <span style="color:var(--text-dim);width:150px;font-size:12px;text-align:center;">—</span>
            <span style="color:var(--text-dim);width:70px;text-align:center;">—</span>
            <span class="row-actions"></span>
          </div>`;
          continue;
        }
        // 兼容旧数据
        if (!c.realmStages||c.realmStages.length===0) {
          c.realmStages = [];
          if (c.basicAttr) {
            const s = {realm:c.realm||'练气初期',hp:c.basicAttr.hp?.lv100||0,atk:c.basicAttr.atk?.lv100||0,def:c.basicAttr.def?.lv100||0,critRate:0,critDmg:0,resist:{metal:0,wood:0,water:0,fire:0,earth:0},dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0}};
            if (c.advancedAttr) { s.critRate=c.advancedAttr.critRate||0; s.critDmg=c.advancedAttr.critDmg||0; ['metal','wood','water','fire','earth'].forEach(k=>{s.resist[k]=c.advancedAttr.resist?.[k]||0;s.dmgBonus[k]=c.advancedAttr.dmgBonus?.[k]||0;}); }
            c.realmStages.push(s);
          }
        }
        const aSrc=(c.avatar||'').startsWith('data:')?c.avatar:(c.avatar?'img/characters/'+c.avatar:'');const avatarHtml=aSrc?`<img src="${aSrc}" alt="${c.name}">`:'<div class="row-noimg">无图</div>';
        let totalCombat = calcCombatPower(c);
        let mainName = '—';
        (c.mainSkills||[]).forEach((skId,i) => {
          const s = skillNameById(skId);
          if (s) { totalCombat += (s.combat||0); if (i===0) mainName = c.mainSkills[0]===c.yuanYingSkill ? s.name+'(元婴)' : s.name; }
        });
        (c.learnedAbilities||[]).forEach(skId => {
          const s = skillNameById(skId);
          if (s) totalCombat += (s.combat||0);
        });
        // 装备法宝战力
        [c.equippedAttack, c.equippedDefense, c.equippedAccessory].forEach(tid => {
          if (!tid) return;
          const t = Storage.findById('treasures', tid);
          if (t) totalCombat += calcTreasureCombat(t);
        });
        rows += `<div class="row-item" style="min-height:130px;">
          <span class="rank-badge ${rankClass}">${rankLabel}</span>
          ${avatarHtml}
          <span class="row-name" style="width:100px;">${c.name||'未命名'}</span>
          ${(()=>{const stages=c.realmStages||[];const cr=stages.length>0?stages[stages.length-1].realm:c.realm;return`<span style="color:var(--text-dim);width:80px;font-size:13px;text-align:center;white-space:nowrap;">${majorName(cr)}期</span>`;})()}
          <span style="color:var(--text-dim);width:80px;font-size:13px;text-align:center;white-space:nowrap;">${c.sect||'—'}</span>
          <span style="color:var(--text-dim);width:150px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mainName}</span>
          <span style="color:var(--gold);font-size:18px;font-weight:bold;width:70px;text-align:center;white-space:nowrap;">${totalCombat}</span>
          <span class="row-actions"><button class="row-icon-btn" onclick="Leaderboard.remove('${entry.charId}')" title="移除">×</button></span>
        </div>`;
      }
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">排行榜</h2><button class="btn-primary" id="btn-add-lb">+ 添加角色</button></div>${rows}`;
  },

  bindEvents() {
    document.getElementById('btn-add-lb')?.addEventListener('click', () => {
      const chars = Storage.list('characters');
      if (chars.length === 0) { alert('请先在角色图鉴中添加角色'); return; }
      const list = Storage.list(this.STORAGE);
      const names = chars.map((c,i) => {
        const already = list.some(e => e.charId === c.id) ? ' [已添加]' : '';
        return `${i+1}. ${c.name||'未命名'} ${c.realm}${already}`;
      }).join('\n');
      const idx = prompt('选择角色加入排行榜（输入序号）：\n' + names);
      if (!idx) return;
      const ci = parseInt(idx) - 1;
      if (ci < 0 || ci >= chars.length) { alert('无效序号'); return; }
      if (list.some(e => e.charId === chars[ci].id)) { alert('该角色已在排行榜中'); return; }
      list.push({ charId: chars[ci].id });
      Storage.set(Leaderboard.STORAGE, list);
      App.navigate('leaderboard');
    });
  },

  remove(charId) {
    const list = Storage.list(this.STORAGE);
    Storage.set(this.STORAGE, list.filter(e => e.charId !== charId));
    App.navigate('leaderboard');
  }
};

// 首页模块
const HomePage = {
  _eventIdx: 0,
  _eventTimer: null,

  _slideEvent(dir){const a=document.querySelectorAll('.event-slide');const v=[];a.forEach((s,i)=>{if(!s.classList.contains('ev-hidden'))v.push(i);});if(v.length<=1)return;let c=v.indexOf(this._eventIdx);if(c<0)c=0;this._eventIdx=v[(c+dir+v.length)%v.length];this._goEvent(this._eventIdx);},
  _goEvent(idx) {
    this._eventIdx = idx;
    const track = document.getElementById('event-track');
    if (track) track.style.transform = `translateX(-${idx * 100}%)`;
    this._updateDots();
  },

  _startEventAuto() {
    clearInterval(this._eventTimer);
    this._updateDots();
    this._eventTimer = setInterval(() => { this._slideEvent(1); }, 5000);
  },

  _updateDots(){const a=document.querySelectorAll('.event-slide');const v=[];a.forEach((s,i)=>{if(!s.classList.contains('ev-hidden'))v.push(i);});const dots=document.getElementById('event-dots');if(!dots||v.length<=1){if(dots)dots.innerHTML='';return;}dots.innerHTML=v.map(vi=>`<span class="event-dot${vi===this._eventIdx?' active':''}" onclick="HomePage._goEvent(${vi})"></span>`).join('');},

  _defaultPoem: `【修仙行】
青崖白鹿访名山，一剑凌霄破九关。
炼气筑基磨道骨，金丹元婴换朱颜。
五行轮转参天地，八卦阴阳悟妙玄。
竹影摇风窥造化，松涛入定忘尘寰。
灵宠相随云路远，法宝护道月光寒。
千劫万难终不老，一朝飞升任往还。`,

  render() {
    const bg = 'img/bg-1.jpg';

    // 近期更新
    const updates = JSON.parse(localStorage.getItem('home_updates') || '[]');
    let updatesHtml = '';
    if (updates.length === 0) {
      updatesHtml = '<div style="color:var(--text-light);font-size:13px;padding:8px 0;">暂无更新记录</div>';
    } else {
      updatesHtml = updates.slice(0, 20).map((u, i) => `
        <div class="home-update-item">
          <div class="home-update-top">
            <span class="home-update-date">${u.date || ''}</span>
            <span class="home-update-actions">
              <button class="home-update-btn" data-action="edit-update" data-idx="${i}" title="编辑">✎</button>
              <button class="home-update-btn" data-action="del-update" data-idx="${i}" title="删除">×</button>
            </span>
          </div>
          <span class="home-update-text">${u.text || ''}</span>
        </div>
      `).join('');
    }

    // 公告
    const announcement = localStorage.getItem('home_announcement') || this._defaultPoem;

    // 导航链接
    const navLinks = [
      { hash: 'characters', label: '角色图鉴', icon: '👤' },
      { hash: 'treasures',  label: '法宝图鉴', icon: '⚔️' },
      { hash: 'pets',       label: '灵宠图鉴', icon: '🐉' },
      { hash: 'skills',     label: '功法与神通', icon: '📜' },
      { hash: 'map',        label: '地图', icon: '🗺️' },
      { hash: 'damage',     label: '伤害计算器', icon: '⚡' }
    ];
    const navHtml = navLinks.map(l => `
      <a class="home-nav-link" href="#${l.hash}" onclick="App.navigate('${l.hash}');return false">
        <span>${l.icon}</span><span>${l.label}</span>
      </a>
    `).join('');

    return `
      <div class="home-page">
        <div class="home-hero" id="home-bg-zone" style="display:flex;flex-direction:column;padding:58px 0 0;min-height:calc(100vh - 58px);">

          <!-- 三栏：左更新 + 中轮播 + 右公告 -->
          <div style="display:flex;width:100%;align-items:stretch;flex:1;min-height:400px;gap:0;padding:0;max-width:1400px;margin:0 auto;background:rgba(255,255,255,0.6);border-radius:16px;">

          <!-- 左栏：近期更新 -->
          <div class="home-panel" style="width:260px;border-right:1px solid rgba(184,148,76,0.15);">
            <div class="home-panel-header">
              <h3>近期更新</h3>
              <button class="btn-add" id="btn-add-update" style="font-size:14px;">+</button>
            </div>
            <div class="home-panel-body" id="updates-list">${updatesHtml}</div>
          </div>

          <!-- 中栏：活动轮播 -->
          <div class="event-carousel" id="event-carousel" style="flex:1;flex-direction:column;">
            <div class="event-track" id="event-track" style="flex:1;">
              ${Array.from({length:8},(_,i)=>`<div class="event-slide" id="evs-${i}"><img src="img/events/event-${i+1}.png" onerror="document.getElementById('evs-${i}').classList.add('ev-hidden');HomePage._updateDots()" onload="HomePage._updateDots()"></div>`).join('')}
            </div>
            <div class="event-dots" id="event-dots"></div>
          </div>

          <!-- 右栏：公告 + 导航 -->
          <div class="home-panel" style="width:260px;border-left:1px solid rgba(184,148,76,0.15);">
            <div class="home-panel-header">
              <h3>公告</h3>
              <button class="btn-add" id="btn-edit-announce" style="font-size:14px;">✎</button>
            </div>
            <div class="home-panel-body">
              <div class="home-announce-text" id="announce-text">${announcement.replace(/\n/g, '<br>')}</div>
              <textarea id="announce-textarea" style="display:none;width:100%;min-height:160px;">${announcement}</textarea>
              <button class="btn-primary" id="btn-save-announce" style="display:none;margin-top:8px;font-size:12px;">保存公告</button>
            </div>
            <div class="home-panel-header" style="margin-top:16px;"><h3>快捷导航</h3></div>
            <div class="home-panel-body home-nav-links">${navHtml}</div>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    this._startEventAuto();
    // === 近期更新 ===
    document.getElementById('btn-add-update')?.addEventListener('click', () => {
      const text = prompt('输入更新内容：');
      if (!text || !text.trim()) return;
      const updates = JSON.parse(localStorage.getItem('home_updates') || '[]');
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      updates.unshift({ date, text: text.trim() });
      if (updates.length > 20) updates.length = 20;
      localStorage.setItem('home_updates', JSON.stringify(updates));
      App.navigate('home');
    });

    // 编辑更新
    document.querySelectorAll('[data-action="edit-update"]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = parseInt(this.dataset.idx);
        const updates = JSON.parse(localStorage.getItem('home_updates') || '[]');
        if (idx >= 0 && idx < updates.length) {
          const text = prompt('编辑更新内容：', updates[idx].text);
          if (text !== null && text.trim()) {
            updates[idx].text = text.trim();
            localStorage.setItem('home_updates', JSON.stringify(updates));
            App.navigate('home');
          }
        }
      });
    });

    // 删除更新
    document.querySelectorAll('[data-action="del-update"]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('确定删除这条更新？')) return;
        const idx = parseInt(this.dataset.idx);
        const updates = JSON.parse(localStorage.getItem('home_updates') || '[]');
        if (idx >= 0 && idx < updates.length) {
          updates.splice(idx, 1);
          localStorage.setItem('home_updates', JSON.stringify(updates));
          App.navigate('home');
        }
      });
    });

    // === 公告编辑 ===
    document.getElementById('btn-edit-announce')?.addEventListener('click', () => {
      const textDiv = document.getElementById('announce-text');
      const textarea = document.getElementById('announce-textarea');
      const saveBtn = document.getElementById('btn-save-announce');
      if (textDiv) textDiv.style.display = 'none';
      if (textarea) textarea.style.display = '';
      if (saveBtn) saveBtn.style.display = '';
    });

    document.getElementById('btn-save-announce')?.addEventListener('click', () => {
      const textarea = document.getElementById('announce-textarea');
      if (textarea) {
        localStorage.setItem('home_announcement', textarea.value);
        App.navigate('home');
      }
    });

  },

};

// 多选项最多选3个
function limitCheckbox(e, max) {
  if (!e.target.checked) return;
  const group = e.target.closest('.checkbox-group');
  if (!group) return;
  const checked = group.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length > max) { e.target.checked = false; alert(`最多选择 ${max} 个`); }
}

// 全局背景轮换（img/background/ 文件夹图片，所有模块共用）
(function(){
  if(!localStorage.getItem('home_bg_count')) localStorage.setItem('home_bg_count','4');
  let idx=0,count=parseInt(localStorage.getItem('home_bg_count'),10);
  setTimeout(()=>{const e=document.getElementById('global-bg');if(e)e.style.backgroundImage='url(img/background/bg1.jpg)';},50);
  setInterval(()=>{const e=document.getElementById('global-bg');if(e){idx=(idx+1)%count;e.style.backgroundImage=`url(img/background/bg${idx+1}.jpg)`;}},15000);
})();

document.addEventListener('DOMContentLoaded', () => App.init());


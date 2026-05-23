// 应用入口：路由 + 导航 + 初始化

const App = {
  _suppressHashChange: false,

  init() {
    this._bindNav();
    window.addEventListener('hashchange', () => {
      if (this._suppressHashChange) { this._suppressHashChange = false; return; }
      this._route(location.hash.slice(1));
    });
    this.navigate(location.hash.slice(1) || 'home');
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

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === module);
    });

    try {
      if (action === 'detail') {
        switch (module) {
          case 'characters': app.innerHTML = Characters.renderDetail(params.id || ''); Characters.bindDetailEvents(); return;
          case 'treasures':  app.innerHTML = Treasures.renderDetail(params.id || '');  Treasures.bindDetailEvents();  return;
          case 'pets':       app.innerHTML = Pets.renderDetail(params.id || '');       Pets.bindDetailEvents();       return;
          case 'skills':     app.innerHTML = Skills.renderDetail(params.id || '', params.type || ''); Skills.bindDetailEvents(); return;
        }
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
          app.innerHTML = Placeholder.render('怪物图鉴 — 暂未开发'); break;
        case 'items':
          app.innerHTML = Placeholder.render('道具图鉴 — 暂未开发'); break;
        case 'pets':
          app.innerHTML = Pets.renderList();       Pets.bindListEvents();       break;
        case 'skills':
          app.innerHTML = Skills.renderList();      Skills.bindListEvents();      break;
        case 'story':
          app.innerHTML = Placeholder.render('剧情 — 暂未开发'); break;
        case 'map':
          app.innerHTML = MapModule.render(); if (MapModule.bindEvents) MapModule.bindEvents(); break;
        case 'damage':
          app.innerHTML = Damage.render();   if (Damage.bindEvents)   Damage.bindEvents();   break;
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

// 首页模块
const HomePage = {

  _rotationTimer: null,
  _rotationIndex: 0,
  _bgList: [],

  // 默认修仙诗
  _defaultPoem: `【修仙行】
青崖白鹿访名山，一剑凌霄破九关。
炼气筑基磨道骨，金丹元婴换朱颜。
五行轮转参天地，八卦阴阳悟妙玄。
竹影摇风窥造化，松涛入定忘尘寰。
灵宠相随云路远，法宝护道月光寒。
千劫万难终不老，一朝飞升任往还。`,

  render() {
    const bg = localStorage.getItem('home_bg') || 'img/bg-1.jpg';

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
        <div class="home-hero" id="home-bg-zone" style="background-image:url(${bg});background-size:cover;background-position:center;">

          <!-- 左栏：近期更新 -->
          <div class="home-panel home-panel-left">
            <div class="home-panel-header">
              <h3>近期更新</h3>
              <button class="btn-add" id="btn-add-update" style="font-size:14px;">+</button>
            </div>
            <div class="home-panel-body" id="updates-list">${updatesHtml}</div>
          </div>

          <!-- 中栏：标题+八卦 -->
          <div class="home-center">
            <div class="home-title">修仙 Wiki</div>
          </div>

          <!-- 更换背景按钮（右下角） -->
          <button class="home-bg-btn" id="btn-change-bg" title="更换背景图">🖼</button>

          <!-- 右栏：公告 + 导航 -->
          <div class="home-panel home-panel-right">
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
    `;
  },

  bindEvents() {
    const zone = document.getElementById('home-bg-zone');
    if (!zone) return;

    // === 背景轮换 ===
    this._startRotation(zone);

    // 更换背景
    const doUpload = () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
          localStorage.setItem('home_bg', reader.result);
          this._stopRotation();
          App.navigate('home');
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    document.getElementById('btn-change-bg')?.addEventListener('click', (e) => {
      e.stopPropagation(); doUpload();
    });
    // Background change only via the bottom-right button

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

  // 扫描可用背景图
  _scanBgImages(callback) {
    const list = [];
    let loaded = 0;
    for (let i = 1; i <= 20; i++) {
      const img = new Image();
      img.onload = function () { list.push({ path: this.src, idx: i - 1 }); check(); };
      img.onerror = function () { check(); };
      img.src = `img/bg-${i}.jpg?t=${Date.now()}`;
    }
    function check() {
      loaded++;
      if (loaded >= 20 && callback) {
        callback(list.sort((a, b) => a.idx - b.idx).map(x => x.path));
      }
    }
  },

  _startRotation(zone) {
    this._stopRotation();
    // 如果有用户上传的背景，不轮换
    if (localStorage.getItem('home_bg')) return;

    this._scanBgImages((bgList) => {
      if (bgList.length <= 1) return;
      this._bgList = bgList;
      this._rotationIndex = parseInt(sessionStorage.getItem('home_bg_idx') || '0', 10) % bgList.length;
      // 立即应用当前索引
      zone.style.backgroundImage = `url(${bgList[this._rotationIndex]})`;

      this._rotationTimer = setInterval(() => {
        this._rotationIndex = (this._rotationIndex + 1) % this._bgList.length;
        sessionStorage.setItem('home_bg_idx', this._rotationIndex);
        const el = document.getElementById('home-bg-zone');
        if (el && this._bgList[this._rotationIndex]) {
          el.style.backgroundImage = `url(${this._bgList[this._rotationIndex]})`;
          el.style.transition = 'background-image 0.8s ease-in-out';
        }
      }, 60000);
    });
  },

  _stopRotation() {
    if (this._rotationTimer) {
      clearInterval(this._rotationTimer);
      this._rotationTimer = null;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

// 应用入口：路由 + 导航 + 初始化

const App = {

  init() {
    this._bindNav();
    window.addEventListener('hashchange', () => {
      this.navigate(location.hash.slice(1));
    });
    const hash = location.hash.slice(1) || 'characters';
    this.navigate(hash);
  },

  _bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        location.hash = link.dataset.route;
      });
    });
  },

  // 解析 hash
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
    return { module: parts[0] || 'characters', action: parts[1] || '', params };
  },

  // 核心渲染方法（同步，不依赖 hashchange）
  render(module, action, params) {
    const app = document.getElementById('app');

    // 导航高亮
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === module);
    });

    if (action === 'detail') {
      switch (module) {
        case 'characters':
          app.innerHTML = Characters.renderDetail(params.id || '');
          Characters.bindDetailEvents();
          return;
        case 'treasures':
          app.innerHTML = Treasures.renderDetail(params.id || '');
          Treasures.bindDetailEvents();
          return;
        case 'pets':
          app.innerHTML = Pets.renderDetail(params.id || '');
          Pets.bindDetailEvents();
          return;
        case 'skills':
          app.innerHTML = Skills.renderDetail(params.id || '', params.type || '');
          Skills.bindDetailEvents();
          return;
      }
    }

    switch (module) {
      case 'characters':
        app.innerHTML = Characters.renderList();
        Characters.bindListEvents();
        break;
      case 'treasures':
        app.innerHTML = Treasures.renderList();
        Treasures.bindListEvents();
        break;
      case 'monsters':
        app.innerHTML = Placeholder.render('怪物图鉴 — 暂未开发');
        break;
      case 'items':
        app.innerHTML = Placeholder.render('道具图鉴 — 暂未开发');
        break;
      case 'pets':
        app.innerHTML = Pets.renderList();
        Pets.bindListEvents();
        break;
      case 'skills':
        app.innerHTML = Skills.renderList();
        Skills.bindListEvents();
        break;
      case 'story':
        app.innerHTML = Placeholder.render('剧情 — 暂未开发');
        break;
      case 'map':
        app.innerHTML = MapModule.render();
        if (MapModule.bindEvents) MapModule.bindEvents();
        break;
      case 'damage':
        app.innerHTML = Damage.render();
        if (Damage.bindEvents) Damage.bindEvents();
        break;
      default:
        app.innerHTML = Placeholder.render('页面不存在');
    }
  },

  navigate(hash) {
    const parsed = this._parseHash(hash);
    this.render(parsed.module, parsed.action, parsed.params);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

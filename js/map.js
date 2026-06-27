// 地图模块

var HUMAN_REALM = {
  main: 'img/map/人界-疆域图.png',
  subs: ['中原图','东海图','北极图','西域图','南疆图']
};

var MapModule = {
  _realm: 'human',    // human / spirit / immortal
  _sub: null,         // 当前选中的子区域名称

  render: function() {
    var self = this;
    var realms = [
      { key:'human', label:'人界' },
      { key:'spirit', label:'灵界' },
      { key:'immortal', label:'仙界' }
    ];

    var realmTabs = realms.map(function(r){
      var active = self._realm === r.key ? ' style="background:var(--gold);color:#fff;font-weight:bold;"' : '';
      return '<button class="map-realm-btn" data-realm="'+r.key+'"'+active+'>'+r.label+'</button>';
    }).join('');

    var contentHtml = '';
    if (self._realm === 'human') {
      var imgSrc = self._sub ? 'img/map/人界-'+self._sub+'.png' : HUMAN_REALM.main;
      contentHtml = '<img src="'+imgSrc+'" style="width:100%;border-radius:4px;cursor:zoom-in;" alt="地图" data-zoom="'+imgSrc+'" onerror="this.alt=\'图片缺失: '+(self._sub||'疆域图')+'\';">';

      var subBtns = HUMAN_REALM.subs.map(function(s){
        var active = self._sub === s ? ' map-sub-active' : '';
        return '<button class="map-sub-btn'+active+'" data-sub="'+s+'">'+s+'</button>';
      }).join('');

      contentHtml = '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">'+
        '<button class="map-sub-btn'+(self._sub===null?' map-sub-active':'')+'" data-sub="">疆域总览</button>'+subBtns+
        '</div>'+contentHtml;
    } else if (self._realm === 'spirit') {
      contentHtml = '<div class="placeholder">灵界地图 — 暂未开放</div>';
    } else {
      contentHtml = '<div class="placeholder">仙界地图 — 暂未开放</div>';
    }

    return '<div class="toolbar"><h2 style="color:#b8944c;flex:1;">地图</h2>'+realmTabs+'</div>'+
      '<div style="width:100%;" id="map-content">'+contentHtml+'</div>';
  },

  bindEvents: function() {
    var self = this;
    // 点击地图全屏放大
    var mapImg = document.querySelector('img[data-zoom]');
    if (mapImg) {
      mapImg.addEventListener('click', function(){
        var src = this.dataset.zoom;
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:600;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        overlay.innerHTML = '<img src="'+src+'" style="max-width:98vw;max-height:98vh;object-fit:contain;">';
        overlay.addEventListener('click', function(){ this.remove(); });
        document.body.appendChild(overlay);
      });
    }
    document.querySelectorAll('.map-realm-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        self._realm = this.dataset.realm;
        self._sub = null;
        App.navigate('map');
      });
    });
    document.querySelectorAll('.map-sub-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        self._sub = this.dataset.sub || null;
        App.navigate('map');
      });
    });
  }
};

// 道具图鉴

const ITEMS_KEY = 'items';
const ITEM_TYPES = ['货币','消耗品','材料','丹药','灵药','法宝材料','其他'];

function createEmptyItem() {
  return { id:'', name:'', type:'消耗品', grade:'普通', desc:'', icon:'' };
}

// 首次加载时预置灵石
(function(){
  const list = JSON.parse(localStorage.getItem(ITEMS_KEY) || 'null');
  if (!list || !Array.isArray(list) || list.length === 0) {
    const lingshi = { id: Storage.uid(), name: '灵石', type: '货币', grade: '普通', desc: '修仙界通用货币，蕴含微量灵气', icon: '灵石.png' };
    localStorage.setItem(ITEMS_KEY, JSON.stringify([lingshi]));
  }
  // 迁移旧数据：灵石图标为空则补上
  if (Array.isArray(list)) {
    var updated = false;
    list.forEach(function(item) {
      if (item.name === '灵石' && !item.icon) { item.icon = '灵石.png'; updated = true; }
    });
    if (updated) localStorage.setItem(ITEMS_KEY, JSON.stringify(list));
  }
})();

const Items = {

  renderList() {
    const list = Storage.list(ITEMS_KEY);
    let rows = '';
    if (list.length === 0) {
      rows = '<div class="placeholder">暂无道具，点击右上角按钮添加</div>';
    } else {
      rows = `<div class="row-list">
      <div class="row-header">
        <span class="row-h-col" style="width:72px;"></span>
        <span class="row-h-col" style="width:140px;">名称</span>
        <span class="row-h-col" style="width:80px;">类型</span>
        <span class="row-h-col" style="width:80px;">品阶</span>
        <span class="row-h-col" style="width:200px;">描述</span>
        <span class="row-h-col" style="width:100px;"></span>
      </div>`;
      list.forEach(item => {
        const iconSrc = (item.icon || '').startsWith('data:') ? item.icon : (item.icon ? 'img/items/' + item.icon : '');
        const iconHtml = iconSrc ? `<img src="${iconSrc}" alt="${item.name}">` : '<div class="row-noimg">无图</div>';
        rows += `<div class="row-item">
          ${iconHtml}
          <span class="row-name" style="width:140px;">${item.name || '未命名'}</span>
          <span style="color:var(--text-dim);width:80px;font-size:13px;text-align:center;">${item.type || '—'}</span>
          <span style="color:var(--gold);width:80px;font-size:13px;text-align:center;">${item.grade || '—'}</span>
          <span style="color:var(--text-dim);width:200px;font-size:12px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.desc || '—'}</span>
          <span class="row-actions" style="width:100px;justify-content:center;">
            <button class="row-icon-btn" onclick="App.navigate('items/detail?id=${item.id}')" title="编辑">✎</button>
            <button class="row-icon-btn" onclick="if(confirm('确定删除此道具?')){Storage.deleteById('${ITEMS_KEY}','${item.id}');App.navigate('items');}" title="删除" style="color:var(--red);">×</button>
          </span>
        </div>`;
      });
      rows += '</div>';
    }
    return `<div class="toolbar"><h2 style="color:var(--gold);flex:1;">道具图鉴</h2><button class="btn-primary" onclick="App.navigate('items/detail')">+ 添加道具</button></div>${rows}`;
  },

  renderDetail(id) {
    const item = id ? Storage.findById(ITEMS_KEY, id) : createEmptyItem();
    if (id && !item) return '<div class="placeholder">道具不存在</div>';
    const isNew = !id;

    return `<div class="detail-page" data-item-id="${item.id || ''}" data-is-new="${isNew}">
      <div class="toolbar">
        <button class="btn-primary" onclick="App.navigate('items')">← 返回列表</button>
        <button class="btn-primary" id="btn-save-item">保存</button>
        <button class="btn-danger" id="btn-del-item" ${isNew ? 'style="display:none"' : ''}>删除道具</button>
      </div>

      <fieldset class="fieldset"><legend>基本信息</legend>
        <div class="form-row">
          <div style="flex:0 0 200px;"><label>图标</label><div id="item-icon-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div>
          <div style="flex:1;">
            <div class="form-group"><label>名称</label><input type="text" id="item-name" value="${item.name || ''}" style="width:100%;font-size:18px;"></div>
            <div class="form-row">
              <div style="flex:1;"><label>类型</label><select id="item-type" style="width:100%;">${ITEM_TYPES.map(t => `<option value="${t}" ${item.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
              <div style="flex:1;"><label>品阶</label><input type="text" id="item-grade" value="${item.grade || ''}" placeholder="如：普通、稀有、仙品" style="width:100%;"></div>
            </div>
            <div class="form-group"><label>描述</label><textarea id="item-desc" style="width:100%;">${item.desc || ''}</textarea></div>
          </div>
        </div>
      </fieldset>

      <div class="toolbar" style="margin-top:20px;">
        <button class="btn-primary" id="btn-save-item2">保存</button>
        <button class="btn-danger" id="btn-del-item2" ${isNew ? 'style="display:none"' : ''}>删除道具</button>
      </div>
    </div>`;
  },

  bindDetailEvents() {
    const el = document.querySelector('.detail-page'); if (!el) return;
    const itemId = el.dataset.itemId; const isNew = el.dataset.isNew === 'true';
    const iz = document.getElementById('item-icon-zone');
    if (iz) {
      let cur = itemId ? Storage.findById(ITEMS_KEY, itemId) : createEmptyItem();
      ImageUpload.setup(iz, cur?.icon || '', () => {}, 'items/');
    }
    const save = () => {
      const d = this._collect(itemId);
      if (!d.name.trim()) { alert('请输入道具名称'); return; }
      if (!d.id) d.id = Storage.uid();
      Storage.save(ITEMS_KEY, d);
      App.navigate('items');
    };
    document.getElementById('btn-save-item')?.addEventListener('click', save);
    document.getElementById('btn-save-item2')?.addEventListener('click', save);
    const del = () => {
      if (confirm('确定删除该道具？')) { Storage.deleteById(ITEMS_KEY, itemId); App.navigate('items'); }
    };
    document.getElementById('btn-del-item')?.addEventListener('click', del);
    document.getElementById('btn-del-item2')?.addEventListener('click', del);
  },

  _collect(itemId) {
    let d = itemId ? Storage.findById(ITEMS_KEY, itemId) : createEmptyItem();
    if (!d) d = createEmptyItem();
    d.id = itemId || '';
    d.name = document.getElementById('item-name')?.value?.trim() || '';
    d.type = document.getElementById('item-type')?.value || '消耗品';
    d.grade = document.getElementById('item-grade')?.value?.trim() || '';
    d.desc = document.getElementById('item-desc')?.value?.trim() || '';
    d.icon = document.querySelector('#item-icon-zone .img-filename-input')?.value?.trim() || '';
    return d;
  },

  bindListEvents() {}
};

// 地图模块

const MAP_STORAGE = 'map_image';

const MapModule = {

  render() {
    const image = localStorage.getItem(MAP_STORAGE);
    const hasImage = image && image.startsWith('data:image/');

    return `
      <div class="toolbar">
        <h2 style="color:#e2b04a;flex:1;">地图</h2>
        ${hasImage ? '<button class="btn-danger" id="btn-del-map">删除地图</button>' : ''}
      </div>
      <div id="map-drop-zone" class="drop-zone" style="min-height:${hasImage ? 'auto' : '300px'};padding:${hasImage ? '0' : '40px'};">
        ${hasImage ? `<img src="${image}" style="width:100%;border-radius:4px;" alt="地图">` : '拖拽地图图片到此处<br>或点击选择文件'}
      </div>
    `;
  },

  bindEvents() {
    const zone = document.getElementById('map-drop-zone');
    if (!zone) return;

    ImageUpload.create(zone, (base64) => {
      localStorage.setItem(MAP_STORAGE, base64);
      // 不重新渲染，直接显示预览已在 create 中处理
    });

    // 如果已有图片，zone 已被 create 处理，但预览已显示。create 会重置点击行为
    // 对于已存在图片的情况，需要让 zone 可点击替换
    // ImageUpload.create 已经处理了点击和拖拽

    document.getElementById('btn-del-map')?.addEventListener('click', () => {
      if (confirm('确定要删除地图吗？')) {
        localStorage.removeItem(MAP_STORAGE);
        App.navigate('map');
      }
    });
  }
};

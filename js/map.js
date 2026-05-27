// 地图模块

const MAP_IMAGE = 'img/e9b08fb6de6cf23e6c08468bd25ca29c.jpg';

const MapModule = {

  render() {
    return `
      <div class="toolbar">
        <h2 style="color:#b8944c;">地图</h2>
      </div>
      <div style="width:100%;">
        <img src="${MAP_IMAGE}" style="width:100%;border-radius:4px;" alt="地图">
      </div>
    `;
  },

  bindEvents() {
    // 无交互
  }
};

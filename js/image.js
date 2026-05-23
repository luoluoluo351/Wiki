// 图片拖拽上传通用组件

const ImageUpload = {
  // 创建一个拖拽上传区域
  // el: 容器 DOM 元素
  // onChange: (base64String) => void  图片变化回调
  create(el, onChange) {
    const zone = el;

    zone.classList.add('drop-zone');
    zone.setAttribute('tabindex', '0');

    // 点击触发文件选择
    zone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) this._readFile(file, onChange, zone);
      };
      input.click();
    });

    // 拖拽事件
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._readFile(file, onChange, zone);
    });
  },

  _readFile(file, onChange, zone) {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      // 显示预览
      zone.innerHTML = `<img src="${base64}" alt="预览">`;
      if (onChange) onChange(base64);
    };
    reader.readAsDataURL(file);
  },

  // 设置已有图片用于预览
  setPreview(zone, base64) {
    if (base64) {
      zone.innerHTML = `<img src="${base64}" alt="预览">`;
    } else {
      zone.innerHTML = '拖拽图片到此处<br>或点击选择文件';
    }
  },

  // 重置为空
  reset(zone, placeholder) {
    zone.innerHTML = placeholder || '拖拽图片到此处<br>或点击选择文件';
  }
};

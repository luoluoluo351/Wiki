// 图片组件 — 纯文件名引用（图片存入 img/ 文件夹）
const ImageUpload = {
  // 初始化预览区 + 文件名输入框
  // subfolder: img/ 下的子目录，如 'characters/', 'treasures/'，默认为 ''
  setup(zone, currentValue, onChange, subfolder) {
    const sf = subfolder || '';
    const basePath = 'img/' + sf;
    zone.classList.add('drop-zone');
    zone.style.flexDirection = 'column';
    zone.style.gap = '6px';
    zone.innerHTML = '';

    if (currentValue && currentValue.startsWith('data:image/')) {
      const img = document.createElement('img'); img.src = currentValue;
      zone.appendChild(img);
      zone.appendChild(Object.assign(document.createElement('div'),{style:'color:var(--text-light);font-size:11px;',textContent:'旧 base64 图片，建议替换为 ' + basePath + ' 文件引用'}));
    } else if (currentValue) {
      const img = document.createElement('img');
      img.src = basePath + currentValue;
      img.onerror = () => { img.alt = '文件不存在: ' + basePath + currentValue; };
      zone.appendChild(img);
    } else {
      zone.appendChild(Object.assign(document.createElement('div'),{style:'color:var(--text-light);',textContent:'图片放在 ' + basePath + ' 文件夹'}));
    }

    const input = document.createElement('input');
    input.type = 'text'; input.className = 'img-filename-input';
    input.placeholder = '输入图片文件名（如 avatar.png）';
    input.value = (!currentValue || currentValue.startsWith('data:image/')) ? '' : currentValue;
    input.style.cssText = 'width:90%;text-align:center;font-size:13px;';
    input.addEventListener('input', () => {
      const name = input.value.trim();
      if (onChange) onChange(name);
      const img = zone.querySelector('img');
      if (name) {
        if (img) img.src = basePath + name;
        else { const ni = document.createElement('img'); ni.src = basePath + name; zone.insertBefore(ni, input); }
      } else if (img && !img.src.startsWith('data:')) {
        img.remove();
      }
    });
    zone.appendChild(input);
  }
};

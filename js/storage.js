// 数据存储工具

const Storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('读取数据失败:', key, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('写入数据失败:', key, e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // 获取列表，为空时返回空数组
  list(key) {
    const data = this.get(key);
    return Array.isArray(data) ? data : [];
  },

  // 根据 id 查找单条
  findById(key, id) {
    const list = this.list(key);
    return list.find(item => item.id === id) || null;
  },

  // 保存单条（新增或更新）
  save(key, item) {
    const list = this.list(key);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    return this.set(key, list);
  },

  // 删除单条
  deleteById(key, id) {
    const list = this.list(key);
    const filtered = list.filter(i => i.id !== id);
    return this.set(key, filtered);
  },

  // 生成唯一 ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
};

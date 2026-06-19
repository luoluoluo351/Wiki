// 剧情模块

var STORY_CHAPTERS_KEY = 'story_chapters';
var STORY_SECTIONS_KEY = 'story_sections';

var FONT_FACES = ['宋体','黑体','楷体','微软雅黑','仿宋','隶书'];
var FONT_SIZES = ['12','14','16','18','20','24','28'];
var PRESET_COLORS = ['#000000','#333333','#666666','#b8944c','#ff3333','#ff8800','#4488ff','#aa44ff','#5a7a4a','#c46b5b','#8b4513','#ffffff'];

function createEmptyChapter() {
  var chapters = Storage.list(STORY_CHAPTERS_KEY);
  return { id:'', title:'', order: chapters.length + 1 };
}
function createEmptySection(chapterId) {
  var sections = Storage.list(STORY_SECTIONS_KEY).filter(function(s){ return s.chapterId === chapterId; });
  return { id:'', chapterId: chapterId, title:'', content:'', globalFont:'', globalFontSize:'', order: sections.length + 1 };
}

var Story = {
  _currentSection: null,
  _editing: false,

  render: function() {
    var self = this;
    var chapters = Storage.list(STORY_CHAPTERS_KEY).sort(function(a,b){ return (a.order||0)-(b.order||0); });
    var sections = Storage.list(STORY_SECTIONS_KEY);

    // === 左侧导航 ===
    var navHtml = '<div class="story-nav"><div class="story-nav-title">📖 剧情目录</div>';
    if (chapters.length === 0) {
      navHtml += '<div class="story-nav-empty">暂无章节，点击下方添加</div>';
    } else {
      chapters.forEach(function(ch){
        var chapSections = sections.filter(function(s){ return s.chapterId === ch.id; }).sort(function(a,b){ return (a.order||0)-(b.order||0); });
        navHtml += '<div class="story-chapter">'+
          '<div class="story-chapter-header" data-chapter="'+ch.id+'">'+
            '<span class="story-chapter-arrow">▸</span>'+
            '<span class="story-chapter-title">'+ (ch.title||'未命名章节') +'</span>'+
            '<span class="story-chapter-actions">'+
              '<button class="story-nav-btn" data-action="edit-chapter" data-id="'+ch.id+'" title="编辑">✎</button>'+
              '<button class="story-nav-btn" data-action="del-chapter" data-id="'+ch.id+'" title="删除">×</button>'+
            '</span>'+
          '</div>'+
          '<div class="story-sections" style="display:none;">';
        chapSections.forEach(function(sec){
          var activeClass = (self._currentSection && self._currentSection.id === sec.id) ? ' story-section-active' : '';
          navHtml += '<div class="story-section-item'+activeClass+'" data-section="'+sec.id+'">'+
            '<span class="story-section-title">'+ (sec.title||'未命名小节') +'</span>'+
            '<span class="story-section-actions">'+
              '<button class="story-nav-btn" data-action="edit-section" data-id="'+sec.id+'" title="编辑">✎</button>'+
              '<button class="story-nav-btn" data-action="del-section" data-id="'+sec.id+'" title="删除">×</button>'+
            '</span></div>';
        });
        navHtml += '<div class="story-add-section" data-chapter="'+ch.id+'">+ 添加小节</div></div></div>';
      });
    }
    navHtml += '<button class="story-add-chapter-btn" id="btn-add-chapter">+ 添加章节</button></div>';

    // === 右侧内容区 ===
    var contentHtml = '<div class="story-content" id="story-content-area">';
    var sec = self._currentSection;
    if (sec) {
      contentHtml += '<div class="story-content-toolbar">'+
        '<span class="story-content-title" id="story-section-title-display">'+ (sec.title||'未命名小节') +'</span>'+
        '<span style="flex:1;"></span>'+
        '<button class="btn-primary btn-sm" id="btn-edit-section-content">✎ 编辑</button>'+
        '</div>'+
        '<div class="story-content-body" id="story-content-body" style="'+(sec.globalFont?'font-family:'+sec.globalFont+';':'')+(sec.globalFontSize?'font-size:'+sec.globalFontSize+';':'')+'">'+ (sec.content||'<div class="story-empty">暂无内容，点击编辑开始写作</div>') +'</div>';
    } else {
      contentHtml += '<div class="story-empty">← 请从左侧选择一个小节</div>';
    }
    contentHtml += '</div>';

    return '<div class="story-page">'+navHtml+contentHtml+'</div>';
  },

  bindEvents: function() {
    var self = this;

    // 章节展开/折叠
    document.querySelectorAll('.story-chapter-header').forEach(function(header){
      header.addEventListener('click', function(e){
        if (e.target.tagName === 'BUTTON') return;
        var sections = this.nextElementSibling;
        var arrow = this.querySelector('.story-chapter-arrow');
        if (sections) {
          var isOpen = sections.style.display !== 'none';
          sections.style.display = isOpen ? 'none' : '';
          if (arrow) arrow.textContent = isOpen ? '▸' : '▾';
        }
      });
    });

    // 点击小节 → 选中
    document.querySelectorAll('.story-section-item').forEach(function(item){
      item.addEventListener('click', function(e){
        if (e.target.tagName === 'BUTTON') return;
        var secId = this.dataset.section;
        var sec = Storage.findById(STORY_SECTIONS_KEY, secId);
        if (sec) {
          self._currentSection = sec;
          self._editing = false;
          App.navigate('story');
        }
      });
    });

    // 编辑小节标题
    document.querySelectorAll('[data-action="edit-section"]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var sec = Storage.findById(STORY_SECTIONS_KEY, this.dataset.id);
        if (!sec) return;
        var title = prompt('修改小节标题：', sec.title||'');
        if (title !== null && title.trim()) {
          sec.title = title.trim();
          Storage.save(STORY_SECTIONS_KEY, sec);
          App.navigate('story');
        }
      });
    });

    // 编辑章节标题
    document.querySelectorAll('[data-action="edit-chapter"]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var ch = Storage.findById(STORY_CHAPTERS_KEY, this.dataset.id);
        if (!ch) return;
        var title = prompt('修改章节标题：', ch.title||'');
        if (title !== null && title.trim()) {
          ch.title = title.trim();
          Storage.save(STORY_CHAPTERS_KEY, ch);
          App.navigate('story');
        }
      });
    });

    // 删除小节
    document.querySelectorAll('[data-action="del-section"]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        if (!confirm('确定删除此小节？')) return;
        var secId = this.dataset.id;
        if (self._currentSection && self._currentSection.id === secId) {
          self._currentSection = null;
          self._editing = false;
        }
        Storage.deleteById(STORY_SECTIONS_KEY, secId);
        App.navigate('story');
      });
    });

    // 删除章节
    document.querySelectorAll('[data-action="del-chapter"]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        if (!confirm('删除章节将同时删除其下所有小节，确定？')) return;
        var chId = this.dataset.id;
        var allSecs = Storage.list(STORY_SECTIONS_KEY);
        allSecs.forEach(function(s){
          if (s.chapterId === chId) Storage.deleteById(STORY_SECTIONS_KEY, s.id);
        });
        if (self._currentSection && self._currentSection.chapterId === chId) {
          self._currentSection = null;
          self._editing = false;
        }
        Storage.deleteById(STORY_CHAPTERS_KEY, chId);
        App.navigate('story');
      });
    });

    // 添加章节
    document.getElementById('btn-add-chapter')?.addEventListener('click', function(){
      var title = prompt('输入章节名称（如"第一章·初入仙门"）：');
      if (!title || !title.trim()) return;
      var ch = createEmptyChapter();
      ch.title = title.trim();
      ch.id = Storage.uid();
      Storage.save(STORY_CHAPTERS_KEY, ch);
      App.navigate('story');
    });

    // 添加小节
    document.querySelectorAll('.story-add-section').forEach(function(btn){
      btn.addEventListener('click', function(){
        var chId = this.dataset.chapter;
        var title = prompt('输入小节名称（如"第1节·觉醒"）：');
        if (!title || !title.trim()) return;
        var sec = createEmptySection(chId);
        sec.title = title.trim();
        sec.id = Storage.uid();
        Storage.save(STORY_SECTIONS_KEY, sec);
        self._currentSection = sec;
        App.navigate('story');
      });
    });

    // 编辑内容 → 进入编辑模式
    document.getElementById('btn-edit-section-content')?.addEventListener('click', function(){
      self._editing = true;
      self._renderEditor(self._currentSection);
    });

    // 如果正在编辑，初始化编辑器
    if (self._editing && self._currentSection) {
      self._renderEditor(self._currentSection);
    }
  },

  _renderEditor: function(sec) {
    var area = document.getElementById('story-content-area');
    if (!area) return;
    area.innerHTML = '<div class="story-content-toolbar">'+
      '<span class="story-content-title">'+ (sec.title||'未命名小节') +'</span>'+
      '<span style="flex:1;"></span>'+
      '<button class="btn-primary btn-sm" id="btn-save-content">保存</button>'+
      '<button class="btn-sm row-icon-btn" id="btn-cancel-edit" style="margin-left:6px;">取消</button>'+
      '</div>'+
      '<div class="story-format-toolbar" id="story-format-toolbar">'+
        '<span style="font-size:11px;color:var(--text-dim);">整篇</span>'+
        '<select id="fmt-font-global" style="width:80px;font-size:11px;padding:4px;">'+ FONT_FACES.map(function(f){ return '<option value="'+f+'">'+f+'</option>'; }).join('') +'</select>'+
        '<select id="fmt-size-global" style="width:56px;font-size:11px;padding:4px;"><option value="">字号</option>'+ FONT_SIZES.map(function(s){ return '<option value="'+s+'px">'+s+'px</option>'; }).join('') +'</select>'+
        '<span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>'+
        '<span style="font-size:11px;color:var(--text-dim);">选中</span>'+
        '<select id="fmt-font" style="width:90px;font-size:12px;padding:4px;"><option value="">字体</option>'+ FONT_FACES.map(function(f){ return '<option value="'+f+'">'+f+'</option>'; }).join('') +'</select>'+
        '<select id="fmt-size" style="width:56px;font-size:12px;padding:4px;"><option value="">字号</option>'+ FONT_SIZES.map(function(s){ return '<option value="'+s+'px">'+s+'px</option>'; }).join('') +'</select>'+
        '<input type="color" id="fmt-color" value="#000000" style="width:32px;height:28px;padding:0;border:none;cursor:pointer;" title="文字颜色">'+
        PRESET_COLORS.map(function(c){ return '<span class="fmt-color-preset" style="background:'+c+';" data-color="'+c+'" title="'+c+'"></span>'; }).join('')+
        '<span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>'+
        '<button class="fmt-btn" data-cmd="bold" title="加粗"><b>B</b></button>'+
        '<button class="fmt-btn" data-cmd="italic" title="斜体"><i>I</i></button>'+
        '<button class="fmt-btn" data-cmd="underline" title="下划线"><u>U</u></button>'+
      '</div>';
      var edStyle = (sec.globalFont?"font-family:"+sec.globalFont+";":"")+(sec.globalFontSize?"font-size:"+sec.globalFontSize+";":"");
      area.innerHTML += '<div class="story-editor" id="story-editor" contenteditable="true" style="'+edStyle+'">'+ (sec.content||'') +'</div>';

    // 绑定工具栏
    var self = this;
    var gfs = document.getElementById('fmt-font-global');
    var gfz = document.getElementById('fmt-size-global');
    if (gfs && sec.globalFont) gfs.value = sec.globalFont;
    if (gfz && sec.globalFontSize) gfz.value = sec.globalFontSize;
    gfs?.addEventListener('change', function(){
      var ed = document.getElementById('story-editor');
      if (ed) ed.style.fontFamily = this.value;
      sec.globalFont = this.value;
    });
    gfz?.addEventListener('change', function(){
      if (!this.value) return;
      var ed = document.getElementById('story-editor');
      if (ed) ed.style.fontSize = this.value;
      sec.globalFontSize = this.value;
    });
    document.getElementById('fmt-font')?.addEventListener('change', function(){
      if (this.value) document.execCommand('fontName', false, this.value);
      this.value = '';
    });
    document.getElementById('fmt-size')?.addEventListener('change', function(){
      if (this.value) _applyFontSize(this.value);
      this.value = '';
    });
    document.getElementById('fmt-color')?.addEventListener('change', function(){ document.execCommand('foreColor', false, this.value); });
    document.querySelectorAll('.fmt-color-preset').forEach(function(sp){
      sp.addEventListener('click', function(){ document.execCommand('foreColor', false, this.dataset.color); });
    });
    document.querySelectorAll('.fmt-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ document.execCommand(this.dataset.cmd, false, null); });
    });

    // 保存
    document.getElementById('btn-save-content')?.addEventListener('click', function(){
      var editor = document.getElementById('story-editor');
      if (editor) sec.content = editor.innerHTML;
      Storage.save(STORY_SECTIONS_KEY, sec);
      self._editing = false;
      App.navigate('story');
    });

    // 取消
    document.getElementById('btn-cancel-edit')?.addEventListener('click', function(){
      self._editing = false;
      App.navigate('story');
    });

    // 点击预设色块
    document.querySelectorAll('.fmt-color-preset').forEach(function(sp){
      sp.addEventListener('click', function(){
        document.execCommand('foreColor', false, this.dataset.color);
      });
    });

    // 光标定位到末尾
    var editor = document.getElementById('story-editor');
    if (editor) {
      editor.focus();
      var range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
};

// 辅助：应用字号（document.execCommand fontSize 只有1-7，用内联style替代）
function _applyFontSize(size) {
  var sel = window.getSelection();
  if (!sel.rangeCount) return;
  var range = sel.getRangeAt(0);
  if (range.collapsed) return;
  var span = document.createElement('span');
  span.style.fontSize = size;
  try { range.surroundContents(span); } catch(e) {
    // 跨节点选择时用备用方案
    document.execCommand('insertHTML', false, '<span style="font-size:'+size+';">'+sel.toString()+'</span>');
  }
}

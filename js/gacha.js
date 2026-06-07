// 模拟抽卡系统

var GACHA_POOLS_KEY = 'gacha_pools';
var GACHA_HISTORY_KEY = 'gacha_history';
var GACHA_STATS_KEY = 'gacha_stats';

// 稀有度分档
var DEFAULT_CHAR_TIERS = [
  { name:'t0', label:'仙品', rate:0.6, color:'#ff3333', glow:'#ff0000' },
  { name:'t1', label:'天品', rate:3.0, color:'#ff8800', glow:'#ff6600' },
  { name:'t2', label:'地品', rate:12.0, color:'#aa44ff', glow:'#8800ff' },
  { name:'t3', label:'玄品', rate:84.4, color:'#4488ff', glow:'#0044ff' }
];
var DEFAULT_SKILL_TIERS = [
  { name:'t0', label:'仙品', rate:0.8, color:'#ff3333', glow:'#ff0000' },
  { name:'t1', label:'天品', rate:3.0, color:'#ff8800', glow:'#ff6600' },
  { name:'t2', label:'地品', rate:12.0, color:'#aa44ff', glow:'#8800ff' },
  { name:'t3', label:'玄品', rate:84.2, color:'#4488ff', glow:'#0044ff' }
];

// 角色池常驻物品存储 key
var CHAR_BASE_KEY = 'gacha_char_base_rewards';

function _charBaseRewards() {
  var raw = localStorage.getItem(CHAR_BASE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function _saveCharBase(arr) {
  localStorage.setItem(CHAR_BASE_KEY, JSON.stringify(arr || []));
}

// 获取技能池主池（最后一个创建的技能池）
function _skillMaster() {
  var pools = JSON.parse(localStorage.getItem(GACHA_POOLS_KEY) || 'null') || [];
  for (var i = pools.length - 1; i >= 0; i--) {
    if (pools[i].type === 'skill') return pools[i];
  }
  return null;
}

function copyTiers(src) {
  return src.map(function(t){ return {name:t.name, label:t.label, rate:t.rate, color:t.color, glow:t.glow}; });
}

function createEmptyPool(type, subtype) {
  var tiers = copyTiers(type === 'skill' ? DEFAULT_SKILL_TIERS : DEFAULT_CHAR_TIERS);
  var pool = { id:'', name:'', version:'', type:type||'character', subtype:subtype||'normal',
    rarityTiers: tiers, rewards:[], upBig:null, upSmall:[], pityValue:0 };
  if (type === 'skill') {
    var master = _skillMaster();
    if (master && master.id) pool.basePoolId = master.id;
  }
  return pool;
}

// === 概率 ===
function getCharRedRate(pv) {
  if (pv <= 70) return 0.006;
  if (pv <= 80) return 0.006 + (pv - 70) * 0.01;
  if (pv <= 90) return 0.106 + (pv - 80) * 0.03;
  if (pv <= 99) return 0.406 + (pv - 90) * 0.066;
  return 1.0;
}
function getSkillRedRate(pv) {
  // 技能池60抽硬保底
  if (pv <= 35) return 0.008;
  if (pv <= 45) return 0.008 + (pv - 35) * 0.01;     // 1.8% → 10.8%
  if (pv <= 55) return 0.108 + (pv - 45) * 0.025;     // 13.3% → 38.3%
  if (pv <= 59) return 0.383 + (pv - 55) * 0.154;     // 53.7% → 99.9%
  return 1.0; // 60硬保底
}
function getSkillUPRate(pv) {
  if (pv <= 35) return 0.25 + (pv - 1) * 0.00735;      // 25% → 50%
  return Math.min(1, 0.50 + (pv - 35) * 0.02);          // 50% → 100%
}

var TEN_PULL_RESET = 10;

// 获取灵石图标
function _lingshiIconSrc() {
  var items = JSON.parse(localStorage.getItem('items') || 'null') || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].name === '灵石' && items[i].icon && items[i].icon.trim()) {
      var icon = items[i].icon.trim();
      return icon.startsWith('data:') ? icon : 'img/items/' + icon;
    }
  }
  return '__lingshi__';
}

// 获取有效奖励列表
function _getEffectiveRewards(pool, tierName) {
  if (pool.type === 'character') {
    // 角色池：从常驻池取
    return _charBaseRewards().filter(function(r){ return r.tier === tierName; });
  }
  if (pool.type === 'skill') {
    // 自有奖励优先，为空时回退到基础池
    var ownRewards = (pool.rewards || []).filter(function(r){ return r.tier === tierName; });
    if (ownRewards.length > 0) return ownRewards;
    if (pool.basePoolId) {
      var allPools = JSON.parse(localStorage.getItem(GACHA_POOLS_KEY) || 'null') || [];
      for (var i = 0; i < allPools.length; i++) {
        if (allPools[i].id === pool.basePoolId) {
          return (allPools[i].rewards || []).filter(function(r){ return r.tier === tierName; });
        }
      }
    }
    return [];
  }
  return [];
}

// === 物品信息 ===
function getRewardItem(itemType, itemId) {
  if (itemType === 'character') {
    var c = Storage.findById('characters', itemId);
    return c ? { name:c.name, image:c.fullBody||c.avatar, type:'角色' } : null;
  }
  if (itemType === 'skill') {
    var g = Storage.findById('skills_gongfa', itemId);
    if (g) return { name:g.name, image:g.image, type:'功法' };
    var s = Storage.findById('skills_shentong', itemId);
    if (s) return { name:s.name, image:s.image, type:'神通' };
    return null;
  }
  if (itemType === 'lingshi') {
    return { name:'灵石', image:'', type:'货币' };
  }
  var it = Storage.findById('items', itemId);
  return it ? { name:it.name, image:it.icon, type:it.type } : null;
}

// === 抽卡核心 ===
function doPull(pool) {
  var pv = (pool.pityValue||0) + 1;
  var isChar = pool.type === 'character';
  var redRate = isChar ? getCharRedRate(pv) : getSkillRedRate(pv);
  var tiers = pool.rarityTiers || (isChar ? DEFAULT_CHAR_TIERS : DEFAULT_SKILL_TIERS);
  var tc = pool._tenCount || 0;
  var goldGuarantee = (tc >= TEN_PULL_RESET - 1);
  var roll = Math.random(), hitIdx = -1;

  if (roll < redRate) { hitIdx = 0; }
  else if (goldGuarantee) { hitIdx = 1; }
  else {
    var acc = 0;
    for (var i = 0; i < tiers.length; i++) { acc += tiers[i].rate/100; if (roll < acc) { hitIdx = i; break; } }
  }
  if (hitIdx < 0) hitIdx = tiers.length - 1;

  var hitTier = tiers[hitIdx];
  var tierRewards = _getEffectiveRewards(pool, hitTier.name);
  var selected = null, isBigUP = false;

  if (hitIdx === 0) {
    if (isChar && pool.upBig) { selected = { itemType:'character', itemId:pool.upBig.itemId, upType:'big' }; isBigUP = true; }
    else if (!isChar && pool.upItems && pool.upItems.length > 0) {
      if (Math.random() < getSkillUPRate(pv)) {
        var upItem = pool.upItems[Math.floor(Math.random() * pool.upItems.length)];
        selected = { itemType:'skill', itemId: upItem.itemId, upType:'big' }; isBigUP = true;
      } else if (tierRewards.length > 0) {
        selected = tierRewards[Math.floor(Math.random() * tierRewards.length)];
      }
    } else if (tierRewards.length > 0) {
      selected = tierRewards[Math.floor(Math.random() * tierRewards.length)];
    }
  } else if (hitIdx === 1) {
    var smallUps = !isChar && pool.upSmallItems ? pool.upSmallItems : pool.upSmall;
    if (smallUps && smallUps.length > 0) {
      if (Math.random() < 0.5) {
        var u = smallUps[Math.floor(Math.random() * smallUps.length)];
        selected = { itemType: isChar?'character':'skill', itemId:u.itemId, upType:'small' };
      } else if (tierRewards.length > 0) {
        selected = tierRewards[Math.floor(Math.random() * tierRewards.length)];
      }
    } else if (tierRewards.length > 0) {
      selected = tierRewards[Math.floor(Math.random() * tierRewards.length)];
    }
  } else if (tierRewards.length > 0) {
    selected = tierRewards[Math.floor(Math.random() * tierRewards.length)];
  }

  if (!selected) {
    var amts = {0:10,1:50,2:100,3:50};
    selected = { itemType:'lingshi', amount:amts[hitIdx]||50 };
  }

  var hitRed = hitIdx === 0;
  var result = {
    tier:hitTier, tierIdx:hitIdx, reward:selected,
    pityValue:hitRed?0:pv, isRed:hitRed, isBigUP:isBigUP,
    newTenCount:(hitIdx===0||hitIdx===1)?0:tc+1
  };
  var hi = getRewardItem(selected.itemType, selected.itemId);
  if (hi) {
    hi.tierName=hitTier.name; hi.tierIdx=hitIdx; hi.tierLabel=hitTier.label;
    hi.tierColor=hitTier.color; hi.upType=selected.upType||''; hi.isBigUP=isBigUP;
    hi.time=new Date().toISOString(); result.histItem=hi;
  }
  return result;
}

function doTenPull(pool) {
  var results = [];
  for (var i = 0; i < 10; i++) {
    var r = doPull(pool); results.push(r);
    pool.pityValue = r.pityValue; pool._tenCount = r.newTenCount;
  }
  return results;
}

function tierBadgeHtml(t) {
  return '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;background:'+t.color+';">'+t.label+'</span>';
}

// === 统计 ===
function _getStats(pid) {
  return JSON.parse(localStorage.getItem(GACHA_STATS_KEY+'_'+pid) || '{"totalPulls":0,"upBigCount":0,"upBigIntervals":[],"pullsSinceLastUP":0,"redCount":0,"redIntervals":[],"pullsSinceLastRed":0}');
}
function _saveStats(pid,s) { localStorage.setItem(GACHA_STATS_KEY+'_'+pid, JSON.stringify(s)); }
function _recordPulls(pid, cnt, bigCnt, redCnt) {
  var s = _getStats(pid);
  s.totalPulls += cnt;

  // 距离上次出红
  s.pullsSinceLastRed = (s.pullsSinceLastRed||0) + cnt;
  s.redIntervals = s.redIntervals || [];
  if (redCnt > 0) {
    s.redCount = (s.redCount||0) + redCnt;
    for (var i=0;i<redCnt;i++) s.redIntervals.push(s.pullsSinceLastRed);
    s.pullsSinceLastRed = 0;
  }
  if (s.redIntervals.length > 50) s.redIntervals = s.redIntervals.slice(-50);

  // 距离上次大UP
  s.pullsSinceLastUP = (s.pullsSinceLastUP||0) + cnt;
  if (bigCnt > 0) { s.upBigCount += bigCnt; for (var i=0;i<bigCnt;i++) s.upBigIntervals.push(s.pullsSinceLastUP); s.pullsSinceLastUP = 0; }
  if (s.upBigIntervals.length > 50) s.upBigIntervals = s.upBigIntervals.slice(-50);
  _saveStats(pid, s);
}
function _avgPulls(s) {
  if (!s.upBigIntervals||s.upBigIntervals.length===0) return null;
  var sum=0; for (var i=0;i<s.upBigIntervals.length;i++) sum+=s.upBigIntervals[i];
  return Math.round(sum/s.upBigIntervals.length);
}
function _avgRedPulls(s) {
  if (!s||!s.redIntervals||s.redIntervals.length===0) return null;
  var sum=0; for (var i=0;i<s.redIntervals.length;i++) sum+=s.redIntervals[i];
  return Math.round(sum/s.redIntervals.length);
}

// === 物品名 ===
function _rewardName(r) {
  if (r.itemType==='character') { var c=Storage.findById('characters',r.itemId); return c?c.name:'(已删除)'; }
  if (r.itemType==='skill') { var g=Storage.findById('skills_gongfa',r.itemId); var s=Storage.findById('skills_shentong',r.itemId); return g?'功法：'+g.name:(s?'神通：'+s.name:'(已删除)'); }
  if (r.itemType==='lingshi') return '灵石 ×'+(r.amount||50);
  var it=Storage.findById('items',r.itemId); return it?it.name:'(已删除)';
}

// === Gacha 模块 ===
var Gacha = {

  renderPoolList: function(type, subtype) {
    var all = Storage.list(GACHA_POOLS_KEY);
    var pools = all.filter(function(p){ return p.type===type && p.subtype===subtype; });
    var tm = {'character|normal':'寻仙唤灵','character|up':'仙途引渡','skill|normal':'天书密阁'};
    var title = tm[type+'|'+subtype]||'卡池';
    var pityLabel = type==='skill'?'悟道值':'仙缘值';
    var cards = '';
    if (pools.length===0) {
      cards = '<div class="placeholder">暂无'+title+'卡池，点击右上角添加</div>';
    } else {
      cards = '<div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">';
      pools.forEach(function(p){
        var maxP = type==='skill'?60:100;
        var pct = Math.round((p.pityValue||0)/maxP*100);
        var s = _getStats(p.id); var avg = _avgPulls(s);
        var uh = '';
        // 展示大UP/可获取角色
        if (type==='skill') {
          if (p.upItems && p.upItems.length>0) {
            uh+='<div style="margin-top:8px;"><div style="color:#ff3333;font-weight:bold;font-size:18px;margin-bottom:6px;">大UP</div>';
            p.upItems.forEach(function(u){
              var sk = u.itemType==='gongfa' ? Storage.findById('skills_gongfa',u.itemId) : Storage.findById('skills_shentong',u.itemId);
              var sImg = sk&&sk.image ? sk.image : '';
              var sSrc = sImg && !sImg.startsWith('data:') ? 'img/skills/'+sImg : sImg;
              uh+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
              if (sSrc) uh+='<img src="'+sSrc+'" style="width:62px;height:62px;object-fit:contain;border-radius:6px;border:2px solid #ff3333;">';
              else uh+='<div style="width:62px;height:62px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:6px;border:2px solid #ff3333;font-size:22px;color:var(--text-dim);">?</div>';
              uh+='<span style="font-size:19px;color:var(--gold);font-weight:bold;">'+(u.itemName||'?')+'</span></div>';
            });
            uh+='</div>';
          }
          if (p.upSmallItems && p.upSmallItems.length>0) {
            uh+='<div style="margin-top:8px;"><div style="color:#ff8800;font-weight:bold;font-size:18px;margin-bottom:6px;">小UP</div>';
            uh+='<div style="display:flex;gap:14px;flex-wrap:wrap;">';
            p.upSmallItems.forEach(function(u){
              var sk = u.itemType==='gongfa' ? Storage.findById('skills_gongfa',u.itemId) : Storage.findById('skills_shentong',u.itemId);
              var sImg = sk&&sk.image ? sk.image : '';
              var sSrc = sImg && !sImg.startsWith('data:') ? 'img/skills/'+sImg : sImg;
              uh+='<div style="text-align:center;">';
              if (sSrc) uh+='<img src="'+sSrc+'" style="width:55px;height:55px;object-fit:contain;border-radius:6px;border:2px solid #ff8800;">';
              else uh+='<div style="width:55px;height:55px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:6px;border:2px solid #ff8800;font-size:20px;color:var(--text-dim);">?</div>';
              uh+='<div style="font-size:15px;color:#ff8800;font-weight:bold;margin-top:2px;">'+(u.itemName||'?')+'</div></div>';
            });
            uh+='</div></div>';
          }
        } else if (subtype==='up') {
          if (p.upBig) {
            var bc=Storage.findById('characters',p.upBig.itemId);
            var bcImg=bc?bc.avatar:'', bcSrc=bcImg&&!bcImg.startsWith('data:')?'img/characters/'+bcImg:bcImg;
            uh+='<div style="margin-top:8px;"><div style="color:#ff3333;font-weight:bold;font-size:18px;margin-bottom:6px;">大UP</div>';
            uh+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
            if (bcSrc) uh+='<img src="'+bcSrc+'" style="width:62px;height:62px;object-fit:cover;border-radius:6px;border:2px solid #ff3333;">';
            else uh+='<div style="width:62px;height:62px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:6px;border:2px solid #ff3333;font-size:22px;color:var(--text-dim);">?</div>';
            uh+='<span style="font-size:19px;color:var(--gold);font-weight:bold;">'+(bc?bc.name:'(已删除)')+'</span></div></div>';
          }
          if (p.upSmall && p.upSmall.length>0) {
            uh+='<div style="margin-top:8px;"><div style="color:#ff8800;font-weight:bold;font-size:18px;margin-bottom:6px;">小UP</div>';
            uh+='<div style="display:flex;gap:14px;flex-wrap:wrap;">';
            p.upSmall.forEach(function(u){
              var sc=Storage.findById('characters',u.itemId);
              var scImg=sc?sc.avatar:'', scSrc=scImg&&!scImg.startsWith('data:')?'img/characters/'+scImg:scImg;
              uh+='<div style="text-align:center;">';
              if (scSrc) uh+='<img src="'+scSrc+'" style="width:55px;height:55px;object-fit:cover;border-radius:6px;border:2px solid #ff8800;">';
              else uh+='<div style="width:55px;height:55px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:6px;border:2px solid #ff8800;font-size:20px;color:var(--text-dim);">?</div>';
              uh+='<div style="font-size:15px;color:#ff8800;font-weight:bold;margin-top:2px;">'+(sc?sc.name:'?')+'</div></div>';
            });
            uh+='</div></div>';
          }
        } else {
          // 常驻池：展示可获取角色（半身头像，和UP池一致排列）
          var baseChars = _charBaseRewards().filter(function(r){ return r.itemType==='character'; });
          if (baseChars.length > 0) {
            var shown = {};
            var charCards = [];
            baseChars.forEach(function(r){ if (!shown[r.itemId]) { var c=Storage.findById('characters',r.itemId); if(c){ shown[r.itemId]=true; charCards.push(c); } } });
            if (charCards.length > 0) {
              uh+='<div style="margin-top:8px;"><div style="color:var(--gold);font-weight:bold;font-size:18px;margin-bottom:6px;">可获取角色</div>';
              uh+='<div style="display:flex;gap:14px;flex-wrap:wrap;">';
              charCards.forEach(function(c){
                var cImg=c.avatar, cSrc=cImg&&!cImg.startsWith('data:')?'img/characters/'+cImg:cImg;
                uh+='<div style="text-align:center;">';
                if (cSrc) uh+='<img src="'+cSrc+'" style="width:55px;height:55px;object-fit:cover;border-radius:6px;border:1px solid rgba(184,148,76,0.4);">';
                else uh+='<div style="width:55px;height:55px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:6px;border:1px solid rgba(184,148,76,0.4);font-size:20px;color:var(--text-dim);">?</div>';
                uh+='<div style="font-size:15px;color:var(--gold);font-weight:bold;margin-top:2px;">'+(c.name||'?')+'</div></div>';
              });
              uh+='</div></div>';
            }
          }
        }
        cards += '<div class="card" style="cursor:default;">'+
          '<div style="font-size:16px;font-weight:bold;color:var(--gold);margin-bottom:6px;">'+(p.name||'未命名')+'</div>'+
          '<div style="font-size:13px;color:var(--text-dim);margin-bottom:4px;">版本：'+(p.version||'—')+'</div>'+uh+
          '<div style="margin-top:8px;font-size:12px;color:var(--text-dim);">'+pityLabel+'：<span style="color:var(--gold);">'+(p.pityValue||0)+'</span> / '+maxP+'</div>'+
          '<div style="margin-top:4px;height:6px;background:var(--border-light);border-radius:3px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:var(--gold);border-radius:3px;"></div></div>'+
          (avg!==null?'<div style="margin-top:4px;font-size:11px;color:var(--text-light);">平均 '+avg+' 抽出大UP</div>':'')+
          '<div style="margin-top:10px;display:flex;gap:8px;">'+
          '<button class="btn-primary" style="flex:1;font-size:12px;padding:6px;" onclick="App.navigate(\'gacha/detail?id='+p.id+'\')">进入卡池</button>'+
          '<button class="btn-sm row-icon-btn" style="font-size:12px;" onclick="App.navigate(\'gacha/edit?id='+p.id+'\')">✎</button>'+
          '<button class="btn-sm row-icon-btn" style="font-size:12px;color:var(--red);" onclick="event.stopPropagation();if(confirm(\'删除此卡池？\')){Storage.deleteById(\''+GACHA_POOLS_KEY+'\',\''+p.id+'\');localStorage.removeItem(\''+GACHA_HISTORY_KEY+'__'+p.id+'\');localStorage.removeItem(\''+GACHA_STATS_KEY+'__'+p.id+'\');App.navigate(\'gacha-'+(type==='skill'?'skill':(subtype==='up'?'up':'normal'))+'\');}">×</button></div></div>';
      });
      cards += '</div>';
    }
    var bh = type==='skill'?'gacha-skill':(subtype==='up'?'gacha-up':'gacha-normal');
    return '<div class="toolbar"><h2 style="color:var(--gold);flex:1;">'+title+'</h2>'+
      '<button class="btn-primary" onclick="App.navigate(\'gacha/edit?type='+type+'&subtype='+subtype+'\')">+ 添加卡池</button>'+
      '<button class="btn-primary" style="background:var(--green);margin-left:8px;" onclick="App.navigate(\''+bh+'\')">刷新</button></div>'+cards;
  },

  bindPoolListEvents: function(){},

  // === 编辑页 ===
  renderPoolEdit: function(id) {
    var pool;
    if (id) { pool = Storage.findById(GACHA_POOLS_KEY, id); if (!pool) return '<div class="placeholder">卡池不存在</div>'; }
    else {
      var prm = new URLSearchParams(location.hash.includes('?')?location.hash.split('?')[1]:'');
      pool = createEmptyPool(prm.get('type')||'character', prm.get('subtype')||'normal');
    }

    var isNew = !id, isSkill = pool.type==='skill', isUp = pool.subtype==='up';
    var tiers = pool.rarityTiers || (isSkill ? DEFAULT_SKILL_TIERS : DEFAULT_CHAR_TIERS);

    // 稀有度表格
    var th = tiers.map(function(t,i){
      return '<tr><td><input type="text" value="'+t.label+'" data-field="tier_label_'+i+'" style="width:70px;text-align:center;"></td>'+
        '<td><input type="color" value="'+t.color+'" data-field="tier_color_'+i+'" style="width:40px;height:28px;"></td>'+
        '<td><input type="number" value="'+t.rate+'" data-field="tier_rate_'+i+'" step="0.1" style="width:80px;text-align:center;">%</td></tr>';
    }).join('');

    var charList = Storage.list('characters');
    var gfList = Storage.list('skills_gongfa');
    var stList = Storage.list('skills_shentong');

    // === 奖励配置 ===
    var rewardsHtml = '';
    var isSkillInherited = isSkill && pool.basePoolId && isNew;

    if (isSkill && isSkillInherited) {
      // 新建从池：复制前一个池的奖励作为初始可编辑内容
      var master = Storage.findById(GACHA_POOLS_KEY, pool.basePoolId);
      var mn = master ? (master.name||'前一个卡池') : '(已删除)';
      // 复制主池奖励到当前池
      if (master && master.rewards) { pool.rewards = JSON.parse(JSON.stringify(master.rewards)); }
      // 可编辑
      rewardsHtml = tiers.map(function(t){
        var tr = (pool.rewards||[]).filter(function(r){ return r.tier===t.name; });
        var items = tr.map(function(r){
          return '<div class="entry-item" style="display:flex;align-items:center;gap:8px;padding:8px 12px;" data-reward-type="'+r.itemType+'" data-reward-id="'+(r.itemId||'')+'" data-lingshi-amount="'+(r.amount||'')+'"><span style="flex:1;font-size:13px;">'+_rewardName(r)+'</span><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
        }).join('');
        var canAddSkill = (t.name==='t0'||t.name==='t1'||t.name==='t2');
        var btns = (canAddSkill
          ? '<select class="tier-add-sel" data-tier="'+t.name+'" data-type="skill_gongfa" style="font-size:12px;padding:4px;"><option value="">+ 功法</option>'+gfList.map(function(g){ return '<option value="'+g.id+'">'+(g.name||'未命名')+'</option>'; }).join('')+'</select>'+
            '<select class="tier-add-sel" data-tier="'+t.name+'" data-type="skill_shentong" style="font-size:12px;padding:4px;"><option value="">+ 神通</option>'+stList.map(function(s){ return '<option value="'+s.id+'">'+(s.name||'未命名')+'</option>'; }).join('')+'</select>'
          : '')+
          '<button class="btn-sm row-icon-btn" style="font-size:11px;" data-tier="'+t.name+'" data-action="add-lingshi">+ 灵石</button>';
        return '<fieldset class="fieldset" style="border-color:'+t.color+';"><legend>'+tierBadgeHtml(t)+' — '+t.rate+'% <span style="font-size:11px;color:var(--bamboo);">（初始复制自「'+mn+'」，可修改）</span></legend>'+
          '<div data-tier="'+t.name+'" class="tier-rewards-container">'+(items||'<div style="color:var(--text-dim);font-size:13px;">暂无</div>')+'</div>'+
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">'+btns+'</div></fieldset>';
      }).join('');
    } else if (!isSkill) {
      // 角色池：编辑常驻物品
      var base = _charBaseRewards();
      rewardsHtml = tiers.map(function(t){
        var tr = base.filter(function(r){ return r.tier===t.name; });
        // t2/t3 (紫/蓝) 不能添加角色
        var canAddChar = (t.name==='t0'||t.name==='t1');
        var items = tr.map(function(r){
          return '<div class="entry-item" style="display:flex;align-items:center;gap:8px;padding:8px 12px;" data-reward-type="'+r.itemType+'" data-reward-id="'+(r.itemId||'')+'" data-lingshi-amount="'+(r.amount||'')+'"><span style="flex:1;font-size:13px;">'+_rewardName(r)+'</span><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
        }).join('');
        var btns = (canAddChar ? '<select class="tier-add-sel" data-tier="'+t.name+'" data-type="character" style="font-size:12px;padding:4px;"><option value="">+ 角色</option>'+charList.map(function(c){ return '<option value="'+c.id+'">'+(c.name||'未命名')+'</option>'; }).join('')+'</select>' : '')+
          '<button class="btn-sm row-icon-btn" style="font-size:11px;" data-tier="'+t.name+'" data-action="add-lingshi">+ 灵石</button>';
        return '<fieldset class="fieldset" style="border-color:'+t.color+';"><legend>'+tierBadgeHtml(t)+' — '+t.rate+'% <span style="font-size:11px;color:var(--text-light);">（所有角色池共享）</span></legend>'+
          '<div data-tier="'+t.name+'" class="tier-rewards-container">'+(items||'<div style="color:var(--text-dim);font-size:13px;">暂无</div>')+'</div>'+
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">'+btns+'</div></fieldset>';
      }).join('');
    } else {
      // 技能主池：可编辑物品
      rewardsHtml = tiers.map(function(t){
        var tr = (pool.rewards||[]).filter(function(r){ return r.tier===t.name; });
        // t3 (蓝) 不能添加工法/神通
        var canAddSkill = (t.name==='t0'||t.name==='t1'||t.name==='t2');
        var items = tr.map(function(r){
          return '<div class="entry-item" style="display:flex;align-items:center;gap:8px;padding:8px 12px;" data-reward-type="'+r.itemType+'" data-reward-id="'+(r.itemId||'')+'" data-lingshi-amount="'+(r.amount||'')+'"><span style="flex:1;font-size:13px;">'+_rewardName(r)+'</span><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
        }).join('');
        var btns = (canAddSkill
          ? '<select class="tier-add-sel" data-tier="'+t.name+'" data-type="skill_gongfa" style="font-size:12px;padding:4px;"><option value="">+ 功法</option>'+gfList.map(function(g){ return '<option value="'+g.id+'">'+(g.name||'未命名')+'</option>'; }).join('')+'</select>'+
            '<select class="tier-add-sel" data-tier="'+t.name+'" data-type="skill_shentong" style="font-size:12px;padding:4px;"><option value="">+ 神通</option>'+stList.map(function(s){ return '<option value="'+s.id+'">'+(s.name||'未命名')+'</option>'; }).join('')+'</select>'
          : '')+
          '<button class="btn-sm row-icon-btn" style="font-size:11px;" data-tier="'+t.name+'" data-action="add-lingshi">+ 灵石</button>';
        return '<fieldset class="fieldset" style="border-color:'+t.color+';"><legend>'+tierBadgeHtml(t)+' — '+t.rate+'%</legend>'+
          '<div data-tier="'+t.name+'" class="tier-rewards-container">'+(items||'<div style="color:var(--text-dim);font-size:13px;">暂无</div>')+'</div>'+
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">'+btns+'</div></fieldset>';
      }).join('');
    }

    // === UP 配置（仅 UP 池） ===
    var upHtml = '';
    if (isUp && !isSkill) {
      // 角色UP池：大UP（红色）+ 小UP（金色）
      upHtml += '<fieldset class="fieldset" style="border-color:#ff3333;"><legend><span style="color:#ff3333;font-weight:bold;">UP配置</span></legend>'+
        '<div style="margin-bottom:12px;"><label style="color:#ff3333;">大UP（红色仙品）</label><select id="up-big-sel" style="width:100%;"><option value="">选择大UP角色</option>'+charList.map(function(c){ return '<option value="'+c.id+'" '+(pool.upBig&&pool.upBig.itemId===c.id?'selected':'')+'>'+(c.name||'未命名')+'</option>'; }).join('')+'</select></div>'+
        '<div><label style="color:#ff8800;">小UP（金色天品，0-3个）</label><div id="up-small-container">';
      (pool.upSmall||[]).forEach(function(u){
        upHtml += '<div class="entry-item" style="display:flex;align-items:center;gap:8px;"><select class="up-small-sel" style="flex:1;"><option value="">不选择</option>'+charList.map(function(c){ return '<option value="'+c.id+'" '+(u.itemId===c.id?'selected':'')+'>'+(c.name||'未命名')+'</option>'; }).join('')+'</select><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
      });
      upHtml += '</div><button class="btn-add" id="btn-add-up-small" style="font-size:14px;margin-top:6px;" '+((pool.upSmall||[]).length>=3?'disabled':'')+'>+</button></div></fieldset>';
    }

    if (isSkill) {
      // 技能池：每个池子独立UP（0-3个功法/神通），第一个池子也可添加，不继承
      upHtml += '<fieldset class="fieldset" style="border-color:#ff3333;"><legend><span style="color:#ff3333;font-weight:bold;">本期UP — 红色仙品（0-3个功法/神通）</span></legend><div id="up-skill-container">';
      (pool.upItems||[]).forEach(function(u){
        var isGf = u.itemType === 'gongfa';
        var name = '';
        if (isGf) { var g = Storage.findById('skills_gongfa', u.itemId); name = g ? '功法：'+g.name : '(已删除)'; }
        else { var s = Storage.findById('skills_shentong', u.itemId); name = s ? '神通：'+s.name : '(已删除)'; }
        upHtml += '<div class="entry-item" style="display:flex;align-items:center;gap:8px;">'+
          '<select class="up-skill-sel" style="flex:1;" data-idx="'+u._idx+'"><option value="">不选择</option>'+
          '<optgroup label="功法">'+gfList.map(function(g){ return '<option value="gf_'+g.id+'" '+(isGf&&u.itemId===g.id?'selected':'')+'>'+(g.name||'未命名')+'</option>'; }).join('')+'</optgroup>'+
          '<optgroup label="神通">'+stList.map(function(s){ return '<option value="st_'+s.id+'" '+(!isGf&&u.itemId===s.id?'selected':'')+'>'+(s.name||'未命名')+'</option>'; }).join('')+'</optgroup></select>'+
          '<button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
      });
      upHtml += '</div><button class="btn-add" id="btn-add-up-skill" style="font-size:14px;margin-top:6px;" '+((pool.upItems||[]).length>=3?'disabled':'')+'>+</button></fieldset>';

      // 技能池金色小UP
      upHtml += '<fieldset class="fieldset" style="border-color:#ff8800;"><legend><span style="color:#ff8800;font-weight:bold;">小UP — 金色天品（0-3个功法/神通）</span></legend><div id="up-skill-small-container">';
      (pool.upSmallItems||[]).forEach(function(u){
        var isGf = u.itemType === 'gongfa';
        upHtml += '<div class="entry-item" style="display:flex;align-items:center;gap:8px;">'+
          '<select class="up-skill-small-sel" style="flex:1;"><option value="">不选择</option>'+
          '<optgroup label="功法">'+gfList.map(function(g){ return '<option value="gf_'+g.id+'" '+(isGf&&u.itemId===g.id?'selected':'')+'>'+(g.name||'未命名')+'</option>'; }).join('')+'</optgroup>'+
          '<optgroup label="神通">'+stList.map(function(s){ return '<option value="st_'+s.id+'" '+(!isGf&&u.itemId===s.id?'selected':'')+'>'+(s.name||'未命名')+'</option>'; }).join('')+'</optgroup></select>'+
          '<button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button></div>';
      });
      upHtml += '</div><button class="btn-add" id="btn-add-up-skill-small" style="font-size:14px;margin-top:6px;" '+((pool.upSmallItems||[]).length>=3?'disabled':'')+'>+</button></fieldset>';
    }

    return '<div class="detail-page" data-pool-id="'+(pool.id||'')+'" data-is-new="'+isNew+'" data-type="'+pool.type+'" data-subtype="'+pool.subtype+'">'+
      '<div class="toolbar"><button class="btn-primary" onclick="history.back()">← 返回</button><button class="btn-primary" id="btn-save-pool">保存卡池</button></div>'+
      '<fieldset class="fieldset"><legend>基本信息</legend>'+
        '<div class="form-row"><div style="flex:1;"><label>卡池名称</label><input type="text" id="pool-name" value="'+(pool.name||'')+'" style="width:100%;"></div><div style="flex:1;"><label>版本号</label><input type="text" id="pool-version" value="'+(pool.version||'')+'" style="width:100%;"></div></div>'+
        '<div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>类型</label><input type="text" value="'+(pool.type==='skill'?'功法神通池':'角色池')+'" disabled style="width:100%;"></div><div style="flex:1;"><label>子类型</label><input type="text" value="'+(pool.subtype==='up'?'限时UP':'常驻')+'" disabled style="width:100%;"></div></div></fieldset>'+
      '<fieldset class="fieldset"><legend>稀有度分档 <span style="font-size:12px;color:var(--red);" id="tier-sum-warn"></span></legend>'+
        '<table style="width:100%;border-collapse:collapse;"><thead><tr><th>标签</th><th>颜色</th><th>概率(%)</th></tr></thead><tbody>'+th+'</tbody></table></fieldset>'+
      '<fieldset class="fieldset"><legend>奖励配置</legend><div id="rewards-config">'+rewardsHtml+'</div></fieldset>'+upHtml+
      '<div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save-pool2">保存卡池</button></div></div>';
  },

  bindPoolEditEvents: function() {
    var el = document.querySelector('.detail-page'); if (!el) return;
    var pid = el.dataset.poolId, isNew = el.dataset.isNew==='true';
    var ptype = el.dataset.type, psub = el.dataset.subtype;

    var save = function() {
      var pool = pid ? Storage.findById(GACHA_POOLS_KEY, pid) : createEmptyPool(ptype, psub);
      if (!pool) pool = createEmptyPool(ptype, psub);
      pool.id = pid || '';
      pool.name = document.getElementById('pool-name')?.value?.trim()||'';
      pool.version = document.getElementById('pool-version')?.value?.trim()||'';

      var tc = document.querySelectorAll('[data-field^="tier_label_"]').length;
      pool.rarityTiers = [];
      for (var i=0;i<tc;i++) {
        pool.rarityTiers.push({
          name:'t'+i,
          label: document.querySelector('[data-field="tier_label_'+i+'"]')?.value||'',
          color: document.querySelector('[data-field="tier_color_'+i+'"]')?.value||'#888',
          rate: parseFloat(document.querySelector('[data-field="tier_rate_'+i+'"]')?.value)||0
        });
      }
      var sum = pool.rarityTiers.reduce(function(a,t){ return a+t.rate; },0);
      if (Math.abs(sum-100)>0.5) { document.getElementById('tier-sum-warn').textContent='概率总和必须为100%，当前：'+sum.toFixed(1)+'%'; return; }

      // 收集奖励
      var collect = function(container, arr) {
        container.querySelectorAll('.entry-item').forEach(function(item){
          if (item.dataset.rewardType==='character') arr.push({tier:container.dataset.tier,itemType:'character',itemId:item.dataset.rewardId});
          else if (item.dataset.rewardType==='skill') arr.push({tier:container.dataset.tier,itemType:'skill',itemId:item.dataset.rewardId});
          else if (item.dataset.lingshiAmount) arr.push({tier:container.dataset.tier,itemType:'lingshi',amount:parseInt(item.dataset.lingshiAmount)});
        });
      };

      if (ptype==='character') {
        var base = []; document.querySelectorAll('.tier-rewards-container').forEach(function(c){ collect(c, base); });
        _saveCharBase(base);
      } else {
        // 技能池：所有池子都保存自有奖励
        pool.rewards = [];
        document.querySelectorAll('.tier-rewards-container').forEach(function(c){ collect(c, pool.rewards); });
      }

      // UP
      if (psub==='up'&&ptype==='character') {
        var bid = document.getElementById('up-big-sel')?.value;
        pool.upBig = bid ? {itemId:bid,itemName:(Storage.findById('characters',bid)?.name||'')} : null;
        pool.upSmall = [];
        document.querySelectorAll('.up-small-sel').forEach(function(s){ if(s.value){var c=Storage.findById('characters',s.value);pool.upSmall.push({itemId:s.value,itemName:c?.name||''});} });
      }
      if (ptype==='skill') {
        pool.upItems = [];
        document.querySelectorAll('.up-skill-sel').forEach(function(sel){
          if (!sel.value) return;
          var isGf = sel.value.startsWith('gf_');
          var id = sel.value.slice(3);
          if (isGf) { var g=Storage.findById('skills_gongfa',id); pool.upItems.push({itemType:'gongfa',itemId:id,itemName:g?.name||''}); }
          else { var s=Storage.findById('skills_shentong',id); pool.upItems.push({itemType:'shentong',itemId:id,itemName:s?.name||''}); }
        });
        pool.upSmallItems = [];
        document.querySelectorAll('.up-skill-small-sel').forEach(function(sel){
          if (!sel.value) return;
          var isGf = sel.value.startsWith('gf_');
          var id = sel.value.slice(3);
          if (isGf) { var g=Storage.findById('skills_gongfa',id); pool.upSmallItems.push({itemType:'gongfa',itemId:id,itemName:g?.name||''}); }
          else { var s=Storage.findById('skills_shentong',id); pool.upSmallItems.push({itemType:'shentong',itemId:id,itemName:s?.name||''}); }
        });
      }

      if (!pool.id) pool.id = Storage.uid();
      Storage.save(GACHA_POOLS_KEY, pool);
      App.navigate(ptype==='skill'?'gacha-skill':(psub==='up'?'gacha-up':'gacha-normal'));
    };

    document.getElementById('btn-save-pool')?.addEventListener('click', save);
    document.getElementById('btn-save-pool2')?.addEventListener('click', save);

    // 添加物品下拉
    document.querySelectorAll('.tier-add-sel').forEach(function(sel){
      sel.addEventListener('change', function(){
        if (!this.value) return;
        var tier = this.dataset.tier;
        var container = document.querySelector('.tier-rewards-container[data-tier="'+tier+'"]');
        if (!container) return;
        var st = this.dataset.type, label='', rtype='', rid='';
        if (st==='character') { var c=Storage.findById('characters',this.value); label=c?c.name:this.value; rtype='character'; rid=this.value; }
        else if (st==='skill_gongfa') { var g=Storage.findById('skills_gongfa',this.value); label=g?'功法：'+g.name:this.value; rtype='skill'; rid=this.value; }
        else if (st==='skill_shentong') { var s=Storage.findById('skills_shentong',this.value); label=s?'神通：'+s.name:this.value; rtype='skill'; rid=this.value; }
        var empty = container.querySelector(':scope > div:not(.entry-item)'); if (empty) empty.remove();
        var div = document.createElement('div'); div.className='entry-item';
        div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;';
        div.setAttribute('data-reward-type', rtype); div.setAttribute('data-reward-id', rid);
        div.innerHTML = '<span style="flex:1;font-size:13px;">'+label+'</span><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button>';
        container.appendChild(div); this.value = '';
      });
    });

    // 灵石
    document.querySelectorAll('[data-action="add-lingshi"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var tier = this.dataset.tier;
        var container = document.querySelector('.tier-rewards-container[data-tier="'+tier+'"]');
        if (!container) return;
        var amt = prompt('灵石数量：','50'); if (!amt) return;
        var empty = container.querySelector(':scope > div:not(.entry-item)'); if (empty) empty.remove();
        var div = document.createElement('div'); div.className='entry-item';
        div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;';
        div.setAttribute('data-reward-type','lingshi'); div.setAttribute('data-lingshi-amount', amt);
        div.innerHTML = '<span style="flex:1;font-size:13px;">灵石 ×'+amt+'</span><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button>';
        container.appendChild(div);
      });
    });

    // 技能UP（红色）
    document.getElementById('btn-add-up-skill')?.addEventListener('click', function(){
      var container = document.getElementById('up-skill-container');
      if ((container.querySelectorAll('.up-skill-sel').length) >= 3) { alert('最多3个UP'); return; }
      var gfList = Storage.list('skills_gongfa'), stList = Storage.list('skills_shentong');
      var div = document.createElement('div'); div.className='entry-item'; div.style.cssText='display:flex;align-items:center;gap:8px;';
      div.innerHTML = '<select class="up-skill-sel" style="flex:1;"><option value="">不选择</option>'+
        '<optgroup label="功法">'+gfList.map(function(g){ return '<option value="gf_'+g.id+'">'+(g.name||'未命名')+'</option>'; }).join('')+'</optgroup>'+
        '<optgroup label="神通">'+stList.map(function(s){ return '<option value="st_'+s.id+'">'+(s.name||'未命名')+'</option>'; }).join('')+'</optgroup></select>'+
        '<button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button>';
      container.appendChild(div);
    });

    // 技能金色小UP
    document.getElementById('btn-add-up-skill-small')?.addEventListener('click', function(){
      var container = document.getElementById('up-skill-small-container');
      if ((container.querySelectorAll('.up-skill-small-sel').length) >= 3) { alert('最多3个小UP'); return; }
      var gfList = Storage.list('skills_gongfa'), stList = Storage.list('skills_shentong');
      var div = document.createElement('div'); div.className='entry-item'; div.style.cssText='display:flex;align-items:center;gap:8px;';
      div.innerHTML = '<select class="up-skill-small-sel" style="flex:1;"><option value="">不选择</option>'+
        '<optgroup label="功法">'+gfList.map(function(g){ return '<option value="gf_'+g.id+'">'+(g.name||'未命名')+'</option>'; }).join('')+'</optgroup>'+
        '<optgroup label="神通">'+stList.map(function(s){ return '<option value="st_'+s.id+'">'+(s.name||'未命名')+'</option>'; }).join('')+'</optgroup></select>'+
        '<button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button>';
      container.appendChild(div);
    });

    // 小UP
    document.getElementById('btn-add-up-small')?.addEventListener('click', function(){
      var container = document.getElementById('up-small-container');
      if (container.querySelectorAll('.up-small-sel').length >= 3) { alert('最多3个小UP'); return; }
      var cl = Storage.list('characters');
      var div = document.createElement('div'); div.className='entry-item'; div.style.cssText = 'display:flex;align-items:center;gap:8px;';
      div.innerHTML = '<select class="up-small-sel" style="flex:1;"><option value="">不选择</option>'+cl.map(function(c){ return '<option value="'+c.id+'">'+(c.name||'未命名')+'</option>'; }).join('')+'</select><button class="btn-delete" onclick="this.closest(\'.entry-item\').remove()">×</button>';
      container.appendChild(div);
    });
  },

  // === 抽卡详情 ===
  renderPoolDetail: function(id) {
    var pool = Storage.findById(GACHA_POOLS_KEY, id);
    if (!pool) return '<div class="placeholder">卡池不存在</div>';
    var isSkill = pool.type==='skill';
    var pityLabel = isSkill?'悟道值':'仙缘值';
    var maxP = isSkill?60:100, pv = pool.pityValue||0;
    var pct = Math.round(pv/maxP*100);
    var stats = _getStats(id), avg = _avgPulls(stats), avgRed = _avgRedPulls(stats);
    var isNormalPool = !isSkill && pool.subtype==='normal';

    var upHtml = '';
    // === UP 展示：大UP在上 + 小UP在下全宽横向 ===
    if (pool.upBig || (pool.upItems&&pool.upItems.length>0) || (pool.upSmall&&pool.upSmall.length>0)) {
      upHtml += '<div style="margin-bottom:20px;">';

      // 大UP（红色）居中
      upHtml += '<div style="background:rgba(255,51,51,0.06);border:2px solid rgba(255,51,51,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:16px;">';
      upHtml += '<div style="color:#ff3333;font-weight:bold;font-size:18px;margin-bottom:12px;">⬤ 大UP · 红色仙品</div>';

      if (isSkill && pool.upItems && pool.upItems.length>0) {
        upHtml += '<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">';
        pool.upItems.forEach(function(u){
          var label = u.itemType==='gongfa'?'功法':'神通';
          var skillObj = u.itemType==='gongfa' ? Storage.findById('skills_gongfa',u.itemId) : Storage.findById('skills_shentong',u.itemId);
          var sImg = skillObj&&skillObj.image ? skillObj.image : '';
          var sSrc = sImg && !sImg.startsWith('data:') ? 'img/skills/'+sImg : sImg;
          upHtml += '<div style="text-align:center;padding:14px;min-width:170px;">';
          if (sSrc) upHtml += '<img src="'+sSrc+'" style="max-height:220px;max-width:180px;border-radius:10px;border:2px solid #ff3333;object-fit:contain;margin-bottom:6px;">';
          upHtml += '<div style="color:#ff3333;font-weight:bold;font-size:14px;">'+label+'</div>';
          upHtml += '<div style="font-size:18px;color:var(--gold);">'+(u.itemName||'(未设置)')+'</div></div>';
        });
        upHtml += '</div>';
      } else if (pool.upBig) {
        var bc=Storage.findById('characters',pool.upBig.itemId);
        var bImg=bc?(bc.fullBody||bc.avatar):'', bSrc=bImg&&!bImg.startsWith('data:')?'img/characters/'+bImg:bImg;
        if (bSrc) upHtml += '<img src="'+bSrc+'" style="max-height:300px;max-width:200px;border-radius:12px;border:3px solid #ff3333;object-fit:contain;margin-bottom:8px;">';
        upHtml += '<div style="font-size:20px;color:var(--gold);font-weight:bold;">'+(bc?bc.name:'(已删除)')+'</div>';
        if (bc && bc.realm) upHtml += '<div style="font-size:13px;color:var(--text-dim);margin-top:4px;">'+majorName(bc.realm)+'期</div>';
      } else {
        upHtml += '<div style="color:var(--text-dim);padding:20px;">暂未设置</div>';
      }
      upHtml += '</div>';

      // 小UP（金色）全宽横向
      var smallUps = [];
      if (isSkill && pool.upSmallItems && pool.upSmallItems.length>0) smallUps = pool.upSmallItems;
      else if (!isSkill && pool.upSmall) smallUps = pool.upSmall;

      if (smallUps.length > 0) {
        upHtml += '<div style="background:rgba(255,136,0,0.04);border:2px solid rgba(255,136,0,0.2);border-radius:14px;padding:20px;text-align:center;">';
        upHtml += '<div style="color:#ff8800;font-weight:bold;font-size:18px;margin-bottom:12px;">⬤ 小UP · 金色天品</div>';
        upHtml += '<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">';
        smallUps.forEach(function(u){
          var obj, imgPath;
          if (isSkill) {
            obj = u.itemType==='gongfa' ? Storage.findById('skills_gongfa',u.itemId) : Storage.findById('skills_shentong',u.itemId);
            imgPath = 'skills/';
          } else {
            obj = Storage.findById('characters', u.itemId);
            imgPath = 'characters/';
          }
          var uImg = obj ? (isSkill ? obj.image : (obj.fullBody||obj.avatar||'')) : '';
          var uSrc = uImg && !uImg.startsWith('data:') ? 'img/'+imgPath+uImg : uImg;
          var uName = u.itemName || (obj ? obj.name : '(已删除)');
          var uRealm = (!isSkill && obj) ? (obj.realm ? majorName(obj.realm)+'期' : '') : '';
          upHtml += '<div style="text-align:center;padding:14px;min-width:170px;">'+
            (uSrc ? '<img src="'+uSrc+'" style="max-height:340px;max-width:240px;object-fit:contain;border-radius:10px;" onerror="this.style.display=\'none\';">' : '<div style="width:170px;height:240px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:10px;color:var(--text-dim);">无图</div>')+
            '<div style="font-size:15px;color:#ff8800;font-weight:bold;margin-top:8px;">'+uName+'</div>'+
            (uRealm ? '<div style="font-size:12px;color:var(--text-dim);">'+uRealm+'</div>' : '')+
            '</div>';
        });
        upHtml += '</div></div>';
      }
      upHtml += '</div>';
    }

    var histKey = GACHA_HISTORY_KEY+'__'+pool.id, history = Storage.list(histKey);
    var showCount = Math.min(history.length, 20);
    var histHtml = history.length===0 ? '<div style="color:var(--text-dim);font-size:13px;text-align:center;padding:12px;">暂无抽卡记录</div>' :
      '<div id="hist-list" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">'+
      history.slice(0, showCount).map(function(h,i){ return '<span style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;background:'+(h.tierColor||'#888')+';">'+(h.name||'?')+'</span>'; }).join('')+
      '</div>'+
      (history.length > 20 ? '<div style="margin-top:8px;"><button class="btn-sm row-icon-btn" id="btn-hist-more" style="font-size:12px;" data-pool="'+pool.id+'">展开全部（'+history.length+'条）</button></div>' : '');

    // 角色常驻池：展示卡池配置中的角色立绘
    var galleryHtml = '';
    if (!isSkill && pool.subtype==='normal') {
      var baseRewards = _charBaseRewards();
      var shownIds = {};
      var charCards = '';
      baseRewards.forEach(function(r){
        if (r.itemType !== 'character' || shownIds[r.itemId]) return;
        shownIds[r.itemId] = true;
        var c = Storage.findById('characters', r.itemId);
        if (!c) return;
        var img = c.fullBody || c.avatar;
        var src = img && !img.startsWith('data:') ? 'img/characters/'+img : img;
        var realm = c.realm ? majorName(c.realm)+'期' : '';
        charCards += '<div style="text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:12px;min-width:180px;">'+
          (src ? '<img src="'+src+'" style="max-height:360px;max-width:260px;object-fit:contain;border-radius:10px;" onerror="this.style.display=\'none\';">' : '<div style="width:180px;height:260px;display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:10px;color:var(--text-dim);font-size:14px;">无图</div>')+
          '<div style="font-size:15px;color:var(--gold);margin-top:8px;font-weight:bold;">'+(c.name||'未命名')+'</div>'+
          '<div style="font-size:12px;color:var(--text-dim);">'+realm+'</div>'+
          '</div>';
      });
      if (charCards) {
        galleryHtml = '<fieldset class="fieldset" style="margin-top:20px;"><legend>角色一览（常驻池内角色）</legend>'+
          '<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">'+charCards+'</div></fieldset>';
      }
    }

    var bh = pool.type==='skill'?'gacha-skill':(pool.subtype==='up'?'gacha-up':'gacha-normal');

    return '<div class="detail-page" data-pool-id="'+pool.id+'" style="text-align:center;">'+
      '<div class="toolbar"><button class="btn-primary" onclick="App.navigate(\''+bh+'\')">← 返回</button><span style="flex:1;"></span>'+
      '<button class="btn-sm row-icon-btn" id="btn-rules" style="font-size:12px;">📋 规则</button>'+
      '<button class="btn-sm row-icon-btn" onclick="App.navigate(\'gacha/edit?id='+pool.id+'\')">✎ 编辑</button></div>'+
      '<h2 style="color:var(--gold);margin-bottom:4px;">'+(pool.name||'未命名')+'</h2>'+
      '<div style="color:var(--text-dim);font-size:14px;margin-bottom:12px;">版本：'+(pool.version||'—')+'</div>'+upHtml+
      '<div style="margin:16px 0;padding:12px 20px;background:rgba(184,148,76,0.08);border-radius:8px;border:1px solid rgba(184,148,76,0.2);">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:14px;color:var(--gold);">'+pityLabel+'</span><span style="font-size:14px;color:var(--gold);font-weight:bold;">'+pv+' / '+maxP+'</span></div>'+
        '<div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--gold),#ff6600);border-radius:4px;" id="pity-bar"></div></div>'+
        '<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">'+
          (isNormalPool
            ? '<span style="font-size:12px;color:var(--text-light);">距上次出红：<span style="color:var(--gold);font-weight:bold;">'+(stats.pullsSinceLastRed||0)+'</span> 抽</span>'+
              (avgRed!==null?'<span style="font-size:12px;color:var(--text-light);">平均出红：<span style="color:var(--gold);">'+avgRed+'</span> 抽（共 '+(stats.redCount||0)+' 次）</span>':'')
            : '<span style="font-size:12px;color:var(--text-light);">距上次大UP：<span style="color:var(--gold);font-weight:bold;">'+(stats.pullsSinceLastUP||0)+'</span> 抽</span>'+
              (avg!==null?'<span style="font-size:12px;color:var(--text-light);">历史平均：<span style="color:var(--gold);">'+avg+'</span> 抽（共 '+stats.upBigCount+' 次）</span>':'')
          )+
          '<span style="font-size:11px;color:var(--text-light);">总计：'+stats.totalPulls+' 抽</span>'+
        '</div>'+
        '<div style="margin-top:6px;display:flex;gap:8px;">'+
          '<button class="btn-sm row-icon-btn" id="btn-reset-pity" style="font-size:11px;color:var(--red);" data-pool="'+pool.id+'">重置'+pityLabel+'</button>'+
          '<button class="btn-sm row-icon-btn" id="btn-reset-stats" style="font-size:11px;color:var(--red);" data-pool="'+pool.id+'">重置统计</button>'+
        '</div></div>'+
      '<div style="display:flex;gap:16px;justify-content:center;margin:20px 0;">'+
        '<button class="btn-primary" id="btn-pull-one" style="font-size:18px;padding:12px 40px;">单 抽</button>'+
        '<button class="btn-primary" id="btn-pull-ten" style="font-size:18px;padding:12px 40px;background:linear-gradient(135deg,#b8944c,#ff8800);">十 连 抽</button></div>'+
      '<fieldset class="fieldset" style="margin-top:20px;"><legend>抽卡记录（最近20条，总'+history.length+'条）</legend><div id="gacha-history">'+histHtml+'</div></fieldset>'+
      galleryHtml+
      '<div id="gacha-overlay" class="gacha-overlay" style="display:none;"></div></div>';
  },

  bindPoolDetailEvents: function() {
    var el = document.querySelector('.detail-page'); if (!el) return;
    var pid = el.dataset.poolId;

    var recSave = function(pool, results, bigCnt, redCnt) {
      var hk = GACHA_HISTORY_KEY+'__'+pool.id, history = Storage.list(hk);
      results.forEach(function(r){ if (r.histItem) history.unshift(r.histItem); });
      if (history.length>100) history.length=100;
      Storage.set(hk, history);
      _recordPulls(pid, results.length, bigCnt, redCnt);
    };

    var doIt = function(isTen) {
      var pool = Storage.findById(GACHA_POOLS_KEY, pid); if (!pool) return;
      if (isTen) {
        var results = doTenPull(pool);
        pool.pityValue = results[results.length-1].pityValue;
        pool._tenCount = results[results.length-1].newTenCount;
        Storage.save(GACHA_POOLS_KEY, pool);
        var bc = results.filter(function(r){ return r.isBigUP; }).length;
        var rc = results.filter(function(r){ return r.isRed; }).length;
        recSave(pool, results, bc, rc);
        _showTenPullAnimation(results, pool);
      } else {
        var result = doPull(pool);
        pool.pityValue = result.pityValue; pool._tenCount = result.newTenCount;
        Storage.save(GACHA_POOLS_KEY, pool);
        recSave(pool, [result], result.isBigUP?1:0, result.isRed?1:0);
        _showSinglePullAnimation(result, pool);
      }
    };

    // 规则按钮
    document.getElementById('btn-rules')?.addEventListener('click', function(){
      var pool = Storage.findById(GACHA_POOLS_KEY, pid); if (!pool) return;
      var isSkill = pool.type==='skill';
      var tiers = pool.rarityTiers||(isSkill?DEFAULT_SKILL_TIERS:DEFAULT_CHAR_TIERS);
      var t0=tiers[0], t1=tiers[1], t2=tiers[2], t3=tiers[3];
      var maxP=isSkill?60:100, pityLabel=isSkill?'悟道值':'仙缘值';
      var redBase=(t0.rate||0).toFixed(1)+'%';

      var html = '<div style="max-width:600px;text-align:left;line-height:1.8;">'+
        '<h3 style="color:var(--gold);text-align:center;margin-bottom:12px;">'+pool.name+' — 概率规则</h3>';

      var redCons, goldCons, redUPCons;
      if (isSkill) {
        redCons = '2.56%（约39抽出1红）';
        goldCons = '11.5%（约9抽出1金，含十连保底）';
        redUPCons = '1.45%（约69抽出1当期UP，计入可歪概率）';
      } else {
        redCons = '1.56%（约64抽出1红）';
        goldCons = '11.5%（约9抽出1金，含十连保底）';
        redUPCons = '1.10%（约91抽出1大UP，计入可歪概率）';
      }

      html += '<fieldset class="fieldset"><legend>稀有度分档</legend><table style="width:100%;">'+
        '<tr><td>'+tierBadgeHtml(t0)+'</td><td>基础概率：'+t0.rate+'%</td><td>综合概率：'+redCons+'</td></tr>'+
        '<tr><td>'+tierBadgeHtml(t1)+'</td><td>基础概率：'+t1.rate+'%</td><td>综合概率：'+goldCons+'</td></tr>'+
        '<tr><td>'+tierBadgeHtml(t2)+'</td><td>基础概率：'+t2.rate+'%</td></tr>'+
        '<tr><td>'+tierBadgeHtml(t3)+'</td><td>基础概率：'+t3.rate+'%</td></tr>'+
        '</table></fieldset>';

      if (pool.subtype==='up' || isSkill) {
        html += '<fieldset class="fieldset"><legend>综合UP概率</legend>'+
          '<p>· 红色UP综合概率：'+redUPCons+'</p>'+
          (!isSkill?'<p>· 金色小UP综合概率：约5.75%（金色中50%为小UP）</p>':'')+
          '</fieldset>';
      }

      html += '<fieldset class="fieldset"><legend>保底机制</legend>'+
        '<p>· 十连抽必出金色（天品）或以上品质</p>'+
        '<p>· '+pityLabel+'达到 '+maxP+' 时，必出红色（仙品）</p>'+
        '<p>· '+pityLabel+'越高，出红色概率逐步递增（基础 '+redBase+'）</p>'+
        '<p>· 抽出红色后，'+pityLabel+'清零重新累计</p>'+
        '</fieldset>';

      if (pool.subtype==='up' || isSkill) {
        html += '<fieldset class="fieldset"><legend>UP 机制</legend>';
        if (isSkill) {
          html += '<p>· 抽出红色时，根据悟道值决定获得UP还是常驻奖励</p>'+
            '<p>· 悟道值较低时易"歪"，悟道值越高UP概率越大</p>'+
            '<p>· 悟道值达 '+maxP+' 时必出UP</p>'+
            '<p>· UP 包含当期配置的功法/神通（红色品质）</p>'+
            (pool.upSmallItems&&pool.upSmallItems.length>0?'<p>· 金色品质也有概率获得小UP奖励</p>':'')+
            '<p>· 各卡池UP独立，不互相继承</p>';
        } else if (pool.subtype==='up') {
          html += '<p>· 大UP（红色仙品）：抽出红色时按仙缘值决定UP概率，仙缘值越高越不易歪</p>'+
            '<p>· 小UP（金色天品）：抽出金色时有50%概率获得</p>'+
            '<p>· 仙缘值跨卡池保留，抽出红色后清零</p>';
        }
        html += '</fieldset>';
      }

      html += '<fieldset class="fieldset"><legend>奖励来源</legend>';
      if (isSkill) {
        html += '<p>· 红色/金色品质：优先当期UP，否则从卡池奖励中随机</p>'+
          '<p>· 紫色/蓝色品质：从卡池配置的奖励中随机</p>'+
          '<p>· 无奖励时降级为灵石</p>';
      } else if (pool.subtype==='up') {
        html += '<p>· 所有角色池共享常驻奖励池（在寻仙唤灵中配置）</p>'+
          '<p>· 红色品质：大UP角色</p>'+
          '<p>· 金色品质：50%小UP角色 / 50%常驻金色奖励</p>'+
          '<p>· 紫色/蓝色品质：从常驻奖励中随机，无角色时获得灵石</p>';
      } else {
        html += '<p>· 所有角色池共享常驻奖励池（在寻仙唤灵中配置）</p>'+
          '<p>· 红色品质：从常驻红色奖励中随机</p>'+
          '<p>· 金色品质：从常驻金色奖励中随机</p>'+
          '<p>· 紫色/蓝色品质：从常驻奖励中随机，无角色时获得灵石</p>';
      }
      html += '</fieldset>';

      html += '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-top:12px;">具体概率数值随'+pityLabel+'动态变化</p>';

      var overlay = document.getElementById('gacha-overlay');
      overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
      overlay.innerHTML = '<div style="background:var(--card-bg);border-radius:14px;padding:28px;max-width:620px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.5);">'+html+
        '<div style="text-align:center;margin-top:16px;"><button class="btn-primary" onclick="document.getElementById(\'gacha-overlay\').style.display=\'none\';">关闭</button></div></div>';
    });

    document.getElementById('btn-pull-one')?.addEventListener('click', function(){ doIt(false); });
    document.getElementById('btn-pull-ten')?.addEventListener('click', function(){ doIt(true); });

    // 重置仙缘值/悟道值
    document.getElementById('btn-reset-pity')?.addEventListener('click', function(){
      if (!confirm('确定重置计数？')) return;
      var pool = Storage.findById(GACHA_POOLS_KEY, this.dataset.pool);
      if (pool) { pool.pityValue = 0; pool._tenCount = 0; Storage.save(GACHA_POOLS_KEY, pool); }
      App.navigate('gacha/detail?id='+this.dataset.pool);
    });
    // 重置统计
    document.getElementById('btn-reset-stats')?.addEventListener('click', function(){
      if (!confirm('确定重置所有统计数据？此操作不可撤销。')) return;
      _saveStats(this.dataset.pool, {totalPulls:0,upBigCount:0,upBigIntervals:[],pullsSinceLastUP:0,redCount:0,redIntervals:[],pullsSinceLastRed:0});
      App.navigate('gacha/detail?id='+this.dataset.pool);
    });

    // 展开历史记录
    document.getElementById('btn-hist-more')?.addEventListener('click', function(){
      var histKey = GACHA_HISTORY_KEY+'__'+this.dataset.pool;
      var history = Storage.list(histKey);
      var all = history.map(function(h,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:4px;">'+
          '<span style="font-size:11px;color:var(--text-dim);min-width:24px;">#'+(i+1)+'</span>'+
          '<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;background:'+(h.tierColor||'#888')+';">'+(h.name||'?')+'</span>'+
          '<span style="font-size:11px;color:var(--text-light);">'+(h.tierLabel||'')+'</span>'+
          (h.upType?'<span style="color:'+(h.upType==='big'?'#ff3333':'#ff8800')+';font-size:11px;font-weight:bold;">'+(h.upType==='big'?'大UP':'小UP')+'</span>':'')+
          '<span style="font-size:10px;color:var(--text-light);margin-left:auto;">'+new Date(h.time).toLocaleString()+'</span>'+
          '</div>';
      }).join('');
      var overlay = document.getElementById('gacha-overlay');
      overlay.style.display = 'flex'; overlay.style.flexDirection = 'column'; overlay.style.padding = '20px';
      overlay.innerHTML = '<h3 style="color:var(--gold);margin-bottom:12px;">抽卡记录（共'+history.length+'条）</h3>'+
        '<div style="max-height:70vh;overflow-y:auto;width:90%;max-width:700px;">'+all+'</div>'+
        '<button class="btn-primary" style="margin-top:12px;" onclick="document.getElementById(\'gacha-overlay\').style.display=\'none\';">关闭</button>';
    });
  }
};

// 获取灵石图标路径（从道具图鉴读取）
function _lingshiIconPath() {
  var items = JSON.parse(localStorage.getItem('items')||'null')||[];
  for (var i=0;i<items.length;i++) {
    if (items[i].name==='灵石'&&items[i].icon&&items[i].icon.trim()) {
      var icon = items[i].icon.trim();
      return icon.startsWith('data:') ? icon : 'img/items/'+icon;
    }
  }
  return '';
}

// === 图片工具 ===
// 统一处理角色/技能/灵石/道具图片
function _rewardImgHtml(item, poolType, maxH, w, h) {
  if (!item) return _fallbackDiv(w, h, '?');
  // 灵石：从道具图鉴读取图标
  if (item.name === '灵石') {
    var lsIcon = _lingshiIconPath();
    if (lsIcon) {
      return '<div style="display:flex;justify-content:center;"><img src="'+lsIcon+'" style="display:block;max-height:'+maxH+';max-width:100%;object-fit:contain;border-radius:8px;" onerror="this.outerHTML=_fallbackDiv(\''+w+'\',\''+h+'\',\'?\');"></div>';
    }
    return _fallbackDiv(w, h, '?');
  }
  // 无图片
  if (!item.image) return _fallbackDiv(w, h, '?');
  // 构建路径
  var src = item.image;
  if (!src.startsWith('data:') && !src.startsWith('img/')) {
    src = 'img/' + (poolType==='skill'?'skills/':'characters/') + src;
  }
  return '<div style="display:flex;justify-content:center;"><img src="'+src+'" style="display:block;max-height:'+maxH+';max-width:100%;object-fit:contain;border-radius:8px;" onerror="this.outerHTML=_fallbackDiv(\''+w+'\',\''+h+'\',\'?\');"></div>';
}
function _fallbackDiv(w, h, text) {
  return '<div style="width:'+w+';height:'+h+';display:flex;align-items:center;justify-content:center;background:var(--input-bg);border-radius:8px;font-size:24px;color:var(--text-light);">'+text+'</div>';
}

// === 抽卡动画（点击交互式）===

function _gachaOverlay() { return document.getElementById('gacha-overlay'); }

// 构建闭合屏风HTML（门框四周发光）
function _closedScreenHtml(tier) {
  return '<div class="gacha-clickable" class="gacha-clickable" style="cursor:pointer;">'+
    '<div class="gacha-pulse-ring" style="border-color:'+tier.glow+';"></div>'+
    '<div class="gacha-screen-frame" style="box-shadow:0 0 50px 20px '+tier.color+';">'+
      '<div class="gacha-screen-container">'+
        '<div class="gacha-screen-left"><div class="gacha-screen-lattice"></div><div class="gacha-screen-border-inner"></div></div>'+
        '<div class="gacha-screen-right"><div class="gacha-screen-lattice"></div><div class="gacha-screen-border-inner"></div></div>'+
      '</div>'+
    '</div></div>';
}

// 构建闭合卷轴HTML（卷轴四周发光）
function _closedScrollHtml(tier) {
  return '<div class="gacha-clickable" style="cursor:pointer;">'+
    '<div class="gacha-pulse-ring" style="border-color:'+tier.glow+';"></div>'+
    '<div class="gacha-scroll-wrapper-closed" style="box-shadow:0 0 50px 20px '+tier.color+';border-radius:16px;position:relative;width:456px;height:52px;">'+
      '<div class="gacha-scroll-rod gacha-scroll-rod-top" style="position:absolute;top:0;left:0;transition:none;"></div>'+
      '<div class="gacha-scroll-rod gacha-scroll-rod-bottom" style="position:absolute;bottom:0;left:0;transition:none;"></div>'+
      '<div class="gacha-scroll-parchment" style="height:0;transition:none;position:absolute;top:26px;left:0;width:100%;"></div>'+
    '</div></div>';
}

// 执行开门动画
function _doOpenAnim(isSkill, onDone) {
  _spawnParticles('#ffcc00');
  if (isSkill) {
    // 卷轴：杆子从重叠变为上下分开
    var wrapper = document.querySelector('.gacha-scroll-wrapper-closed');
    var rt = wrapper ? wrapper.querySelector('.gacha-scroll-rod-top') : null;
    var rb = wrapper ? wrapper.querySelector('.gacha-scroll-rod-bottom') : null;
    var sp = wrapper ? wrapper.querySelector('.gacha-scroll-parchment') : null;
    if (wrapper) {
      wrapper.style.transition = 'height 1.2s cubic-bezier(0.25,0.1,0.25,1)';
      wrapper.style.height = '572px';
    }
    if (rt) { rt.style.transition = 'top 1.2s cubic-bezier(0.25,0.1,0.25,1)'; rt.style.top = '0'; }
    if (rb) { rb.style.transition = 'bottom 1.2s cubic-bezier(0.25,0.1,0.25,1)'; rb.style.bottom = '0'; }
    if (sp) {
      sp.style.transition = 'height 1.2s cubic-bezier(0.25,0.1,0.25,1),top 1.2s cubic-bezier(0.25,0.1,0.25,1)';
      sp.style.top = '26px'; sp.style.height = '520px';
    }
  } else {
    setTimeout(function(){
      var sl=document.querySelector('.gacha-screen-left'); if(sl)sl.style.transform='translateX(-100%)';
      var sr=document.querySelector('.gacha-screen-right'); if(sr)sr.style.transform='translateX(100%)';
      _spawnParticles('#ffcc00');
    }, 300);
  }
  setTimeout(function(){
    var reveal=document.getElementById('gacha-reveal');
    if(reveal){reveal.style.display='flex';reveal.style.opacity='0';reveal.style.transition='opacity 0.6s';setTimeout(function(){if(reveal)reveal.style.opacity='1';},50);}
  }, 1100);
  setTimeout(function(){ if(onDone)onDone(); }, 2000);
}

// === 单抽 ===
function _showSinglePullAnimation(result, pool) {
  var overlay = _gachaOverlay(); if (!overlay) return;
  var isSkill = pool.type==='skill';
  var t = result.tier, rw = result.histItem;
  var isRed = result.tierIdx===0, isGold = result.tierIdx===1;
  var imgHtml = _rewardImgHtml(rw, pool.type, '380px', '200px', '280px');

  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
  overlay.innerHTML =
    '<div class="gacha-scene">'+
    (isSkill ? _closedScrollHtml(t) : _closedScreenHtml(t))+
    '<div class="gacha-particles" id="gacha-particles"></div>'+
    '<div class="gacha-reveal-card" id="gacha-reveal" style="display:none;">'+imgHtml+
      '<div class="gacha-result-tier" style="background:'+t.color+';margin-top:14px;">'+t.label+'</div>'+
      '<div class="gacha-result-name">'+(rw?rw.name:'灵石')+'</div>'+
      (rw&&rw.upType?'<div style="color:'+(rw.upType==='big'?'#ff3333':'#ff8800')+';font-size:14px;margin-top:2px;font-weight:bold;">'+(rw.upType==='big'?'大UP':'小UP')+'</div>':'')+'</div>'+
    (isRed?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,51,51,0.6) 0%, transparent 70%);"></div>':isGold?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,136,0,0.5) 0%, transparent 70%);"></div>':'')+
    '</div><button class="gacha-skip-btn" onclick="_skipToReveal()">跳过 ▸▸</button>';

  var opened = false;
  document.querySelector('.gacha-clickable')?.addEventListener('click', function(){
    if (opened) return; opened = true;
    var el = this; el.style.cursor = 'default';
    var ring = el.querySelector('.gacha-pulse-ring'); if (ring) ring.style.display = 'none';
    _doOpenAnim(isSkill, function(){
      overlay.addEventListener('click', function(){ overlay.style.display='none'; App.navigate('gacha/detail?id='+pool.id); });
    });
  });

  // 跳过 = 直接到结果
  window._skipToReveal = function(){
    var reveal = document.getElementById('gacha-reveal');
    if (reveal) { reveal.style.display = 'flex'; reveal.style.opacity = '1'; reveal.style.transition = 'none'; }
    var sl=document.querySelector('.gacha-screen-left'); if(sl)sl.style.transform='translateX(-100%)';
    var sr=document.querySelector('.gacha-screen-right'); if(sr)sr.style.transform='translateX(100%)';
    var cw=document.querySelector('.gacha-scroll-wrapper-closed');
    if(cw){cw.style.transition='none';cw.style.height='572px';}
    var rt=cw?cw.querySelector('.gacha-scroll-rod-top'):null; if(rt){rt.style.transition='none';rt.style.top='0';}
    var rb=cw?cw.querySelector('.gacha-scroll-rod-bottom'):null; if(rb){rb.style.transition='none';rb.style.bottom='0';}
    var sp=cw?cw.querySelector('.gacha-scroll-parchment'):null; if(sp){sp.style.transition='none';sp.style.top='26px';sp.style.height='520px';}
    var ring = document.querySelector('.gacha-pulse-ring'); if (ring) ring.style.display = 'none';
    overlay.addEventListener('click', function(){ overlay.style.display='none'; App.navigate('gacha/detail?id='+pool.id); });
  };
}

// === 十抽 ===
var _tenSeq = null; // 当前十抽序列状态
function _showTenPullAnimation(results, pool) {
  var overlay = _gachaOverlay(); if (!overlay) return;
  var isSkill = pool.type==='skill';
  var currentIdx = 0;

  // 构建十个结果的汇总卡片（最后显示）
  function _summaryCards() {
    var cardsHtml = results.map(function(r){
      var t = r.tier, h = r.histItem;
      var border = r.tierIdx===0?'3px solid #ff3333':r.tierIdx===1?'3px solid #ff8800':'1px solid rgba(255,255,255,0.15)';
      var isCharCard = pool.type==='character' && h && h.type==='角色';
      var im = _rewardImgHtml(h, pool.type, isCharCard?'340px':'200px', isCharCard?'220px':'100px', isCharCard?'300px':'140px');
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(255,255,255,0.08);border-radius:14px;padding:'+(isCharCard?'20px 18px':'12px 10px')+';min-width:'+(isCharCard?'200px':'120px')+';border:'+border+';">'+im+
        '<span style="display:inline-block;padding:'+(isCharCard?'3px 12px':'2px 8px')+';border-radius:3px;font-size:'+(isCharCard?'12px':'10px')+';font-weight:bold;color:#fff;background:'+t.color+';">'+t.label+'</span>'+
        '<span style="font-size:'+(isCharCard?'14px':'11px')+';color:#fff;text-align:center;max-width:'+(isCharCard?'180px':'100px')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(h?h.name:'灵石')+'</span>'+
        (h&&h.upType?'<span style="color:'+(h.upType==='big'?'#ff3333':'#ff8800')+';font-size:'+(isCharCard?'11px':'9px')+';font-weight:bold;">'+(h.upType==='big'?'大UP':'小UP')+'</span>':'')+'</div>';
    }).join('');
    return '<h3 style="color:var(--gold);margin-bottom:14px;font-size:22px;">十连抽结果</h3>'+
      '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:50vw;">'+cardsHtml+'</div>';
  }

  // 渲染一扇闭合门（跑马灯用，复用单抽发光门）
  function _renderOneDoor(idx) {
    var r = results[idx], t = r.tier;
    return '<div class="marquee-door" style="flex-shrink:0;margin:20px 10px;">'+
      (isSkill ? _closedScrollHtml(t) : _closedScreenHtml(t))+
      '</div>';
  }

  // Phase1: 跑马灯——10扇门从右向左依次滚过
  var _marqueeTimer1 = null, _marqueeTimer2 = null;
  function _startMarquee(callback) {
    var track = document.getElementById('gacha-marquee-track');
    if (!track) return;
    track.style.transform = 'translateX(110vw)';
    track.style.transition = 'none';
    var totalWidth = 10 * (isSkill?462:456);
    _marqueeTimer1 = setTimeout(function(){
      track.style.transition = 'transform 6s linear';
      track.style.transform = 'translateX(-'+(totalWidth+200)+'px)';
    }, 200);
    _marqueeTimer2 = setTimeout(function(){
      if(!_skipped && callback)callback();
    }, 6400);
  }

  // Phase2: 逐一开门——第N扇移到中央，onOpened回调在打开后执行
  function _showDoorOneByOne(idx, onOpened) {
    var track = document.getElementById('gacha-marquee-track');
    if (!track) return;
    track.style.transition = 'none';
    track.style.transform = 'none';
    track.style.justifyContent = 'center';
    track.innerHTML = _renderOneDoor(idx);

    var r = results[idx], t = r.tier, rw = r.histItem;
    var isRed = r.tierIdx===0, isGold = r.tierIdx===1;
    var imgHtml = _rewardImgHtml(rw, pool.type, '380px', '200px', '280px');

    var door = track.querySelector('.marquee-door');
    if (!door) return;
    var clickable = door.querySelector('.gacha-clickable');
    if (!clickable) return;
    clickable.innerHTML +=
      '<div class="gacha-particles" id="gacha-particles"></div>'+
      '<div class="gacha-reveal-card" id="gacha-reveal" style="display:none;">'+imgHtml+
        '<div class="gacha-result-tier" style="background:'+t.color+';margin-top:14px;">'+t.label+'</div>'+
        '<div class="gacha-result-name">'+(rw?rw.name:'灵石')+'</div>'+
        (rw&&rw.upType?'<div style="color:'+(rw.upType==='big'?'#ff3333':'#ff8800')+';font-size:14px;margin-top:2px;font-weight:bold;">'+(rw.upType==='big'?'大UP':'小UP')+'</div>':'')+'</div>'+
      (isRed?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,51,51,0.6) 0%, transparent 70%);"></div>':isGold?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,136,0,0.5) 0%, transparent 70%);"></div>':'');

    var opened = false;
    clickable.addEventListener('click', function(){
      if (opened) return; opened = true;
      this.style.cursor = 'default';
      var ring = this.querySelector('.gacha-pulse-ring'); if (ring) ring.style.display = 'none';
      _doOpenAnim(isSkill, function(){
        _tenSeq.opened[idx] = true;
        // 清理旧的overlay click监听器
        if (_currentOverlayHandler) overlay.removeEventListener('click', _currentOverlayHandler);
        _currentOverlayHandler = onOpened || _nextOne;
        overlay.addEventListener('click', _currentOverlayHandler);
      });
    });
  }

  var _currentOverlayHandler = null;
  function _nextOne() {
    overlay.removeEventListener('click', _nextOne);
    _currentOverlayHandler = null;
    currentIdx++;
    if (currentIdx < 10) {
      _showDoorOneByOne(currentIdx);
    } else {
      overlay.style.overflow = '';
      overlay.innerHTML = _summaryCards()+
        '<button class="btn-primary" style="margin-top:18px;font-size:16px;padding:10px 36px;" onclick="document.getElementById(\'gacha-overlay\').style.display=\'none\';App.navigate(\'gacha/detail?id='+pool.id+'\');">确 定</button>';
      overlay.style.padding = '20px'; overlay.style.overflowY = 'auto'; overlay.style.alignItems = 'center';
    }
  }

  // 初始渲染：跑马灯（10扇门横向排列）
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
  overlay.style.overflow = 'hidden';
  // 构建10扇门的轨道
  var marqueeItems = '';
  for (var i = 0; i < 10; i++) {
    marqueeItems += _renderOneDoor(i);
  }
  overlay.innerHTML = '<div class="gacha-scene" style="width:100vw;overflow:visible;">'+
    '<div class="gacha-marquee-track" id="gacha-marquee-track" style="display:flex;gap:6px;">'+marqueeItems+'</div></div>'+
    '<button class="gacha-skip-btn" onclick="_skipTenSequence()">跳过 ▸▸</button>';

  _tenSeq = { opened: new Array(10).fill(false), results: results, pool: pool };
  _skipped = false;

  var _skipped = false;
  window._skipTenSequence = function(){
    _skipped = true;
    if (_marqueeTimer1) { clearTimeout(_marqueeTimer1); _marqueeTimer1 = null; }
    if (_marqueeTimer2) { clearTimeout(_marqueeTimer2); _marqueeTimer2 = null; }

    var upIndices = [];
    results.forEach(function(r, i){
      if (r.histItem && r.histItem.upType) upIndices.push(i);
    });

    if (upIndices.length === 0) {
      overlay.innerHTML = _summaryCards()+
        '<button class="btn-primary" style="margin-top:18px;font-size:16px;padding:10px 36px;" onclick="document.getElementById(\'gacha-overlay\').style.display=\'none\';App.navigate(\'gacha/detail?id='+pool.id+'\');">确 定</button>';
      overlay.style.padding = '20px'; overlay.style.overflowY = 'auto'; overlay.style.alignItems = 'center';
      return;
    }

    // 完全独立的UP逐一播放，不依赖跑马灯轨道
    _playUPSequence(upIndices, 0);
  };

  function _playUPSequence(upIndices, idx) {
    var overlay = _gachaOverlay();
    if (idx >= upIndices.length) {
      overlay.innerHTML = _summaryCards()+
        '<button class="btn-primary" style="margin-top:18px;font-size:16px;padding:10px 36px;" onclick="document.getElementById(\'gacha-overlay\').style.display=\'none\';App.navigate(\'gacha/detail?id='+pool.id+'\');">确 定</button>';
      overlay.style.padding = '20px'; overlay.style.overflowY = 'auto'; overlay.style.alignItems = 'center';
      return;
    }

    var ri = upIndices[idx];
    var r = results[ri], t = r.tier, rw = r.histItem;
    var isRed = r.tierIdx===0, isGold = r.tierIdx===1;
    var imgHtml = _rewardImgHtml(rw, pool.type, '380px', '200px', '280px');

    // 直接构建完整的独立场景
    overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.innerHTML =
      '<div class="gacha-scene">'+
      (isSkill ? _closedScrollHtml(t) : _closedScreenHtml(t))+
      '<div class="gacha-particles" id="gacha-particles"></div>'+
      '<div class="gacha-reveal-card" id="gacha-reveal" style="display:none;">'+imgHtml+
        '<div class="gacha-result-tier" style="background:'+t.color+';margin-top:14px;">'+t.label+'</div>'+
        '<div class="gacha-result-name">'+(rw?rw.name:'灵石')+'</div>'+
        (rw&&rw.upType?'<div style="color:'+(rw.upType==='big'?'#ff3333':'#ff8800')+';font-size:14px;margin-top:2px;font-weight:bold;">'+(rw.upType==='big'?'大UP':'小UP')+'</div>':'')+'</div>'+
      (isRed?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,51,51,0.6) 0%, transparent 70%);"></div>':isGold?'<div class="gacha-light-beam" style="background:radial-gradient(ellipse at center, rgba(255,136,0,0.5) 0%, transparent 70%);"></div>':'')+
      '</div>';

    var opened = false;
    var clickable = overlay.querySelector('.gacha-clickable');
    if (clickable) {
      clickable.addEventListener('click', function(){
        if (opened) return; opened = true;
        this.style.cursor = 'default';
        var ring = this.querySelector('.gacha-pulse-ring'); if (ring) ring.style.display = 'none';
        _doOpenAnim(isSkill, function(){
          // 打开后点击overlay任意位置进入下一个UP
          overlay.addEventListener('click', function nextUP(){
            overlay.removeEventListener('click', nextUP);
            _playUPSequence(upIndices, idx + 1);
          });
        });
      });
    }
  }

  // Phase1: 跑马灯滚动 → Phase2: 逐一开门
  _startMarquee(function(){
    currentIdx = 0;
    _showDoorOneByOne(0);
  });
}

// === CSS ===
(function(){
  var s = document.createElement('style');
  s.textContent =
    '.gacha-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column;}'+
    '.gacha-scene{position:relative;width:50vw;min-width:500px;display:flex;align-items:center;justify-content:center;min-height:55vh;}'+
    // 点击提示
    '.gacha-clickable{position:relative;display:flex;align-items:center;justify-content:center;}'+
    '.gacha-pulse-ring{position:absolute;width:120%;height:120%;border:2px solid;border-radius:50%;animation:gachaPulse 1.5s ease-out infinite;pointer-events:none;}'+
    '@keyframes gachaPulse{0%{transform:scale(0.8);opacity:0.8;}100%{transform:scale(1.3);opacity:0;}}'+
    // 十连小元素
    '.gacha-marquee-track{display:flex;gap:6px;align-items:center;position:relative;white-space:nowrap;}'+
    '.gacha-mini-screen{width:130px;height:175px;flex-shrink:0;border:2px solid;border-radius:4px;background:linear-gradient(180deg,#e8f0dc,#dce8c8);position:relative;transition:all 0.3s;}'+
    '.gacha-mini-screen .gacha-mini-lattice{position:absolute;top:15%;left:15%;right:15%;bottom:15%;border:1px solid rgba(184,148,76,0.2);background:repeating-linear-gradient(0deg,transparent,transparent 6px,rgba(184,148,76,0.06) 6px,rgba(184,148,76,0.06) 7px),repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(184,148,76,0.06) 6px,rgba(184,148,76,0.06) 7px);}'+
    '.gacha-mini-scroll{width:120px;height:155px;flex-shrink:0;border:2px solid;border-radius:3px;display:flex;flex-direction:column;align-items:center;background:#f5e6c8;transition:all 0.3s;}'+
    '.gacha-mini-rod{width:126px;height:10px;background:linear-gradient(180deg,#8b6914,#6b4a2a);border-radius:5px;flex-shrink:0;}'+
    '.gacha-mini-paper{flex:1;width:114px;background:#efe0c0;}'+
    '.gacha-mini-active{border-color:#fff!important;box-shadow:0 0 16px rgba(255,255,255,0.5);}'+
    // 中央门覆盖层
    '.gacha-center-door{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20;}'+
    // 竹色屏风
    '.gacha-screen-frame{border:8px solid #8b9a6b;border-radius:6px;box-shadow:0 0 40px rgba(80,120,60,0.3),inset 0 0 20px rgba(80,120,60,0.1);padding:4px;background:#c8d8b0;}'+
    '.gacha-screen-container{position:relative;width:440px;height:580px;display:flex;overflow:hidden;}'+
    '.gacha-screen-left,.gacha-screen-right{width:50%;height:100%;transition:transform 1.3s cubic-bezier(0.4,0,0.2,1);position:relative;z-index:2;}'+
    '.gacha-screen-left{background:linear-gradient(180deg,#e8f0dc 0%,#f0f5e8 20%,#e8f0dc 40%,#eef4e4 60%,#e8f0dc 80%,#f0f5e8 100%);border-right:3px solid #b8944c;}'+
    '.gacha-screen-right{background:linear-gradient(180deg,#e8f0dc 0%,#f0f5e8 20%,#e8f0dc 40%,#eef4e4 60%,#e8f0dc 80%,#f0f5e8 100%);border-left:3px solid #b8944c;}'+
    '.gacha-screen-lattice{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60%;height:60%;border:1.5px solid rgba(184,148,76,0.2);background:repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(184,148,76,0.08) 18px,rgba(184,148,76,0.08) 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(184,148,76,0.08) 18px,rgba(184,148,76,0.08) 19px);}'+
    '.gacha-screen-border-inner{position:absolute;top:8%;left:8%;right:8%;bottom:8%;border:2px solid rgba(184,148,76,0.18);border-radius:2px;pointer-events:none;}'+
    '.gacha-door-crack{position:absolute;top:8%;left:50%;width:5px;height:84%;transform:translateX(-50%);z-index:1;transition:all 0.8s;border-radius:3px;}'+
    // 卷轴
    '.gacha-scroll-wrapper{display:flex;flex-direction:column;align-items:center;position:relative;}'+
    '.gacha-scroll-parchment{position:relative;width:440px;height:0;overflow:hidden;background:linear-gradient(180deg,#f5e6c8 0%,#efe0c0 20%,#f0e4c8 50%,#efe0c0 80%,#f5e6c8 100%);border-left:3px solid #8b7355;border-right:3px solid #8b7355;box-shadow:inset 0 0 30px rgba(139,115,85,0.15);transition:height 1.3s cubic-bezier(0.25,0.1,0.25,1);}'+
    '.gacha-scroll-parchment.open{height:520px;}'+
    '.gacha-scroll-rod{width:456px;height:26px;background:linear-gradient(180deg,#6b4a2a,#8b6914,#6b4a2a);border-radius:13px;box-shadow:0 3px 8px rgba(0,0,0,0.5),inset 0 1px 2px rgba(255,255,255,0.2);position:relative;z-index:5;flex-shrink:0;transition:transform 1.3s cubic-bezier(0.25,0.1,0.25,1);}'+
    '.gacha-scroll-rod::after{content:"";position:absolute;top:5px;bottom:5px;width:8px;background:rgba(255,255,255,0.12);border-radius:4px;}'+
    '.gacha-scroll-rod-top::after{left:8px;}.gacha-scroll-rod-bottom::after{right:8px;}'+
    // 通用
    '.gacha-light-beam{position:absolute;top:-50%;left:50%;width:400px;height:200%;transform:translateX(-50%);pointer-events:none;animation:beamPulse 1.5s ease-out;}'+
    '@keyframes beamPulse{0%{opacity:0;transform:translateX(-50%) scaleY(0);}30%{opacity:1;transform:translateX(-50%) scaleY(1);}100%{opacity:0.3;transform:translateX(-50%) scaleY(1);}}'+
    '.gacha-particles{position:absolute;top:50%;left:50%;width:0;height:0;pointer-events:none;}'+
    '.gacha-particle{position:absolute;width:6px;height:6px;border-radius:50%;animation:particleFly 2s ease-out forwards;}'+
    '@keyframes particleFly{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0);}}'+
    '.gacha-reveal-card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;z-index:0;width:100%;}'+
    '.gacha-reveal-card>*{flex-shrink:0;}'+
    '.gacha-result-tier{display:inline-block;padding:6px 24px;border-radius:4px;font-size:16px;font-weight:bold;color:#fff;letter-spacing:4px;margin-top:12px;}'+
    '.gacha-result-name{font-size:30px;font-weight:bold;color:var(--gold);margin-top:10px;letter-spacing:4px;font-family:"KaiTi","Noto Serif SC",serif;}'+
    '.gacha-skip-btn{margin-top:24px;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.25);padding:8px 24px;border-radius:20px;cursor:pointer;font-size:14px;transition:all 0.2s;}'+
    '.gacha-skip-btn:hover{background:rgba(255,255,255,0.25);color:#fff;}'+
    '.gacha-shake{animation:gachaShake 0.6s ease-out;}'+
    '@keyframes gachaShake{0%,100%{transform:translate(0,0);}10%{transform:translate(-6px,0);}30%{transform:translate(6px,0);}50%{transform:translate(-4px,0);}70%{transform:translate(4px,0);}90%{transform:translate(-2px,0);}}'+
    '@keyframes marqueeGlow{0%{opacity:0.3;transform:scale(0.95);}100%{opacity:0.8;transform:scale(1.05);}}';
  document.head.appendChild(s);
})();

function _spawnParticles(color) {
  var c = document.getElementById('gacha-particles'); if (!c) return;
  for (var i=0;i<20;i++) {
    var p=document.createElement('div'); p.className='gacha-particle';
    p.style.cssText = 'background:'+color+';--dx:'+((Math.random()-0.5)*300)+'px;--dy:'+((Math.random()-0.5)*300-100)+'px;animation-duration:'+(1+Math.random()*2)+'s;animation-delay:'+(Math.random()*0.5)+'s;';
    c.appendChild(p); setTimeout(function(){ p.remove(); },2500);
  }
}

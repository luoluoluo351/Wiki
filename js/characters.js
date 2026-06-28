// 角色图鉴

const REALMS = [
  '练气初期','练气中期','练气后期','练气巅峰',
  '筑基初期','筑基中期','筑基后期','筑基巅峰',
  '金丹初期','金丹中期','金丹后期','金丹巅峰',
  '元婴初期','元婴中期','元婴后期','元婴巅峰',
  '化神初期','化神中期','化神后期','化神巅峰'
];
const MAJOR_NAMES = ['练气','筑基','金丹','元婴','化神'];
const ELEMENTS = ['金','木','水','火','土'];
const STORAGE_KEY = 'characters';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX'];
const SPIRIT_ROOT_GRADES = ['人阶下','人阶中','人阶上'];
const MAJOR_REALMS = ['练气','筑基','金丹','元婴','化神'];
const SUB_STAGES = ['初期','中期','后期','巅峰'];

function majorIndex(realm) { const i=REALMS.indexOf(realm); return i>=0?Math.floor(i/4):0; }
function majorName(realm) { return MAJOR_NAMES[majorIndex(realm)]||'练气'; }

// 技能数量限制（根据已有大境界数量）
function getSkillLimits(stageCount) {
  var mi = Math.max(0, Math.min(stageCount - 1, 4)); // 0练气..4化神
  var gongfa = [1,2,3,4,5];
  var shentong = [2,3,3,4,4];
  return { gongfa: gongfa[mi]||1, shentong: shentong[mi]||2 };
}

function createEmptyAdvancement(rank) {
  return {
    rank: rank,
    hpGrowthBoost: 0, atkGrowthBoost: 0, defGrowthBoost: 0, traitGrowthBoost: 0,
    strengthBoost: 0, agilityBoost: 0, physiqueBoost: 0, spiritBoost: 0, wisdomBoost: 0,
    hpBoost: 0, atkBoost: 0, defBoost: 0, maxLingliBoost: 0,
    critRateBoost: 0, critDmgBoost: 0,
    resistBoost: { metal:0, wood:0, water:0, fire:0, earth:0 },
    dmgBonusBoost: { metal:0, wood:0, water:0, fire:0, earth:0 }
  };
}

function createEmptyStage() {
  return {
    majorRealm: '练气',
    baseHp: 0, baseAtk: 0, baseDef: 0, baseMaxLingli: 0,
    baseCritRate: 0, baseCritDmg: 0,
    baseResist: { metal:0, wood:0, water:0, fire:0, earth:0 },
    baseDmgBonus: { metal:0, wood:0, water:0, fire:0, earth:0 },
    hpGrowth: 1.0, atkGrowth: 1.0, defGrowth: 1.0,
    strength: 0, agility: 0, physique: 0, spirit: 0, wisdom: 0,
    traitGrowth: 1.0
  };
}

function createEmptyChar() {
  var s = createEmptyStage();
  return {
    id:'', name:'', avatar:'', fullBody:'', spiritRootGrade:'人阶下', sect:'', spiritRoots:[],
    realmStages:[s],
    advancements:[],
    passiveSkills:[],
    mainSkills:[], yuanYingSkill:null, learnedAbilities:[],
    equippedAttack:null, equippedDefense:null, equippedAccessory:null
  };
}

// 累计突破加成
function _sumAdvBoosts(advancements) {
  var r = {
    hpGrowthBoost:0, atkGrowthBoost:0, defGrowthBoost:0, traitGrowthBoost:0,
    strengthBoost:0, agilityBoost:0, physiqueBoost:0, spiritBoost:0, wisdomBoost:0,
    hpBoost:0, atkBoost:0, defBoost:0, maxLingliBoost:0,
    critRateBoost:0, critDmgBoost:0,
    resistBoost:{metal:0,wood:0,water:0,fire:0,earth:0},
    dmgBonusBoost:{metal:0,wood:0,water:0,fire:0,earth:0}
  };
  (advancements||[]).forEach(function(a){
    r.hpGrowthBoost += a.hpGrowthBoost||0;
    r.atkGrowthBoost += a.atkGrowthBoost||0;
    r.defGrowthBoost += a.defGrowthBoost||0;
    r.traitGrowthBoost += a.traitGrowthBoost||0;
    r.strengthBoost += a.strengthBoost||0; r.agilityBoost += a.agilityBoost||0; r.physiqueBoost += a.physiqueBoost||0; r.spiritBoost += a.spiritBoost||0; r.wisdomBoost += a.wisdomBoost||0;
    r.hpBoost += a.hpBoost||0; r.atkBoost += a.atkBoost||0; r.defBoost += a.defBoost||0; r.maxLingliBoost += a.maxLingliBoost||0;
    r.critRateBoost += a.critRateBoost||0; r.critDmgBoost += a.critDmgBoost||0;
    ['metal','wood','water','fire','earth'].forEach(function(k){ r.resistBoost[k] += (a.resistBoost||{})[k]||0; r.dmgBonusBoost[k] += (a.dmgBonusBoost||{})[k]||0; });
  });
  return r;
}

// 计算单个阶段在子阶段N的属性 (N:0初期,1中期,2后期,3巅峰)
// includeTraits: 是否包含特质贡献，默认true
function computeStageStats(stage, advBoosts, subIndex, includeTraits) {
  if (includeTraits === undefined) includeTraits = true;
  var N = subIndex||3;
  var effTraitGrowth = (stage.traitGrowth||1) + (advBoosts.traitGrowthBoost||0);
  var gt_ratio = includeTraits ? (effTraitGrowth - 1) * N : 0;
  var wisdomAtN = ((stage.wisdom||0) + (advBoosts.wisdomBoost||0)) * (1 + gt_ratio);
  var wisBonus = wisdomAtN * 0.001;
  var effHpGrowth = (stage.hpGrowth||1) + (advBoosts.hpGrowthBoost||0) + wisBonus;
  var effAtkGrowth = (stage.atkGrowth||1) + (advBoosts.atkGrowthBoost||0) + wisBonus;
  var effDefGrowth = (stage.defGrowth||1) + (advBoosts.defGrowthBoost||0) + wisBonus;
  var gbHp = (effHpGrowth - 1) * N;
  var gbAtk = (effAtkGrowth - 1) * N;
  var gbDef = (effDefGrowth - 1) * N;
  var gt = gt_ratio;

  var totalBaseHp = (stage.baseHp||0) + (advBoosts.hpBoost||0);
  var totalBaseAtk = (stage.baseAtk||0) + (advBoosts.atkBoost||0);
  var totalBaseDef = (stage.baseDef||0) + (advBoosts.defBoost||0);
  var totalBaseLingli = (stage.baseMaxLingli||0) + (advBoosts.maxLingliBoost||0);
  var totalStr = includeTraits ? (stage.strength||0) + (advBoosts.strengthBoost||0) : 0;
  var totalAgi = includeTraits ? (stage.agility||0) + (advBoosts.agilityBoost||0) : 0;
  var totalPhy = includeTraits ? (stage.physique||0) + (advBoosts.physiqueBoost||0) : 0;
  var totalSpi = includeTraits ? (stage.spirit||0) + (advBoosts.spiritBoost||0) : 0;

  return {
    hp: totalBaseHp * (1 + gbHp) + totalPhy * 10 * (1 + gt),
    atk: totalBaseAtk * (1 + gbAtk) + (totalStr * 0.5 + totalAgi * 1) * (1 + gt),
    def: totalBaseDef * (1 + gbDef) + (totalStr * 1 + totalPhy * 1) * (1 + gt),
    maxLingli: totalBaseLingli + totalSpi * 10 * (1 + gt),
    critRate: (stage.baseCritRate||0) + (advBoosts.critRateBoost||0),
    critDmg: (stage.baseCritDmg||0) + (advBoosts.critDmgBoost||0),
    resist: {
      metal: ((stage.baseResist||{})[0]||0) + ((advBoosts.resistBoost||{}).metal||0),
      wood: ((stage.baseResist||{}).wood||0) + ((advBoosts.resistBoost||{}).wood||0),
      water: ((stage.baseResist||{}).water||0) + ((advBoosts.resistBoost||{}).water||0),
      fire: ((stage.baseResist||{}).fire||0) + ((advBoosts.resistBoost||{}).fire||0),
      earth: ((stage.baseResist||{}).earth||0) + ((advBoosts.resistBoost||{}).earth||0)
    },
    dmgBonus: {
      metal: ((stage.baseDmgBonus||{}).metal||0) + ((advBoosts.dmgBonusBoost||{}).metal||0),
      wood: ((stage.baseDmgBonus||{}).wood||0) + ((advBoosts.dmgBonusBoost||{}).wood||0),
      water: ((stage.baseDmgBonus||{}).water||0) + ((advBoosts.dmgBonusBoost||{}).water||0),
      fire: ((stage.baseDmgBonus||{}).fire||0) + ((advBoosts.dmgBonusBoost||{}).fire||0),
      earth: ((stage.baseDmgBonus||{}).earth||0) + ((advBoosts.dmgBonusBoost||{}).earth||0)
    }
  };
}

// 满级总属性（生攻防+特质取最高阶段；灵力/暴击/抗性/增伤累加）
function computeTotalAttr(c) {
  var t = { hp:0, atk:0, def:0, maxLingli:0, critRate:0, critDmg:0, resist:{metal:0,wood:0,water:0,fire:0,earth:0}, dmgBonus:{metal:0,wood:0,water:0,fire:0,earth:0} };
  var advBoosts = _sumAdvBoosts(c.advancements||[]);
  var stages = c.realmStages||[];
  if (stages.length===0) return t;
  stages.forEach(function(s, i){
    var isLast = (i === stages.length - 1);
    var st = computeStageStats(s, advBoosts, 3, isLast);
    if (isLast) { t.hp = st.hp; t.atk = st.atk; t.def = st.def; }
    t.maxLingli += st.maxLingli;
    t.critRate += st.critRate; t.critDmg += st.critDmg;
    ['metal','wood','water','fire','earth'].forEach(function(k){ t.resist[k] += st.resist[k]; t.dmgBonus[k] += st.dmgBonus[k]; });
  });
  return t;
}

// 战力
function calcCombatPower(c) {
  var t = computeTotalAttr(c);
  var pts = 0;
  pts += t.hp/10 + t.atk/2 + t.def/1.5;
  pts += (t.critRate/100) * ((t.critDmg-100)/100) * 100;
  ['metal','wood','water','fire','earth'].forEach(function(k){ pts += t.resist[k]/0.8 + t.dmgBonus[k]/0.8; });
  return Math.round(pts);
}

function skillNameById(id) {
  var g=Storage.findById('skills_gongfa',id); if(g)return{name:g.name,type:'gongfa',combat:g.combat||0};
  var s=Storage.findById('skills_shentong',id); if(s)return{name:s.name,type:'shentong',combat:s.combat||0};
  return null;
}

// 兼容旧数据迁移
function _migrateChar(c) {
  if (!c.realmStages || c.realmStages.length===0) {
    c.realmStages = [];
    if (c.basicAttr) {
      var s = createEmptyStage();
      s.majorRealm = majorName(c.realm||'练气初期');
      s.baseHp = c.basicAttr.hp?.lv100||0;
      s.baseAtk = c.basicAttr.atk?.lv100||0;
      s.baseDef = c.basicAttr.def?.lv100||0;
      c.realmStages.push(s);
    }
  }
  // 检查是否为新格式（有baseGrowth字段）
  if (c.realmStages.length>0 && c.realmStages[0].hpGrowth===undefined && c.realmStages[0].baseGrowth===undefined) {
    // 旧 format stage → 转为新格式练气阶段
    var newStages = [];
    c.realmStages.forEach(function(oldS){
      var ns = createEmptyStage();
      ns.majorRealm = majorName(oldS.realm||'练气初期');
      ns.baseHp = oldS.hp||0; ns.baseAtk = oldS.atk||0; ns.baseDef = oldS.def||0;
      ns.baseMaxLingli = oldS.maxLingli||0;
      ns.baseCritRate = oldS.critRate||0; ns.baseCritDmg = oldS.critDmg||0;
      ns.baseResist = oldS.resist||{metal:0,wood:0,water:0,fire:0,earth:0};
      ns.baseDmgBonus = oldS.dmgBonus||{metal:0,wood:0,water:0,fire:0,earth:0};
      ns.baseGrowth = 1.0; ns.traitGrowth = 1.0;
      newStages.push(ns);
    });
    c.realmStages = newStages;
  }
  // 确保有spiritRootGrade
  if (!c.spiritRootGrade) c.spiritRootGrade = '人阶下';
  // 转换旧advancements
  if (c.advancements && c.advancements.length>0 && c.advancements[0].desc!==undefined && c.advancements[0].hpGrowthBoost===undefined) {
    c.advancements = [];
  }
  if (!c.advancements) c.advancements = [];
  if (!c.mainSkills) c.mainSkills = [];
  if (!c.learnedAbilities) c.learnedAbilities = [];
  if (!c.passiveSkills) c.passiveSkills = [];
}

const Characters = {

  renderList() {
    var list = Storage.list(STORAGE_KEY);
    var rows = '';
    if (list.length===0) { rows='<div class="placeholder">暂无角色，点击右上角按钮添加</div>'; }
    else {
      rows = '<div class="row-list"><div class="row-header" style="gap:18px;padding:10px 28px;">'+
        '<span class="row-h-col" style="width:72px;"></span>'+
        '<span class="row-h-col" style="width:80px;">名称</span>'+
        '<span class="row-h-col" style="width:55px;">品阶</span>'+
        '<span class="row-h-col" style="width:55px;">修为</span>'+
        '<span class="row-h-col" style="width:50px;">所属</span>'+
        '<span class="row-h-col" style="width:55px;">灵根</span>'+
        '<span class="row-h-col" style="width:55px;">生命</span>'+
        '<span class="row-h-col" style="width:55px;">攻击</span>'+
        '<span class="row-h-col" style="width:55px;">防御</span>'+
        '<span class="row-h-col" style="width:90px;">主修功法</span>'+
        '<span class="row-h-col" style="width:50px;">战力</span>'+
        '<span class="row-h-col" style="width:100px;"></span>'+
      '</div>';
      list.forEach(function(c){
        _migrateChar(c);
        var aSrc=(c.avatar||'').startsWith('data:')?c.avatar:(c.avatar?'img/characters/'+c.avatar:'');var avatarHtml=aSrc?'<img src="'+aSrc+'" alt="'+c.name+'" class="thumb-clickable" style="cursor:pointer;">':'<div class="row-noimg">无图</div>';
        var tags = c.spiritRoots.map(function(e){return '<span class="tag tag-'+(e==='金'?'gold':e==='木'?'wood':e==='水'?'water':e==='火'?'fire':'earth')+'">'+e+'</span>';}).join('');
        var total = computeTotalAttr(c);
        var cp = calcCombatPower(c);
        var stages=c.realmStages||[]; var curRealm = stages.length>0 ? stages[stages.length-1].majorRealm : '练气';
        var mainSkillText = '—';
        if (c.mainSkills.length>0) {
          var sk=skillNameById(c.mainSkills[0]);
          if (sk) mainSkillText = c.mainSkills[0]===c.yuanYingSkill?sk.name+'(元婴)':sk.name;
        }
        // 弹窗数据
        var modalData = c.passiveSkills.slice();
        (c.mainSkills||[]).forEach(function(skId,i){var sk=skillNameById(skId);if(sk){var label=skId===c.yuanYingSkill?'元婴功法':(i===0?'主修功法':'其他功法');modalData.push({name:label+'：'+sk.name,desc:(Storage.findById('skills_gongfa',skId)||{}).desc||''});}});
        (c.learnedAbilities||[]).forEach(function(skId){var sk=skillNameById(skId);var full=Storage.findById('skills_shentong',skId)||{};if(sk){var n='习得神通：'+sk.name;modalData.push({name:n,desc:full.desc||''});}});
        var modalEsc = JSON.stringify(modalData).replace(/'/g,'&#39;');

        rows += '<div class="row-item" style="gap:18px;padding:22px 28px;min-height:140px;">'+
          avatarHtml+
          '<span class="row-name" style="width:80px;">'+(c.name||'未命名')+'</span>'+
          '<span style="color:var(--gold);width:55px;font-size:12px;text-align:center;white-space:nowrap;">'+(c.spiritRootGrade||'人阶下')+'</span>'+
          '<span style="color:var(--text-dim);width:55px;font-size:13px;text-align:center;white-space:nowrap;">'+curRealm+'期</span>'+
          '<span style="color:var(--text-dim);width:50px;font-size:13px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(c.sect||'—')+'</span>'+
          '<span class="row-tags" style="width:55px;overflow:hidden;">'+tags+'</span>'+
          '<span class="row-stat" style="width:55px;">'+fmtNum(Math.round(total.hp))+'</span>'+
          '<span class="row-stat" style="width:55px;">'+fmtNum(Math.round(total.atk))+'</span>'+
          '<span class="row-stat" style="width:55px;">'+fmtNum(Math.round(total.def))+'</span>'+
          '<span style="color:var(--text-dim);width:90px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+mainSkillText+'</span>'+
          '<span style="color:var(--gold);width:50px;font-size:14px;text-align:center;white-space:nowrap;">'+fmtNum(cp)+'</span>'+
          '<span class="row-actions" style="width:100px;justify-content:center;">'+
            '<button class="row-icon-btn" onclick="App.navigate(\'characters/detail?id='+c.id+'\')" title="编辑">✎</button>'+
            '<button class="row-icon-btn" data-skills=\''+modalEsc+'\' onclick="event.stopPropagation();showAbilityModal(\''+(c.name||'角色').replace(/'/g,'&#39;')+' 详情\',JSON.parse(this.dataset.skills))" title="查看能力">👁</button>'+
            '<button class="row-icon-btn" onclick="event.stopPropagation();if(confirm(\'确定删除此角色?\')){Storage.deleteById(\'characters\',\''+c.id+'\');App.navigate(\'characters\');}" title="删除" style="color:var(--red);">×</button>'+
          '</span></div>';
      });
      rows += '</div>';
    }
    return '<div class="toolbar"><h2 style="color:var(--gold);flex:1;">角色图鉴</h2><button class="btn-primary" onclick="App.navigate(\'characters/detail\')">+ 添加角色</button></div>'+rows;
  },

  renderDetail(id) {
    var char = id ? Storage.findById(STORAGE_KEY, id) : createEmptyChar();
    if (id&&!char) return '<div class="placeholder">角色不存在</div>';
    var isNew = !id;
    _migrateChar(char);

    var rootsHtml = ELEMENTS.map(function(e){return '<label><input type="checkbox" value="'+e+'" '+(char.spiritRoots.includes(e)?'checked':'')+' onchange="limitCheckbox(event,3)"> '+e+'</label>';}).join('');
    var total = computeTotalAttr(char);
    var advBoosts = _sumAdvBoosts(char.advancements||[]);

    // === 修为阶段 HTML ===
    var stagesHtml = '';
    (char.realmStages||[]).forEach(function(s,i){
      var realmLabel = MAJOR_REALMS[i]||s.majorRealm||'练气';
      // 折叠时显示的巅峰基础预览（不含特质）
      var wisBonus = ((s.wisdom||0)+(advBoosts.wisdomBoost||0)) * 0.001;
      var gbHp = (((s.hpGrowth||1)+(advBoosts.hpGrowthBoost||0)+wisBonus)-1)*3;
      var gbAtk = (((s.atkGrowth||1)+(advBoosts.atkGrowthBoost||0)+wisBonus)-1)*3;
      var gbDef = (((s.defGrowth||1)+(advBoosts.defGrowthBoost||0)+wisBonus)-1)*3;
      var prevHp = Math.round(((s.baseHp||0)+(advBoosts.hpBoost||0))*(1+gbHp));
      var prevAtk = Math.round(((s.baseAtk||0)+(advBoosts.atkBoost||0))*(1+gbAtk));
      var prevDef = Math.round(((s.baseDef||0)+(advBoosts.defBoost||0))*(1+gbDef));
      // 特质巅峰值（含突破加成+特质成长）
      var gt0 = (((s.traitGrowth||1)+(advBoosts.traitGrowthBoost||0))-1)*3;
      var pStr = Math.round(((s.strength||0)+(advBoosts.strengthBoost||0))*(1+gt0));
      var pAgi = Math.round(((s.agility||0)+(advBoosts.agilityBoost||0))*(1+gt0));
      var pPhy = Math.round(((s.physique||0)+(advBoosts.physiqueBoost||0))*(1+gt0));
      var pSpi = Math.round(((s.spirit||0)+(advBoosts.spiritBoost||0))*(1+gt0));
      var pWis = ((s.wisdom||0)+(advBoosts.wisdomBoost||0))*(1+gt0);
      var collapsePreview = ' HP:'+fmtNum(prevHp)+' ATK:'+fmtNum(prevAtk)+' DEF:'+fmtNum(prevDef);
      var traitPreview = ' 力'+pStr+' 敏'+pAgi+' 体'+pPhy+' 神'+pSpi+' 悟'+pWis.toFixed(1);
      stagesHtml += '<fieldset class="fieldset"><legend><span style="cursor:pointer;" onclick="var b=this.parentElement.nextElementSibling;b.style.display=b.style.display===\'none\'?\'\':\'none\';this.textContent=this.textContent.startsWith(\'▸\')?this.textContent.replace(\'▸\',\'▾\'):this.textContent.replace(\'▾\',\'▸\')">▸ '+realmLabel+'</span>'+
        '<span style="color:var(--text-dim);font-size:12px;margin-left:8px;">巅峰基础'+collapsePreview+'</span>'+
        '<span style="color:var(--text-light);font-size:11px;margin-left:4px;">'+traitPreview+'</span>'+
        (char.realmStages.length>1?' <button class="btn-delete stage-quick-del" data-idx="'+i+'" title="删除此阶段" style="vertical-align:middle;">×</button>':'')+
        '</legend>'+
        '<div class="stage-body" style="display:none">'+
        // 初始属性
        '<div style="margin-bottom:12px;"><label style="color:var(--gold);font-weight:bold;">初始属性（初期值）</label>'+
        '<div class="form-row"><div style="flex:1;"><label>生命(HP)</label><input type="number" value="'+(s.baseHp||0)+'" data-field="s_bhp_'+i+'"></div><div style="flex:1;"><label>攻击(ATK)</label><input type="number" value="'+(s.baseAtk||0)+'" data-field="s_batk_'+i+'"></div><div style="flex:1;"><label>防御(DEF)</label><input type="number" value="'+(s.baseDef||0)+'" data-field="s_bdef_'+i+'"></div></div>'+
        // 各子阶段预览
        '<div style="margin-bottom:4px;font-size:12px;color:var(--text-dim);">巅峰基础属性（不含特质）：'+
          (function(){
            var wb = ((s.wisdom||0)+(advBoosts.wisdomBoost||0))*0.001;
            var hpg = (((s.hpGrowth||s.baseGrowth||1)+(advBoosts.hpGrowthBoost||advBoosts.baseGrowthBoost||0)+wb)-1)*3;
            var atkg = (((s.atkGrowth||s.baseGrowth||1)+(advBoosts.atkGrowthBoost||advBoosts.baseGrowthBoost||0)+wb)-1)*3;
            var defg = (((s.defGrowth||s.baseGrowth||1)+(advBoosts.defGrowthBoost||advBoosts.baseGrowthBoost||0)+wb)-1)*3;
            var tbh = ((s.baseHp||0)+(advBoosts.hpBoost||0))*(1+hpg);
            var tba = ((s.baseAtk||0)+(advBoosts.atkBoost||0))*(1+atkg);
            var tbd = ((s.baseDef||0)+(advBoosts.defBoost||0))*(1+defg);
            return 'HP:'+fmtNum(Math.round(tbh))+' ATK:'+fmtNum(Math.round(tba))+' DEF:'+fmtNum(Math.round(tbd));
          })()+
        '</div>'+
        '<div style="margin-bottom:8px;font-size:12px;color:var(--text-dim);">巅峰总属性（含特质）：'+
          (function(){
            var pv = computeStageStats(s, advBoosts, 3);
            return 'HP:'+fmtNum(Math.round(pv.hp))+' ATK:'+fmtNum(Math.round(pv.atk))+' DEF:'+fmtNum(Math.round(pv.def))+' 灵力:'+fmtNum(Math.round(pv.maxLingli));
          })()+
        '</div></div>'+
        // 成长系数
        '<div style="margin-bottom:12px;"><label style="color:var(--gold);font-weight:bold;">成长系数</label>'+
        '<div class="form-row"><div style="flex:1;"><label>HP成长</label><input type="number" value="'+(s.hpGrowth||1)+'" data-field="s_hpgrow_'+i+'" step="0.001" min="1"></div><div style="flex:1;"><label>ATK成长</label><input type="number" value="'+(s.atkGrowth||1)+'" data-field="s_atkgrow_'+i+'" step="0.001" min="1"></div><div style="flex:1;"><label>DEF成长</label><input type="number" value="'+(s.defGrowth||1)+'" data-field="s_defgrow_'+i+'" step="0.001" min="1"></div></div>'+
        '<div style="font-size:11px;color:var(--text-light);">有效成长(含悟性+突破): HP'+(function(){var w=(s.wisdom||0)+(advBoosts.wisdomBoost||0);var e=(s.hpGrowth||1)+(advBoosts.hpGrowthBoost||0)+w*0.001;return e.toFixed(3);})()+' ATK'+(function(){var w=(s.wisdom||0)+(advBoosts.wisdomBoost||0);var e=(s.atkGrowth||1)+(advBoosts.atkGrowthBoost||0)+w*0.001;return e.toFixed(3);})()+' DEF'+(function(){var w=(s.wisdom||0)+(advBoosts.wisdomBoost||0);var e=(s.defGrowth||1)+(advBoosts.defGrowthBoost||0)+w*0.001;return e.toFixed(3);})()+'</div></div>'+
        // 基础属性(其他)
        '<div style="margin-bottom:12px;"><label style="color:var(--gold);font-weight:bold;">基础属性（其他）</label>'+
        '<div class="form-row"><div style="flex:1;"><label>灵力上限</label><input type="number" value="'+(s.baseMaxLingli||0)+'" data-field="s_blingli_'+i+'"></div><div style="flex:1;"><label>暴击率(%)</label><input type="number" value="'+(s.baseCritRate||0)+'" data-field="s_bcr_'+i+'" step="0.01"></div><div style="flex:1;"><label>暴击伤害(%)</label><input type="number" value="'+(s.baseCritDmg||0)+'" data-field="s_bcd_'+i+'" step="0.01"></div></div></div>'+
        // 五行抗性/增伤
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">'+
          '<div><label style="color:var(--gold);">五行抗性(%)</label>'+ELEMENTS.map(function(e){var m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return '<div style="margin-top:4px;"><label>'+e+'</label><input type="number" value="'+((s.baseResist||{})[m[e]]||0)+'" data-field="s_bres_'+i+'_'+m[e]+'" step="0.01"></div>';}).join('')+'</div>'+
          '<div><label style="color:var(--gold);">伤害加成(%)</label>'+ELEMENTS.map(function(e){var m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return '<div style="margin-top:4px;"><label>'+e+'</label><input type="number" value="'+((s.baseDmgBonus||{})[m[e]]||0)+'" data-field="s_bdmg_'+i+'_'+m[e]+'" step="0.01"></div>';}).join('')+'</div>'+
        '</div>'+
        // 特质
        '<div style="margin-bottom:12px;"><label style="color:var(--gold);font-weight:bold;">特质</label>'+
        '<div class="form-row"><div style="flex:1;"><label>力量(+0.5攻+1防)</label><input type="number" value="'+(s.strength||0)+'" data-field="s_str_'+i+'"></div><div style="flex:1;"><label>敏捷(+1攻)</label><input type="number" value="'+(s.agility||0)+'" data-field="s_agi_'+i+'"></div><div style="flex:1;"><label>体魄(+10命+1防)</label><input type="number" value="'+(s.physique||0)+'" data-field="s_phy_'+i+'"></div></div>'+
        '<div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>神识(+10灵力)</label><input type="number" value="'+(s.spirit||0)+'" data-field="s_spi_'+i+'"></div><div style="flex:1;"><label>悟性(+0.001成长)</label><input type="number" value="'+(s.wisdom||0)+'" data-field="s_wis_'+i+'"></div><div style="flex:1;"><label>特质成长系数</label><input type="number" value="'+(s.traitGrowth||1)+'" data-field="s_tgrow_'+i+'" step="0.001" min="1"></div></div></div>'+
        // 删除按钮（最后一阶段且>1时）
        (char.realmStages.length>1&&i===char.realmStages.length-1?'<button class="btn-danger" style="margin-top:10px;font-size:12px;" onclick="Characters.delStage('+i+',\''+(char.id||'')+'\')">删除此阶段</button>':'')+
        '</div></fieldset>';
    });

    // === 进阶突破 HTML ===
    var advHtml = '';
    (char.advancements||[]).forEach(function(a,i){
      var rankLabel = ROMAN[a.rank-1]||a.rank;
      advHtml += '<fieldset class="fieldset" style="margin-bottom:8px;"><legend><span style="cursor:pointer;" onclick="var b=this.closest(\'fieldset\').querySelector(\'.adv-body\');b.style.display=b.style.display===\'none\'?\'\':\'none\';this.textContent=this.textContent.startsWith(\'▸\')?this.textContent.replace(\'▸\',\'▾\'):this.textContent.replace(\'▾\',\'▸\')">▸ '+rankLabel+'阶突破</span><button class="btn-delete" style="margin-left:8px;" data-action="del-adv" data-idx="'+i+'">×</button></legend>'+
        '<div class="adv-body" style="display:none;">'+
        // 成长系数提升
        '<details style="margin-bottom:8px;"><summary style="color:var(--gold);cursor:pointer;">成长系数提升</summary><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>HP成长提升</label><input type="number" value="'+(a.hpGrowthBoost||0)+'" data-field="adv_hpgrow_'+i+'" step="0.001"></div><div style="flex:1;"><label>ATK成长提升</label><input type="number" value="'+(a.atkGrowthBoost||0)+'" data-field="adv_atkgrow_'+i+'" step="0.001"></div><div style="flex:1;"><label>DEF成长提升</label><input type="number" value="'+(a.defGrowthBoost||0)+'" data-field="adv_defgrow_'+i+'" step="0.001"></div></div><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>特质成长系数提升</label><input type="number" value="'+(a.traitGrowthBoost||0)+'" data-field="adv_tgrow_'+i+'" step="0.001"></div><div style="flex:1;"></div><div style="flex:1;"></div></div></details>'+
        // 特质提升
        '<details style="margin-bottom:8px;"><summary style="color:var(--gold);cursor:pointer;">特质提升</summary><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>力量</label><input type="number" value="'+(a.strengthBoost||0)+'" data-field="adv_str_'+i+'"></div><div style="flex:1;"><label>敏捷</label><input type="number" value="'+(a.agilityBoost||0)+'" data-field="adv_agi_'+i+'"></div><div style="flex:1;"><label>体魄</label><input type="number" value="'+(a.physiqueBoost||0)+'" data-field="adv_phy_'+i+'"></div></div><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>神识</label><input type="number" value="'+(a.spiritBoost||0)+'" data-field="adv_spi_'+i+'"></div><div style="flex:1;"><label>悟性</label><input type="number" value="'+(a.wisdomBoost||0)+'" data-field="adv_wis_'+i+'"></div><div style="flex:1;"></div></div></details>'+
        // 基础属性提升
        '<details style="margin-bottom:8px;"><summary style="color:var(--gold);cursor:pointer;">基础属性提升</summary><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>生命</label><input type="number" value="'+(a.hpBoost||0)+'" data-field="adv_hp_'+i+'"></div><div style="flex:1;"><label>攻击</label><input type="number" value="'+(a.atkBoost||0)+'" data-field="adv_atk_'+i+'"></div><div style="flex:1;"><label>防御</label><input type="number" value="'+(a.defBoost||0)+'" data-field="adv_def_'+i+'"></div></div><div class="form-row" style="margin-top:8px;"><div style="flex:1;"><label>灵力上限</label><input type="number" value="'+(a.maxLingliBoost||0)+'" data-field="adv_lingli_'+i+'"></div><div style="flex:1;"><label>暴击率(%)</label><input type="number" value="'+(a.critRateBoost||0)+'" data-field="adv_cr_'+i+'" step="0.01"></div><div style="flex:1;"><label>暴击伤害(%)</label><input type="number" value="'+(a.critDmgBoost||0)+'" data-field="adv_cd_'+i+'" step="0.01"></div></div></details>'+
        // 抗性增伤提升
        '<details style="margin-bottom:8px;"><summary style="color:var(--gold);cursor:pointer;">抗性增伤提升</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">'+
          '<div>'+ELEMENTS.map(function(e){var m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return '<div style="margin-top:4px;"><label>'+e+'抗性(%)</label><input type="number" value="'+((a.resistBoost||{})[m[e]]||0)+'" data-field="adv_res_'+i+'_'+m[e]+'" step="0.01"></div>';}).join('')+'</div>'+
          '<div>'+ELEMENTS.map(function(e){var m={'金':'metal','木':'wood','水':'water','火':'fire','土':'earth'};return '<div style="margin-top:4px;"><label>'+e+'增伤(%)</label><input type="number" value="'+((a.dmgBonusBoost||{})[m[e]]||0)+'" data-field="adv_dmg_'+i+'_'+m[e]+'" step="0.01"></div>';}).join('')+'</div>'+
        '</div></details>'+
        '</div></fieldset>';
    });

    // 被动技能
    var skillsHtml=''; (char.passiveSkills||[]).forEach(function(sk,i){skillsHtml+='<div class="entry-item"><div class="entry-header"><span>被动技能 #'+(i+1)+'</span><button class="btn-delete" data-action="del-skill" data-idx="'+i+'">×</button></div><input type="text" value="'+(sk.name||'')+'" data-field="skill_name_'+i+'" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_'+i+'" placeholder="技能描述" style="width:100%;">'+(sk.desc||'')+'</textarea></div>';});

    // 主修功法
    var gongfaList=Storage.list('skills_gongfa');
    var mainSkillHtml='';
    (char.mainSkills||[]).forEach(function(skId,i){
      var sk=skillNameById(skId); var name=sk?sk.name:'(已删除)'; var isYY=(skId===char.yuanYingSkill);
      mainSkillHtml+='<div class="entry-item" data-skid="'+skId+'"><div class="entry-header"><span>'+(isYY?'元婴功法':(i===0?'主修功法':'其他功法'))+'：'+name+'</span><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:var(--text-dim);">元婴功法</span><input type="checkbox" class="yy-check" data-skid="'+skId+'" '+(isYY?'checked':'')+'></div><button class="btn-delete ms-del">×</button></div></div>';
    });

    // 习得神通
    var learnedHtml='';
    (char.learnedAbilities||[]).forEach(function(skId,i){var sk=skillNameById(skId);learnedHtml+='<div class="entry-item" data-skid="'+skId+'"><div class="entry-header"><span>'+(sk?sk.name:'(已删除)')+'</span><button class="btn-delete la-del">×</button></div></div>';});

    var cp = calcCombatPower(char);

    return '<div class="detail-page" data-char-id="'+(char.id||'')+'" data-is-new="'+isNew+'">'+
      '<div class="toolbar"><button class="btn-primary" id="btn-back-list">← 返回列表</button><button class="btn-primary" id="btn-save-char">保存</button><button class="btn-danger" id="btn-del-char" '+(isNew?'style="display:none"':'')+'>删除角色</button></div>'+

      // 1. 基本信息
      '<fieldset class="fieldset"><legend>基本信息</legend>'+
        '<div class="form-row"><div style="flex:0 0 200px;"><label>半身头像（列表展示）</label><div id="char-avatar-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:0 0 200px;"><label>全身立绘（抽卡展示）</label><div id="char-fullbody-zone" class="drop-zone">拖拽图片到此处<br>或点击选择文件</div></div><div style="flex:1;">'+
        '<div class="form-group"><label>姓名</label><input type="text" id="char-name" value="'+(char.name||'')+'" style="width:100%;font-size:18px;"></div>'+
        '<div class="form-row"><div style="flex:1;"><label>所属</label><input type="text" id="char-sect" value="'+(char.sect||'')+'" placeholder="如：青云门" style="width:100%;"></div><div style="flex:1;"><label>灵根品阶</label><select id="char-grade" style="width:100%;">'+SPIRIT_ROOT_GRADES.map(function(r){return '<option value="'+r+'" '+(char.spiritRootGrade===r?'selected':'')+'>'+r+'</option>';}).join('')+'</select></div></div>'+
        '<div class="form-group"><label>灵根（可多选，最多3个）</label><div class="checkbox-group" id="char-roots">'+rootsHtml+'</div></div></div></div>'+
      '</fieldset>'+

      // 2. 满级总属性
      '<fieldset class="fieldset" style="background:#fefcf2;border-color:var(--gold);">'+
        '<legend style="font-size:16px;">满级总属性</legend>'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;">'+(function(){var h='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">生命</div><div style="font-size:18px;">'+fmtNum(Math.round(total.hp))+'</div></div><div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">攻击</div><div style="font-size:18px;">'+fmtNum(Math.round(total.atk))+'</div></div><div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">防御</div><div style="font-size:18px;">'+fmtNum(Math.round(total.def))+'</div></div><div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">灵力上限</div><div style="font-size:18px;">'+fmtNum(Math.round(total.maxLingli))+'</div></div>';h+='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击率</div><div style="font-size:18px;">'+(total.critRate||0).toFixed(1)+'%</div></div>';h+='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">暴击伤害</div><div style="font-size:18px;">'+(total.critDmg||0).toFixed(1)+'%</div></div>';['金','木','水','火','土'].forEach(function(e){var m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};var v=total.resist[m[e]];if(v)h+='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">'+e+'抗性</div><div style="font-size:18px;">'+(v).toFixed(1)+'%</div></div>';});['金','木','水','火','土'].forEach(function(e){var m={金:'metal',木:'wood',水:'water',火:'fire',土:'earth'};var v=total.dmgBonus[m[e]];if(v)h+='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">'+e+'伤害加成</div><div style="font-size:18px;">'+(v).toFixed(1)+'%</div></div>';});h+='<div style="text-align:center;"><div style="color:var(--gold);font-weight:bold;">战力</div><div style="font-size:22px;color:var(--gold);">'+fmtNum(cp)+'</div></div>';return h;})()+'</div>'+
      '</fieldset>'+

      // 3. 修为阶段
      '<fieldset class="fieldset"><legend>修为阶段 <button class="btn-add" id="btn-add-stage">+</button></legend>'+
        '<div id="stages-container">'+(stagesHtml||'<div style="color:var(--text-dim);">暂无阶段</div>')+'</div>'+
      '</fieldset>'+

      // 4. 进阶突破
      '<fieldset class="fieldset"><legend>突破 <button class="btn-add" id="btn-add-adv">+</button></legend>'+
        '<div id="adv-container">'+(advHtml||'<div style="color:var(--text-dim);">暂无突破</div>')+'</div>'+
      '</fieldset>'+

      // 5. 被动技能
      '<fieldset class="fieldset"><legend>被动技能 <button class="btn-add" id="btn-add-skill">+</button></legend><div id="skills-container">'+(skillsHtml||'<div style="color:var(--text-dim);">暂无被动技能</div>')+'</div></fieldset>'+

      // 6. 装备法宝
      '<fieldset class="fieldset"><legend>装备法宝</legend><div class="form-row">'+(function(){var al=Storage.list('treasures').filter(function(t){return t.type==='attack';});var dl=Storage.list('treasures').filter(function(t){return t.type==='defense';});var acl=Storage.list('treasures').filter(function(t){return t.type==='accessory';});return'<div style="flex:1;"><label>攻击类</label><select id="equip-attack"><option value="">不装备</option>'+al.map(function(t){return'<option value="'+t.id+'" '+(char.equippedAttack===t.id?'selected':'')+'>'+(t.name||'未命名')+'('+t.grade+')</option>';}).join('')+'</select></div><div style="flex:1;"><label>防具类</label><select id="equip-defense"><option value="">不装备</option>'+dl.map(function(t){return'<option value="'+t.id+'" '+(char.equippedDefense===t.id?'selected':'')+'>'+(t.name||'未命名')+'('+t.grade+')</option>';}).join('')+'</select></div><div style="flex:1;"><label>饰品类</label><select id="equip-accessory"><option value="">不装备</option>'+acl.map(function(t){return'<option value="'+t.id+'" '+(char.equippedAccessory===t.id?'selected':'')+'>'+(t.name||'未命名')+'('+t.grade+')</option>';}).join('')+'</select></div>';})()+'</div></fieldset>'+

      // 7. 主修功法
      '<fieldset class="fieldset"><legend>主修功法 <button class="btn-add" id="btn-add-ms">+</button></legend><div id="ms-container">'+(mainSkillHtml||'<div style="color:var(--text-dim);">暂无主修功法</div>')+'</div></fieldset>'+

      // 8. 习得神通
      '<fieldset class="fieldset"><legend>习得神通 <button class="btn-add" id="btn-add-la">+</button></legend><div id="la-container">'+(learnedHtml||'<div style="color:var(--text-dim);">暂无习得神通</div>')+'</div></fieldset>'+

      '<div class="toolbar" style="margin-top:20px;"><button class="btn-primary" id="btn-save-char2">保存</button><button class="btn-danger" id="btn-del-char2" '+(isNew?'style="display:none"':'')+'>删除角色</button></div>'+
    '</div>';
  },

  bindDetailEvents() {
    var self=this; var el=document.querySelector('.detail-page'); if(!el)return;
    var charId=el.dataset.charId; var isNew=el.dataset.isNew==='true';
    var _dirty=false;
    var setDirty=function(){_dirty=true;};
    var az=document.getElementById('char-avatar-zone'); if(az){var cur=charId?Storage.findById(STORAGE_KEY,charId):createEmptyChar();ImageUpload.setup(az,cur.avatar||'',setDirty,'characters/');az.addEventListener('click',function(){var i=this.querySelector('img');if(i){var o=document.getElementById('skill-modal');document.getElementById('modal-title').textContent='立绘预览';document.getElementById('modal-body').innerHTML='<img src="'+i.src+'" style="max-width:100%;max-height:70vh;">';o.style.display='flex';}});}
    var fz=document.getElementById('char-fullbody-zone'); if(fz){var cur=charId?Storage.findById(STORAGE_KEY,charId):createEmptyChar();ImageUpload.setup(fz,cur.fullBody||'',setDirty,'characters/');fz.addEventListener('click',function(){var i=this.querySelector('img');if(i){var o=document.getElementById('skill-modal');document.getElementById('modal-title').textContent='全身立绘预览';document.getElementById('modal-body').innerHTML='<img src="'+i.src+'" style="max-width:100%;max-height:70vh;">';o.style.display='flex';}});}

    document.querySelectorAll('input,textarea,select').forEach(function(inp){
      inp.addEventListener('change',setDirty);
      inp.addEventListener('input',setDirty);
    });

    window.addEventListener('beforeunload',function(e){if(_dirty){e.preventDefault();e.returnValue='确定离开？未保存的修改将丢失。';}});

    var save=function(){var d=self._collect(charId);if(!d.name.trim()){alert('请输入角色姓名');return;}if(!d.id)d.id=Storage.uid();if(!d.realmStages||d.realmStages.length===0){d.realmStages=[createEmptyStage()];}Storage.save(STORAGE_KEY,d);_dirty=false;App.navigate('characters');};
    var back=function(){if(_dirty&&!confirm('有未保存的修改，确定离开？'))return;_dirty=false;App.navigate('characters');};
    document.getElementById('btn-back-list')?.addEventListener('click',back);
    document.getElementById('btn-save-char')?.addEventListener('click',save);
    document.getElementById('btn-save-char2')?.addEventListener('click',save);

    // 添加大境界阶段
    document.getElementById('btn-add-stage')?.addEventListener('click',function(){
      var cur=self._quickCollect(charId);
      if(!cur.realmStages)cur.realmStages=[];
      if(cur.realmStages.length>=5){alert('已达化神，无法再添加阶段');return;}
      if(!cur.id)cur.id=Storage.uid();
      var s=createEmptyStage();
      s.majorRealm=MAJOR_REALMS[cur.realmStages.length];
      // 继承上阶段特质和成长系数
      var prev = cur.realmStages[cur.realmStages.length-1];
      if (prev) {
        s.hpGrowth = prev.hpGrowth||prev.baseGrowth||1;
        s.atkGrowth = prev.atkGrowth||prev.baseGrowth||1;
        s.defGrowth = prev.defGrowth||prev.baseGrowth||1;
        s.traitGrowth = prev.traitGrowth||1;
        s.strength = prev.strength||0;
        s.agility = prev.agility||0;
        s.physique = prev.physique||0;
        s.spirit = prev.spirit||0;
        s.wisdom = prev.wisdom||0;
      }
      cur.realmStages.push(s);
      Storage.save(STORAGE_KEY,cur);
      _dirty=false;
      App.navigate('characters/detail?id='+cur.id);
    });

    var del=function(){if(confirm('确定删除该角色？')){_dirty=false;Storage.deleteById(STORAGE_KEY,charId);App.navigate('characters');}};
    document.getElementById('btn-del-char')?.addEventListener('click',del);
    document.getElementById('btn-del-char2')?.addEventListener('click',del);

    // 被动技能
    document.getElementById('btn-add-skill')?.addEventListener('click',function(){var c=document.getElementById('skills-container');var idx=c.querySelectorAll('.entry-item').length;var div=document.createElement('div');div.className='entry-item';div.innerHTML='<div class="entry-header"><span>被动技能 #'+(idx+1)+'</span><button class="btn-delete sd">×</button></div><input type="text" data-field="skill_name_'+idx+'" placeholder="技能名称" style="width:100%;margin-bottom:8px;"><textarea data-field="skill_desc_'+idx+'" placeholder="技能描述" style="width:100%;"></textarea>';var em=c.querySelector(':scope > div:not(.entry-item)');if(em)em.remove();c.appendChild(div);div.querySelector('.sd').addEventListener('click',function(){div.remove();if(c.querySelectorAll('.entry-item').length===0)c.innerHTML='<div style="color:var(--text-dim);">暂无被动技能</div>';});});
    document.querySelectorAll('[data-action="del-skill"]').forEach(function(b){b.addEventListener('click',function(){this.closest('.entry-item').remove();var c=document.getElementById('skills-container');if(c.querySelectorAll('.entry-item').length===0)c.innerHTML='<div style="color:var(--text-dim);">暂无被动技能</div>';});});

    // 进阶突破
    document.getElementById('btn-add-adv')?.addEventListener('click',function(){
      var cur=self._quickCollect(charId);
      if(!cur.advancements)cur.advancements=[];
      // 同时检查DOM中的突破数量，确保不超限
      var domCount=document.querySelectorAll('#adv-container fieldset').length;
      var actualCount=Math.max(cur.advancements.length,domCount);
      if(actualCount>=6){alert('已达六阶突破上限（当前'+actualCount+'阶）');return;}
      if(!cur.id)cur.id=Storage.uid();
      // 同步：确保storage反映真实数量
      while(cur.advancements.length<actualCount){cur.advancements.push(createEmptyAdvancement(cur.advancements.length+1));}
      var nr=cur.advancements.length+1;
      cur.advancements.push(createEmptyAdvancement(nr));
      Storage.save(STORAGE_KEY,cur);
      _dirty=false;
      App.navigate('characters/detail?id='+cur.id);
    });
    document.querySelectorAll('[data-action="del-adv"]').forEach(function(b){b.addEventListener('click',function(){
      var cur=self._quickCollect(charId);
      var idx=parseInt(this.dataset.idx);
      cur.advancements.splice(idx,1);
      Storage.save(STORAGE_KEY,cur);
      _dirty=false;
      App.navigate('characters/detail?id='+(cur.id||charId));
    });});

    // 阶段快捷删除（折叠时×按钮）
    document.querySelectorAll('.stage-quick-del').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var idx=parseInt(this.dataset.idx);Characters.delStage(idx,charId);});});

    // 元婴互斥
    document.querySelectorAll('.yy-check').forEach(function(cb){cb.addEventListener('change',function(){if(this.checked){document.querySelectorAll('.yy-check').forEach(function(o){if(o!==this)o.checked=false;});}});});

    // 主修功法删除
    document.querySelectorAll('.ms-del').forEach(function(b){b.addEventListener('click',function(){var cur=self._quickCollect(charId);var skId=this.closest('.entry-item')?.dataset.skid;if(skId){cur.mainSkills=(cur.mainSkills||[]).filter(function(id){return id!==skId;});if(cur.yuanYingSkill===skId)cur.yuanYingSkill=null;Storage.save(STORAGE_KEY,cur);}App.navigate('characters/detail?id='+(cur.id||charId));});});
    document.getElementById('btn-add-ms')?.addEventListener('click',function(){var gl=Storage.list('skills_gongfa');if(gl.length===0){alert('请先添加功法');return;}var cur=self._quickCollect(charId);var stageCount=(cur.realmStages||[]).length;var limits=getSkillLimits(stageCount);if((cur.mainSkills||[]).length>=limits.gongfa){alert('功法已达上限（'+limits.gongfa+'个），当前境界数：'+stageCount);return;}var names=gl.map(function(g,i){return (i+1)+'. '+(g.name||'未命名');}).join('\n');var idx=prompt('选择功法（输入序号）：\n'+names);if(!idx)return;var gi=parseInt(idx)-1;if(gi<0||gi>=gl.length){alert('无效序号');return;}if(!cur.mainSkills)cur.mainSkills=[];if(cur.mainSkills.includes(gl[gi].id)){alert('已添加');return;}cur.mainSkills.push(gl[gi].id);Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});

    // 习得神通
    document.querySelectorAll('.la-del').forEach(function(b){b.addEventListener('click',function(){var cur=self._quickCollect(charId);var skId=this.closest('.entry-item')?.dataset.skid;if(skId){cur.learnedAbilities=(cur.learnedAbilities||[]).filter(function(id){return id!==skId;});Storage.save(STORAGE_KEY,cur);}App.navigate('characters/detail?id='+(cur.id||charId));});});
    document.getElementById('btn-add-la')?.addEventListener('click',function(){var sl=Storage.list('skills_shentong');if(sl.length===0){alert('请先添加神通');return;}var cur=self._quickCollect(charId);var stageCount=(cur.realmStages||[]).length;var limits=getSkillLimits(stageCount);if((cur.learnedAbilities||[]).length>=limits.shentong){alert('神通已达上限（'+limits.shentong+'个），当前境界数：'+stageCount);return;}var names=sl.map(function(s,i){return (i+1)+'. '+(s.name||'未命名');}).join('\n');var idx=prompt('选择神通（输入序号）：\n'+names);if(!idx)return;var si=parseInt(idx)-1;if(si<0||si>=sl.length){alert('无效序号');return;}if(!cur.learnedAbilities)cur.learnedAbilities=[];if(cur.learnedAbilities.includes(sl[si].id)){alert('已添加');return;}cur.learnedAbilities.push(sl[si].id);Storage.save(STORAGE_KEY,cur);App.navigate('characters/detail?id='+(cur.id||charId));});
  },

  delStage(idx, charId) {
    var cur = Storage.findById(STORAGE_KEY, charId);
    if (!cur) return;
    if (!cur.realmStages) cur.realmStages = [];
    cur.realmStages.splice(idx, 1);
    Storage.save(STORAGE_KEY, cur);
    App.navigate('characters/detail?id=' + (cur.id || charId));
  },

  _quickCollect(charId){
    var d=charId?Storage.findById(STORAGE_KEY,charId):createEmptyChar(); if(!d)d=createEmptyChar();
    if(!d.realmStages)d.realmStages=[]; if(!d.advancements)d.advancements=[];
    if(!d.mainSkills)d.mainSkills=[]; if(!d.learnedAbilities)d.learnedAbilities=[];
    if(!d.passiveSkills)d.passiveSkills=[];
    d.id=charId||''; d.name=document.getElementById('char-name')?.value||'';
    d.sect=document.getElementById('char-sect')?.value||'';
    d.spiritRootGrade=document.getElementById('char-grade')?.value||'人阶下';
    d.spiritRoots=Array.from(document.querySelectorAll('#char-roots input:checked')).map(function(cb){return cb.value;});
    return d;
  },

  _collect(charId){
    var d=this._quickCollect(charId);

    // 收集修为阶段
    d.realmStages=[];
    var stagesContainer=document.getElementById('stages-container');
    var stageFields=stagesContainer?stagesContainer.querySelectorAll('fieldset'):[];
    stageFields.forEach(function(fs,i){
      var legend=fs.querySelector('legend span');
      var realmLabel=legend?legend.textContent.replace(/^[▾▸]\s*/,'').trim():MAJOR_REALMS[i]||'练气';
      var s=createEmptyStage();
      s.majorRealm=realmLabel;
      s.baseHp=parseFloat(fs.querySelector('[data-field="s_bhp_'+i+'"]')?.value)||0;
      s.baseAtk=parseFloat(fs.querySelector('[data-field="s_batk_'+i+'"]')?.value)||0;
      s.baseDef=parseFloat(fs.querySelector('[data-field="s_bdef_'+i+'"]')?.value)||0;
      s.baseMaxLingli=parseFloat(fs.querySelector('[data-field="s_blingli_'+i+'"]')?.value)||0;
      s.baseCritRate=parseFloat(fs.querySelector('[data-field="s_bcr_'+i+'"]')?.value)||0;
      s.baseCritDmg=parseFloat(fs.querySelector('[data-field="s_bcd_'+i+'"]')?.value)||0;
      ['metal','wood','water','fire','earth'].forEach(function(k){
        var rv=fs.querySelector('[data-field="s_bres_'+i+'_'+k+'"]');
        var dv=fs.querySelector('[data-field="s_bdmg_'+i+'_'+k+'"]');
        s.baseResist[k]=parseFloat(rv?.value)||0;
        s.baseDmgBonus[k]=parseFloat(dv?.value)||0;
      });
      s.hpGrowth=parseFloat(fs.querySelector('[data-field="s_hpgrow_'+i+'"]')?.value)||1;
      s.atkGrowth=parseFloat(fs.querySelector('[data-field="s_atkgrow_'+i+'"]')?.value)||1;
      s.defGrowth=parseFloat(fs.querySelector('[data-field="s_defgrow_'+i+'"]')?.value)||1;
      s.strength=parseFloat(fs.querySelector('[data-field="s_str_'+i+'"]')?.value)||0;
      s.agility=parseFloat(fs.querySelector('[data-field="s_agi_'+i+'"]')?.value)||0;
      s.physique=parseFloat(fs.querySelector('[data-field="s_phy_'+i+'"]')?.value)||0;
      s.spirit=parseFloat(fs.querySelector('[data-field="s_spi_'+i+'"]')?.value)||0;
      s.wisdom=parseFloat(fs.querySelector('[data-field="s_wis_'+i+'"]')?.value)||0;
      s.traitGrowth=parseFloat(fs.querySelector('[data-field="s_tgrow_'+i+'"]')?.value)||1;
      d.realmStages.push(s);
    });

    // 收集突破
    d.advancements=[];
    var advFields=document.querySelectorAll('#adv-container fieldset');
    advFields.forEach(function(fs,i){
      var a=createEmptyAdvancement(i+1);
      a.hpGrowthBoost=parseFloat(fs.querySelector('[data-field="adv_hpgrow_'+i+'"]')?.value)||0;
      a.atkGrowthBoost=parseFloat(fs.querySelector('[data-field="adv_atkgrow_'+i+'"]')?.value)||0;
      a.defGrowthBoost=parseFloat(fs.querySelector('[data-field="adv_defgrow_'+i+'"]')?.value)||0;
      a.traitGrowthBoost=parseFloat(fs.querySelector('[data-field="adv_tgrow_'+i+'"]')?.value)||0;
      a.strengthBoost=parseFloat(fs.querySelector('[data-field="adv_str_'+i+'"]')?.value)||0;
      a.agilityBoost=parseFloat(fs.querySelector('[data-field="adv_agi_'+i+'"]')?.value)||0;
      a.physiqueBoost=parseFloat(fs.querySelector('[data-field="adv_phy_'+i+'"]')?.value)||0;
      a.spiritBoost=parseFloat(fs.querySelector('[data-field="adv_spi_'+i+'"]')?.value)||0;
      a.wisdomBoost=parseFloat(fs.querySelector('[data-field="adv_wis_'+i+'"]')?.value)||0;
      a.hpBoost=parseFloat(fs.querySelector('[data-field="adv_hp_'+i+'"]')?.value)||0;
      a.atkBoost=parseFloat(fs.querySelector('[data-field="adv_atk_'+i+'"]')?.value)||0;
      a.defBoost=parseFloat(fs.querySelector('[data-field="adv_def_'+i+'"]')?.value)||0;
      a.maxLingliBoost=parseFloat(fs.querySelector('[data-field="adv_lingli_'+i+'"]')?.value)||0;
      a.critRateBoost=parseFloat(fs.querySelector('[data-field="adv_cr_'+i+'"]')?.value)||0;
      a.critDmgBoost=parseFloat(fs.querySelector('[data-field="adv_cd_'+i+'"]')?.value)||0;
      ['metal','wood','water','fire','earth'].forEach(function(k){
        var rv=fs.querySelector('[data-field="adv_res_'+i+'_'+k+'"]');
        var dv=fs.querySelector('[data-field="adv_dmg_'+i+'_'+k+'"]');
        a.resistBoost[k]=parseFloat(rv?.value)||0;
        a.dmgBonusBoost[k]=parseFloat(dv?.value)||0;
      });
      d.advancements.push(a);
    });

    d.avatar=document.querySelector('#char-avatar-zone .img-filename-input')?.value?.trim()||'';
    d.fullBody=document.querySelector('#char-fullbody-zone .img-filename-input')?.value?.trim()||'';
    d.passiveSkills=[]; document.querySelectorAll('#skills-container .entry-item').forEach(function(item){var n=item.querySelector('input');var t=item.querySelector('textarea');d.passiveSkills.push({name:n?.value||'',desc:t?.value||''});});

    var yyCheck=document.querySelector('.yy-check:checked'); d.yuanYingSkill=yyCheck?yyCheck.dataset.skid:null;
    d.equippedAttack=document.getElementById('equip-attack')?.value||null;
    d.equippedDefense=document.getElementById('equip-defense')?.value||null;
    d.equippedAccessory=document.getElementById('equip-accessory')?.value||null;
    return d;
  },

  bindListEvents(){}
};

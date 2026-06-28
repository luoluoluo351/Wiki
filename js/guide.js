// 攻略模块

var Guide = {
  render: function() {
    var html = '<h2 style="color:var(--gold);font-family:KaiTi,serif;letter-spacing:3px;margin-bottom:20px;">📜 修仙攻略 · 机制总览</h2>';

    // 一、修为系统
    html += '<fieldset class="fieldset"><legend>一、修为系统</legend>';
    html += '<p>共20个境界，分为5个大境界：<b>练气 → 筑基 → 金丹 → 元婴 → 化神</b></p>';
    html += '<p>每个大境界包含4个小阶段：初期 / 中期 / 后期 / 巅峰</p>';
    html += '<p>每个阶段独立配置属性：生命、攻击、防御、灵力上限、暴击率、暴击伤害、五行抗性(金木水火土)、五行增伤(金木水火土)</p>';
    html += '<p><b>突破进阶</b>：I~IV阶，每阶解锁一个额外修为阶段，上限4阶</p>';
    html += '<p><b>元婴功法</b>：达到元婴初期后可指定一个主修功法为元婴功法</p>';
    html += '<p><b>灵力上限</b>：随修为阶段累加，决定灵力最大值</p>';
    html += '</fieldset>';

    // 二、技能数量限制
    html += '<fieldset class="fieldset"><legend>二、技能数量限制</legend>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<tr style="color:var(--gold);"><th>境界</th><th>功法上限</th><th>神通上限</th></tr>';
    html += '<tr><td>练气</td><td>1</td><td>2</td></tr>';
    html += '<tr><td>筑基</td><td>2</td><td>3</td></tr>';
    html += '<tr><td>金丹</td><td>3</td><td>3</td></tr>';
    html += '<tr><td>元婴</td><td>4</td><td>4</td></tr>';
    html += '<tr><td>化神</td><td>5</td><td>4</td></tr>';
    html += '</table>';
    html += '<p style="font-size:12px;color:var(--text-dim);">功法为被动增益（无CD/灵力），神通为主动释放（有CD+消耗灵力）</p>';
    html += '</fieldset>';

    // 三、战力公式
    html += '<fieldset class="fieldset"><legend>三、战力公式</legend>';
    html += '<p style="font-family:monospace;background:var(--input-bg);padding:10px;border-radius:6px;">战力 = 生命/10 + 攻击/2 + 防御/1.5 + 暴击综合值 + Σ(五行抗性/0.8) + Σ(五行增伤/0.8)</p>';
    html += '<p>适用于角色、灵宠。法宝有独立战力公式。</p>';
    html += '</fieldset>';

    // 四、伤害公式
    html += '<fieldset class="fieldset"><legend>四、伤害公式</legend>';
    html += '<table style="width:100%;">';
    html += '<tr><td style="width:100px;color:var(--gold);">总攻击力</td><td>基础ATK × (1 + ATK加成%/100) + 固定加成</td></tr>';
    html += '<tr><td style="color:var(--gold);">修为压制</td><td>1 + (攻方等级 - 防方等级) × 8%（每小境界8%）</td></tr>';
    html += '<tr><td style="color:var(--gold);">大境界穿透</td><td>每高一个大境界 +10% 防御穿透</td></tr>';
    html += '<tr><td style="color:var(--gold);">防御免伤</td><td>有效防御 / (有效防御 + K)<br><span style="font-size:12px;">K值：练气500 / 筑基650 / 金丹900 / 元婴1250 / 化神1700</span></td></tr>';
    html += '<tr><td style="color:var(--gold);">有效防御</td><td>防御力 × (1 - 穿透率/100)</td></tr>';
    html += '<tr><td style="color:var(--gold);">五行克制</td><td>攻方克防方 = ×1.2，否则 ×1.0</td></tr>';
    html += '<tr><td style="color:var(--gold);">克制顺序</td><td><b>金→木→水→火→土→金</b></td></tr>';
    html += '<tr><td style="color:var(--gold);">一类增伤</td><td>1 + 全增伤%/100（对所有伤害生效）</td></tr>';
    html += '<tr><td style="color:var(--gold);">二类增伤</td><td>1 + 攻击属性增伤%/100 - 目标对应抗性%/100</td></tr>';
    html += '<tr><td style="color:var(--gold);">三类增伤</td><td>1 + 攻击类型增伤%/100</td></tr>';
    html += '<tr><td style="color:var(--gold);">暴击</td><td>非暴击伤害 × 爆伤/100</td></tr>';
    html += '</table>';
    html += '<p style="font-family:monospace;background:var(--input-bg);padding:10px;border-radius:6px;margin-top:8px;">最终伤害 = 总攻击力 × 技能倍率 × (1-防御免伤) × 修为压制 × 五行克制 × 一类增伤 × 二类增伤 × 三类增伤</p>';
    html += '</fieldset>';

    // 五、技能系统
    html += '<fieldset class="fieldset"><legend>五、技能系统</legend>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<tr style="color:var(--gold);"><th></th><th>功法</th><th>神通</th></tr>';
    html += '<tr><td>类型</td><td>被动增益</td><td>主动释放</td></tr>';
    html += '<tr><td>品阶</td><td>人阶下/中/上</td><td>人阶下/中/上</td></tr>';
    html += '<tr><td>类别</td><td>攻击/防御/增益/辅助</td><td>攻击/防御/增益/辅助</td></tr>';
    html += '<tr><td>五行</td><td>多选，最多3个</td><td>多选，最多3个</td></tr>';
    html += '<tr><td>冷却</td><td>无</td><td>有（CD秒数）</td></tr>';
    html += '<tr><td>灵力</td><td>无</td><td>消耗灵力</td></tr>';
    html += '</table>';
    html += '</fieldset>';

    // 六、法宝系统
    html += '<fieldset class="fieldset"><legend>六、法宝系统</legend>';
    html += '<p><b>类型</b>：攻击类(剑/枪/斧/针/盾/扇)、防具类(甲/胄/袍)、饰品类(环/玺/镜/珠/印)</p>';
    html += '<p><b>品阶</b>：下品/中品/上品/极品法器</p>';
    html += '<p><b>词条1</b>（攻击/防具）：基础攻击力或基础生命值，1~60级线性成长</p>';
    html += '<p><b>词条2</b>（全部类型）：任选属性%（攻击/生命/防御/暴击率/爆伤/五行抗性/五行增伤），1~60级线性成长</p>';
    html += '<p><b>等级范围</b>：1~60级</p>';
    html += '</fieldset>';

    // 七、五行克制
    html += '<fieldset class="fieldset"><legend>七、五行克制</legend>';
    html += '<p style="font-size:18px;text-align:center;letter-spacing:8px;"><b>金 → 木 → 水 → 火 → 土 → 金</b></p>';
    html += '<p>攻击方元素克制防御方元素时，伤害×1.2。每个角色最多拥有3种灵根属性。</p>';
    html += '</fieldset>';

    // 八、抽卡概率
    html += '<fieldset class="fieldset"><legend>八、抽卡概率</legend>';
    html += '<p><b>稀有度分档</b>：红色仙品 / 金色天品 / 紫色地品 / 蓝色玄品</p>';
    html += '<p><b>十连保底</b>：每10抽至少出一个金色（天品）或以上</p>';
    html += '<p><b>仙缘值/悟道值</b>：每次抽卡累计，提高出红概率，出红后清零</p>';
    html += '<p><b>歪率</b>：出红时有概率获得非UP角色/技能，仙缘值/悟道值越高歪率越低</p>';
    html += '<p><b>金色UP</b>：出金时50%概率获得小UP，50%为常驻奖励</p>';
    html += '<table style="width:100%;border-collapse:collapse;margin-top:8px;">';
    html += '<tr style="color:var(--gold);"><th>池</th><th>红基础</th><th>软保底</th><th>硬保底</th><th>综合出红</th></tr>';
    html += '<tr><td>角色池</td><td>0.6%</td><td>71抽起</td><td>100抽</td><td>~64抽/红</td></tr>';
    html += '<tr><td>技能池</td><td>0.8%</td><td>36抽起</td><td>60抽</td><td>~39抽/红</td></tr>';
    html += '</table>';
    html += '</fieldset>';

    // 九、角色系统
    html += '<fieldset class="fieldset"><legend>九、角色系统</legend>';
    html += '<p><b>灵根</b>：金/木/水/火/土 多选，最多3个</p>';
    html += '<p><b>装备栏</b>：攻击法宝 + 防具法宝 + 饰品法宝</p>';
    html += '<p><b>立绘</b>：半身头像（列表展示）+ 全身立绘（抽卡展示）</p>';
    html += '<p><b>被动技能</b>：自由添加（名称+描述）</p>';
    html += '</fieldset>';

    return html;
  },
  bindEvents: function() {}
};

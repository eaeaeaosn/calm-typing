/* ============================================================
 *  FishFX 独立模块（v1.0）
 *  功能：键盘触发鱼动画（普通鱼🐠🐟 + Enter→鲨鱼🦈）
 *  依赖：CSS中定义 #fish-layer、.fish、.fish.shark、@keyframes fish-float
 *  作者：Chloe 项目定制版
 * ============================================================ */

(function (global) {
  const cfg = {
    minIntervalMs: 90,          // 触发最小间隔（节流）
    maxConcurrency: 20,         // 同时存在的普通鱼数量上限
    fishEmojis: ['🐠', '🐡', '🐟'], // 普通鱼图标（已增加河豚 🐡）
    sharkEmoji: '🦈',           // 鲨鱼图标
    useArcProb: 0,              // 若你定义了 .fish.arc，可改成 0.35
    attachListener: false       // ❗不自动监听键盘（交由 CalmTyping 调用）
  };

  const state = {
    layer: null,
    lastTs: 0,
    enabled: true
  };

  // 初始化：查找或创建鱼层
  function init() {
    state.layer = document.getElementById('fish-layer');
    if (!state.layer) {
      console.warn('[FishFX] 未找到 #fish-layer，已自动创建。');
      const el = document.createElement('div');
      el.id = 'fish-layer';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      state.layer = el;
    }
  }

  function now() { return performance.now(); }

  // 虚拟键盘坐标映射
  function getKeyPos(key) {
    const rows = {
      num: ['`','1','2','3','4','5','6','7','8','9','0','-','='],
      q  : ['q','w','e','r','t','y','u','i','o','p','[',']'],
      a  : ['a','s','d','f','g','h','j','k','l',';'],
      z  : ['z','x','c','v','b','n','m',',','.','/']
    };
    const rowYvh = { num:85, q:88, a:91, z:94 };
    const rowShift = { num:0.0, q:0.5, a:1.0, z:1.5 };

    key = String(key || '').toLowerCase();
    for (const r of ['num','q','a','z']) {
      const arr = rows[r];
      const idx = arr.indexOf(key);
      if (idx !== -1) {
        const vw = innerWidth, vh = innerHeight;
        const colW = vw / (arr.length + 2); // 左右留1列空
        const colIndex = idx + 1 + rowShift[r];
        const x = colW * (colIndex + 0.5) + (Math.random() - 0.5) * 20;
        const y = vh * (rowYvh[r] / 100) + (Math.random() - 0.5) * 10;
        return { x, y };
      }
    }
    if (key === ' ') return { x: innerWidth * 0.5, y: innerHeight * 0.95 };
    return null;
  }

  // 在视口内生成随机位置（避免贴边，留白 5%-10%）
  function getRandomPos() {
    const marginX = Math.max(20, innerWidth * 0.05);
    const marginY = Math.max(20, innerHeight * 0.05);
    const x = marginX + Math.random() * (innerWidth - marginX * 2);
    const y = marginY + Math.random() * (innerHeight - marginY * 2);
    return { x, y };
  }
  
  // 生成一条鱼或鲨鱼
  function spawnAt(pos, { emoji, isShark = false } = {}) {
    if (!state.enabled || !state.layer || !pos) return;
    if (state.layer.children.length >= cfg.maxConcurrency && !isShark) return;

    const el = document.createElement('span');
    el.className = 'fish' + (isShark ? ' shark' : '');
    el.textContent = emoji || cfg.fishEmojis[0];
    el.style.left = pos.x + 'px';
    el.style.top  = pos.y + 'px';

    if (!isShark) {
      el.style.fontSize = (1.6 + Math.random() * 1.0) + 'rem';
      el.style.animationDuration = (1.5 + Math.random() * 0.8) + 's';
      if (cfg.useArcProb > 0 && Math.random() < cfg.useArcProb) el.classList.add('arc');
    }

    el.addEventListener('animationend', () => el.remove());
    state.layer.appendChild(el);
    return el;
  }

  // 判断当前是否为 mountain 背景：检测 #mountain-bg 是否存在且可见
  function isMountainActive() {
    try {
      const el = document.getElementById('mountain-bg');
      if (!el) {
        console.log('❌ Mountain element not found');
        return false;
      }
      const s = getComputedStyle(el);
      const hasActiveClass = el.classList.contains('active');
      console.log('🏔️ Mountain element found:', {
        hasActiveClass,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity
      });
      
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const op = parseFloat(s.opacity || '1');
      const isVisible = op > 0.05;
      console.log('🏔️ Mountain visibility check:', { opacity: op, isVisible });
      return isVisible;
    } catch (e) {
      console.log('❌ Mountain detection error:', e);
      return false;
    }
  }

  // 判断当前是否为 forest 背景
  function isForestActive() {
    try {
      const el = document.getElementById('forest-bg');
      if (!el) {
        console.log('❌ Forest element not found');
        return false;
      }
      const s = getComputedStyle(el);
      const hasActiveClass = el.classList.contains('active');
      console.log('🌲 Forest element found:', {
        hasActiveClass,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity
      });
      
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const op = parseFloat(s.opacity || '1');
      const isVisible = op > 0.05;
      console.log('🌲 Forest visibility check:', { opacity: op, isVisible });
      return isVisible;
    } catch (e) {
      console.log('❌ Forest detection error:', e);
      return false;
    }
  }

  // 根据当前背景选择普通的 emoji（鱼、鸟或森林动物）
  function chooseNormalEmoji() {
    if (isMountainActive()) {
      console.log('🐦 Mountain background detected - spawning birds!');
      const pool = cfg.birdEmojis && cfg.birdEmojis.length ? cfg.birdEmojis : ['🐦','🦜','🕊️'];
      return pool[(Math.random() * pool.length) | 0];
    }
    if (isForestActive()) {
      console.log('🦔 Forest background detected - spawning forest animals!');
      const pool = cfg.forestEmojis && cfg.forestEmojis.length ? cfg.forestEmojis : ['🦔','🐿️','🦨'];
      return pool[(Math.random() * pool.length) | 0];
    }
    console.log('🐠 Ocean/other background - spawning fish!');
    const pool = cfg.fishEmojis && cfg.fishEmojis.length ? cfg.fishEmojis : ['🐠','🐡','🐟'];
    return pool[(Math.random() * pool.length) | 0];
  }

  // 普通动物：根据背景选择适当的动物
  function spawnNormalByKey(key) {
    const pos = getRandomPos();
    const emoji = chooseNormalEmoji();
    spawnAt(pos, { emoji, isShark: false });
  }

  function spawnShark() {
    // Enter：根据背景选择特殊动物
    const pos = getRandomPos();
    if (isMountainActive()) {
      // mountain 背景：Enter 生成猛禽 🦅
      spawnAt(pos, { emoji: cfg.eagleEmoji || '🦅', isShark: false });
    } else if (isForestActive()) {
      // forest 背景：Enter 生成孔雀 🦚
      spawnAt(pos, { emoji: cfg.peacockEmoji || '🦚', isShark: false });
    } else {
      // 其它场景：正常鲨鱼
      spawnAt(pos, { emoji: cfg.sharkEmoji, isShark: true });
    }
  }

  // 断句算法占位（未来扩展）
  function processSentence() {
    // TODO: 在这里实现断句/语义分析算法
  }

  // 键盘事件处理（供外部调用）
  function onKeydown(e) {
    if (!state.enabled) return;
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

    const t = now();
    if (t - state.lastTs < cfg.minIntervalMs) return;
    state.lastTs = t;

    if (e.key === 'Enter') {
      spawnShark();
      // 预留接口
      // processSentence();
      return;
    }
    spawnNormalByKey(e.key);
  }

  // 测试函数：手动检测背景状态
  function testBackgroundDetection() {
    console.log('🧪 Testing background detection...');
    console.log('Mountain active:', isMountainActive());
    console.log('Forest active:', isForestActive());
    console.log('Current emoji would be:', chooseNormalEmoji());
    
    // 检查所有背景元素
    const backgrounds = ['mountain-bg', 'forest-bg', 'ocean-bg'];
    backgrounds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const s = getComputedStyle(el);
        console.log(`${id}:`, {
          exists: true,
          hasActiveClass: el.classList.contains('active'),
          display: s.display,
          opacity: s.opacity,
          visibility: s.visibility
        });
      } else {
        console.log(`${id}: not found`);
      }
    });
  }

  // 对外暴露接口
  const FishFX = {
    init,
    onKeydown,          // 👈 你自己的键盘监听调用这个
    spawnShark,         // 手动召唤鲨鱼
    spawnAt,            // 手动指定位置产鱼
    enable()  { state.enabled = true;  },
    disable() { state.enabled = false; },
    config(patch = {}) { Object.assign(cfg, patch); },
    testBackgroundDetection, // 测试函数
  };

  // 初始化舞台
  function autoInit() {
    init();
  }

  global.FishFX = FishFX;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, { once: true });
  } else {
    autoInit();
  }

})(window);
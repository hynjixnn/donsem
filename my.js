// 돈셈 마이: 화면 모드 고르기, 가계부·고정지출·내 자산·목표 전체 백업/복원
(() => {
  const $ = id => document.getElementById(id);
  // 이름표: 저장 키, 목록이 들어 있는 칸, 보여 줄 이름
  const PARTS = [
    { key: 'donsem:budget', list: 'entries', name: '가계부 기록' },
    { key: 'donsem:fixed', list: 'items', name: '고정지출' },
    { key: 'donsem:assets', list: 'items', name: '내 자산 항목' },
    { key: 'donsem:goals', list: 'goals', name: '목표' },
  ];
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; } };

  // ── 화면 모드 ──
  function drawTheme() {
    const now = document.documentElement.dataset.theme || 'light';
    document.querySelectorAll('#my-theme button').forEach(b => b.classList.toggle('on', b.dataset.v === now));
  }
  $('my-theme').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    store.set('donsem:theme', v);
    applyTheme(v, true);
    drawTheme();
  });
  document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => setTimeout(drawTheme, 0)));
  drawTheme();

  // ── 지금 저장된 기록 수 ──
  function drawCount() {
    const parts = PARTS.map(p => { const d = read(p.key); const n = d && Array.isArray(d[p.list]) ? d[p.list].length : 0; return n ? `${p.name} ${n}개` : ''; }).filter(Boolean);
    $('my-count').textContent = parts.length ? `이 기기에 저장된 기록: ${parts.join(' · ')}` : '이 기기에는 아직 저장된 기록이 없어요.';
  }
  drawCount();

  // ── 전체 백업 저장 ──
  $('my-export').addEventListener('click', () => {
    const out = { app: 'donsem-all', version: 1, saved: new Date().toISOString() };
    PARTS.forEach(p => { out[p.key.split(':')[1]] = read(p.key); });
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `돈셈-전체-백업-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('전체 백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });

  // ── 전체 백업 불러오기: 같은 기록은 두 번 들어가지 않게 합쳐요 ──
  $('my-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let d;
    try { d = JSON.parse(await file.text()); } catch (err) { d = null; }
    if (!d || d.app !== 'donsem-all') return toast('돈셈 전체 백업 파일이 아니에요. 마이에서 저장한 파일을 골라 주세요.');
    const plan = PARTS.map(p => {
      const incoming = d[p.key.split(':')[1]], list = incoming && Array.isArray(incoming[p.list]) ? incoming[p.list].filter(x => x && x.id) : [];
      const mine = read(p.key) || {}, have = new Set((Array.isArray(mine[p.list]) ? mine[p.list] : []).map(x => x.id));
      return { p, incoming, mine, fresh: list.filter(x => !have.has(x.id)) };
    });
    const total = plan.reduce((s, x) => s + x.fresh.length, 0);
    if (!total) return toast('새로 불러올 기록이 없어요. 이미 다 들어 있어요.');
    if (!confirm(`백업에서 새 기록 ${total}개를 찾았어요 (${plan.filter(x => x.fresh.length).map(x => `${x.p.name} ${x.fresh.length}개`).join(', ')}). 지금 기록에 합칠까요?`)) return;
    plan.forEach(({ p, incoming, mine, fresh }) => {
      if (!fresh.length && !(incoming && incoming.history)) return;
      const merged = Object.assign({}, incoming || {}, mine);
      merged[p.list] = (Array.isArray(mine[p.list]) ? mine[p.list] : []).concat(fresh);
      if (p.key === 'donsem:budget' && !mine.budget && incoming && incoming.budget) merged.budget = Number(incoming.budget) || 0;
      if (p.key === 'donsem:assets') merged.history = Object.assign({}, (incoming && incoming.history) || {}, mine.history || {});
      try { localStorage.setItem(p.key, JSON.stringify(merged)); } catch (err) { /* 저장이 막힌 브라우저 */ }
    });
    drawCount();
    toast(`기록 ${total}개를 불러왔어요.`);
  });

  // 이미 홈 화면 앱으로 열었다면 설치 안내 대신 확인 문구
  if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true) {
    $('my-install').textContent = '지금 홈 화면에 설치한 돈셈 앱으로 쓰고 있어요. ✓';
  }
})();

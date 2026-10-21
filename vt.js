// ── 화면 모드(라이트/다크/기기 설정): 화면이 그려지기 전에 먼저 적용해서 흰 화면이 번쩍이지 않게 해요 ──
(() => {
  let t = 'light';
  try { t = localStorage.getItem('donsem:theme') || 'light'; } catch (e) { /* 저장이 막힌 브라우저 */ }
  if (!['light', 'dark', 'auto'].includes(t)) t = 'light';
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#000000' : '#ffffff';
})();

// ── 페이지를 오갈 때 방향 정하기 (화면이 처음 그려지기 전에 알아야 해서 <head>에서 읽어요): 들어가면 오른쪽에서, 뒤로 가거나 첫 화면으로 가면 왼쪽에서, 돈 관리 탭끼리는 겹쳐서 ──
const MONEY_TABS = ['/budget/', '/fixed/', '/assets/', '/goals/'];
// 돈 관리 탭끼리 오갈 때는 브라우저 기능에 맡기지 않고 돈셈이 직접 움직여요 (아이폰 사파리에서도 똑같이 보이게)
let mmFrom = -1;
try { const v = sessionStorage.getItem('donsem:mm-from'); if (v !== null) mmFrom = Number(v); } catch (e) { mmFrom = -1; }
const mmHere = MONEY_TABS.indexOf(location.pathname), mmTab = mmHere >= 0 && mmFrom >= 0 && mmFrom !== mmHere;
if (mmTab) document.documentElement.classList.add(mmHere > mmFrom ? 'mm-in-next' : 'mm-in-prev'); // 화면이 그려지기 전에 들어올 방향을 정해 둬요
// 아래 탭바를 눌러 왔으면: 새 화면 내용만 살짝 떠오르듯 나타나요 (탭바 하이라이트는 누른 화면에서 이미 옮겨 왔어요)
let tbNav = false;
try { tbNav = sessionStorage.getItem('donsem:tb-nav') === '1'; } catch (e) { tbNav = false; }
if (tbNav && !mmTab) document.documentElement.classList.add('tb-in');
window.addEventListener('pagereveal', e => {
  if (!e.viewTransition) return;
  if (mmTab || tbNav) { e.viewTransition.skipTransition(); return; } // 브라우저 전환과 겹치지 않게
  const act = window.navigation && navigation.activation;
  if (!act || !act.from) return; // 방향을 알 수 없으면 브라우저 기본(겹쳐 바뀌기)
  if (act.navigationType === 'reload') { e.viewTransition.skipTransition(); return; }
  const from = new URL(act.from.url).pathname, to = location.pathname;
  let type = 'forward';
  if (MONEY_TABS.includes(from) && MONEY_TABS.includes(to)) type = MONEY_TABS.indexOf(to) > MONEY_TABS.indexOf(from) ? 'tab-next' : 'tab-prev'; // 오른쪽 탭이면 오른쪽에서, 왼쪽 탭이면 왼쪽에서
  else if (act.navigationType === 'traverse' ? act.from.index > act.entry.index : to === '/') type = 'back';
  e.viewTransition.types.add(type);
});

// ── 페이지를 오갈 때 방향 정하기 (화면이 처음 그려지기 전에 알아야 해서 <head>에서 읽어요): 들어가면 오른쪽에서, 뒤로 가거나 첫 화면으로 가면 왼쪽에서, 돈 관리 탭끼리는 겹쳐서 ──
const MONEY_TABS = ['/budget/', '/fixed/', '/assets/', '/goals/'];
window.addEventListener('pagereveal', e => {
  if (!e.viewTransition) return;
  const act = window.navigation && navigation.activation;
  if (!act || !act.from) return; // 방향을 알 수 없으면 브라우저 기본(겹쳐 바뀌기)
  if (act.navigationType === 'reload') { e.viewTransition.skipTransition(); return; }
  const from = new URL(act.from.url).pathname, to = location.pathname;
  let type = 'forward';
  if (MONEY_TABS.includes(from) && MONEY_TABS.includes(to)) type = 'tab';
  else if (act.navigationType === 'traverse' ? act.from.index > act.entry.index : to === '/') type = 'back';
  e.viewTransition.types.add(type);
});

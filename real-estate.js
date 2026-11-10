// 돈셈 부동산: 서울 지도에 내 관심 부동산을 핀으로 꽂고, 취득세·중개수수료·대출까지 바로 계산해요 (네이버페이 부동산 '관심 부동산'처럼)
// 지도·장소 찾기·주변 시설은 카카오맵을 써요. 카카오맵이 안 열리면 OpenFreeMap 지도 + Nominatim·Overpass(OpenStreetMap 자료)로 바꿔요
// 관심 부동산은 이 기기에만 저장해요(donsem:homes). 지도를 누르면 네이버지도처럼 전체화면으로 커져요
(() => {
  const mapEl = document.getElementById('re-map');
  if (!mapEl) return;
  const KEY = 'donsem:homes', $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GU = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];
  const KIND = { buy: '매매', jeonse: '전세', rent: '월세' };
  // 법정동 시군구 코드 (국토교통부 실거래가 자료를 찾을 때 써요)
  const LAWD = { 종로구: 11110, 중구: 11140, 용산구: 11170, 성동구: 11200, 광진구: 11215, 동대문구: 11230, 중랑구: 11260, 성북구: 11290, 강북구: 11305, 도봉구: 11320, 노원구: 11350, 은평구: 11380, 서대문구: 11410, 마포구: 11440, 양천구: 11470, 강서구: 11500, 구로구: 11530, 금천구: 11545, 영등포구: 11560, 동작구: 11590, 관악구: 11620, 서초구: 11650, 강남구: 11680, 송파구: 11710, 강동구: 11740 };
  const API = 'https://donsem-counter.hjjung330.workers.dev/apt', TR = 'https://donsem-counter.hjjung330.workers.dev/transit/';
  const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && Array.isArray(d.items) ? d.items : []; } catch (e) { return []; } };
  let items = load(), map = null, marks = [], pending = null, kind = 'buy', full = false, temp = null, poiMarks = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ items })); } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); } };
  const man = n => (n >= 1e8 ? `${Math.floor(n / 1e8)}억${n % 1e8 >= 1e4 ? ` ${Math.round(n % 1e8 / 1e4).toLocaleString('ko-KR')}만` : ''}` : `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`) + ' 원';
  const priceText = x => x.kind === 'rent' ? `보증금 ${man(x.price)} · 월 ${man(x.rent || 0)}` : `${KIND[x.kind]} ${man(x.price)}`;
  const naverAt = (lat, lng) => `https://new.land.naver.com/complexes?ms=${lat.toFixed(5)},${lng.toFixed(5)},17`;

  // ── 지도 엔진: 카카오맵을 먼저 쓰고, 안 열리면 OpenFreeMap(MapLibre) 지도로 바꿔요 ──
  // 두 엔진 모두 아래 map 모양(fly·fit·bounds·zoom·pin…)으로 다뤄요. 확대 정도는 MapLibre 숫자(클수록 가까이)로 맞춰요
  // 카카오 JavaScript 키는 원래 공개되는 키예요. 카카오 개발자 사이트에 등록한 돈셈 주소에서만 지도가 열려요
  const KAKAO_KEY = '659255150dcc2175d56e029a25d0d460';
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  const lv = z => Math.max(1, Math.min(14, Math.round(20 - z))); // MapLibre 확대 → 카카오 레벨(작을수록 가까이)
  const clearPick = () => { if (temp) { temp.remove(); temp = null; } pending = null; $('re-fs-act').hidden = true; $('re-place').hidden = true; };
  // 큰 지도에서 누르면: 그 자리가 아파트면 바로 단지 정보 창 → 아니면 정보 창 닫기 → 그다음엔 마크 꽂기/지우기
  let tapTok = 0, markTap = 0;
  const onMapClick = async (lat, lng) => {
    if (!full) return enter(); // 작은 지도를 누르면 먼저 크게
    if (Date.now() - markTap < 500) return; // 파란 마크를 누른 거면 지도 누름은 무시
    const tok = ++tapTok, apt = await aptAt(lat, lng);
    if (tok !== tapTok) return;
    if (apt) { const b = $('re-place'); if (!b.hidden && b.dataset.code === apt.raw.id) return; return showPlace(apt); }
    if (!$('re-place').hidden) { $('re-place').hidden = true; return; } // 정보 창만 닫고 파란 마크는 남겨요 (누르면 다시 열려요)
    { const pl = await placeAt(lat, lng); if (tok !== tapTok) return; if (pl) { if (temp) { temp.remove(); temp = null; } $('re-fs-act').hidden = true; return showPoi(pl); } } // 가게·은행·호텔 같은 건물을 누르면 그 장소 정보
    if (temp) return clearPick(); // 마크가 있을 때 한 번 더 누르면 사라져요
    temp = map.dot(lat, lng, clearPick);
    pending = { name: '', lat, lng };
    $('re-fs-act').hidden = false;
  };
  // 누른 자리의 장소 찾기: 그 자리 건물 이름으로 가까운 장소 (카카오맵에서 건물을 누른 것처럼)
  async function placeAt(lat, lng) {
    if (!map || !map.kakao) return null;
    const S = kakao.maps.services, here = new kakao.maps.LatLng(lat, lng);
    const ad = await new Promise(ok => new S.Geocoder().coord2Address(lng, lat, (r, st) => ok(st === S.Status.OK ? r[0] : null)));
    const bname = ad && ad.road_address && ad.road_address.building_name, road = ad && ad.road_address && ad.road_address.address_name;
    if (bname) { // 건물 이름이 있으면 그 이름의 장소
      const list = await kPlaces('keywordSearch', bname, { location: here, radius: 150, sort: S.SortBy.DISTANCE }, 15).catch(() => []);
      const k = norm(bname), hit = list.find(p => norm(p.place_name) === k) || list.find(p => k.length > 1 && (norm(p.place_name).includes(k) || k.includes(norm(p.place_name))));
      if (hit) return hit;
    }
    if (road) { // 아니면 같은 도로명 주소(같은 건물)에 있는 가장 가까운 장소
      const list = await kPlaces('keywordSearch', road, { location: here, radius: 60, sort: S.SortBy.DISTANCE }, 15).catch(() => []);
      return list.find(p => p.road_address_name === road && +p.distance <= 40) || null;
    }
    return null;
  }
  // 누른 자리의 아파트 찾기 (카카오: 그 자리 건물 이름 → 근처 아파트). 카카오맵이 아니면 없어요
  async function aptAt(lat, lng) {
    if (!map || !map.kakao) return null;
    const S = kakao.maps.services, here = new kakao.maps.LatLng(lat, lng);
    const ad = await new Promise(ok => new S.Geocoder().coord2Address(lng, lat, (r, st) => ok(st === S.Status.OK ? r[0] : null)));
    const bname = ad && ad.road_address && ad.road_address.building_name, jibun = ad && ad.address && ad.address.address_name;
    const isApt = p => /아파트|주거시설/.test(p.category_name), main = p => /아파트$/.test(p.category_name); // 단지 자체(…> 아파트)를 동·상가보다 먼저
    const same = (a, b) => { a = norm(a); b = norm(b); return a.length > 1 && b.length > 1 && (a.includes(b) || b.includes(a)); };
    // 건물 이름이 같은 아파트 → 지번 주소가 똑같은 아파트 → 50m 안 아파트 순서로 (공원처럼 아파트가 아닌 곳은 아무것도 안 골라요)
    for (const [q, radius, ok] of [[bname, 300, x => same(x.place_name, bname)], [jibun, 300, x => x.address_name === jibun], ['아파트', 50, () => true]]) {
      if (!q) continue;
      const list = (await kPlaces('keywordSearch', q, { location: here, radius, sort: S.SortBy.DISTANCE }, 15).catch(() => [])).filter(x => isApt(x) && ok(x));
      const p = list.find(main) || list[0];
      if (p) return { name: p.place_name.replace(/\s*\d+동$/, ''), addr: p.road_address_name || p.address_name, lat: +p.y, lng: +p.x, raw: p }; // '○○아파트 101동'은 단지 이름으로
    }
    return null;
  }
  function kakaoMap() {
    const wait = new Promise((_, no) => setTimeout(no, 8000));
    return Promise.race([script(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`).then(() => new Promise(ok => kakao.maps.load(ok))), wait]).then(() => {
      const K = kakao.maps, LL = (a, b) => new K.LatLng(a, b);
      const m = new K.Map(mapEl, { center: LL(37.5565, 126.978), level: 9 });
      m.setCopyrightPosition(K.CopyrightPosition.BOTTOMRIGHT, true); // 카카오 로고가 PC 왼쪽 목록에 가리지 않게
      K.event.addListener(m, 'click', e => onMapClick(e.latLng.getLat(), e.latLng.getLng()));
      return {
        center: () => { const c = m.getCenter(); return [c.getLat(), c.getLng()]; },
        kakao: true,
        fly: (lat, lng, z) => { m.setLevel(lv(z)); m.setCenter(LL(lat, lng)); }, // 미끄러지는 중에 아래 창이 열려 지도 크기가 바뀌면 중간에 멈춰서, 바로 옮겨요
        fit: pts => { const b = new K.LatLngBounds(); pts.forEach(p => b.extend(LL(p.lat, p.lng))); m.setBounds(b, 60, 60, 60, 60); if (m.getLevel() < 3) m.setLevel(3); },
        bounds: () => { const b = m.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast(); return [sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng()]; },
        zoom: () => 20 - m.getLevel(),
        zoomTo: z => m.setLevel(lv(z)),
        zoomBy: d => m.setLevel(m.getLevel() - d, { animate: true }),
        onZoom: cb => K.event.addListener(m, 'zoom_changed', () => cb(20 - m.getLevel())),
        stop: () => {},
        resize: () => { const c = m.getCenter(); m.relayout(); m.setCenter(c); },
        pin: (lat, lng, el) => { const o = new K.CustomOverlay({ position: LL(lat, lng), content: el, clickable: true }); o.setMap(m); return { remove: () => o.setMap(null) }; },
        dot: (lat, lng, onTap) => { const k = new K.Marker({ position: LL(lat, lng), clickable: !!onTap }); k.setMap(m); if (onTap) K.event.addListener(k, 'click', onTap); return { remove: () => k.setMap(null) }; },
        // 재건축·재개발 구역 칠하기 (연보라): rings = [[lat,lng,lat,lng…], …]
        poly: (rings, st, onTap) => { const g = new K.Polygon({ path: rings.map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(LL(r[i], r[i + 1])); return a; }), strokeWeight: st.w || 1.5, strokeColor: st.line, strokeOpacity: .95, fillColor: st.fill, fillOpacity: st.op || .42, zIndex: 1 }); g.setMap(m); if (onTap) K.event.addListener(g, 'click', onTap); return { remove: () => g.setMap(null) }; },
        onIdle: cb => K.event.addListener(m, 'idle', cb),
      };
    });
  }
  // 카카오맵이 안 열릴 때: OpenFreeMap 벡터 지도 (MapLibre는 이때만 받아요)
  const isDark = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };
  const STYLE = () => `https://tiles.openfreemap.org/styles/${isDark() ? 'dark' : 'liberty'}`;
  function loadLib() {
    if (window.maplibregl) return Promise.resolve();
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.append(css);
    return script('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js');
  }
  // 지명은 한글로 (지도 자료의 name:ko → 없으면 원래 이름)
  const koLabels = m => { try { m.getStyle().layers.forEach(l => { if (l.type === 'symbol' && m.getLayoutProperty(l.id, 'text-field')) m.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name:nonlatin'], ['get', 'name']]); }); } catch (e) { /* 스타일이 아직이면 다음에 */ } };
  const libreMap = () => loadLib().then(() => new Promise(ok => {
    const m = new maplibregl.Map({ container: mapEl, style: STYLE(), center: [126.978, 37.5565], zoom: 10.6, attributionControl: { compact: true }, localIdeographFontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif", dragRotate: false, pitchWithRotate: false });
    m.touchZoomRotate.disableRotation();
    const fold = () => mapEl.querySelectorAll('.maplibregl-compact-show').forEach(el => el.classList.remove('maplibregl-compact-show')); /* 출처는 접힌 ⓘ로 */
    m.on('resize', () => setTimeout(fold, 0));
    m.on('click', e => onMapClick(e.lngLat.lat, e.lngLat.lng));
    new MutationObserver(() => { m.setStyle(STYLE()); m.once('styledata', () => setTimeout(() => koLabels(m), 300)); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    m.on('load', () => { koLabels(m); fold(); ok({
      fly: (lat, lng, z) => m.flyTo({ center: [lng, lat], zoom: z, speed: 1.6 }),
      fit: pts => { const b = new maplibregl.LngLatBounds(); pts.forEach(p => b.extend([p.lng, p.lat])); m.fitBounds(b, { padding: 60, maxZoom: 15, duration: 0 }); },
      bounds: () => { const b = m.getBounds(); return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]; },
      zoom: () => m.getZoom(),
      zoomTo: z => m.jumpTo({ zoom: z }),
      zoomBy: d => m.easeTo({ zoom: m.getZoom() + d }),
      onZoom: cb => m.on('zoomend', () => cb(m.getZoom())),
      stop: () => m.stop(),
      resize: () => m.resize(),
      center: () => { const c = m.getCenter(); return [c.lat, c.lng]; },
      pin: (lat, lng, el) => new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m),
      dot: (lat, lng, onTap) => { const k = new maplibregl.Marker({ color: '#ff3b30' }).setLngLat([lng, lat]).addTo(m); if (onTap) k.getElement().addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); return k; },
      poly: () => ({ remove() {} }), // 예비 지도에서는 칠하지 않고 이름표만 보여요
      onIdle: cb => m.on('moveend', cb),
    }); });
  }));
  kakaoMap().catch(() => { mapEl.innerHTML = ''; return libreMap(); })
    .then(g => { map = g; setTimeout(drawGuBubbles, 600); mapEl.classList.toggle('kakao', !!g.kakao); const zc = z => { mapEl.classList.toggle('far', z < 12); mapEl.classList.toggle('mid', z < 14); mapEl.classList.toggle('near', z >= 16); }; g.onZoom(zc); zc(g.zoom()); /* 멀리서 보면 말풍선을 숨기고, 조금 멀면 가격만 */ draw(); if (!openShared() && items.length) fit(); })
    .catch(() => { mapEl.innerHTML = '<p class="re-off">지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; });
  const flyTo = (lat, lng, zoom) => map && map.fly(lat, lng, zoom);
  window.donsemMapApi = () => map; window.donsemMapEnter = () => { if (!full) enter(); }; // 재건축·재개발 구역 칠하기(redev.js)에서 써요
  window.donsemMapGo = (lat, lng) => { const was = full; if (!was) enter(); setTimeout(() => flyTo(lat, lng, 15), was ? 0 : 120); }; // 재건축 정보표에서 큰 지도로
  const fit = () => { if (map && items.length) map.fit(items); };

  // ── 핀과 목록 ──
  const pinEl = x => { const el = document.createElement('div'); el.className = 're-pin'; el.innerHTML = `<span class="k-${x.kind}">${x.kind === 'rent' ? '월' : x.kind === 'jeonse' ? '전' : '매'}</span><b>${esc(man(x.price).replace(' 원', ''))}</b>`; el.addEventListener('click', ev => { ev.stopPropagation(); focus(x.id); }); return el; };
  function draw() {
    if (map) { marks.forEach(m => m.remove()); marks = items.map(x => map.pin(x.lat, x.lng, pinEl(x))); }
    $('re-list').innerHTML = items.length ? items.map(x => `<li class="re-item" id="re-${x.id}"><div class="re-top"><b>${esc(x.name || '내가 고른 곳')}</b><button type="button" class="re-del" data-del="${x.id}" aria-label="지우기">×</button></div>
      <p class="re-price">${priceText(x)}</p>${x.memo ? `<p class="re-memo">${esc(x.memo)}</p>` : ''}
      <div class="re-acts">${x.kind === 'buy' ? `<a href="/acquisition-tax/?at_price=${x.price}">취득세</a>` : ''}<a href="/brokerage-fee/?bf_kind=${x.kind}&bf_amt=${x.price}${x.kind === 'rent' ? `&bf_rent=${x.rent || 0}` : ''}">중개수수료</a>${x.kind === 'buy' ? '<a href="/loan/">대출 이자</a>' : '<a href="/rent/">전월세 전환</a>'}<a href="${naverAt(x.lat, x.lng)}" target="_blank" rel="noopener">이 근처 시세 ↗</a><button type="button" data-go="${x.id}">지도에서 보기</button></div></li>`).join('')
      : '<li class="re-empty">아직 관심 부동산이 없어요. 위에서 아파트 이름이나 주소를 찾거나, 지도를 크게 열고 눌러서 핀을 꽂아 보세요.</li>';
    $('re-count').textContent = items.length ? `${items.length}곳` : '';
  }
  function focus(id) {
    const x = items.find(i => i.id === id); if (!x) return;
    flyTo(x.lat, x.lng, 16);
    const el = $('re-' + id); if (el && !full) { el.classList.add('hl'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); setTimeout(() => el.classList.remove('hl'), 1400); }
  }

  // ── 전체화면 (네이버지도처럼: 위에 검색·칩, 아래에 실거래 시트) ──
  const wrap = $('re-mapwrap'), spots = {};
  const park = id => { const el = $(id); if (!el) return; spots[id] = document.createComment(id); el.before(spots[id]); return el; };
  function enter() {
    if (full) return; full = true;
    [['re-searchbox', 're-fs-top'], ['re-results', 're-fs-top'], ['re-poi', 're-fs-chips'], ['re-gu', 're-fs-chips'], ['re-deals', 're-fs-sheet']].forEach(([id, to]) => { const el = park(id); if (el) $(to).append(el); });
    wrap.classList.add('full'); document.documentElement.classList.add('re-fs-open');
    try { history.pushState({ reFull: 1 }, ''); } catch (e) { /* 괜찮아요 */ }
    setTimeout(() => map && map.resize(), 60);
  }
  function exit(fromPop) {
    if (!full) return; full = false;
    Object.entries(spots).forEach(([id, c]) => { const el = $(id); if (el && c.parentNode) c.replaceWith(el); delete spots[id]; });
    wrap.classList.remove('full'); document.documentElement.classList.remove('re-fs-open');
    clearPick();
    if (!fromPop) try { if (history.state && history.state.reFull) history.back(); } catch (e) { /* 괜찮아요 */ }
    setTimeout(() => map && map.resize(), 60);
  }
  // 폰에서는 아래 실거래 시트만큼 지도를 줄여요 (카카오 로고가 시트에 가리지 않게)
  if (window.ResizeObserver) new ResizeObserver(() => { const h = full && innerWidth < 900 ? $('re-fs-sheet').offsetHeight : 0; if (wrap.style.getPropertyValue('--sh') !== h + 'px') { wrap.style.setProperty('--sh', h + 'px'); if (map) map.resize(); } }).observe($('re-fs-sheet'));
  // 아래 창 끌어내리기 (휴대폰): 손잡이를 아래로 끌면 접혀서 지도가 넓어지고, 위로 끌거나 누르면 다시 펴져요
  const sheetEl = $('re-fs-sheet'), grip = $('fs-grip');
  const peek = on => { sheetEl.classList.toggle('sh-fold', on); grip.setAttribute('aria-expanded', String(!on)); if (!on) sheetEl.scrollTop = 0; };
  let gY = null, gDy = 0;
  grip.addEventListener('pointerdown', e => { gY = e.clientY; gDy = 0; try { grip.setPointerCapture(e.pointerId); } catch (err) { /* 괜찮아요 */ } sheetEl.classList.add('dragging'); });
  grip.addEventListener('pointermove', e => { if (gY === null) return; gDy = e.clientY - gY; const open = !sheetEl.classList.contains('sh-fold'); sheetEl.style.transform = open && gDy > 0 ? `translateY(${gDy}px)` : !open && gDy < 0 ? `translateY(${Math.max(gDy, -40)}px)` : ''; });
  const gEnd = () => { if (gY === null) return; gY = null; sheetEl.classList.remove('dragging'); sheetEl.style.transform = '';
    if (Math.abs(gDy) < 6) peek(!sheetEl.classList.contains('sh-fold')); else if (gDy > 40) peek(true); else if (gDy < -20) peek(false); };
  grip.addEventListener('pointerup', gEnd); grip.addEventListener('pointercancel', gEnd);
  grip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); peek(!sheetEl.classList.contains('sh-fold')); } });
  $('re-expand').addEventListener('click', enter);
  $('re-fs-close').addEventListener('click', () => exit());
  window.addEventListener('popstate', () => exit(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') exit(); });
  $('re-fs-add').addEventListener('click', () => { const p = pending; exit(); if (p) openForm(p); });
  $('re-place').addEventListener('click', e => {
    const a = e.target.closest('[data-pa]'); if (a) { pcData.sel = +a.dataset.pa; return drawArea(); }
    const h = e.target.closest('[data-ph]'); if (h) { const x = poiHere[+h.dataset.ph]; if (x) showPoi(x); return; }
    const b = e.target.closest('[data-pc], [data-pd]'); if (!b) return;
    if (b.dataset.pc === 'share') return shareApt(pending && pending.name);
    if (b.dataset.pc === 'x') { $('re-place').hidden = true; return; } // 마크는 남겨서 다시 누르면 열려요
    if (b.dataset.pc === 'copy') { const a = $('re-place').dataset.addr; return navigator.clipboard ? navigator.clipboard.writeText(a).then(() => toast('주소를 복사했어요.'), () => toast(a)) : toast(a); }
    const p = pending && { ...pending }; if (!p) return;
    if (b.dataset.pd) p.deal = placeDeals[+b.dataset.pd]; // 그 거래 가격으로 채워서 열어요
    exit(); openForm(p);
  });
  $('re-fs-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('이 기기에서는 내 위치를 찾을 수 없어요.');
    navigator.geolocation.getCurrentPosition(p => flyTo(p.coords.latitude, p.coords.longitude, 15), () => toast('위치 권한을 허용하면 내 위치로 가요.'), { timeout: 8000 });
  });
  $('re-fs-zin').addEventListener('click', () => map && map.zoomBy(1));
  $('re-fs-zout').addEventListener('click', () => map && map.zoomBy(-1));
  $('re-fs-star').addEventListener('click', () => { if (items.length) fit(); else toast('아직 관심 부동산이 없어요.'); });

  // ── 주변 생활 시설 (네이버지도 음식점·카페 칩처럼, 집 볼 때 중요한 것만) ──
  // 카카오맵이면 카카오 장소 자료, 아니면 OpenStreetMap(Overpass) 자료를 써요
  // [아이콘, 이름, OpenStreetMap 찾기, 카카오 { c: 분류 코드, k: 검색어(여러 개), keep: 남길 분류, drop: 뺄 분류 }]
  const POI = {
    subway: ['🚇', '지하철역', 'node["railway"="station"]["subway"="yes"];node["station"="subway"];', { c: 'SW8' }],
    bus: ['🚌', '버스정류장', '', { bus: true }],
    school: ['🏫', '학교', 'nwr["amenity"="school"];', { c: 'SC4' }],
    mart: ['🛒', '마트', 'nwr["shop"="supermarket"];', { c: 'MT1', k: ['아울렛'], drop: /편의점/ }],
    conv: ['🏪', '편의점', 'node["shop"="convenience"];', { c: 'CS2' }],
    hospital: ['🏥', '병원', 'nwr["amenity"~"^(hospital|clinic)$"];', { c: 'HP8' }],
    pharmacy: ['💊', '약국', 'node["amenity"="pharmacy"];', { c: 'PM9' }],
    bank: ['🏦', '은행', 'node["amenity"="bank"];', { c: 'BK9', keep: /은행|금융/ }],
    food: ['🍽️', '음식점', 'node["amenity"="restaurant"];', { c: 'FD6' }],
    cafe: ['☕', '카페', 'node["amenity"="cafe"];', { c: 'CE7' }],
    dept: ['🛍️', '백화점', 'nwr["shop"="department_store"];', { k: ['백화점'], kc: /> 백화점/, dn: /주차장|입구|출구|정문|후문|예정\)/ }],
    hotel: ['🏨', '호텔', 'nwr["tourism"="hotel"];', { c: 'AD5', kc: /호텔/, dn: /주차장|입구/ }],
    hair: ['💇', '헤어샵', 'node["shop"="hairdresser"];', { k: ['미용실', '헤어샵'], kc: /미용실|이발|헤어/ }],
    fuel: ['⛽', '주유소', 'nwr["amenity"="fuel"];', { c: 'OL7', keep: /주유소/ }],
    popup: ['✨', '팝업스토어', '', { k: ['팝업스토어', '팝업'], keep: /팝업/, dn: /주차장/ }],
    parking: ['🅿️', '주차장', 'nwr["amenity"="parking"];', { c: 'PK6' }],
    park: ['🌳', '공원', 'nwr["leisure"="park"]["name"];', { k: ['공원'], kc: /공원$/ }],
  };
  // 카카오 장소 찾기: 한 쪽에 15곳씩, max만큼 모아요
  // 카카오가 오류를 주면(등록 안 된 주소 등) 실패로 알려서 OpenStreetMap 자료로 다시 찾게 해요
  const kPlaces = (fn, arg, opt, max = 45) => new Promise((ok, no) => {
    const out = [], ps = new kakao.maps.services.Places(), S = kakao.maps.services.Status;
    ps[fn](arg, (d, st, pg) => { if (st === S.OK) out.push(...d); else if (st !== S.ZERO_RESULT && !out.length) return no(st); if (st === S.OK && pg && pg.hasNextPage && out.length < max) pg.nextPage(); else ok(out.slice(0, max)); }, opt);
  });
  async function overpass(q, [s, w, n, e]) {
    const body = `[out:json][timeout:15];(${q.replace(/;/g, `(${s},${w},${n},${e});`)});out center 80;`;
    for (const u of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) { // 무료 서버가 붐비면 다른 곳에 다시 물어봐요
      try { const r = await fetch(u, { method: 'POST', body: 'data=' + encodeURIComponent(body), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (r.ok) return ((await r.json()).elements || []).filter(x => x.lat || x.center).slice(0, 80).map(x => ({ lat: x.lat || x.center.lat, lng: x.lon || x.center.lon, name: (x.tags && (x.tags['name:ko'] || x.tags.name)) || '' })); } catch (err) { /* 다음 서버 */ }
    }
    throw 0;
  }
  let poiOn = '';
  $('re-poi').innerHTML = Object.entries(POI).map(([k, [i, n]]) => `<button type="button" data-poi="${k}">${i} ${n}</button>`).join('');
  const poiAgain = document.createElement('button'); poiAgain.type = 'button'; poiAgain.className = 're-poi-again'; poiAgain.hidden = true; poiAgain.textContent = '↻ 이 지역에서 다시 찾기';
  $('re-mapwrap').append(poiAgain);
  poiAgain.addEventListener('click', () => poiOn && findPoi(poiOn));
  $('re-poi').addEventListener('click', e => {
    const b = e.target.closest('[data-poi]'); if (!b || !map) return;
    if (poiOn === b.dataset.poi) { poiTok++; poiMarks.forEach(m => m.remove()); poiMarks = []; poiOn = ''; b.classList.remove('on'); poiAgain.hidden = true; return; }
    if (!full) enter(); /* 시설은 큰 지도에서 봐요 */
    $('re-poi').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    map.stop(); if (map.zoom() < 14) map.zoomTo(15); /* 너무 멀면 먼저 동네 크기로 다가가요 */
    setTimeout(() => findPoi(b.dataset.poi), full ? 0 : 200);
  });
  let poiTok = 0;
  async function findPoi(key) {
    poiOn = key; const tok = ++poiTok;
    const [ico, name, q, K] = POI[key], bb = map.bounds();
    let wideHit = false;
    try {
      let found = null;
      if (K.bus) { const c = map.center(), d = await (await fetch(`${TR}near?lat=${c[0]}&lng=${c[1]}&r=500`)).json(); if (d.error) { if (tok === poiTok) toast(d.error === 'api' || d.error === 'nokey' ? '버스 정보 연결을 준비하고 있어요. 조금만 기다려 주세요.' : '지금은 버스 정보를 불러오지 못했어요.'); return; } found = d.list.map(x => ({ lat: x.lat, lng: x.lng, name: x.name, raw: { id: 'bus' + x.ars, place_name: x.name, x: x.lng, y: x.lat, category_name: '교통,수송 > 버스정류장', address_name: `정류장 번호 ${x.ars}`, ars: x.ars } })); }
      else if (map.kakao) {
        const bounds = new kakao.maps.LatLngBounds(new kakao.maps.LatLng(bb[0], bb[1]), new kakao.maps.LatLng(bb[2], bb[3]));
        const run = async opt => { const lists = await Promise.allSettled([...(K.c ? [kPlaces('categorySearch', K.c, opt)] : []), ...(K.k || []).map(w => kPlaces('keywordSearch', w, opt))]);
          if (!lists.some(r => r.status === 'fulfilled')) return null;
          const seen = new Set();
          return lists.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(p => !seen.has(p.id) && seen.add(p.id))
            .filter(p => (!K.keep || K.keep.test(p.category_name + ' ' + p.place_name)) && (!K.kc || K.kc.test(p.category_name)) && (!K.drop || !K.drop.test(p.category_name)) && (!K.dn || !K.dn.test(p.place_name)))
            .map(p => ({ lat: +p.y, lng: +p.x, name: p.place_name, raw: p, d: +p.distance || 0 })); };
        found = await run({ bounds });
        if (found && !found.length) { /* 이 화면에 없으면 지도 가운데에서 5km 안 가까운 곳 */
          const c = map.center(), wide = await run({ location: new kakao.maps.LatLng(c[0], c[1]), radius: 5000, sort: kakao.maps.services.SortBy.DISTANCE });
          if (wide && wide.length) { found = wide.sort((a, b) => a.d - b.d).slice(0, 10); wideHit = true; }
        }
      }
      if (!found && q) found = await overpass(q, bb);
      if (tok !== poiTok) return;
      poiMarks.forEach(m => m.remove()); poiMarks = [];
      if (!found) throw 0;
      poiAgain.hidden = false;
      if (!found.length) return toast(`이 화면에는 ${name}이 없어요. 지도를 옮기고 「다시 찾기」를 눌러 보세요.`);
      poiMarks = found.map(x => { const el = document.createElement('div'); el.className = 're-poi-pin'; el.textContent = ico; el.dataset.n = x.name || name;
        el.addEventListener('click', ev => { ev.stopPropagation(); markTap = Date.now(); document.querySelectorAll('.re-poi-pin.sel').forEach(o => o.classList.remove('sel')); el.classList.add('sel'); if (x.raw) showPoi(x.raw); else { el.classList.toggle('show'); } });
        return map.pin(x.lat, x.lng, el); });
      if (wideHit) { map.fit(found); toast(`이 화면에는 없어서 가까운 ${name} ${found.length}곳을 찾았어요.`); }
      else toast(`${name} ${found.length}곳을 찾았어요. 아이콘을 누르면 자세한 정보가 나와요.`);
    } catch (err) { if (tok === poiTok) toast('지금은 주변 시설을 불러오지 못했어요.'); }
  }
  // ── 장소 정보 창 (카카오맵처럼): 이름·분류·주소·전화·길찾기 ──
  function showPoi(p) {
    lastPoi = p;
    const box = $('re-place'), lat = +p.y, lng = +p.x, cats = (p.category_name || '').split(' > '), cat = cats[cats.length - 1] || '';
    if (/아파트$/.test(p.category_name || '')) return showPlace({ name: p.place_name.replace(/\s*\d+동$/, ''), addr: p.road_address_name || p.address_name, lat, lng, raw: p });
    if (temp) temp.remove();
    temp = map ? map.dot(lat, lng, () => { markTap = Date.now(); if (box.innerHTML) box.hidden = !box.hidden; }) : null; // 고른 곳에 파란 마크
    pending = { name: p.place_name, lat, lng }; placeDeals = []; pcData = null;
    box.dataset.code = p.id || ''; box.dataset.tok = String(Date.now()); box.dataset.addr = p.road_address_name || p.address_name || '';
    $('re-fs-act').hidden = true;
    const c = map && map.center ? map.center() : null;
    const dist = (a, b) => { const R = 6371e3, t = Math.PI / 180, x = (b[1] - a[1]) * t * Math.cos((a[0] + b[0]) / 2 * t), y = (b[0] - a[0]) * t; return Math.round(Math.sqrt(x * x + y * y) * R); };
    const route = `https://map.kakao.com/link/to/${encodeURIComponent(p.place_name)},${lat},${lng}`;
    box.innerHTML = `<div class="pc-h"><div><b>${esc(p.place_name)}</b>${cat ? ` <small>${esc(cat)}</small>` : ''}</div><button type="button" class="pc-x" data-pc="x" aria-label="닫기">×</button></div>
      ${cats.length > 1 ? `<p class="pc-cat">${esc(cats.slice(0, -1).join(' › '))}</p>` : ''}
      <table class="pc-tb">
        <tr><th>주소</th><td>${esc(p.road_address_name || p.address_name || '')}${p.road_address_name && p.address_name ? `<small>지번 ${esc(p.address_name)}</small>` : ''} <button type="button" class="pc-copy" data-pc="copy">복사</button></td></tr>
        ${p.phone ? `<tr><th>전화</th><td><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></td></tr>` : ''}
        ${c ? `<tr><th>거리</th><td>지도 가운데에서 약 ${(d => d >= 1000 ? (d / 1000).toFixed(1) + 'km' : d + 'm')(dist(c, [lat, lng]))}<small>걸어서 약 ${Math.max(1, Math.round(dist(c, [lat, lng]) / 67))}분</small></td></tr>` : ''}
      </table>
      <div class="pc-acts">${p.phone ? `<a class="btn fill" href="tel:${esc(p.phone)}">📞 전화</a>` : ''}<a class="btn ${p.phone ? '' : 'fill'}" href="${route}" target="_blank" rel="noopener">🧭 길찾기</a>${p.place_url ? `<a class="btn" href="${esc(p.place_url)}" target="_blank" rel="noopener">사진·영업시간·리뷰 (카카오맵) ↗</a>` : ''}</div>
      ${p.ars || p.category_group_code === 'SW8' || /지하철|전철역/.test(p.category_name || '') ? '<div id="pc-transit" class="tr-box"><p class="re-empty semi-wait">실시간 도착 정보를 불러오고 있어요</p></div>' : ''}
      <div id="pc-here"></div>
      <p class="re-tip">장소 정보: 카카오</p>`;
    box.hidden = false; peek(false);
    if (document.getElementById('pc-transit')) transitLoad(p, box.dataset.tok);
    const road = p.road_address_name, tok = box.dataset.tok; poiHere = [];
    if (road && map && map.kakao) kPlaces('keywordSearch', road, { location: new kakao.maps.LatLng(lat, lng), radius: 80 }, 30).then(l => { // 같은 건물(같은 도로명 주소)에 있는 다른 곳
      if (box.dataset.tok !== tok) return;
      poiHere = l.filter(x => x.road_address_name === road && x.id !== p.id).slice(0, 12);
      const el = document.getElementById('pc-here'); if (!el || !poiHere.length) return;
      el.innerHTML = `<p class="pc-sub">이 건물에 있는 곳 <small>${poiHere.length}곳</small></p><ul class="dl-list">${poiHere.map((x, i) => `<li><button type="button" data-ph="${i}"><span><b>${esc(x.place_name)}</b><small>${esc((x.category_name || '').split(' > ').pop())}</small></span><em>›</em></button></li>`).join('')}</ul>`;
    }, () => {});
  }
  let poiHere = [];

  // ── 지하철·버스 실시간 도착 (네이버지도처럼: 방면별로 몇 분 뒤 오는지) ──
  const LINE = { 1001: ['1호선', '#0052A4'], 1002: ['2호선', '#00A84D'], 1003: ['3호선', '#EF7C1C'], 1004: ['4호선', '#00A5DE'], 1005: ['5호선', '#996CAC'], 1006: ['6호선', '#CD7C2F'], 1007: ['7호선', '#747F00'], 1008: ['8호선', '#E6186C'], 1009: ['9호선', '#BDB092'], 1061: ['중앙선', '#77C4A3'], 1063: ['경의중앙선', '#77C4A3'], 1065: ['공항철도', '#0090D2'], 1067: ['경춘선', '#0C8E72'], 1075: ['수인분당선', '#F5A200'], 1077: ['신분당선', '#D4003B'], 1081: ['경강선', '#003DA5'], 1092: ['우이신설선', '#B7C452'], 1093: ['서해선', '#8FC31F'], 1032: ['GTX-A', '#9A6292'] };
  const BUS = { 1: ['공항', '#00A0E9'], 2: ['마을', '#53B332'], 3: ['간선', '#0068B7'], 4: ['지선', '#53B332'], 5: ['순환', '#F2B70A'], 6: ['광역', '#E60012'], 7: ['인천', '#0068B7'], 8: ['경기', '#0068B7'], 0: ['공용', '#8e8e93'] };
  const mins = x => x.sec > 0 ? (x.sec < 60 ? '곧 도착' : `${Math.round(x.sec / 60)}분`) : (x.msg || '').replace(/\s*\(.*\)/, '').replace('전역 도착', '전역 도착').replace('당역 도착', '도착') || '정보 없음';
  const busMsg = m => (m || '').replace(/\[차고지출발\]\s*/, '차고지 출발 ').replace(/\[막차\]\s*/, '막차 · ').replace(/\[첫차\]\s*/, '첫차 · ').trim().replace(/\[(\d+)번째 전\]/, ' · $1정류장 전').replace('곧 도착', '곧 도착').replace(/(\d+)분(\d+)초후/, '$1분').replace('운행종료', '운행 끝').replace('출발대기', '출발 기다리는 중').replace(/(\d+)분후/, '$1분 후');
  async function transitLoad(p, tok) {
    const el = () => { const b = $('re-place'); return b.dataset.tok === tok ? document.getElementById('pc-transit') : null; };
    const again = '<button type="button" class="tr-re" data-tr="re">↻ 새로고침</button>';
    try {
      if (p.ars) {
        const d = await (await fetch(`${TR}bus?ars=${encodeURIComponent(p.ars)}`)).json(); const box = el(); if (!box) return;
        if (d.error) { box.innerHTML = `<p class="re-empty">실시간 버스 정보를 준비하고 있어요.</p>`; return; }
        box.innerHTML = `<p class="pc-sub">실시간 버스 <small>서울시 · 정류장 ${esc(p.ars)}</small>${again}</p><ul class="tr-bus">${d.list.map(x => { const t = BUS[x.type] || BUS[0]; return `<li><span class="tr-no" style="color:${t[1]}"><b>${esc(x.no)}</b><small>${t[0]}</small></span><span class="tr-dir">${esc(x.dir || x.next || '')} 방면</span><span class="tr-t"><b>${esc(busMsg(x.m1))}</b><small>${busMsg(x.m2) === busMsg(x.m1) ? '' : esc(busMsg(x.m2))}</small></span></li>`; }).join('') || '<li class="re-empty">지금은 오는 버스가 없어요.</li>'}</ul>`;
      } else {
        const name = (p.place_name || '').replace(/역.*$/, '').trim(), lineNm = ((p.place_name || '').match(/(\d호선|[가-힣]+선)$/) || [])[1];
        const d = await (await fetch(`${TR}subway?name=${encodeURIComponent(name)}`)).json(); const box = el(); if (!box) return;
        if (d.error) { box.innerHTML = `<p class="re-empty">실시간 지하철 정보를 준비하고 있어요.${p.place_url ? ` <a href="${esc(p.place_url)}" target="_blank" rel="noopener">시간표·출구 (카카오맵) ↗</a>` : ''}</p>`; return; }
        let list = d.list; const mine = lineNm && list.filter(x => (LINE[x.line] || [])[0] === lineNm); if (mine && mine.length) list = mine;
        const groups = {}; list.forEach(x => { const k = x.line + '|' + x.dir; (groups[k] = groups[k] || []).push(x); });
        box.innerHTML = `<p class="pc-sub">실시간 도착 <small>서울시 · ${esc(name)}역</small>${again}</p><div class="tr-sub">${Object.values(groups).map(g => { const L = LINE[g[0].line] || ['지하철', '#8e8e93'], side = (g[0].to || '').split(' - ')[1] || g[0].dir; return `<div class="tr-card"><p><i style="background:${L[1]}">${esc(L[0].replace('호선', ''))}</i><b>${esc(side)}</b></p>${g.sort((a, b) => (a.sec || 9e9) - (b.sec || 9e9)).slice(0, 2).map(x => `<div class="tr-row"><span>${esc(x.end)}행${x.exp && x.exp !== '일반' ? ` <em>${esc(x.exp)}</em>` : ''}</span><b>${esc(mins(x))}</b></div>`).join('')}</div>`; }).join('') || '<p class="re-empty">지금은 도착 정보가 없어요.</p>'}</div>`;
      }
    } catch (e) { const box = el(); if (box) box.innerHTML = '<p class="re-empty">지금은 실시간 정보를 불러오지 못했어요.</p>'; }
  }
  $('re-place').addEventListener('click', e => { if (!e.target.closest('[data-tr="re"]')) return; const b = $('re-place'), raw = lastPoi; if (raw) { document.getElementById('pc-transit').innerHTML = '<p class="re-empty semi-wait">도착 정보를 다시 불러오고 있어요</p>'; transitLoad(raw, b.dataset.tok); } });
  let lastPoi = null;

  // ── 주소·아파트 찾기 ──
  // 장소 찾기: 카카오맵이면 카카오 장소 검색(아파트 이름도 잘 찾아요), 아니면 Nominatim
  async function geo(q, n = 6, aptOnly = false) { // aptOnly: 실거래 단지를 찾을 때는 아파트만 (같은 이름 식당 말고)
    if (map && map.kakao) { try { return (await kPlaces('keywordSearch', q, { size: aptOnly ? 15 : Math.min(15, n) }, aptOnly ? 15 : n)).filter(p => !aptOnly || /아파트|주거시설/.test(p.category_name)).sort((a, b) => aptOnly ? /아파트$/.test(b.category_name) - /아파트$/.test(a.category_name) : 0).slice(0, n).map(p => ({ name: p.place_name, addr: p.road_address_name || p.address_name, lat: +p.y, lng: +p.x, raw: p })); } catch (e) { /* 아래 Nominatim으로 */ } }
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=${n}&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
    return (await r.json()).map(p => ({ name: p.name || p.display_name.split(',')[0], addr: p.display_name, lat: +p.lat, lng: +p.lon }));
  }
  async function search(q) {
    const box = $('re-results');
    if (!q.trim()) return;
    box.innerHTML = '<li class="re-empty semi-wait">찾고 있어요</li>';
    try {
      const list = await geo(q);
      box.innerHTML = list.length ? list.map((p, i) => `<li><button type="button" data-pick="${i}"><b>${esc(p.name)}</b><small>${esc(p.addr)}</small></button></li>`).join('')
        : '<li class="re-empty">찾지 못했어요. "서울 송파구 잠실동"처럼 동네 이름으로 찾거나, 지도를 직접 눌러 보세요.</li>';
      box.onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; const p = list[+b.dataset.pick]; box.innerHTML = ''; const was = full; if (!was) enter(); setTimeout(() => flyTo(p.lat, p.lng, 17), was ? 0 : 120); showPlace(p); };
    } catch (e) { box.innerHTML = '<li class="re-empty">지금은 찾기가 안 돼요. 지도를 직접 눌러 핀을 꽂아 보세요.</li>'; }
  }
  $('re-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(e.target.value); } });
  $('re-go').addEventListener('click', () => search($('re-q').value));

  // ── 서울 25개 구 바로가기 ──
  $('re-gu').innerHTML = GU.map(g => `<button type="button" data-gu="${g}">${g}</button>`).join('');
  $('re-gu').addEventListener('click', async e => {
    const b = e.target.closest('[data-gu]'); if (!b) return;
    if (b.classList.contains('on')) { b.classList.remove('on'); $('re-deals').hidden = true; $('re-near').hidden = true; dealGu = ''; clearBubs(); return; } // 한 번 더 누르면 실거래 창을 닫고 지도만
    let c = null; try { c = JSON.parse(localStorage.getItem('donsem:gu:' + b.dataset.gu)); } catch (err) { c = null; }
    if (!c) { try { const p = (await geo(map && map.kakao ? `서울 ${b.dataset.gu}청` : `서울특별시 ${b.dataset.gu}`, 1))[0]; if (p) { c = [p.lat, p.lng]; try { localStorage.setItem('donsem:gu:' + b.dataset.gu, JSON.stringify(c)); } catch (err) { /* 괜찮아요 */ } } } catch (err) { c = null; } }
    if (c) flyTo(c[0], c[1], 13.5); else toast('지금은 그 구로 이동하지 못했어요.');
    $('re-gu').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('re-near').href = c ? naverAt(c[0], c[1]) : '#';
    $('re-near').hidden = !c; $('re-near').textContent = `${b.dataset.gu} 아파트 시세 보기 (네이버 부동산) ↗`;
    deals(b.dataset.gu);
  });

  // ── 구별 최근 실거래가 (국토교통부 공공데이터, 돈셈 카운터 워커가 받아 와요) ──
  let dealGu = '', dealType = 'trade', dealSize = 'all', dealData = { trade: null, rent: null };
  const yms = (k = 2) => { const n = new Date(), a = []; for (let i = 0; i < k; i++) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); a.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`); } return a; };
  const eok = v => { const e = Math.floor(v / 10000), r = v % 10000; return e ? `${e}억${r ? ` ${r.toLocaleString('ko-KR')}` : ''}` : `${v.toLocaleString('ko-KR')}만`; }; // v는 만 원
  const SIZE = { all: ['전체', () => true], s: ['59㎡ 안팎', a => a >= 50 && a < 70], m: ['84㎡ 안팎', a => a >= 76 && a < 90], l: ['100~134㎡', a => a >= 100 && a < 135], xl: ['135~164㎡', a => a >= 135 && a < 165], xxl: ['165㎡ 이상', a => a >= 165] };
  const SORT = { new: '최신순', high: '비싼 순', low: '싼 순' };
  const byDate = (a, b) => (b.y * 1e4 + b.m * 100 + b.d) - (a.y * 1e4 + a.m * 100 + a.d);
  const months = {}; // 같은 구·달·종류는 한 번만 받아요 (목록과 단지 정보 창이 같이 써요)
  const get1 = (gu, ym, type) => fetch(`${API}?lawd=${LAWD[gu]}&ym=${ym}${type === 'rent' ? '&type=rent' : ''}`).then(r => r.ok ? r.json() : null).then(d => d && d.items).catch(() => null);
  const month = (gu, ym, type) => months[gu + ym + type] || (months[gu + ym + type] = get1(gu, ym, type) // 한꺼번에 많이 부르면 가끔 실패해서, 한 번 더 물어봐요
    .then(v => v || new Promise(ok => setTimeout(ok, 600 + Math.random() * 900)).then(() => get1(gu, ym, type))).then(v => { if (!v) delete months[gu + ym + type]; return v; }));
  async function loadDeals(type) {
    const list = await Promise.all(yms().map(ym => month(dealGu, ym, type)));
    if (list.every(x => !x)) return null;
    return list.filter(Boolean).flat().sort(byDate);
  }
  async function deals(gu) {
    if (!LAWD[gu]) return;
    dealGu = gu; dealData = { trade: null, rent: null };
    const box = $('re-deals'); box.hidden = false; peek(false);
    box.innerHTML = `<p class="re-empty semi-wait">${gu} 실거래가를 불러오고 있어요</p>`;
    dealData.trade = await loadDeals('trade');
    drawDeals();
    if (dealGu === gu) drawBubbles(gu, dealData.trade);
  }

  // ── 멀리서 보면 구별 시세 말풍선 (호갱노노처럼 '강남구 26억'): 지난달 매매 가운데 값. 누르면 그 구 실거래가로 ──
  const GU_XY = { 종로구: [37.5735, 126.979], 중구: [37.5641, 126.9979], 용산구: [37.5324, 126.99], 성동구: [37.5634, 127.0369], 광진구: [37.5385, 127.0823], 동대문구: [37.5744, 127.0396], 중랑구: [37.6066, 127.0927], 성북구: [37.5894, 127.0167], 강북구: [37.6397, 127.0256], 도봉구: [37.6688, 127.0471], 노원구: [37.6542, 127.0568], 은평구: [37.6027, 126.9291], 서대문구: [37.5791, 126.9368], 마포구: [37.5663, 126.9019], 양천구: [37.517, 126.8664], 강서구: [37.5509, 126.8495], 구로구: [37.4954, 126.8874], 금천구: [37.4569, 126.8955], 영등포구: [37.5264, 126.8962], 동작구: [37.5124, 126.9393], 관악구: [37.4784, 126.9516], 서초구: [37.4837, 127.0324], 강남구: [37.5172, 127.0473], 송파구: [37.5145, 127.1066], 강동구: [37.5301, 127.1238] }; // 구청 자리
  let guBubs = [];
  async function drawGuBubbles() {
    if (!map) return;
    const d = new Date(), pm = new Date(d.getFullYear(), d.getMonth() - 1, 1), ym = `${pm.getFullYear()}${String(pm.getMonth() + 1).padStart(2, '0')}`;
    const res = await Promise.all(GU.map(async g => ({ g, t: await month(g, ym, 'trade') })));
    guBubs.forEach(b => b.remove()); guBubs = [];
    res.forEach(({ g, t }) => {
      if (!t || !t.length || !GU_XY[g]) return;
      const v = t.map(x => x.amt).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)];
      const el = document.createElement('button'); el.type = 'button'; el.className = 're-gb';
      el.innerHTML = `<small>${g}</small><b>${short(med)}</b>`; el.title = `${g} ${pm.getMonth() + 1}월 아파트 매매 가운데 값 · ${t.length}건`;
      el.addEventListener('click', ev => { ev.stopPropagation(); markTap = Date.now(); if (!full) enter(); const c = $('re-gu').querySelector(`[data-gu="${g}"]`); if (c && !c.classList.contains('on')) c.click(); });
      guBubs.push(map.pin(GU_XY[g][0], GU_XY[g][1], el));
    });
    if (guBubs.length < GU.length && !drawGuBubbles.again) { drawGuBubbles.again = 1; setTimeout(drawGuBubbles, 4000); } // 빠진 구가 있으면 한 번 더
  }

  // ── 지도 위 단지별 실거래가 말풍선 (아파트실거래가 앱처럼 '84㎡ 25억') ──
  // 구를 고르면 최근 2달 매매에서 거래가 많은 단지 30곳을 카카오 장소 검색으로 찾아 붙여요. 찾은 자리는 이 기기에 기억해 둬서 다음엔 바로 떠요
  const XY = 'donsem:aptxy', short = v => v >= 10000 ? `${(v / 10000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, '')}억` : `${v.toLocaleString('ko-KR')}만`;
  let bubs = [], bubTok = 0;
  function clearBubs() { bubs.forEach(b => b.remove()); bubs = []; bubTok++; }
  async function drawBubbles(gu, list) {
    clearBubs(); const tok = bubTok;
    if (!map || !map.kakao || !list || !list.length) return;
    const by = new Map();
    list.forEach(x => { const k = `${x.dong}|${x.apt}`, c = by.get(k); if (c) c.n++; else by.set(k, { k, x, n: 1 }); }); // 최신순이라 처음 것이 가장 최근 거래
    const top = [...by.values()].sort((a, b) => b.n - a.n).slice(0, 30), key = t => `${gu}|${t.k}`;
    let cache = {}; try { cache = JSON.parse(localStorage.getItem(XY)) || {}; } catch (e) { cache = {}; }
    const todo = top.filter(t => !(key(t) in cache));
    for (let i = 0; i < todo.length; i += 5) { // 5곳씩 나눠 찾아요
      await Promise.all(todo.slice(i, i + 5).map(async t => {
        try { const p = (await geo(`${t.x.dong} ${t.x.apt}`, 1, true))[0], r = p && p.raw;
          cache[key(t)] = r && String(r.address_name).includes(gu) ? [p.lat, p.lng, r.id, r.place_name, r.address_name, r.road_address_name || '', r.place_url || ''] : 0; // 다른 구의 같은 이름 단지는 버려요
        } catch (e) { /* 다음에 다시 */ }
      }));
      if (tok !== bubTok) return; // 그사이 다른 구를 골랐어요
    }
    try { localStorage.setItem(XY, JSON.stringify(cache)); } catch (e) { /* 기억 못 해도 괜찮아요 */ }
    top.forEach(t => {
      const c = cache[key(t)]; if (!c) return;
      const el = document.createElement('button'); el.type = 'button'; el.className = 're-bub';
      el.innerHTML = `<small>${esc(t.x.apt.length > 9 ? t.x.apt.slice(0, 9) + '…' : t.x.apt)}</small><b><i>${Math.round(t.x.area)}㎡</i>${short(t.x.amt)}</b>`;
      el.title = `${t.x.apt} · 최근 2달 매매 ${t.n}건`;
      el.addEventListener('click', ev => { ev.stopPropagation(); markTap = Date.now(); if (!full) enter(); showPlace({ name: c[3], lat: c[0], lng: c[1], addr: c[5] || c[4], raw: { id: c[2], place_name: c[3], address_name: c[4], road_address_name: c[5], place_url: c[6], category_name: '부동산 > 주거시설 > 아파트' } }, t.x.apt); });
      bubs.push(map.pin(c[0], c[1], el));
    });
  }
  function drawDeals() {
    const box = $('re-deals'), all = dealData[dealType];
    if (!all) { box.innerHTML = `<p class="re-empty">지금은 실거래가를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.</p>`; return; }
    const list = all.filter(x => SIZE[dealSize][1](x.area) && (dealType === 'trade' || (x.rent ? 1 : 0) === (dealType === 'rent' ? (dealRentMode === 'wol' ? 1 : 0) : 0)));
    if (dealSort !== 'new') list.sort((a, b) => dealSort === 'high' ? b.amt - a.amt || b.rent - a.rent : a.amt - b.amt || a.rent - b.rent);
    const prices = list.map(x => x.amt).sort((a, b) => a - b), mid = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const label = dealType === 'trade' ? '매매' : dealRentMode === 'wol' ? '월세' : '전세';
    box.innerHTML = `<div class="dl-h"><b>${dealGu} 최근 실거래</b><small>국토교통부 · 최근 2달 · 신고 기준</small></div>
      <div class="dl-tabs"><button type="button" class="${dealType === 'trade' ? 'on' : ''}" data-dt="trade">매매</button><button type="button" class="${dealType === 'rent' && dealRentMode !== 'wol' ? 'on' : ''}" data-dt="jeon">전세</button><button type="button" class="${dealType === 'rent' && dealRentMode === 'wol' ? 'on' : ''}" data-dt="wol">월세</button></div>
      <div class="dl-view"><button type="button" class="${dealView === 'list' ? 'on' : ''}" data-dv="list">거래 목록</button><button type="button" class="${dealView === 'rank' ? 'on' : ''}" data-dv="rank">단지별 순위</button></div>
      <div class="dl-size">${Object.entries(SIZE).map(([k, [n]]) => `<button type="button" class="${dealSize === k ? 'on' : ''}" data-ds="${k}">${n}</button>`).join('')}</div>
      ${list.length ? `<div class="dl-bar"><p class="dl-sum">${label} <b>${list.length.toLocaleString('ko-KR')}건</b> · 가운데 값 <b>${eok(mid)}</b>${dealType === 'trade' ? ` · 가장 비싼 거래 <b>${eok(prices[prices.length - 1])}</b>` : ''}</p>
      <select class="dl-sort" aria-label="정렬">${Object.entries(dealView === 'rank' ? { new: '거래 많은 순', high: '비싼 순', low: '싼 순' } : SORT).map(([k, n]) => `<option value="${k}"${dealSort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      ${dealView === 'rank' ? rankHtml(all, list) : `<ul class="dl-list">${list.slice(0, Math.min(dealShown, 30)).map((x, i) => `<li><button type="button" data-di="${all.indexOf(x)}"><span><b>${esc(x.apt)}</b><small>${esc(x.dong)} · 전용 ${Math.round(x.area)}㎡ · ${x.floor}층 · ${x.built}년</small></span><em>${eok(x.amt)}${x.rent ? ` / 월 ${x.rent.toLocaleString("ko-KR")}만` : ''}<small>${x.m}.${x.d}</small></em></button></li>`).join('')}</ul>`}
      ${moreBar(dealView === 'rank' ? Math.min(rankCount(list), 30) : Math.min(list.length, 30))}
      ${dealView === 'list' && list.length > 30 && dealShown >= 30 ? `<p class="re-tip">최근 30건만 보여 드려요. 전체는 <a href="https://rt.molit.go.kr/" target="_blank" rel="noopener">국토부 실거래가 공개시스템 ↗</a>에서 볼 수 있어요.</p>` : ''}`
        : '<p class="re-empty">이 조건의 거래가 아직 없어요. 실거래는 계약 후 30일 안에 신고돼서 이번 달은 적게 보여요.</p>'}`;
  }
  // 단지별 순위 (아파트실거래가 '많이산단지·최고가'처럼): 같은 단지 거래를 모아 건수·최고가·최근 거래로 보여 줘요
  function rankHtml(all, list) {
    const by = new Map();
    [...list].sort(byDate).forEach(x => { const k = `${x.dong}|${x.apt}`, c = by.get(k); if (c) { c.n++; c.max = Math.max(c.max, x.amt); c.min = Math.min(c.min, x.amt); } else by.set(k, { x, n: 1, max: x.amt, min: x.amt }); });
    const rows = [...by.values()].sort((a, b) => dealSort === 'high' ? b.max - a.max : dealSort === 'low' ? a.min - b.min : b.n - a.n || b.max - a.max).slice(0, Math.min(dealShown, 30));
    return `<ol class="dl-list dl-rank">${rows.map((r, i) => `<li><button type="button" data-di="${all.indexOf(r.x)}"><i class="dl-no">${i + 1}</i><span><b>${esc(r.x.apt)}</b><small>${esc(r.x.dong)} · ${r.n}건 · 최근 ${eok(r.x.amt)} (${r.x.m}.${r.x.d})</small></span><em>${eok(dealSort === 'low' ? r.min : r.max)}<small>${dealSort === 'low' ? '가장 싼 거래' : '가장 비싼 거래'}</small></em></button></li>`).join('')}</ol>`;
  }
  let dealRentMode = 'jeon', dealSort = 'new', dealView = 'list';
  // 목록이 너무 길어서 처음엔 5건만, 「더보기」로 10건씩 (재건축 구역 목록처럼)
  let dealShown = 5;
  const rankCount = list => new Set(list.map(x => `${x.dong}|${x.apt}`)).size;
  const moreBar = n => n <= 5 ? '' : `<div class="rd-morebar dl-morebar">${dealShown < n ? `<button type="button" class="rk-more" data-dmore="1">더보기 (${Math.min(10, n - dealShown)}건 더)</button>` : ''}${dealShown > 5 ? '<button type="button" class="rk-more rd-less" data-dless="1">간략히 보기</button>' : ''}</div>`;
  $('re-deals').addEventListener('change', e => { if (e.target.matches('.dl-sort')) { dealSort = e.target.value; dealShown = 5; drawDeals(); } });
  $('re-deals').addEventListener('click', async e => {
    const t = e.target.closest('[data-dt]'), sz = e.target.closest('[data-ds]'), it = e.target.closest('[data-di]');
    if (e.target.closest('[data-dmore]')) { dealShown += 10; return drawDeals(); }
    if (e.target.closest('[data-dless]')) { dealShown = 5; drawDeals(); return $('re-deals').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    if (t || sz || e.target.closest('[data-dv]')) dealShown = 5; // 조건을 바꾸면 다시 5건부터
    if (t) {
      dealType = t.dataset.dt === 'trade' ? 'trade' : 'rent'; dealRentMode = t.dataset.dt === 'wol' ? 'wol' : 'jeon';
      if (dealType === 'rent' && !dealData.rent) { $('re-deals').querySelector('.dl-sum, .dl-list, .re-empty')?.replaceWith(Object.assign(document.createElement('p'), { className: 're-empty semi-wait', textContent: '전월세 실거래를 불러오고 있어요' })); dealData.rent = await loadDeals('rent'); }
      drawDeals();
    }
    if (sz) { dealSize = sz.dataset.ds; drawDeals(); }
    const dv = e.target.closest('[data-dv]'); if (dv) { dealView = dv.dataset.dv; dealSort = 'new'; drawDeals(); }
    if (it) { // 누르면 지도에서 그 단지를 찾아 보여 주고, 관심 부동산에 넣을 수 있게 해요
      const x = dealData[dealType][+it.dataset.di];
      try {
        let p = null, qi = 0; // 단지 이름으로 먼저, 못 찾으면 동네로
        for (const q of [`서울 ${dealGu} ${x.dong} ${x.apt}`, `${x.dong} ${x.apt}`, `서울 ${dealGu} ${x.dong}`]) { p = (await geo(q, 1, qi < 2))[0]; if (p) break; qi++; }
        if (p && qi < 2) { const was = full; if (!was) enter(); setTimeout(() => flyTo(p.lat, p.lng, 17), was ? 0 : 120); return showPlace(p, x.apt); } // 단지를 찾으면 정보 창으로
        if (p) { flyTo(p.lat, p.lng, 16); if (full) { pending = { name: `${x.apt} ${Math.round(x.area)}㎡`, lat: p.lat, lng: p.lng, deal: x }; $('re-fs-act').hidden = false; return; } mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (p) {
          openForm({ name: `${x.apt} ${Math.round(x.area)}㎡`, lat: p.lat, lng: p.lng });
          const k = dealType === 'trade' ? 'buy' : x.rent ? 'rent' : 'jeonse';
          $('re-kind').querySelector(`[data-v="${k}"]`).click();
          $('re-price').value = (x.amt * 10000).toLocaleString('ko-KR'); $('re-rent').value = x.rent ? (x.rent * 10000).toLocaleString('ko-KR') : '';
          $('re-memo').value = `${x.y}.${x.m}.${x.d} 실거래 ${x.floor}층`;
        } else toast('지도에서 위치를 찾지 못했어요.');
      } catch (err) { toast('지금은 위치를 찾지 못했어요.'); }
    }
  });

  // ── 단지 정보 창 (카카오맵 앱처럼 아래에서 올라와요) ──
  // 카카오가 웹사이트에 주는 건 이름·주소·전화·카카오맵 링크까지예요. 사진·세대수 같은 단지정보는 카카오맵 링크로 보여 주고,
  // 돈셈은 국토교통부 실거래 자료로 그 단지의 준공 연도·최근 거래가를 붙여요
  // 단지정보(세대수·동수·주차·난방·시공사…)는 국토교통부 공동주택 자료를 돈셈 카운터 워커가 찾아 줘요. 공공데이터 서버가 가끔 거절해서 한 번 더 물어봐요
  const kaptInfo = async (gu, name, dong) => { for (let i = 0; i < 2; i++) { try { const r = await fetch(`${API.replace('/apt', '/kapt')}?lawd=${LAWD[gu]}&name=${encodeURIComponent(name)}&dong=${encodeURIComponent(dong || '')}`); const d = await r.json(); if (d && d.found) return d; if (d && d.found === false) return null; } catch (e) { /* 다시 */ } await new Promise(ok => setTimeout(ok, 1200)); } return null; };
  const telFmt = v => String(v).replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  const norm = v => String(v).replace(/\(.*?\)|\s|아파트|APT/gi, '');
  let placeDeals = [];
  // ── 최근 본 단지 (아파트실거래가 MY '최근조회'처럼): 정보 창을 연 단지 10곳을 이 기기에 기억해요 ──
  const RR = 'donsem:re-recent', readRecent = () => { try { const v = JSON.parse(localStorage.getItem(RR)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  function saveRecent(r) {
    if (!r || !r.name || !isFinite(r.lat)) return;
    const raw = r.raw || {}, keep = { name: r.name, lat: r.lat, lng: r.lng, addr: r.addr || '', raw: { id: raw.id || '', place_name: raw.place_name || '', address_name: raw.address_name || '', road_address_name: raw.road_address_name || '', place_url: raw.place_url || '', category_name: raw.category_name || '', phone: raw.phone || '' } };
    const list = [keep, ...readRecent().filter(x => x.name !== r.name)].slice(0, 10);
    try { localStorage.setItem(RR, JSON.stringify(list)); } catch (e) { /* 괜찮아요 */ }
    drawRecent();
  }
  function drawRecent() {
    const box = $('re-recent'); if (!box) return;
    const list = readRecent(); box.hidden = !list.length;
    box.innerHTML = list.length ? `<span class="rr-cap">최근 본 단지</span>${list.map((x, i) => `<button type="button" data-rr="${i}">${esc(x.name.replace(/아파트$/, ''))}</button>`).join('')}<button type="button" class="rr-clear" data-rrx="1" aria-label="최근 본 단지 지우기">지우기</button>` : '';
  }
  if ($('re-recent')) $('re-recent').addEventListener('click', e => {
    const b = e.target.closest('[data-rr]'), x = e.target.closest('[data-rrx]');
    if (x) { try { localStorage.removeItem(RR); } catch (err) { /* 괜찮아요 */ } return drawRecent(); }
    if (!b) return;
    const r = readRecent()[+b.dataset.rr]; if (!r) return;
    const was = full; if (!was) enter(); setTimeout(() => flyTo(r.lat, r.lng, 17), was ? 0 : 120); showPlace(r);
  });
  drawRecent();
  async function showPlace(r, aptName) {
    const box = $('re-place'), raw = r.raw || {}, jibun = raw.address_name || r.addr || '', cat = (raw.category_name || '').split(' > ').pop();
    const words = jibun.split(/[\s,]+/), gu = words.find(w => LAWD[w]) || '', dong = gu && raw.address_name ? words[words.indexOf(gu) + 1] : '';
    if (temp) temp.remove(); temp = map ? map.dot(r.lat, r.lng, () => { markTap = Date.now(); if (box.innerHTML) box.hidden = !box.hidden; }) : null; // 파란 마크를 누르면 정보 창이 열리고 닫혀요
    box.dataset.code = raw.id || '';
    pending = { name: r.name, lat: r.lat, lng: r.lng }; placeDeals = []; pcData = null;
    saveRecent(r);
    $('re-fs-act').hidden = true; box.hidden = false; peek(false);
    const tok = String(Date.now()); box.dataset.tok = tok; box.dataset.addr = raw.road_address_name || r.addr || '';
    const head = `<div class="pc-h"><div><b>${esc(r.name)}</b>${cat ? ` <small>${esc(cat)}</small>` : ''}</div><button type="button" class="pc-x" data-pc="x" aria-label="닫기">×</button></div>
      <p class="pc-addr">${esc(raw.road_address_name || r.addr || '')}${raw.road_address_name && raw.address_name ? ` <small>(${esc(raw.address_name.split(' ').slice(2).join(' '))})</small>` : ''} <button type="button" class="pc-copy" data-pc="copy">복사</button></p>
      ${raw.phone ? `<p class="pc-addr"><a href="tel:${esc(raw.phone)}">${esc(raw.phone)}</a></p>` : ''}${window.donsemRedev ? window.donsemRedev.btn(r.name, jibun) : ''}`;
    const acts = `<div class="pc-acts"><button type="button" class="btn fill" data-pc="add">📌 관심 부동산에 넣기</button>${raw.place_url ? `<a class="btn" href="${esc(raw.place_url)}" target="_blank" rel="noopener">사진·단지정보 (카카오맵) ↗</a>` : ''}<a class="btn" href="${naverAt(r.lat, r.lng)}" target="_blank" rel="noopener">시세 (네이버 부동산) ↗</a></div>`;
    const isApt = !raw.category_name || /아파트|주거/.test(raw.category_name);
    if (!gu || !/서울/.test(jibun) || !isApt) { box.innerHTML = head + `<p class="re-tip">실거래가는 서울 아파트만 보여 드려요.</p>` + acts; return; }
    box.innerHTML = head + '<p class="re-empty semi-wait">이 단지 실거래가를 찾고 있어요</p>' + acts;
    const key = norm(aptName || r.name);
    const [tr, rt, k] = await Promise.all([Promise.all(yms(6).map(ym => month(gu, ym, 'trade'))), Promise.all(yms(3).map(ym => month(gu, ym, 'rent'))), kaptInfo(gu, aptName || r.name, dong)]);
    if (box.dataset.tok !== tok) return; // 그사이 다른 곳을 골랐어요
    const mine = l => l.filter(Boolean).flat().filter(x => (!dong || x.dong === dong) && norm(x.apt).length > 1 && (norm(x.apt).includes(key) || key.includes(norm(x.apt)))).sort(byDate);
    const T = mine(tr).map(x => ({ ...x, t: 'trade' })), R = mine(rt), J = R.filter(x => !x.rent), W = R.filter(x => x.rent);
    const range = l => { const v = l.map(x => x.amt), lo = Math.min(...v), hi = Math.max(...v); return lo === hi ? eok(lo) : `${eok(lo)} ~ ${eok(hi)}`; };
    const built = (T[0] || R[0] || {}).built, areas = [...new Set([...T, ...R].map(x => Math.round(x.area)))].sort((a, b) => a - b);
    const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
    placeDeals = T.slice(0, 5);
    { const cnt = {}; [...T, ...J].forEach(x => { const a = Math.round(x.area); cnt[a] = (cnt[a] || 0) + (x.t ? 2 : 1); }); /* 매매 거래가 많은 평형을 먼저 */
      const top = Object.entries(cnt).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([a]) => +a).sort((p, q) => p - q);
      pcData = { T, J, areas: top, sel: top.length > 1 ? +Object.entries(cnt).sort((p, q) => q[1] - p[1])[0][0] : 0 }; }
    const n = v => Number(v).toLocaleString('ko-KR'), use = k && /^\d{6}/.test(k.use) ? `${k.use.slice(0, 4)}년 ${+k.use.slice(4, 6)}월` : '';
    const sz = k ? [['60㎡ 이하', k.sizes.u60], ['60~85㎡', k.sizes.u85], ['85~135㎡', k.sizes.u135], ['135㎡ 초과', k.sizes.o135]].filter(x => x[1]).map(([a, c]) => `${a} ${n(c)}세대`).join(' · ') : '';
    const edu = k ? k.edu.replace(/[^\s()]+\(\s*\)/g, '').replace(/\s+/g, ' ').trim() : '';
    const info = k ? `<p class="pc-sub">단지정보 <small>국토교통부 공동주택 자료</small></p><table class="pc-tb">
      ${k.households ? row('규모', `<b>${n(k.households)}세대</b>${k.dongs ? ` (${k.dongs}개 동)` : ''}`) : ''}
      ${use ? row('준공', use) : ''}
      ${k.builder ? row('시공', esc(k.builder)) : ''}
      ${k.heat || k.hall ? row('난방·구조', esc([k.heat, k.hall].filter(Boolean).join(' · '))) : ''}
      ${k.parking ? row('주차', `${k.households ? `세대당 ${(k.parking / k.households).toFixed(1)}대 ` : ''}<small>총 ${n(k.parking)}대${k.ev ? ` · 전기차 충전기 ${n(k.ev)}대` : ''}</small>`) : ''}
      ${sz ? row('면적별 세대수', `<small class="pc-wrap">전용 ${sz}</small>`) : ''}
      ${k.subway ? row('지하철', `${esc(k.subway)}${k.subwayTime ? `<small>걸어서 ${esc(k.subwayTime)}</small>` : ''}`) : ''}
      ${edu ? row('학교', esc(edu)) : ''}
      ${k.kind || k.sale ? row('형태', esc([k.kind, k.sale].filter(Boolean).join(' · '))) : ''}
      ${k.tel ? row('관리사무소', `<a href="tel:${esc(k.tel)}">${esc(telFmt(k.tel))}</a>`) : ''}</table>` : '';
    box.innerHTML = head + info + (T.length || R.length ? `${k ? '<p class="pc-sub">실거래가 <small>국토교통부</small></p>' : ''}<table class="pc-tb">
      ${T.length ? row('매매 실거래', `<b>${range(T)}</b><small>최근 6달 ${T.length}건</small>`) : ''}
      ${J.length ? row('전세 실거래', `<b>${range(J)}</b><small>최근 3달 ${J.length}건</small>`) : ''}
      ${W.length ? row('월세 실거래', `<b>보증금 ${eok(W[0].amt)} / 월 ${W[0].rent.toLocaleString("ko-KR")}만</b><small>최근 3달 ${W.length}건 · 가장 최근 거래</small>`) : ''}
      ${built && !use ? row('준공', `${built}년`) : ''}
      ${areas.length ? row('거래된 면적', `전용 ${areas.join(' · ')}㎡`) : ''}</table>
      <div id="pc-area"></div>`
      : '<p class="re-tip">최근 6달 동안 신고된 이 단지 거래를 찾지 못했어요. 거래가 없었거나 국토부 자료의 단지 이름이 달라서일 수 있어요.</p>') + acts
      + `<p class="pc-share"><button type="button" class="btn line" data-pc="share">🔗 이 단지 공유하기</button></p>`
      + `<p class="re-tip">${k ? '사진·관리비는 「사진·단지정보 (카카오맵)」에서 볼 수 있어요.' : '사진·세대수·관리비 같은 자세한 단지정보는 「사진·단지정보 (카카오맵)」에서 볼 수 있어요.'} 출처: 국토교통부</p>`;
    drawArea();
  }

  // ── 평형별 시세: 고른 평형의 매매·전세 가운데 값, 전세가율, 3.3㎡당 값, 6달 가격 흐름 ──
  let pcData = null;
  function drawArea() {
    const el = document.getElementById('pc-area'); if (!el || !pcData) return;
    const { T, J, areas, sel } = pcData;
    const near = x => !sel || Math.round(x.area) === sel, Ts = T.filter(near), Js = J.filter(near);
    const md = a => { const v = [...a].sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const mT = md(Ts.map(x => x.amt)), mJ = md(Js.map(x => x.amt)), ratio = mT && mJ ? Math.round(mJ / mT * 100) : 0;
    const chips = areas.length > 1 ? `<div class="pc-areas" role="group" aria-label="평형 고르기"><button type="button" data-pa="0" class="${sel ? '' : 'on'}">전체</button>${areas.map(a => `<button type="button" data-pa="${a}" class="${sel === a ? 'on' : ''}">${a}㎡<small>${Math.round(a * 0.4)}평형</small></button>`).join('')}</div>` : '';
    const stat = (k, v, s) => `<div><small>${k}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const stats = `<div class="pc-stats">${stat('매매 가운데 값', mT ? eok(mT) : '-', Ts.length ? `6달 ${Ts.length}건` : '거래 없음')}${stat('전세 가운데 값', mJ ? eok(mJ) : '-', Js.length ? `3달 ${Js.length}건` : '거래 없음')}${ratio ? stat('전세가율', ratio + '%', ratio >= 80 ? '<a href="/jeonse-check/">높아요 · 전세 안심 진단 ›</a>' : ratio >= 70 ? '조금 높은 편' : '보통') : ''}${sel && mT ? stat('3.3㎡당', eok(Math.round(mT / (sel / 3.3058))), '전용 면적 기준') : ''}</div>`;
    const ms = yms(6).reverse(), pts = ms.map(ym => { const v = Ts.filter(x => x.y === +ym.slice(0, 4) && x.m === +ym.slice(4)).map(x => x.amt); return v.length ? md(v) : null; });
    const have = pts.filter(v => v !== null);
    let spark = '';
    if (have.length >= 2) {
      const lo = Math.min(...have), hi = Math.max(...have), W = 300, H = 70, P = 8;
      const xy = pts.map((v, i) => v === null ? null : [P + i * (W - 2 * P) / (ms.length - 1), hi === lo ? H / 2 : P + (hi - v) * (H - 2 * P) / (hi - lo)]);
      const line = xy.filter(Boolean).map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
      const first = have[0], last = have[have.length - 1], ch = (last - first) / first * 100;
      spark = `<p class="pc-sub">매매 가격 흐름 <small>달마다 가운데 값${sel ? ` · 전용 ${sel}㎡` : ''}</small><em class="pc-ch ${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</em></p>
        <svg class="pc-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="최근 6달 매매 가격 흐름"><polyline points="${line}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${xy.filter(Boolean).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="currentColor"/>`).join('')}</svg>
        <div class="pc-spark-x">${ms.map((ym, i) => `<span>${+ym.slice(4)}월${pts[i] !== null ? `<b>${eok(pts[i])}</b>` : ''}</span>`).join('')}</div>`;
    }
    placeDeals = Ts.slice(0, 5);
    el.innerHTML = chips + stats + spark + (placeDeals.length ? `<p class="pc-sub">최근 매매 · 누르면 그 가격으로 관심 부동산에 넣어요</p><ul class="dl-list">${placeDeals.map((x, i) => `<li><button type="button" data-pd="${i}"><span><b>전용 ${Math.round(x.area)}㎡ · ${x.floor}층</b><small>${x.y}.${x.m}.${x.d}</small></span><em>${eok(x.amt)}</em></button></li>`).join('')}</ul>` : '');
    const on = el.querySelector('.pc-areas .on'); if (on) on.parentElement.scrollLeft = on.offsetLeft - on.parentElement.offsetLeft - on.parentElement.clientWidth / 2 + on.offsetWidth / 2; /* 고른 평형이 보이게 */
  }
  // ── 단지 공유: 링크를 열면 그 단지 정보 창이 바로 열려요 (?apt=단지이름) ──
  function shareApt(name) {
    if (!name) return;
    const url = `${location.origin}/real-estate/?apt=${encodeURIComponent(name)}`, text = `${name} 실거래가 · 돈셈 부동산`;
    if (navigator.share) return navigator.share({ title: text, url }).catch(() => {});
    if (navigator.clipboard) return navigator.clipboard.writeText(url).then(() => toast('링크를 복사했어요. 붙여넣어 보내 주세요.'), () => toast(url));
    toast(url);
  }
  function openShared() {
    const q = new URLSearchParams(location.search).get('apt'); if (!q || q.length > 60) return false;
    $('re-q').value = q;
    geo(q, 6, true).then(l => { const p = l && l[0]; if (!p) return search(q); enter(); setTimeout(() => { flyTo(p.lat, p.lng, 17); showPlace(p); }, 150); }).catch(() => search(q));
    return true;
  }

  // ── 관심 부동산 추가 ──
  function openForm(p) {
    pending = p;
    const f = $('re-form'); f.hidden = false;
    $('re-name').value = p.name || ''; $('re-price').value = ''; $('re-rent').value = ''; $('re-memo').value = '';
    if (p.deal) { const x = p.deal, k = x.rent ? 'rent' : (x.t || dealType) === 'trade' ? 'buy' : 'jeonse'; setTimeout(() => { $('re-kind').querySelector(`[data-v="${k}"]`).click(); $('re-price').value = (x.amt * 10000).toLocaleString('ko-KR'); $('re-rent').value = x.rent ? (x.rent * 10000).toLocaleString('ko-KR') : ''; $('re-memo').value = `${x.y}.${x.m}.${x.d} 실거래 ${x.floor}층`; }, 0); }
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('re-name').focus(), 300);
  }
  $('re-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    kind = b.dataset.v; $('re-kind').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('re-rent-wrap').hidden = kind !== 'rent'; $('re-price-lab').textContent = kind === 'buy' ? '매매가' : '보증금';
  });
  ['re-price', 're-rent'].forEach(id => $(id).addEventListener('input', e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0, 13); e.target.value = d ? Number(d).toLocaleString('ko-KR') : ''; }));
  $('re-cancel').addEventListener('click', () => { $('re-form').hidden = true; pending = null; });
  $('re-save').addEventListener('click', () => {
    if (!pending) return;
    const price = num($('re-price').value);
    if (!price) { toast(kind === 'buy' ? '매매가를 넣어 주세요.' : '보증금을 넣어 주세요.'); return $('re-price').focus(); }
    items.push({ id: Date.now().toString(36), name: $('re-name').value.trim().slice(0, 40) || '내가 고른 곳', lat: pending.lat, lng: pending.lng, kind, price, rent: kind === 'rent' ? num($('re-rent').value) : 0, memo: $('re-memo').value.trim().slice(0, 60) });
    save(); draw(); $('re-form').hidden = true; pending = null;
    toast('관심 부동산에 넣었어요.');
  });
  $('re-list').addEventListener('click', e => {
    const d = e.target.closest('[data-del]'), g = e.target.closest('[data-go]');
    if (g) { focus(g.dataset.go); mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (d && confirm('이 관심 부동산을 지울까요?')) { items = items.filter(x => x.id !== d.dataset.del); save(); draw(); }
  });
  // ── 우리 집, 지금 팔면 얼마일까? (호갱노노 '내집얼마'처럼): 같은 단지·같은 면적의 최근 6달 실거래로 어림해요 ──
  (() => {
    const q = $('mh-q'); if (!q) return;
    const fee = v => { const r = v < 5e7 ? [0.006, 250000] : v < 2e8 ? [0.005, 800000] : v < 9e8 ? [0.004] : v < 12e8 ? [0.005] : v < 15e8 ? [0.006] : [0.007]; return Math.round(Math.min(v * r[0], r[1] || Infinity) * 1.1); }; // 매매 중개보수 상한(2021.10~) + 부가세
    let cur = null, area = 0;
    async function find() {
      const v = q.value.trim(); if (!v) return;
      const box = $('mh-results'); box.innerHTML = '<li class="re-empty semi-wait">찾고 있어요</li>';
      let list = []; try { list = await geo(v, 6, !!(map && map.kakao)); } catch (e) { list = []; }
      list = list.filter(p => /서울/.test((p.raw && p.raw.address_name) || p.addr || ''));
      box.innerHTML = list.length ? list.map((p, i) => `<li><button type="button" data-mh="${i}"><b>${esc(p.name)}</b><small>${esc(p.addr)}</small></button></li>`).join('') : '<li class="re-empty">서울 아파트를 찾지 못했어요. 단지 이름을 다시 확인해 주세요.</li>';
      box.onclick = e => { const b = e.target.closest('[data-mh]'); if (!b) return; box.innerHTML = ''; pick(list[+b.dataset.mh]); };
    }
    async function pick(p) {
      const out = $('mh-out'), raw = p.raw || {}, words = (raw.address_name || p.addr || '').split(/[\s,]+/), gu = words.find(w => LAWD[w]) || '', dong = gu && raw.address_name ? words[words.indexOf(gu) + 1] : '';
      if (!gu) { out.innerHTML = '<p class="re-tip">서울 아파트만 어림할 수 있어요.</p>'; return; }
      out.innerHTML = `<p class="re-empty semi-wait">${esc(p.name)} 실거래를 모으고 있어요</p>`;
      const key = norm(p.name), all = (await Promise.all(yms(6).map(ym => month(gu, ym, 'trade')))).filter(Boolean).flat()
        .filter(x => (!dong || x.dong === dong) && norm(x.apt).length > 1 && (norm(x.apt).includes(key) || key.includes(norm(x.apt)))).sort(byDate);
      if (!all.length) { out.innerHTML = `<p class="re-tip">${esc(p.name)}의 최근 6달 매매 신고를 찾지 못했어요. 거래가 없었거나 국토부 자료의 단지 이름이 달라서일 수 있어요.</p>`; return; }
      const areas = {}; all.forEach(x => { const a = Math.round(x.area); areas[a] = (areas[a] || 0) + 1; });
      cur = { p, all, areas }; area = +Object.entries(areas).sort((a, b) => b[1] - a[1])[0][0]; // 거래가 가장 많은 면적부터
      draw3();
    }
    function draw3() {
      const { p, all, areas } = cur, same = all.filter(x => Math.abs(x.area - area) <= 2), v = same.map(x => x.amt).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)];
      const ago = x => (Date.now() - new Date(x.y, x.m - 1, x.d)) / 864e5, near = same.filter(x => ago(x) <= 90).map(x => x.amt), far = same.filter(x => ago(x) > 90).map(x => x.amt);
      const md = a => { const s2 = [...a].sort((x, y) => x - y); return s2[Math.floor(s2.length / 2)]; };
      const trend = near.length && far.length ? (md(near) - md(far)) / md(far) * 100 : null, won0 = n => `${Math.round(n).toLocaleString('ko-KR')}원`;
      $('mh-out').innerHTML = `<div class="mh-h"><b>${esc(p.name)}</b><button type="button" class="pc-copy" data-mhgo="1">지도에서 보기 ›</button></div>
        <div class="dl-size mh-areas">${Object.keys(areas).map(Number).sort((a, b) => a - b).map(a => `<button type="button" class="${a === area ? 'on' : ''}" data-ma="${a}">전용 ${a}㎡ <small>${areas[a]}건</small></button>`).join('')}</div>
        <div class="mh-big"><small>지금 팔면 약</small><b>${eok(med)}</b>${trend !== null ? `<em class="${trend >= 0 ? 'up' : 'dn'}">3달 전보다 ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%</em>` : ''}</div>
        <table class="pc-tb">
          <tr><th>시세 범위</th><td>${v.length > 1 ? `${eok(v[0])} ~ ${eok(v[v.length - 1])}` : eok(med)}<small>최근 6달 ${v.length}건 가운데 값으로 어림</small></td></tr>
          <tr><th>팔 때 중개수수료</th><td>최대 ${won0(fee(med * 10000))}<small>부가세 포함 · <a href="/brokerage-fee/?bf_kind=buy&bf_amt=${med * 10000}">자세히 계산 ›</a></small></td></tr>
          <tr><th>양도소득세</th><td>1주택·보유 기간에 따라 크게 달라요<small>1세대 1주택을 2년 넘게 가졌다면(살 때 조정대상지역이었으면 2년 거주도) 양도가 12억 원까지는 비과세, 넘는 부분만 세금이에요</small></td></tr></table>
        <p class="pc-sub">최근 거래 · 전용 ${area}㎡ 안팎</p>
        <ul class="dl-list">${same.slice(0, 5).map(x => `<li><button type="button" tabindex="-1"><span><b>${x.floor}층 · 전용 ${Math.round(x.area)}㎡</b><small>${x.y}.${x.m}.${x.d}</small></span><em>${eok(x.amt)}</em></button></li>`).join('')}</ul>
        <p class="re-tip">국토교통부 실거래 신고로 어림한 값이에요. 실제로 팔리는 값은 층·향·집 상태에 따라 달라요.</p>`;
    }
    $('mh-out').addEventListener('click', e => {
      const a = e.target.closest('[data-ma]'), go = e.target.closest('[data-mhgo]');
      if (a) { area = +a.dataset.ma; draw3(); }
      if (go && cur) { const p = cur.p; const was = full; if (!was) enter(); setTimeout(() => flyTo(p.lat, p.lng, 17), was ? 0 : 120); showPlace(p); }
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
    $('mh-go').addEventListener('click', find);
  })();

  // ── 서울 동네 랭킹 (다방 '동네정보 · 거래 랭킹'처럼): 지난달 25개 구 실거래를 모아 줄 세워요. 화면에 보일 때 불러와요 ──
  (() => {
    const card = $('re-rank'); if (!card) return;
    const d = new Date(), pm = new Date(d.getFullYear(), d.getMonth() - 1, 1), ym = `${pm.getFullYear()}${String(pm.getMonth() + 1).padStart(2, '0')}`;
    let view = 'dong', more = false, data = null;
    const MEDAL = ['🥇', '🥈', '🥉'];
    function draw2() {
      if (!data) return;
      const { trades, rents } = data, by = (f) => { const m = new Map(); trades.forEach(x => { const k = f(x); const c = m.get(k) || { k, gu: x.gu, dong: x.dong, n: 0, v: [] }; c.n++; c.v.push(x.amt); m.set(k, c); }); return [...m.values()]; };
      const med = a => { const s2 = [...a].sort((p, q) => p - q); return s2[Math.floor(s2.length / 2)]; };
      let rows;
      if (view === 'gu') rows = by(x => x.gu).sort((a, b) => b.n - a.n).map(r => ({ t: r.gu, s: `가운데 값 ${eok(med(r.v))}`, v: `${r.n.toLocaleString('ko-KR')}건`, gu: r.gu }));
      else if (view === 'price') rows = by(x => x.gu + ' ' + x.dong).filter(r => r.n >= 5).map(r => ({ ...r, m: med(r.v) })).sort((a, b) => b.m - a.m).map(r => ({ t: r.dong, s: `서울 ${r.gu} · ${r.n}건`, v: eok(r.m), gu: r.gu }));
      else rows = by(x => x.gu + ' ' + x.dong).sort((a, b) => b.n - a.n).map(r => ({ t: r.dong, s: `서울 ${r.gu}`, v: `${r.n.toLocaleString('ko-KR')}건`, gu: r.gu }));
      $('rk-list').innerHTML = rows.slice(0, more ? 10 : 5).map((r, i) => `<li><button type="button" data-rkgu="${esc(r.gu)}"><i class="rk-no">${MEDAL[i] || i + 1}</i><span><small>${esc(r.s)}</small><b>${esc(r.t)}</b></span><em>${r.v}</em></button></li>`).join('');
      $('rk-more').hidden = rows.length <= 5; $('rk-more').textContent = more ? '접기' : '더보기';
      if (view === 'price') $('rk-list').insertAdjacentHTML('beforeend', '<li class="rk-note">가운데 값 기준 · 지난달 거래가 5건 이상인 동네만</li>');
    }
    async function load() {
      const res = await Promise.all(GU.map(async g => { const [t, r] = await Promise.all([month(g, ym, 'trade'), month(g, ym, 'rent')]); return { g, t: t || [], r: r || [], ok: !!t }; }));
      const okN = res.filter(x => x.ok).length;
      if (!okN) { $('rk-list').innerHTML = '<li class="re-empty">지금은 랭킹을 불러오지 못했어요. 잠시 뒤 다시 와 주세요.</li>'; return; }
      const trades = res.flatMap(x => x.t.map(i => ({ ...i, gu: x.g }))), rents = res.flatMap(x => x.r);
      data = { trades, rents };
      $('rk-when').textContent = `${pm.getMonth() + 1}월 계약 기준${okN < GU.length ? ` · ${okN}개 구` : ''}`;
      const jeon = rents.filter(x => !x.rent).length, wol = rents.length - jeon, all = trades.length + rents.length || 1, pc = n => Math.round(n / all * 1000) / 10;
      $('rk-share').innerHTML = `<div class="rk-bar"><i style="width:${pc(trades.length)}%" class="t"></i><i style="width:${pc(jeon)}%" class="j"></i><i style="width:${pc(wol)}%" class="w"></i></div>
        <ul class="rk-legend"><li><i class="t"></i>매매 <b>${pc(trades.length)}%</b> <small>${trades.length.toLocaleString('ko-KR')}건</small></li><li><i class="j"></i>전세 <b>${pc(jeon)}%</b> <small>${jeon.toLocaleString('ko-KR')}건</small></li><li><i class="w"></i>월세 <b>${pc(wol)}%</b> <small>${wol.toLocaleString('ko-KR')}건</small></li></ul>`;
      draw2();
    }
    $('rk-tabs').addEventListener('click', e => { const b = e.target.closest('[data-rk]'); if (!b) return; view = b.dataset.rk; more = false; $('rk-tabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw2(); });
    $('rk-more').addEventListener('click', () => { more = !more; draw2(); });
    $('rk-list').addEventListener('click', e => { // 누르면 그 구 실거래가를 지도에
      const b = e.target.closest('[data-rkgu]'); if (!b) return;
      const g = $('re-gu').querySelector(`[data-gu="${b.dataset.rkgu}"]`); if (!g) return;
      if (!g.classList.contains('on')) g.click();
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '300px' }); io.observe(card); } else load();
  })();
  draw();
})();

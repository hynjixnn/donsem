// 돈셈 재건축·재개발 정보: 구역을 누르면 단지 정보표(위에 지도, 아래에 세대수·층수·시공사…)가 열려요
// 자료는 서울시 고시와 뉴스 보도로 직접 확인해서 넣어요. 바뀌면 아래 UPDATED와 RD만 고치면 돼요
(() => {
  const root = document.getElementById('re-redev');
  const UPDATED = '2026년 11월 7일';
  const STEPS = ['구역 지정', '조합 설립', '시공사 선정', '사업시행인가', '관리처분인가', '이주·철거', '착공', '입주'];
  const C = { 대우: '#1b4d9b', 현대: '#d9482b', 삼성: '#1b3f94', GS: '#00796b', DL: '#5b3a8c', 롯데: '#b3202c', 공동: '#2f4858' };
  const GROUPS = ['압구정', '성수', '한남', '강남권', '여의도·목동'];
  const RD = [
    { id: 'ap2', type2: '아파트', brandName: '압구정 현대 (현대건설 제안)', park: '약 5,234대 (정비계획 기준)', g: '압구정', short: '2구역', name: '압구정 2구역', kind: '재건축', c: C.현대, addr: '서울 강남구 압구정동 434', addrText: '서울특별시 강남구 압구정동 434 일대', dong: '압구정동',
      before: '신현대 9·11·12차', beforeN: '1,924세대', units: '2,571세대', floors: '지하 5층 ~ 지상 65층', dongs: '14개동', area: '214,345㎡', builder: '현대건설', cost: '2조 7,489억 원', at: 2, stage: '2025년 9월 시공사 선정', move: '미정',
      keys: ['신현대', '현대9차', '현대11차', '현대12차'], src: [['서울시 정비사업 고시', 'https://news.seoul.go.kr/citybuild/archives/531576'], ['한국경제', 'https://www.hankyung.com/amp/2025061840211'], ['스마트투데이', 'https://www.smarttoday.co.kr/ko-kr/articles/92519'], ['서울시 고시 제2025-136호', 'https://urban.seoul.go.kr/UpisArchive/DATA/PM/pdf/11000NTC202504070006/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C_%EC%A0%9C2025-136%ED%98%B8_%EA%B3%A0%EC%8B%9C.pdf']] },
    { id: 'ap3', type2: '아파트', brandName: '압구정 현대 (현대건설 제안)', ll: [37.5329, 127.0281], g: '압구정', short: '3구역', name: '압구정 3구역', kind: '재건축', c: C.현대, addr: '서울 강남구 압구정동 369-1', addrText: '서울특별시 강남구 압구정동 369-1 일대', dong: '압구정동',
      before: '현대 1~7·10·13·14차, 대림빌라트 등', beforeN: '3,934세대', units: '5,175세대', floors: '지상 최고 65층', dongs: '30개동', area: '339,595㎡', builder: '현대건설', cost: '5조 5,610억 원', design: 'RAMSA · 모포시스', at: 2, stage: '2026년 5월 시공사 선정', move: '미정',
      keys: ['구현대', '현대1차', '현대2차', '현대3차', '현대4차', '현대5차', '현대6차', '현대7차', '현대10차', '현대13차', '현대14차', '대림빌라트', '현대빌라트', '대림아크로빌'], src: [['서울시 정비사업 고시', 'https://news.seoul.go.kr/citybuild/archives/531576'], ['한국경제', 'https://www.hankyung.com/article/2026052574847'], ['MTN', 'https://news.mtn.co.kr/news-detail/2026052518134533046']] },
    { id: 'ap4', type2: '아파트', brandName: '컬리넌 (삼성물산)', park: '5,029대 (세대당 3.03대)', g: '압구정', short: '4구역', name: '압구정 4구역', brand: '컬리넌 압구정', kind: '재건축', c: C.삼성, addr: '서울 강남구 압구정동 481', addrText: '서울특별시 강남구 압구정동 481 일대', dong: '압구정동',
      before: '현대 8차, 한양 3·4·6차', beforeN: '1,340세대', units: '1,664세대', floors: '지상 최고 67층', dongs: '8개동 (공사 계약 보도는 9개동)', area: '118,860㎡', builder: '삼성물산', cost: '2조 1,154억 원', at: 2, stage: '2026년 5월 시공사 선정, 8월 공사 계약', plan: '2028년 이주 목표', move: '2035년 1월 목표',
      keys: ['현대8차', '한양3차', '한양4차', '한양6차'], src: [['서울시 정비사업 고시', 'https://news.seoul.go.kr/citybuild/archives/531576'], ['MTN', 'https://news.mtn.co.kr/news-detail/2026083110582568005'], ['이코노미스트', 'https://economist.co.kr/article/view/ecn202605260035'], ['DA그룹 설계 공모', 'https://www.dagroup.kr/inside/competiton.php?ptype=view&idx=1216&page=1&code=competiton'], ['나무위키', 'https://namu.wiki/w/컬리넌%20압구정']] },
    { id: 'ap5', park: '4,202대 (세대당 3.0대)', type2: '주상복합', brandName: '압구정 현대 (현대건설)', dongs: '8개동', g: '압구정', short: '5구역', name: '압구정 5구역', brand: '압구정 현대 갤러리아', kind: '재건축', c: C.현대, addr: '서울 강남구 압구정동 490', addrText: '서울특별시 강남구 압구정동 490 일대', dong: '압구정동',
      before: '한양 1·2차', units: '1,397세대', floors: '지하 5층 ~ 지상 68층', area: '78,987㎡', builder: '현대건설 (지분 70%)', cost: '약 1조 5천억 원 (현대건설 몫 1조 472억 원)', at: 2, stage: '2026년 5월 시공사 선정, 10월 공사 계약', plan: '2027년 사업시행인가, 2028년 관리처분인가 목표', move: '미정',
      keys: ['한양1차', '한양2차'], src: [['서울시 정비사업 고시', 'https://news.seoul.go.kr/citybuild/archives/531576'], ['머니투데이', 'https://www.mt.co.kr/estate/2026/05/30/2026053013404961177'], ['이투데이', 'https://etoday.co.kr/news/view/2641654'], ['뉴시스', 'https://www.newsis.com/view/NISX20260518_0003633898'], ['나무위키', 'https://namu.wiki/w/압구정%20현대%20갤러리아']] },
    { id: 'ss1', park: '세대당 3.05대', type2: '주상복합', brandName: '자이 (GS건설)', dongs: '17개동', ll: [37.5382, 127.0485], g: '성수', short: '1지구', name: '성수전략정비구역 1지구', brand: '리베니크 자이', kind: '재개발', c: C.GS, addr: '서울 성동구 성수동1가 72-10', addrText: '서울특별시 성동구 성수동1가 일대',
      units: '3,014세대', floors: '최고 64~69층 (보도마다 달라요)', builder: 'GS건설', cost: '2조 1,540억 원', at: 2, stage: '2026년 4월 시공사 선정', move: '미정', src: [['MTN', 'https://news.mtn.co.kr/news-detail/2026042519451152950'], ['디벨로퍼뉴스', 'https://www.dpnews.co.kr/news/articleView.html?idxno=1768'], ['나무위키', 'https://namu.wiki/w/리베니크자이']] },
    { id: 'ss2', brand: '아크로 성수', type2: '아파트', brandName: '아크로 (DL이앤씨 제안)', g: '성수', short: '2지구', name: '성수전략정비구역 2지구', kind: '재개발', c: C.DL, addr: '서울 성동구 성수동2가 506', addrText: '서울특별시 성동구 성수동2가 일대',
      units: '약 2,350세대 (제안 기준)', floors: '최고 62층 (제안 기준)', dongs: '9개동 (제안 기준)', builder: 'DL이앤씨 (우선협상대상자)', cost: '약 1조 7,864억 원', at: 1, stage: '2026년 11월 21일 시공사 선정 총회 예정', move: '미정', src: [['아시아투데이', 'https://www.asiatoday.co.kr/kn/view.php?key=20261018010005549'], ['MTN', 'https://news.mtn.co.kr/news-detail/2026090816353962276']] },
    { id: 'ss3', type2: '주상복합', brandName: '래미안 (삼성물산)', g: '성수', short: '3지구', name: '성수전략정비구역 3지구', brand: '래미안 레비르 성수', kind: '재개발', c: C.삼성, addr: '서울 성동구 성수동2가 572-6', addrText: '서울특별시 성동구 성수동2가 일대',
      units: '약 2,200세대', floors: '최고 250m 초고층', dongs: '11개동', builder: '삼성물산', cost: '약 1조 8,275억 원', at: 2, stage: '2026년 9월 시공사 선정', move: '미정', src: [['MTN', 'https://news.mtn.co.kr/news-detail/2026091916154196913'], ['아시아투데이', 'https://www.asiatoday.co.kr/kn/view.php?key=20261018010005549'], ['나무위키', 'https://namu.wiki/w/래미안%20레비르%20성수']] },
    { id: 'ss4', park: '세대당 3.0대', dongs: '7개동', type2: '주상복합', brandName: '르엘 (롯데건설)', g: '성수', short: '4지구', name: '성수전략정비구역 4지구', brand: '성수 르엘 S70', kind: '재개발', c: C.롯데, addr: '서울 성동구 성수동2가 219-4', addrText: '서울특별시 성동구 성수동2가 일대',
      units: '1,439세대', floors: '지하 6층 ~ 지상 64층', builder: '롯데건설', cost: '약 1조 3천억 원대', at: 2, stage: '2026년 7월 시공사 선정', move: '미정', src: [['MTN', 'https://news.mtn.co.kr/news-detail/2026070516423546615'], ['데일리안', 'https://www.dailian.co.kr/news/view/1663554'], ['나무위키', 'https://namu.wiki/w/성수르엘%20S70']] },
    { id: 'hn1', type2: '아직 정해지지 않았어요', brandName: '아직 정해지지 않았어요', g: '한남', short: '1구역', name: '한남 1구역', kind: '재개발', c: C.공동, addr: '서울 용산구 이태원동 730', addrText: '서울특별시 용산구 이태원동 730 일대',
      before: '단독·다세대 주택가, 상가', units: '아직 정해지지 않았어요', floors: '아직 정해지지 않았어요', area: '44,034.94㎡', builder: '아직 정하지 않았어요', at: 0, stage: '2025년 2월 신속통합기획 후보지 선정', plan: '2017년 정비구역 해제 뒤 다시 추진 중', move: '미정',
      src: [['서울시 보도자료', 'https://www.seoul.go.kr/news/news_report.do?nttNo=429742'], ['경향신문', 'https://www.khan.co.kr/article/202502281453001']] },
    { id: 'hn2', ll: [37.53131, 126.99711], type2: '아파트', brandName: '써밋 (대우건설)', dongs: '25개동', park: '3,222대 (세대당 2.16대)', g: '한남', short: '2구역', name: '한남 2구역', brand: '한남 써밋', kind: '재개발', c: C.대우, addr: '서울 용산구 보광동 272-3', addrText: '서울특별시 용산구 보광동 272-3 일대',
      units: '1,311세대 (공공주택 197세대 포함)', floors: '지하 6층 ~ 지상 15층', builder: '대우건설', at: 5, stage: '2026년 1월 이주 시작', plan: '2026년 5월 재정비촉진계획 변경 · 2027년 착공 목표', move: '2031년 예정',
      src: [['서울신문', 'https://m.go.seoul.co.kr/news/2026/05/15/20260515019009'], ['서울신문 (관리처분인가)', 'https://m.go.seoul.co.kr/news/2025/07/25/20250725500103'], ['나무위키', 'https://namu.wiki/w/%ED%95%9C%EB%82%A8%20%EC%8D%A8%EB%B0%8B']] },
    { id: 'hn3', park: '세대당 1.80대', type2: '아파트', brandName: '디에이치 (현대건설)', ll: [37.53436, 127.00016], g: '한남', short: '3구역', name: '한남 3구역', brand: '디에이치 한남', kind: '재개발', c: C.현대, addr: '서울 용산구 한남동 686', addrText: '서울특별시 용산구 한남동 686 일대',
      units: '5,988세대', floors: '지하 7층 ~ 지상 22층', dongs: '127개동', builder: '현대건설', at: 5, stage: '이주 완료, 철거 막바지', plan: '2027년 일반분양 추진', move: '미정', src: [['대한경제', 'https://www.dnews.co.kr/uhtml/view.jsp?idxno=202604301926138690361'], ['머니투데이', 'https://www.mt.co.kr/estate/2026/09/16/2026091612191969761'], ['나무위키', 'https://namu.wiki/w/디에이치%20한남']] },
    { id: 'hn4', park: '세대당 2.05대', type2: '아파트', brandName: '래미안 (삼성물산)', g: '한남', short: '4구역', name: '한남 4구역', brand: '래미안 글로우 힐즈 한남', kind: '재개발', c: C.삼성, addr: '서울 용산구 보광동 360', addrText: '서울특별시 용산구 보광동 360 일대',
      units: '2,331세대 (공공주택 350세대 포함)', floors: '지하 7층 ~ 지상 22층', dongs: '35개동', builder: '삼성물산', cost: '1조 5,695억 원', at: 3, stage: '2025년 11월 사업시행인가', plan: '관리처분인가 준비 중', move: '미정', src: [['머니투데이', 'https://www.mt.co.kr/estate/2026/09/16/2026091612191969761'], ['네이트 뉴스', 'https://news.nate.com/view/20251114n15469'], ['나무위키', 'https://namu.wiki/w/래미안%20글로우힐즈%20한남']] },
    { id: 'hn5', park: '5,400대 (세대당 2.25대)', type2: '주상복합', brandName: '아크로 (DL이앤씨)', ll: [37.52249, 126.99622], g: '한남', short: '5구역', name: '한남 5구역', brand: '아크로 한남', kind: '재개발', c: C.DL, addr: '서울 용산구 동빙고동 60', addrText: '서울특별시 용산구 동빙고동 60 일대',
      units: '2,592세대 (임대 390세대 포함)', floors: '지하 6층 ~ 지상 23층', dongs: '44개동', builder: 'DL이앤씨', at: 3, stage: '2026년 사업시행인가', move: '미정', src: [['한국주택경제', 'https://www.arunews.com/news/articleView.html?idxno=62296'], ['머니투데이', 'https://www.mt.co.kr/estate/2026/09/16/2026091612191969761'], ['나무위키', 'https://namu.wiki/w/아크로%20한남']] },
    { id: 'em', type2: '아파트', brandName: '아직 정해지지 않았어요', g: '강남권', short: '은마', name: '대치 은마아파트', kind: '재건축', c: C.공동, addr: '서울 강남구 대치동 316', addrText: '서울특별시 강남구 대치동 316 일대', dong: '대치동',
      before: '은마아파트', beforeN: '4,424세대', units: '5,850세대 (공공임대 909세대 포함)', floors: '지하 6층 ~ 지상 49층', dongs: '29개동', area: '243,552.6㎡ (대지)', builder: '삼성물산 · GS건설', at: 3, stage: '2026년 7월 사업시행인가', plan: '2028년 착공 목표', move: '미정',
      keys: ['은마'], src: [['한국경제', 'https://www.hankyung.com/article/202607021829i'], ['파이낸셜뉴스', 'https://www.fnnews.com/news/202607021353273341'], ['뉴데일리', 'https://biz.newdaily.co.kr/site/data/html/2026/07/09/2026070900109.html']] },
    { id: 'js5', park: '13,168대 (세대당 약 2.0대)', type2: '아파트', brandName: '래미안 · 자이 · 아이파크 (3사 공동)', dongs: '32개동', g: '강남권', short: '잠실주공5', name: '잠실주공 5단지', kind: '재건축', c: C.공동, addr: '서울 송파구 잠실동 27', addrText: '서울특별시 송파구 잠실동 일대', dong: '잠실동',
      before: '잠실주공 5단지', beforeN: '3,930세대', units: '6,411세대', floors: '지하 4층 ~ 지상 65층', area: '358,077㎡', builder: '삼성물산 · GS건설 · HDC현대산업개발', at: 3, stage: '2026년 7월 사업시행인가', plan: '2027년 관리처분인가 신청 예정', move: '미정',
      keys: ['잠실주공5', '주공아파트5단지'], src: [['에너지경제', 'https://m.ekn.kr/view.php?key=20260701024477940'], ['재경일보', 'https://news.jkn.co.kr/post/1054106'], ['서울경제', 'https://www.sedaily.com/article/14081119'], ['나무위키', 'https://namu.wiki/w/빌%20라디우스%20잠실']] },
    { id: 'bp', park: '12,091대 (세대당 2.41대)', type2: '아파트', brandName: '디에이치 (현대건설)', g: '강남권', short: '반포주공1', name: '반포주공 1단지 1·2·4주구', brand: '디에이치 반포124', kind: '재건축', c: C.현대, addr: '서울 서초구 반포동 810', addrText: '서울특별시 서초구 반포동 일대', dong: '반포동',
      before: '반포주공 1단지 1·2·4주구', units: '5,007세대 (일반분양 1,832세대)', floors: '지하 5층 ~ 지상 35층', dongs: '50개동', builder: '현대건설', at: 6, stage: '공사 중', plan: '일반분양 준비 중', move: '2027년 말 목표',
      keys: ['반포주공1', '디에이치클래스트', '디에이치반포'], src: [['한국경제', 'https://www.hankyung.com/article/2026101394701'], ['뉴스핌', 'https://www.newspim.com/news/view/20261012000640'], ['나무위키', 'https://namu.wiki/w/디에이치%20반포124']] },
    { id: 'ys', type2: '아파트', brandName: '래미안 (삼성물산)', g: '여의도·목동', short: '시범', name: '여의도 시범아파트', brand: '래미안 소넬리', kind: '재건축', c: C.삼성, addr: '서울 영등포구 여의도동 50', addrText: '서울특별시 영등포구 여의도동 일대', dong: '여의도동',
      before: '시범아파트', units: '2,491세대 (공공임대 344세대 포함)', floors: '지하 6층 ~ 지상 59층', builder: '삼성물산', cost: '2조 2,685억 원', at: 3, stage: '2026년 10월 사업시행인가·시공사 선정', plan: '2029년 착공 제시', move: '미정',
      keys: ['시범'], src: [['파이낸셜뉴스', 'https://www.fnnews.com/news/202610190907596825'], ['네이트 뉴스', 'https://m.news.nate.com/view/20261020n22011']] },
    { id: 'yh', type2: '아파트', brandName: '디에이치 (현대건설)', ll: [37.52147, 126.9325], g: '여의도·목동', short: '한양', name: '여의도 한양아파트', brand: '디에이치 여의도퍼스트', kind: '재건축', c: '#141414', addr: '서울 영등포구 여의도동 42', addrText: '서울특별시 영등포구 여의도동 42', dong: '여의도동',
      before: '한양아파트', beforeN: '588세대', units: '아파트 992세대, 오피스텔 60실', floors: '지하 5층 ~ 지상 57층', dongs: '4개동', park: '2,152대 (세대당 1.9대)', builder: '현대건설', cost: '협의 중 (현대건설이 약 1,206억 원 증액 요청)', at: 3, stage: '2025년 10월 사업시행인가', plan: '공사비 협의 후 착공', move: '2032년 7월 예정',
      keys: ['한양', '여의도한양', '디에이치 여의도'], src: [['나무위키', 'https://namu.wiki/w/%EB%94%94%EC%97%90%EC%9D%B4%EC%B9%98%20%EC%97%AC%EC%9D%98%EB%8F%84%ED%8D%BC%EC%8A%A4%ED%8A%B8'], ['뉴스토마토', 'https://www.newstomato.com/ReadNews.aspx?no=1284620'], ['스마트투데이', 'https://www.smarttoday.co.kr/ko-kr/articles/110766']] },
    { id: 'md6', type2: '아파트', brandName: '아크로 (DL이앤씨)', ll: [37.5347, 126.8848], g: '여의도·목동', short: '목동6', name: '목동 6단지', brand: '아크로 목동 리젠시', kind: '재건축', c: C.DL, addr: '서울 양천구 목동 911', addrText: '서울특별시 양천구 목동 일대', dong: '목동',
      before: '목동신시가지 6단지', units: '2,173세대', floors: '지하 2층 ~ 지상 49층', dongs: '14개동', builder: 'DL이앤씨', cost: '1조 2,868억 원', at: 2, stage: '2026년 6월 시공사 선정', move: '미정',
      keys: ['신시가지6단지', '목동6단지'], src: [['서울경제', 'https://www.sedaily.com/article/20060867'], ['핀포인트뉴스', 'https://www.pinpointnews.co.kr/news/articleView.html?idxno=463589']] },
  ];
  const CODE = { hn2: '2476', ap2: '1003', ap3: '1004', ap4: '1005', ap5: '1006', ss1: '1220', ss2: '1221', ss3: '1222', ss4: '1223', hn3: '2477', hn4: '2478', hn5: '2479', em: '1007', js5: '1342', bp: '1303', ys: '1822', md6: '2608', yh: '1824' }; // 서울시 자료의 구역 번호
  const BY_CODE = Object.fromEntries(Object.entries(CODE).map(([id, c]) => [c, id]));
  // 서울 전체 구역은 서울 열린데이터광장 '도시정비사업 통계' 파일을 redev-seoul.json으로 바꿔서 써요 (분기마다 새 파일이 나와요)
  const PSTEPS = ['구역 지정', '추진위', '조합 설립', '건축심의', '사업시행인가', '관리처분인가', '착공'];
  const PAT = { 구역지정: 0, 추진위: 1, 조합설립: 2, 건축심의: 3, 사업시행: 4, 관리처분: 5, 착공: 6 };
  let allP = null, asof = '';
  const loadAll = () => allP || (allP = fetch('/redev-seoul.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => { asof = d.asof; return d.rows; }).catch(e => { allP = null; throw e; }));
  const num = n => Number(n).toLocaleString('ko-KR');
  const toX = r => { const [c, gu, name, addr, road, type, stage, before, units, sale, rent, d, ll] = r; return { pub: true, id: 'c' + c, name, kind: /재개발/.test(type) ? '재개발' : '재건축', type, c: '#17408b', ll, addr: `서울 ${gu} ${addr}`, addrText: `서울특별시 ${gu} ${addr}`, road, before, units, sale, rent, d, at: PAT[stage] ?? 0, steps: PSTEPS, gu }; };
  const NA = '아직 공개되지 않았어요';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').replace(/[\s·()\-]/g, '').replace(/아파트$/, '');
  const say = m => { if (typeof toast === 'function') toast(m); };

  // 지도에서 고른 아파트가 재건축 구역이면 단지 창에 버튼을 보여 줘요
  const match = (name, addr) => { const n = norm(name); return RD.find(x => x.keys && (!x.dong || String(addr || '').includes(x.dong)) && x.keys.some(k => n.includes(k))); };
  window.donsemRedev = { btn: (name, addr) => { const x = match(name, addr); return x ? `<button type="button" class="rd-link" data-rd="${x.id}">🏗️ ${esc(x.name)} ${x.kind} 정보 보기 ›</button>` : ''; } };

  // ── 정보표 창 ──
  const row = (k, v) => v ? `<tr><th scope="row">${k}</th><td>${v}</td></tr>` : '';
  const stepsHtml = x => `<ol class="rd-steps" style="--n:${(x.steps || STEPS).length}" aria-label="진행 단계">${(x.steps || STEPS).map((s, i) => `<li class="${i < x.at ? 'done' : i === x.at ? 'now' : ''}"${i === x.at ? ' aria-current="step"' : ''}><i></i><span>${s}</span></li>`).join('')}</ol>`;
  const pubRows = x => `${row('종류', esc(x.type))}${row('주소', esc(x.addrText))}${row('도로명', x.road && esc(x.road))}${row('기존 가구', x.before ? `${num(x.before)}가구` : '')}${row('세대수', x.units ? `<b>${num(x.units)}세대</b><small>분양 ${num(x.sale)} · 임대 ${num(x.rent)}</small>` : '아직 정해지지 않았어요')}${row('진행', `<b>${esc(PSTEPS[x.at])} 단계</b>`)}${PSTEPS.map((s, i) => row(s, x.d[i] && esc(x.d[i]))).join('')}`;
  const pubSheet = x => `<div class="rd-box" style="--rd:${x.c}">
      <header class="rd-head"><span class="rd-kind">${x.kind}</span><div><b>${esc(x.name)}</b><small>${esc(x.gu)}</small></div></header>
      <div class="rd-map" id="rd-map"><a class="rd-mapa" id="rd-mapa" href="https://map.kakao.com/?q=${encodeURIComponent(x.addr)}" target="_blank" rel="noopener">지도 ↗</a></div>
      <table class="rd-tb"><tbody>${pubRows(x)}</tbody></table>
    </div>
    ${stepsHtml(x)}
    <div class="rd-biz-slot" data-code="${x.pub ? x.id.slice(1) : CODE[x.id] || ''}"></div>
    <div class="rd-acts"><button type="button" class="btn fill" data-rdgo="1">돈셈 지도에서 보기</button><a class="btn" href="https://search.naver.com/search.naver?where=news&amp;sort=1&amp;query=${encodeURIComponent(x.name + ' ' + x.kind)}" target="_blank" rel="noopener">최신 뉴스 ↗</a><button type="button" class="btn" data-rdshare="1">링크 복사</button></div>
    <p class="rd-note">서울시가 ${esc(asof)} 말 기준으로 정리한 자료예요. 그 뒤 진행된 내용은 빠져 있을 수 있고, 시공사는 이 자료에 없어요. 계약이나 투자 전에는 <a href="https://cleanup.seoul.go.kr/" target="_blank" rel="noopener">정비사업 정보몽땅</a>과 조합 공고를 꼭 확인해 주세요.</p>
    <p class="rd-src">출처 <a href="https://data.seoul.go.kr/dataList/OA-22856/F/1/datasetView.do" target="_blank" rel="noopener">서울 열린데이터광장 도시정비사업 통계</a></p>`;
  const sheet = x => `<div class="rd-box" style="--rd:${x.c}">
      <header class="rd-head"><span class="rd-kind">${x.kind}</span><div><b>${esc(x.brand || x.name)}</b><small>${esc(x.brand ? x.name : x.addrText.replace('서울특별시 ', ''))}</small></div></header>
      <div class="rd-map" id="rd-map"><a class="rd-mapa" id="rd-mapa" href="https://map.kakao.com/?q=${encodeURIComponent(x.addr)}" target="_blank" rel="noopener">지도 ↗</a></div>
      <table class="rd-tb"><tbody>
        ${row('종류', esc(x.type2 || '아파트'))}
        ${row('브랜드', esc(x.brandName || '아직 정해지지 않았어요'))}
        ${row('주소', esc(x.addrText))}
        ${row('입주', esc(x.move))}
        ${row('기존 단지', x.before && `${esc(x.before)}${x.beforeN ? ` <small>${esc(x.beforeN)}</small>` : ''}`)}
        ${row('동수', esc(x.dongs || NA))}
        ${row('층수', esc(x.floors))}
        ${row('세대수', esc(x.units))}
        ${row('면적', x.area && esc(x.area))}
        ${row('주차대수', esc(x.park || NA))}
        ${row('설계', x.design && esc(x.design))}
        ${row('시공', esc(x.builder))}
        ${row('공사비', x.cost && esc(x.cost))}
        ${row('진행', `<b>${esc(x.stage)}</b>${x.plan ? `<small>${esc(x.plan)}</small>` : ''}`)}
      </tbody></table>
    </div>
    ${stepsHtml(x)}
    <div class="rd-biz-slot" data-code="${x.pub ? x.id.slice(1) : CODE[x.id] || ''}"></div>
    <div class="rd-acts"><button type="button" class="btn fill" data-rdgo="1">돈셈 지도에서 보기</button><a class="btn" href="https://search.naver.com/search.naver?where=news&amp;sort=1&amp;query=${encodeURIComponent(x.name + ' ' + x.kind)}" target="_blank" rel="noopener">최신 뉴스 ↗</a><button type="button" class="btn" data-rdshare="1">링크 복사</button></div>
    <p class="rd-note">${x.brand ? '단지 이름은 시공사가 제안한 이름이라 바뀔 수 있어요. ' : ''}세대수·층수는 서울시 고시와 조합·시공사 발표를 전한 보도를 기준으로 했고, 종류·동수·주차대수는 나무위키도 함께 참고했어요. 자료마다 숫자가 조금씩 다를 수 있고, 사업이 진행되면 바뀌어요. 공개되지 않은 칸은 비워 두지 않고 그렇다고 적었어요. 투자나 계약 전에는 조합 공고와 <a href="https://cleanup.seoul.go.kr/" target="_blank" rel="noopener">정비사업 정보몽땅</a>을 꼭 확인해 주세요.</p>
    <p class="rd-src">${UPDATED} 기준 · 출처 ${x.src.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}</p>`;

  let modal = null, cur = null, pos = null, tok = 0;
  const waitKakao = () => new Promise(ok => { let n = 0; const t = setInterval(() => { if (window.kakao && kakao.maps && kakao.maps.Map && kakao.maps.services) { clearInterval(t); ok(true); } else if (++n > 40) { clearInterval(t); ok(false); } }, 250); });
  async function drawMap(x) {
    const my = ++tok, el = document.getElementById('rd-map'); pos = null;
    if (!await waitKakao() || my !== tok) { if (my === tok) el.classList.add('off'); return; }
    const show = (lat, lng) => {
      pos = { lat, lng };
      const ll = new kakao.maps.LatLng(lat, lng), m = new kakao.maps.Map(el, { center: ll, level: 5, draggable: false, scrollwheel: false, disableDoubleClickZoom: true });
      new kakao.maps.Marker({ position: ll }).setMap(m);
      const code = x.pub ? x.id.slice(1) : CODE[x.id]; // 구역 모양이 있으면 작은 지도에도 연보라로 칠해요
      if (code) loadPoly().then(P => { const g = P[code]; if (g && my === tok) new kakao.maps.Polygon({ map: m, path: g.map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(new kakao.maps.LatLng(r[i], r[i + 1])); return a; }), strokeWeight: 2, strokeColor: '#8B5CC9', fillColor: '#C9B3EA', fillOpacity: .45 }); });
      const a = document.getElementById('rd-mapa'); a.href = `https://map.kakao.com/link/map/${encodeURIComponent(x.name)},${lat},${lng}`; el.append(a);
    };
    if (x.ll) return show(x.ll[0], x.ll[1]); // 지번이 지도에서 안 잡히는 구역은 좌표를 직접 넣었어요
    const S = kakao.maps.services;
    new S.Geocoder().addressSearch(x.addr, (r, st) => {
      if (my !== tok) return;
      if (st !== S.Status.OK || !r[0]) return el.classList.add('off');
      show(+r[0].y, +r[0].x);
    });
  }
  async function open(id, push = true) {
    let x = RD.find(r => r.id === id);
    if (!x && /^c\d+$/.test(id)) { try { const r = (await loadAll()).find(y => 'c' + y[0] === id); if (r) x = toX(r); } catch (e) { return say('지금은 구역 정보를 불러오지 못했어요.'); } }
    if (!x) return;
    if (!modal) { modal = document.createElement('div'); modal.className = 'rd-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.innerHTML = '<div class="rd-panel"><button type="button" class="rd-x" aria-label="닫기">×</button><div id="rd-body"></div></div>'; document.body.append(modal); modal.addEventListener('click', onModal); }
    cur = x; modal.setAttribute('aria-label', `${x.name} ${x.kind} 정보`);
    document.getElementById('rd-body').innerHTML = x.pub ? pubSheet(x) : sheet(x);
    modal.hidden = false; modal.scrollTop = 0; document.documentElement.classList.add('rd-open');
    modal.querySelector('.rd-x').focus({ preventScroll: true });
    if (push) try { history.pushState({ rd: id }, ''); } catch (e) { /* 괜찮아요 */ }
    drawMap(x);
    const slot = document.querySelector('#rd-body .rd-biz-slot'); if (slot && slot.dataset.code && window.donsemRedevBiz) window.donsemRedevBiz(slot.dataset.code).then(h => { if (h && slot.isConnected) slot.innerHTML = '<h3 class="rd-h3">사업성 분석</h3>' + h; });
  }
  function close(fromPop) {
    if (!modal || modal.hidden) return;
    tok++; modal.hidden = true; document.documentElement.classList.remove('rd-open');
    if (!fromPop) try { if (history.state && history.state.rd) history.back(); } catch (e) { /* 괜찮아요 */ }
  }
  function onModal(e) {
    if (e.target === modal || e.target.closest('.rd-x')) return close();
    if (e.target.closest('[data-rdgo]')) {
      if (!pos) return say('지도를 불러오는 중이에요. 잠시 뒤에 다시 눌러 주세요.');
      const p = pos; close(); setTimeout(() => window.donsemMapGo && window.donsemMapGo(p.lat, p.lng), 80); return;
    }
    if (e.target.closest('[data-rdshare]')) {
      const u = `${location.origin}/real-estate/?rd=${cur.id}`;
      return navigator.clipboard ? navigator.clipboard.writeText(u).then(() => say('링크를 복사했어요.'), () => say(u)) : say(u);
    }
  }
  addEventListener('popstate', () => { if (modal && !modal.hidden) close(true); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-rd]'); if (b) open(b.dataset.rd); });

  // ── 구역표 ──
  if (root) {
    const tabs = document.getElementById('rd-tabs'), table = document.getElementById('rd-table');
    const cell = x => `<button type="button" data-rd="${x.id}"><b>${esc(x.brand || x.name)}</b><small>${esc(x.units.replace(/ \(.*\)/, ''))} · ${esc(x.builder.replace(/ \(.*\)/, ''))}</small></button>`;
    const draw = g => {
      tabs.innerHTML = GROUPS.map(n => `<button type="button" data-g="${n}"${n === g ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>${n}</button>`).join('');
      table.innerHTML = `<thead><tr><th scope="col">구역</th><th scope="col">기존</th><th scope="col">새 단지</th></tr></thead><tbody>${RD.filter(x => x.g === g).map(x => `<tr><th scope="row">${esc(x.short)}</th><td>${esc(x.before || '단독·다세대 주택가')}</td><td>${cell(x)}</td></tr>`).join('')}</tbody>`;
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) draw(b.dataset.g); });
    draw(GROUPS[0]);
    document.getElementById('rd-when').textContent = `${UPDATED} 기준`;
    const $ = id => document.getElementById(id), list = $('rd-list'), more = $('rd-more');
    let rows = null, shown = 5;
    const sel = (el, first, vals) => { el.innerHTML = `<option value="">${first}</option>` + vals.map(v => `<option>${v}</option>`).join(''); };
    const drawList = () => {
      const q = norm($('rd-q').value), gu = $('rd-gu').value, st = $('rd-st').value, kd = $('rd-kd').value;
      const hit = rows.filter(r => (!gu || r[1] === gu) && (!st || PSTEPS[PAT[r[6]]] === st) && (!kd || /재개발/.test(r[5]) === (kd === '재개발')) && (!q || norm([r[1], r[2], r[3], r[4], (RD.find(x => CODE[x.id] === r[0]) || {}).brand].join('')).includes(q)));
      $('rd-sum').textContent = `${num(hit.length)}곳`;
      list.innerHTML = hit.slice(0, shown).map(r => { const id = BY_CODE[r[0]], x = id && RD.find(y => y.id === id); return `<li><button type="button" data-rd="${id || 'c' + r[0]}"><span><b>${esc(x ? x.brand || x.name : r[2])}</b><small>${esc(r[1])} · ${/재개발/.test(r[5]) ? '재개발' : '재건축'} · ${x ? esc(x.units.replace(/ \(.*\)/, '')) : r[8] ? num(r[8]) + '세대' : '세대수 미정'}</small></span><em>${esc(x ? x.stage.replace(/^\d{4}년 (\d+월(?: \d+일)? )?/, '').split(',')[0] : PSTEPS[PAT[r[6]]])}</em></button></li>`; }).join('') || '<li class="re-empty">찾는 구역이 없어요. 동네 이름으로 찾아보세요.</li>';
      more.hidden = hit.length <= shown; more.textContent = `더보기 (${num(Math.min(20, hit.length - shown))}곳 더)`; $('rd-less').hidden = shown <= 5 || hit.length <= 5;
    };
    const start = () => loadAll().then(r => {
      rows = [...r].sort((a, b) => b[8] - a[8]);
      sel($('rd-gu'), '모든 구', [...new Set(rows.map(x => x[1]))].sort());
      sel($('rd-st'), '모든 단계', PSTEPS); sel($('rd-kd'), '재건축·재개발', ['재건축', '재개발']);
      $('rd-when2').textContent = `서울시 ${asof} 말 기준`; drawList();
    }).catch(() => { list.innerHTML = '<li class="re-empty">지금은 구역 목록을 불러오지 못했어요.</li>'; });
    const reset = () => { if (rows) { shown = 5; drawList(); } };
    ['rd-gu', 'rd-st', 'rd-kd'].forEach(id => $(id).addEventListener('change', reset)); $('rd-q').addEventListener('input', reset);
    more.addEventListener('click', () => { shown += 20; drawList(); });
    $('rd-less').addEventListener('click', () => { shown = 5; drawList(); $('rd-q').scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    if (window.IntersectionObserver) { const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '400px' }); io.observe(root); } else start();
  }
  const q = new URLSearchParams(location.search).get('rd');
  if (q) { const x = RD.find(r => r.id === q); if (x && root) draw0(x); open(q); }
  function draw0(x) { const b = document.querySelector(`#rd-tabs [data-g="${x.g}"]`); if (b) b.click(); }

  // ── 지도에 재건축·재개발 구역 칠하기 (연보라) + 이름·단계 이름표 ──
  // 구역 모양은 OpenStreetMap 단지 경계(ODbL)로 그렸어요. 모양이 없는 구역은 이름표만 보여요
  let polyP = null;
  const loadPoly = () => polyP || (polyP = fetch('/redev-poly.json').then(r => r.json()).then(d => d.p).catch(() => (polyP = null, {})));
  const ST = { line: '#8B5CC9', fill: '#C9B3EA' }, STON = { line: '#5E3290', fill: '#A47FD6', op: .55, w: 2.5 };
  const shortStage = s => ({ 사업시행: '사업시행인가', 관리처분: '관리처분인가', 구역지정: '구역 지정', 조합설립: '조합 설립', 건축심의: '건축심의', 추진위: '추진위 승인', 착공: '착공' })[s] || s;
  // 사업성: 조합원(기존 세대 기준) · 일반분양 · 임대 — 서울시 자료로 어림해요
  const biz = r => { const [, , , , , , , before, units, sale, rent] = r; if (!units || !sale) return null; const mem = Math.min(before || 0, sale), gen = Math.max(sale - mem, 0); return mem ? { units, mem, gen, rent: rent || 0 } : null; };
  const donut = b => { const t = b.mem + b.gen + b.rent, p1 = b.mem / t * 100, p2 = p1 + b.gen / t * 100, pc = v => Math.round(v / t * 100);
    return `<div class="rdz-biz"><div class="rdz-donut" style="background:conic-gradient(#3182F6 0 ${p1}%,#FF9F0A ${p1}% ${p2}%,#34C759 ${p2}% 100%)"><span><b>${num(b.units)}</b>세대</span></div>
      <ul><li><i style="background:#3182F6"></i>조합원<b>${num(b.mem)} <small>${pc(b.mem)}%</small></b></li><li><i style="background:#FF9F0A"></i>일반분양<b>${num(b.gen)} <small>${pc(b.gen)}%</small></b></li><li><i style="background:#34C759"></i>임대<b>${num(b.rent)} <small>${pc(b.rent)}%</small></b></li></ul></div>
      <p class="rdz-bizn">조합원 수는 기존 세대수로 어림했어요. 일반분양이 많을수록 조합원 부담이 줄어요.</p>`; };
  window.donsemRedevBiz = code => loadAll().then(rows => { const r = rows.find(y => y[0] === code); const b = r && biz(r); return b ? donut(b) : ''; });
  const poiBox = document.getElementById('re-poi'), wrapEl = document.getElementById('re-mapwrap');
  if (poiBox && wrapEl) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rdz-btn'; btn.innerHTML = '<i aria-hidden="true"></i>재개발·재건축';
    poiBox.prepend(btn);
    const card = document.createElement('div'); card.className = 'rdz-card'; card.hidden = true; wrapEl.append(card);
    let on = false, shapes = [], chips = [], rows = null, polys = null, sel = '', hooked = false;
    const clear = () => { shapes.forEach(x => x.remove()); chips.forEach(x => x.remove()); shapes = []; chips = []; };
    const pick = code => {
      const r = rows.find(y => y[0] === code); if (!r) return;
      sel = code; drawAll();
      const id = BY_CODE[code], x = id && RD.find(y => y.id === id), b = biz(r), kind = /재개발/.test(r[5]) ? '재개발' : '재건축';
      card.innerHTML = `<button type="button" class="rdz-x" aria-label="닫기">×</button><span class="rdz-tag">${kind}</span><b class="rdz-name">${esc(x ? x.brand || x.name : r[2])}</b>
        <p class="rdz-st">${esc(shortStage(r[6]))}${r[8] ? ` · 총 ${num(r[8])}세대 예정` : ''}</p>${b ? `<p class="rdz-sub">일반분양 ${num(b.gen)}세대 · 일반분양 비율 ${Math.round(b.gen / (b.mem + b.gen + b.rent) * 100)}%</p>` : ''}
        ${b ? donut(b) : ''}<p class="rdz-src">구역 모양 © OpenStreetMap · 구역 정보 서울시 ${esc(asof)} 기준</p><button type="button" class="btn fill wide rdz-go" data-rd="${id || 'c' + code}">상세보기</button>`;
      card.hidden = false;
    };
    const drawAll = () => {
      const m = window.donsemMapApi && window.donsemMapApi(); if (!m || !on || !rows) return;
      clear();
      const z = m.zoom(), [s0, w0, n0, e0] = m.bounds(), inView = ll => ll && ll[0] >= s0 && ll[0] <= n0 && ll[1] >= w0 && ll[1] <= e0;
      if (z < 12) return; // 너무 멀면 서울 전체가 보라색 점투성이라, 동네 크기에서만 보여요
      const vis = rows.filter(r => inView(r[12]) || (polys[r[0]] && polys[r[0]].some(g => inView([g[0], g[1]]))));
      vis.forEach(r => { const g = polys[r[0]]; if (g) shapes.push(m.poly(g, r[0] === sel ? STON : ST, () => pick(r[0]))); });
      if (z < 13.5) return;
      vis.slice(0, 120).forEach(r => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'rdz-chip' + (r[0] === sel ? ' on' : '') + (z < 15.5 ? ' sm' : ''); // 조금 멀면 이름만, 가까이 가면 단계까지
        el.innerHTML = `<b>${esc(r[2].replace(/아파트$/, ''))}</b><span>${esc(shortStage(r[6]))}</span>`;
        el.addEventListener('click', ev => { ev.stopPropagation(); pick(r[0]); });
        chips.push(m.pin(r[12][0], r[12][1], el));
      });
    };
    btn.addEventListener('click', async () => {
      on = !on; btn.classList.toggle('on', on); if (!on) { clear(); card.hidden = true; sel = ''; return; }
      window.donsemMapEnter && window.donsemMapEnter();
      try { [rows, polys] = await Promise.all([loadAll(), loadPoly()]); } catch (e) { on = false; btn.classList.remove('on'); return say('지금은 구역 정보를 불러오지 못했어요.'); }
      const m = window.donsemMapApi && window.donsemMapApi(); if (!m) return;
      if (!hooked) { hooked = true; m.onIdle(() => on && drawAll()); }
      if (m.zoom() < 13.5) m.zoomTo(14.5);
      drawAll(); say('연보라색이 재건축·재개발 구역이에요. 이름표를 누르면 사업성이 나와요.');
    });
    card.addEventListener('click', e => { if (e.target.closest('.rdz-x')) { card.hidden = true; sel = ''; drawAll(); } });
  }
})();

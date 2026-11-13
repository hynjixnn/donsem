// ── 돈셈 브랜드 글꼴: 로고·숫자는 Saira, 배너 큰 영문은 같은 집안의 Saira Stencil (크림처럼 사이트 전체가 한 목소리로) ──
(() => { if (document.getElementById('f-brand')) return; const h = document.head;
  [['preconnect', 'https://fonts.googleapis.com'], ['preconnect', 'https://fonts.gstatic.com']].forEach(([r, u]) => { const l = document.createElement('link'); l.rel = r; l.href = u; if (u.includes('gstatic')) l.crossOrigin = ''; h.append(l); });
  const l = document.createElement('link'); l.id = 'f-brand'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,600;0,700;0,800;1,800;1,900&family=Saira+Stencil+One&display=swap'; h.append(l); })();
const MAX_REC = 1e11; // 가계부·고정지출·자산·목표에 넣을 수 있는 가장 큰 금액 (1,000억 원) — 실수로 0을 많이 눌러도 화면이 망가지지 않게
const won = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') + '원' : '계산할 수 없을 만큼 큰 금액'); // 숫자를 너무 크게 넣어도 '∞원'이 아니라 말로 알려 줘요
const minus = n => (Math.round(n) ? '-' : '') + won(n); // 빼는 돈이 0원이면 '-0원' 대신 '0원'
const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
const val = k => num(document.querySelector(`input[data-k="${k}"]`).value);
const seg = k => document.querySelector(`.seg[data-k="${k}"] .on`).dataset.v;
const rows = list => '<div class="rows">' + list.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + '</div>';

// 기간은 현실적인 최대치까지만 계산해요 (자릿수를 잘못 넣어도 화면이 멈추지 않게): 개월 600(50년), 년 100
function savings() {
  const P = val('s_amt'), n = Math.min(600, Math.floor(val('s_n'))), r = val('s_r') / 100, tax = num(seg('s_tax')) / 100;
  const principal = P * n;
  let interest;
  if (seg('s_type') === 'simple') interest = P * (r / 12) * n * (n + 1) / 2;
  else { interest = 0; for (let k = 1; k <= n; k++) interest += P * (Math.pow(1 + r / 12, k) - 1); }
  const t = Math.floor(interest * tax / 10) * 10;
  document.getElementById('s_out').innerHTML =
    `<div>만기 수령액 (세후)</div><div class="big">${won(principal + interest - t)}</div>` +
    rows([['원금 합계', won(principal)], ['세전 이자', won(interest)], ['이자 과세', minus(t)], ['세후 이자', won(interest - t)]]);
}

function deposit() {
  const A = val('d_amt'), n = Math.min(600, Math.floor(val('d_n'))), r = val('d_r') / 100, tax = num(seg('d_tax')) / 100;
  const interest = seg('d_type') === 'simple' ? A * r * n / 12 : A * (Math.pow(1 + r / 12, n) - 1);
  const t = Math.floor(interest * tax / 10) * 10;
  document.getElementById('d_out').innerHTML =
    `<div>만기 수령액 (세후)</div><div class="big">${won(A + interest - t)}</div>` +
    rows([['원금', won(A)], ['세전 이자', won(interest)], ['이자 과세', minus(t)], ['세후 이자', won(interest - t)]]);
}

function loan() {
  const L = val('l_amt'), n = Math.max(1, Math.min(600, Math.floor(val('l_n')))), i = val('l_r') / 100 / 12, type = seg('l_type');
  let bal = L, total = 0, sched = [];
  const M = i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n));
  for (let m = 1; m <= n; m++) {
    const int = bal * i;
    let prin = type === 'equal' ? M - int : type === 'principal' ? L / n : (m === n ? bal : 0);
    bal -= prin; total += int;
    sched.push([m, prin + int, prin, int, Math.max(0, bal)]);
  }
  const first = sched[0][1], last = sched[n - 1][1];
  const head = type === 'equal' ? `<div>매달 상환액</div><div class="big">${won(M)}</div>`
    : type === 'principal' ? `<div>첫 달 상환액</div><div class="big">${won(first)} <small>→ 마지막 달 ${won(last)}</small></div>`
    : `<div>매달 이자</div><div class="big">${won(L * i)} <small>+ 만기에 원금 ${won(L)}</small></div>`;
  const tr = sched.map(s => `<tr><td>${s[0]}</td><td>${won(s[1])}</td><td>${won(s[2])}</td><td>${won(s[3])}</td><td>${won(s[4])}</td></tr>`).join('');
  document.getElementById('l_out').innerHTML = head +
    rows([['대출 원금', won(L)], ['총 이자', won(total)], ['총 상환액', won(L + total)]]) +
    `<details><summary>월별 상환 스케줄 보기</summary><div class="tbl"><table><tr><th>회차</th><th>상환액</th><th>원금</th><th>이자</th><th>잔액</th></tr>${tr}</table></div></details>`;
}

function compound() {
  const init = val('c_init'), add = val('c_add'), r = val('c_r') / 100, y = Math.min(100, Math.floor(val('c_y')));
  const mr = Math.pow(1 + r, 1 / 12) - 1;
  let v = init, paid = init, tr = '';
  for (let yr = 1; yr <= y; yr++) {
    for (let m = 0; m < 12; m++) { v = v * (1 + mr) + add; paid += add; }
    tr += `<tr><td>${yr}년</td><td>${won(paid)}</td><td>${won(v - paid)}</td><td>${won(v)}</td></tr>`;
  }
  document.getElementById('c_out').innerHTML =
    `<div>${y}년 후 예상 자산</div><div class="big">${won(v)}</div>` +
    rows([['내가 넣은 돈', won(paid)], ['불어난 수익', won(v - paid)], ['수익률', paid && Number.isFinite(v) ? ((v / paid - 1) * 100).toFixed(1) + '%' : '-']]) +
    `<details><summary>연도별 보기</summary><div class="tbl"><table><tr><th>기간</th><th>투자 원금</th><th>수익</th><th>총 자산</th></tr>${tr}</table></div></details>` +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">세금·수수료·물가는 반영하지 않은 단순 계산이에요.</p>`;
}

function severance() {
  const out = document.getElementById('v_out');
  const s = document.querySelector('input[data-k="v_start"]').value, e = document.querySelector('input[data-k="v_end"]').value;
  if (!s || !e) { out.innerHTML = '입사일과 마지막 근무일을 넣어 주세요.'; return; }
  const DAY = 86400000;
  const start = new Date(s + 'T00:00:00Z'), quit = new Date(new Date(e + 'T00:00:00Z').getTime() + DAY); // 퇴직일 = 마지막 근무일 다음 날
  const workDays = Math.round((quit - start) / DAY);
  if (workDays < 365) { out.innerHTML = `<div>재직 기간 <b>${workDays}일</b></div><div class="big">퇴직금 대상 아님</div><p style="font-size:14px;margin:8px 0 0">1년(365일) 이상 일해야 퇴직금을 받을 수 있어요.</p>`; return; }
  const from = new Date(quit); from.setUTCMonth(from.getUTCMonth() - 3);
  const d3 = Math.round((quit - from) / DAY); // 퇴직 전 3개월 달력 일수
  const wages3 = val('v_pay') * 3 + val('v_bonus') * 3 / 12 + val('v_leave') * 3 / 12;
  const daily = wages3 / d3;
  const pay = daily * 30 * workDays / 365;
  const y = Math.floor(workDays / 365);
  out.innerHTML = `<div>예상 퇴직금 (세전)</div><div class="big">${won(pay)}</div>` +
    rows([['재직 기간', `${workDays.toLocaleString('ko-KR')}일 (약 ${y}년)`], ['퇴직 전 3개월 임금', won(wages3)], ['퇴직 전 3개월 일수', d3 + '일'], ['1일 평균임금', won(daily)]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">퇴직소득세는 빠지지 않은 금액이에요. 1일 평균임금이 통상임금보다 적으면 통상임금으로 계산해요.</p>`;
}

function rent() {
  const mode = seg('r_mode'), r = val('r_rate') / 100, out = document.getElementById('r_out');
  document.querySelectorAll('#rent [data-mode]').forEach(d => d.hidden = d.dataset.mode !== mode);
  if (r <= 0) { out.innerHTML = '전환율을 넣어 주세요.'; return; }
  const note = `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">주택은 법으로 전환율 상한이 정해져 있어요 (한국은행 기준금리 + 2%p). 실제 계약 조건은 집주인과 협의해서 정해요.</p>`;
  if (mode === 'toMonthly') {
    const J = val('r_jeonse'), D = val('r_dep1');
    if (D >= J) { out.innerHTML = '월세 보증금이 전세 보증금보다 작아야 해요.'; return; }
    const m = (J - D) * r / 12;
    out.innerHTML = `<div>바꾼 뒤 월세</div><div class="big">${won(m)} <small>/ 월</small></div>` +
      rows([['월세로 바뀌는 금액', won(J - D)], ['보증금', won(D)], ['1년 월세 합계', won(m * 12)]]) + note;
  } else {
    const D = val('r_dep2'), M = val('r_month');
    const j = D + M * 12 / r;
    out.innerHTML = `<div>전세로 바꾸면</div><div class="big">${won(j)}</div>` +
      rows([['지금 보증금', won(D)], ['월세를 보증금으로 환산', won(M * 12 / r)], ['1년 월세 합계', won(M * 12)]]) + note;
  }
}

function vat() {
  const A = val('x_amt'), mode = seg('x_mode');
  // 합계에서 거꾸로 계산할 때는 공급가액을 원 단위로 반올림하고 나머지를 부가세로 봐요
  const supply = mode === 'total' ? Math.round(A / 1.1) : A;
  const tax = mode === 'total' ? A - supply : Math.floor(A * 0.1);
  document.getElementById('x_out').innerHTML =
    `<div>${mode === 'total' ? '공급가액' : '합계금액'}</div><div class="big">${won(mode === 'total' ? supply : supply + tax)}</div>` +
    rows([['공급가액', won(supply)], ['부가세 (10%)', won(tax)], ['합계금액', won(supply + tax)]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">원 단위 처리 방식은 업체마다 조금씩 다를 수 있어요.</p>`;
}

function holidayPay() {
  const wage = val('h_wage'), hours = val('h_hours'), out = document.getElementById('h_out');
  const WEEKS = 365 / 7 / 12; // 한 달 평균 약 4.345주
  if (hours < 15) {
    out.innerHTML = `<div>주휴수당</div><div class="big">0원</div><p style="font-size:14px;margin:8px 0 0">일주일에 15시간 이상 일해야 주휴수당을 받을 수 있어요.</p>` +
      rows([['주급', won(wage * hours)], ['한 달 예상 월급', won(wage * hours * WEEKS)]]);
    return;
  }
  const paidHours = Math.min(hours, 40) / 40 * 8; // 40시간이 넘어도 최대 8시간
  const holiday = paidHours * wage, weekly = wage * hours + holiday;
  out.innerHTML = `<div>일주일 주휴수당</div><div class="big">${won(holiday)}</div>` +
    rows([['주휴시간', paidHours.toFixed(1).replace(/\.0$/, '') + '시간'], ['주급 (주휴수당 포함)', won(weekly)], ['한 달 주휴수당', won(holiday * WEEKS)], ['한 달 예상 월급 (주휴수당 포함)', won(weekly * WEEKS)]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">세금·4대보험은 빠지지 않은 금액이에요. 주 40시간을 넘는 연장근로 수당은 따로 계산해요.</p>`;
}

function prepayment() {
  const out = document.getElementById('p_out');
  const s = document.querySelector('input[data-k="p_start"]').value, e = document.querySelector('input[data-k="p_pay"]').value;
  if (!s || !e) { out.innerHTML = '대출받은 날과 갚는 날을 넣어 주세요.'; return; }
  const DAY = 86400000, start = new Date(s + 'T00:00:00Z'), pay = new Date(e + 'T00:00:00Z');
  if (isNaN(start) || isNaN(pay)) { out.innerHTML = '날짜를 다시 확인해 주세요.'; return; }
  if (val('p_years') > 50) { out.innerHTML = '수수료 부과 기간은 보통 3년이에요. 50년 안으로 넣어 주세요.'; return; } // 너무 큰 숫자는 날짜가 넘쳐서 계산이 멈췄어요
  const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + Math.round(val('p_years') * 12)); // 수수료 부과가 끝나는 날
  const total = Math.round((end - start) / DAY), left = Math.round((end - pay) / DAY);
  if (pay < start) { out.innerHTML = '갚는 날이 대출받은 날보다 뒤여야 해요.'; return; }
  if (total <= 0 || left <= 0) {
    out.innerHTML = `<div>중도상환수수료</div><div class="big">0원</div><p style="font-size:14px;margin:8px 0 0">수수료 내는 기간이 지나서 수수료 없이 갚을 수 있어요.</p>`;
    return;
  }
  const A = val('p_amt'), fee = A * val('p_rate') / 100 * left / total;
  out.innerHTML = `<div>예상 중도상환수수료</div><div class="big">${won(fee)}</div>` +
    rows([['미리 갚을 금액', won(A)], ['수수료 부과 기간', `${total.toLocaleString('ko-KR')}일`], ['남은 일수', `${left.toLocaleString('ko-KR')}일`],
      ['수수료 없어지는 날', end.toISOString().slice(0, 10)]]);
}

function inflation() {
  const A = val('i_amt'), i = val('i_rate') / 100, y = Math.min(100, Math.floor(val('i_y')));
  let tr = '';
  for (let k = 1; k <= y; k++) tr += `<tr><td>${k}년 뒤</td><td>${won(A * Math.pow(1 + i, k))}</td><td>${won(A / Math.pow(1 + i, k))}</td></tr>`;
  const need = A * Math.pow(1 + i, y), worth = A / Math.pow(1 + i, y);
  document.getElementById('i_out').innerHTML =
    `<div>${y}년 뒤 같은 물건을 사려면</div><div class="big">${won(need)}</div>` +
    rows([['지금 금액', won(A)], [`${y}년 뒤 지금 돈의 실제 가치`, won(worth)], ['줄어드는 가치', A ? ((1 - worth / A) * 100).toFixed(1) + '%' : '-']]) +
    `<details><summary>연도별 보기</summary><div class="tbl"><table><tr><th>기간</th><th>필요한 돈</th><th>지금 돈의 가치</th></tr>${tr}</table></div></details>`;
}

function discount() {
  const mode = seg('o_mode'), L = val('o_list'), out = document.getElementById('o_out');
  document.querySelectorAll('#discount [data-mode]').forEach(d => d.hidden = d.dataset.mode !== mode);
  if (L <= 0) { out.innerHTML = '정가를 넣어 주세요.'; return; }
  if (mode === 'price') {
    const r1 = Math.min(val('o_rate'), 100) / 100, r2 = Math.min(val('o_rate2'), 100) / 100;
    const price = L * (1 - r1) * (1 - r2), total = (1 - price / L) * 100;
    out.innerHTML = `<div>할인된 가격</div><div class="big">${won(price)}</div>` +
      rows([['정가', won(L)], ['아낀 금액', won(L - price)], ['정가 기준 총 할인율', total.toFixed(1).replace(/\.0$/, '') + '%']]);
  } else {
    const S = val('o_sale'), rate = (L - S) / L * 100;
    out.innerHTML = `<div>할인율</div><div class="big">${rate.toFixed(1).replace(/\.0$/, '')}%</div>` +
      rows([['정가', won(L)], ['판매가', won(S)], [rate >= 0 ? '아낀 금액' : '더 비싼 금액', won(Math.abs(L - S))]]);
  }
}

function wage() {
  const mode = seg('w_mode'), A = val('w_amt'), w = val('w_hours'), out = document.getElementById('w_out');
  if (w <= 0) { out.innerHTML = '일주일 근무시간을 넣어 주세요.'; return; }
  // 한 달 유급시간 = (주 근무시간 + 주휴시간) × 한 달 평균 주 수. 주 40시간이면 209시간
  const holidayHours = w >= 15 ? Math.min(w, 40) / 40 * 8 : 0;
  const monthHours = Math.round((w + holidayHours) * 365 / 7 / 12);
  const hour = mode === 'hour' ? A : mode === 'month' ? A / monthHours : A / 12 / monthHours;
  const month = hour * monthHours, year = month * 12;
  const label = { hour: ['월급', month], month: ['시급', hour], year: ['시급', hour] }[mode];
  out.innerHTML = `<div>${label[0]} (세전)</div><div class="big">${won(label[1])}</div>` +
    rows([['시급', won(hour)], ['월급', won(month)], ['연봉', won(year)], ['한 달 유급시간', `${monthHours}시간${holidayHours ? ' (주휴 포함)' : ''}`]]) +
    (w < 15 ? `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">주 15시간 미만이라 주휴수당 없이 계산했어요.</p>` : '');
}

// ── 연봉 실수령액: 2026년 근로자 부담 4대보험료율 + 국세청 근로소득 간이세액표(/salary/table.js) ──
// 국민연금 기준소득월액 상·하한은 2026.7 ~ 2027.6 기준, 장기요양은 건강보험료 × (0.9448% ÷ 7.19%)
const INS_2026 = { pension: 0.0475, penMin: 410000, penMax: 6590000, health: 0.03595, care: 0.9448 / 7.19, job: 0.009 };
const floor10 = n => Math.floor((n + 1e-6) / 10) * 10; // 2,800,000 × 0.009 = 25,199.99… 같은 소수점 오차를 막아요
let taxRows;
function tableTax(pay, fam) {
  const T = window.TAX_TABLE;
  if (!T) return 0;
  if (!taxRows) taxRows = T.rows.split(';').map(r => r.split(',').map(Number));
  if (fam > 11) { // 11명 넘으면: 11명 세액 - (10명 세액 - 11명 세액) × 넘는 사람 수
    const t11 = tableTax(pay, 11), t10 = tableTax(pay, 10);
    return Math.max(0, t11 - (t10 - t11) * (fam - 11));
  }
  const k = Math.floor(pay / 1000); // 표는 천원 단위 구간이에요
  if (k < 10000) {
    for (let i = taxRows.length - 1; i >= 0; i--) if (k >= taxRows[i][0]) return taxRows[i][fam];
    return 0; // 월 77만 원 미만은 0원
  }
  const base = T.top[fam - 1], x = pay - 10000000; // 월 1,000만 원 넘는 부분은 표 아래 산식으로
  if (x <= 0) return base;
  if (pay <= 14000000) return base + x * 0.98 * 0.35 + 25000;
  if (pay <= 28000000) return base + 1397000 + (pay - 14000000) * 0.98 * 0.38;
  if (pay <= 30000000) return base + 6610600 + (pay - 28000000) * 0.98 * 0.40;
  if (pay <= 45000000) return base + 7394600 + (pay - 30000000) * 0.40;
  if (pay <= 87000000) return base + 13394600 + (pay - 45000000) * 0.42;
  return base + 31034600 + (pay - 87000000) * 0.45;
}
function takeHome(month, free, fam, kids, rate = 1, relCut = 0) { // rate: 매달 떼는 소득세 비율 (80%·100%·120% 중 직원이 골라요)
  const pay = Math.max(0, month - free); // 세금·보험료는 비과세를 뺀 돈에만 붙어요
  const pension = pay > 0 ? floor10(Math.min(Math.max(Math.floor(pay / 1000) * 1000, INS_2026.penMin), INS_2026.penMax) * INS_2026.pension) : 0;
  const health = floor10(pay * INS_2026.health), care = floor10(health * INS_2026.care), job = floor10(pay * INS_2026.job);
  const kidCut = kids <= 0 ? 0 : kids === 1 ? 20830 : 45830 + (kids - 2) * 33330;
  // relCut: 중소기업 취업자 감면율(0.9·0.7) — 원천징수 단계에서 줄여서 떼요. 1년 한도 200만 원이라 한 달에는 약 16.6만 원까지만 줄여요
  const before = Math.max(0, floor10((tableTax(pay, fam) - kidCut) * rate)), relief = relCut ? Math.min(floor10(before * relCut), Math.floor(2e6 / 12 / 10) * 10) : 0;
  const tax = before - relief, local = floor10(tax * 0.1);
  const cut = pension + health + care + job + tax + local;
  return { pension, health, care, job, tax, local, cut, net: month - cut, relief, before };
}
// 입력값을 한 번에 읽어요 (계산, 한 줄 정리, 다음 추천이 같이 써요)
function salaryInput() {
  const A = val('m_amt'), byYear = seg('m_mode') === 'year', sev = byYear && seg('m_sev') === 'in';
  const month = Math.floor(byYear ? A / (sev ? 13 : 12) : A);
  const kids = Math.max(0, Math.round(val('m_kids'))), famIn = Math.max(1, Math.round(val('m_fam')));
  const rateEl = document.querySelector('.seg[data-k="m_rate"] .on'), rate = rateEl ? Number(rateEl.dataset.v) / 100 : 1;
  const cutEl = document.querySelector('.seg[data-k="m_cut"] .on'), cut = cutEl ? Number(cutEl.dataset.v) / 100 : 0;
  return { month, sev, kids, famIn, fam: Math.max(famIn, kids + 1), free: Math.min(val('m_free'), month), rate, cut };
}
// 감면을 고르면 원래 떼던 금액을 줄 그어 옆에 보여 줘요 (소득세와 지방소득세가 함께 줄어드는 게 한눈에 보이게)
const was = (before, now) => (before > now ? `<s class="was">${won(before)}</s>` : '');
function salary() {
  const out = document.getElementById('m_out'), s = salaryInput();
  if (!s.month) { out.innerHTML = '금액을 넣어 주세요.'; return; }
  const r = takeHome(s.month, s.free, s.fam, s.kids, s.rate, s.cut), note = [];
  if (s.sev) note.push('퇴직금 포함 연봉이라 13으로 나눠 한 달 월급을 계산했어요.');
  if (s.rate !== 1) {
    const base = takeHome(s.month, s.free, s.fam, s.kids, 1, s.cut), gap = Math.abs(base.tax + base.local - r.tax - r.local) * 12;
    note.push(s.rate < 1 ? `소득세를 80%만 떼서 100%보다 매달 ${won(r.net - base.net)} 더 받아요. 대신 1년에 약 ${won(gap)}을 덜 떼서, 연말정산 때 그만큼 덜 돌려받거나 더 낼 수 있어요.`
      : `소득세를 120% 떼서 100%보다 매달 ${won(base.net - r.net)} 덜 받아요. 대신 1년에 약 ${won(gap)}을 더 떼서, 연말정산 때 그만큼 더 돌려받아요.`);
  }
  if (s.cut) {
    const capped = floor10(r.before * s.cut) > r.relief;
    note.push(r.relief ? `중소기업 취업자 감면(${Math.round(s.cut * 100)}%)으로 매달 소득세가 ${won(r.relief)}, 지방소득세까지 약 ${won(Math.round(r.relief * 1.1 / 10) * 10)} 줄어요.${capped ? ' 1년 감면 한도 200만 원에 맞춰 한 달 감면을 줄여서 계산했어요.' : ''}` : '이 월급은 원래 떼는 소득세가 없어서 감면으로 달라지는 게 없어요.');
  }
  if (s.fam > s.famIn) note.push(`자녀도 부양가족에 들어가서 부양가족을 ${s.fam}명으로 계산했어요.`);
  out.innerHTML = `<div>한 달 실수령액</div><div class="big">${won(r.net)}</div>` +
    rows([['세전 월급', won(s.month)], ['국민연금 (4.75%)', minus(r.pension)], ['건강보험 (3.595%)', minus(r.health)], ['장기요양보험', minus(r.care)],
      ['고용보험 (0.9%)', minus(r.job)], [`근로소득세${s.rate !== 1 || s.cut ? ` (${[s.rate !== 1 ? Math.round(s.rate * 100) + '%' : '', s.cut ? `감면 ${Math.round(s.cut * 100)}%` : ''].filter(Boolean).join(' · ')})` : ''}`, was(r.before, r.tax) + minus(r.tax)],
      ['지방소득세', was(floor10(r.before * 0.1), r.local) + minus(r.local)], ...(r.relief ? [['감면으로 줄어든 세금 (한 달)', `<span class="save-amt">${won(r.relief + floor10(r.before * 0.1) - r.local)}</span>`]] : []), ['빠지는 돈 합계', minus(r.cut)], ['1년 실수령액', won(r.net * 12)]]) +
    note.map(t => `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${t}</p>`).join('');
}

// ── 실업급여(구직급여): 2026년 1일 상한 68,100원, 하한 = 최저시급 × 80% × 하루 근무시간 ──
const JOB_MAX_2026 = 68100;
const JOB_DAYS = { under50: [120, 150, 180, 210, 240], over50: [120, 180, 210, 240, 270] }; // 가입기간 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상
const jobDays = () => JOB_DAYS[seg('j_age')][num(seg('j_years'))];
function unemployment() {
  const out = document.getElementById('j_out'), M = val('j_pay'), h = Math.min(Math.max(val('j_hours'), 1), 8);
  const endRaw = document.querySelector('input[data-k="j_end"]').value;
  if (!M || !endRaw) { out.innerHTML = '월급과 퇴사일을 넣어 주세요.'; return; }
  // 평균임금(하루) = 그만두기 전 3개월 동안 받은 임금 ÷ 그 3개월의 날수
  const end = new Date(endRaw + 'T00:00:00Z'), from = new Date(end);
  from.setUTCMonth(from.getUTCMonth() - 3);
  const avg = M * 3 / Math.round((end - from) / 86400000), raw = avg * 0.6;
  const min = Math.round(MIN_WAGE_2026 * 0.8 * h), day = Math.floor(Math.min(Math.max(raw, min), JOB_MAX_2026)), n = jobDays();
  const note = [];
  if (raw > JOB_MAX_2026) note.push(`평균임금의 60%가 하루 상한액(${won(JOB_MAX_2026)})보다 많아서 상한액으로 계산했어요.`);
  else if (raw < min) note.push(`평균임금의 60%가 하루 하한액(${won(min)})보다 적어서 하한액으로 계산했어요.`);
  if (seg('j_years') === '0') note.push('그만두기 전 18개월 동안 고용보험에 가입해 일한 날(유급일)이 180일 이상이어야 받을 수 있어요.');
  out.innerHTML = `<div>받을 수 있는 실업급여 (총액)</div><div class="big">${won(day * n)}</div>` +
    rows([['하루에 받는 돈', won(day)], ['받는 날수', `${n}일 (약 ${Math.round(n / 30)}개월)`], ['한 달(30일) 기준', won(day * 30)], ['평균임금 (하루)', won(avg)], ['평균임금의 60%', won(raw)]]) +
    note.map(t => `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${t}</p>`).join('');
}

// ── 연말정산 환급: 지금 적용 중인 근로소득 연말정산 규칙으로 1년 세금을 다시 계산해서, 미리 낸 세금과 비교해요 ──
const earnedDed = Y => Y <= 5e6 ? Y * 0.7 : Y <= 15e6 ? 3.5e6 + (Y - 5e6) * 0.4 : Y <= 45e6 ? 7.5e6 + (Y - 15e6) * 0.15 : Y <= 1e8 ? 12e6 + (Y - 45e6) * 0.05 : Math.min(2e7, 14.75e6 + (Y - 1e8) * 0.02);
const TAX_BRACKETS = [[14e6, 0.06, 0], [5e7, 0.15, 1.26e6], [8.8e7, 0.24, 5.76e6], [1.5e8, 0.35, 15.44e6], [3e8, 0.38, 19.94e6], [5e8, 0.40, 25.94e6], [1e9, 0.42, 35.94e6], [Infinity, 0.45, 65.94e6]];
const incomeTaxOf = tb => { const [, r, d] = TAX_BRACKETS.find(b => tb <= b[0]); return Math.max(0, tb * r - d); };
function yearEndTax(o) { // o: pay, fam, kids, credit, debit, pension, rent, med, ins
  const Y = o.pay, month = Y / 12, ins4 = takeHome(month, 0, o.fam, o.kids);
  const npsYear = ins4.pension * 12, hiYear = (ins4.health + ins4.care + ins4.job) * 12; // 국민연금, 건강·장기요양·고용보험료
  // 신용카드 등: 총급여의 25%를 넘게 쓴 돈부터, 신용카드를 먼저 채운 걸로 보고 신용 15% · 체크·현금 30%
  const th = Y * 0.25, overCredit = Math.max(0, o.credit - th), overDebit = Math.max(0, o.debit - Math.max(0, th - o.credit));
  const cardLimit = Y <= 7e7 ? 3e6 + Math.min(o.kids, 2) * 5e5 : 2.5e6 + Math.min(o.kids, 2) * 2.5e5;
  const card = Math.min(overCredit * 0.15 + overDebit * 0.3, cardLimit);
  const base = Y - earnedDed(Y) - 1.5e6 * o.fam - npsYear - card;
  const kidCredit = o.kids <= 0 ? 0 : o.kids === 1 ? 25e4 : 55e4 + (o.kids - 2) * 40e4;
  const pensionCredit = Math.min(o.pension, 9e6) * (Y <= 5.5e7 ? 0.15 : 0.12);
  const special = Math.min(o.ins, 1e6) * 0.12 + Math.max(0, o.med - Y * 0.03) * 0.15 + (Y <= 8e7 ? Math.min(o.rent, 1e7) * (Y <= 5.5e7 ? 0.17 : 0.15) : 0);
  const workLimit = Y <= 3.3e7 ? 74e4 : Y <= 7e7 ? Math.max(66e4, 74e4 - (Y - 3.3e7) * 0.008) : Y <= 1.2e8 ? Math.max(5e5, 66e4 - (Y - 7e7) * 0.5) : Math.max(2e5, 5e5 - (Y - 1.2e8) * 0.5);
  const settle = (tb, extra) => {
    const calc = incomeTaxOf(Math.max(0, tb));
    const work = Math.min(calc <= 1.3e6 ? calc * 0.55 : 715000 + (calc - 1.3e6) * 0.3, workLimit);
    return floor10(Math.max(0, calc - work - kidCredit - pensionCredit - extra));
  };
  // 보험료·의료비·월세 공제를 받는 쪽과, 대신 표준세액공제 13만 원을 받는 쪽 중 세금이 적은 쪽으로 정산돼요
  const tax = Math.min(settle(base - hiYear, special), settle(base, 13e4));
  return { tax, card, th, kidCredit, pensionCredit, special };
}
function yearEndInput() {
  const kids = Math.max(0, Math.round(val('ys_kids')));
  return { pay: val('ys_pay'), fam: Math.max(1, Math.round(val('ys_fam')), kids + 1), kids, credit: val('ys_credit'), debit: val('ys_debit'), pension: val('ys_pension'), rent: val('ys_rent'), med: val('ys_med'), ins: val('ys_ins') };
}
function yearEnd() {
  const out = document.getElementById('ys_out'), o = yearEndInput();
  if (!o.pay) { out.innerHTML = '총급여를 넣어 주세요.'; return; }
  const paidEl = document.querySelector('input[data-k="ys_paid"]'), guessed = paidEl.value.trim() === '';
  // 낸 세금을 모르면: 매달 간이세액표대로 뗐다고 보고 1년 치를 추정해요
  const kidCut = o.kids <= 0 ? 0 : o.kids === 1 ? 20830 : 45830 + (o.kids - 2) * 33330;
  const paid = guessed ? Math.max(0, floor10(tableTax(o.pay / 12, Math.min(o.fam, 11)) - kidCut)) * 12 : val('ys_paid');
  const r = yearEndTax(o), paidAll = paid + floor10(paid * 0.1), taxAll = r.tax + floor10(r.tax * 0.1), diff = paidAll - taxAll;
  out.innerHTML = `<div>${diff >= 0 ? '예상 환급액 (지방소득세 포함)' : '더 낼 세금 (지방소득세 포함)'}</div><div class="big">${won(Math.abs(diff))}</div>` +
    rows([[`이미 낸 세금${guessed ? ' (추정)' : ''}`, won(paidAll)], ['실제 낼 세금', won(taxAll)], ['신용카드 등 소득공제', won(r.card)], ['연금저축·IRP 세액공제', won(r.pensionCredit)], ['자녀 세액공제', won(r.kidCredit)], ['보험료·의료비·월세 세액공제', won(r.special)]]) +
    (guessed ? '<p style="font-size:12px;color:var(--muted);margin:10px 0 0">이미 낸 세금을 비워 둬서, 매달 국세청 간이세액표대로 뗐다고 보고 추정했어요. 급여명세서의 소득세 × 12를 넣으면 더 정확해요.</p>' : '');
}

function goal() {
  const G = val('g_goal'), S = val('g_now'), n = Math.round(val('g_y') * 12), i = val('g_r') / 100 / 12, out = document.getElementById('g_out');
  if (n <= 0) { out.innerHTML = '기간을 넣어 주세요.'; return; }
  // 매달 초에 넣고 월복리로 불어난다고 보고, 목표 금액에서 거꾸로 계산해요
  const grow = Math.pow(1 + i, n), nowLater = S * grow;
  const factor = i === 0 ? n : (grow - 1) / i * (1 + i);
  if (nowLater >= G) {
    out.innerHTML = `<div>매달 저축할 돈</div><div class="big">0원</div><p style="font-size:14px;margin:8px 0 0">지금 모은 돈만으로도 기간이 끝나면 목표 금액을 넘어요 (${won(nowLater)}).</p>`;
    return;
  }
  const P = (G - nowLater) / factor, paid = S + P * n;
  out.innerHTML = `<div>매달 저축할 돈</div><div class="big">${won(P)} <small>/ 월</small></div>` +
    rows([['목표 금액', won(G)], ['내가 넣는 돈 합계', won(paid)], ['이자로 불어나는 돈', won(G - paid)], ['기간', `${n}개월`]]);
}

function pyeong() {
  const PY = 400 / 121; // 1평 = 3.3058㎡
  const mode = seg('y_mode'), A = val('y_area'), price = val('y_price');
  document.getElementById('y_unit').textContent = mode === 'm2' ? '㎡' : '평';
  const m2 = mode === 'm2' ? A : A * PY, py = m2 / PY;
  const fmt = (n, d) => n.toLocaleString('ko-KR', { maximumFractionDigits: d });
  const list = [['제곱미터', fmt(m2, 2) + '㎡'], ['평', fmt(py, 2) + '평']];
  if (price > 0 && m2 > 0) list.push(['가격', won(price)], ['평당 가격', won(price / py)], ['㎡당 가격', won(price / m2)]);
  document.getElementById('y_out').innerHTML =
    `<div>${mode === 'm2' ? '평수' : '제곱미터'}</div><div class="big">${mode === 'm2' ? fmt(py, 2) + '평' : fmt(m2, 2) + '㎡'}</div>` + rows(list);
}

let percentMode = 'of';
function percent() {
  const mode = seg('q_mode'), out = document.getElementById('q_out');
  // 계산 방식마다 칸 이름과 예시 숫자가 달라요
  const setup = {
    of: ['금액 (A)', '원', '500000', '퍼센트 (B)', '%', '15'],
    ratio: ['부분 (A)', '', '75000', '전체 (B)', '', '500000'],
    change: ['처음 값', '', '3000000', '나중 값', '', '3150000'],
  }[mode];
  [['q_la', 0], ['q_ua', 1], ['q_lb', 3], ['q_ub', 4]].forEach(([id, k]) => document.getElementById(id).textContent = setup[k]);
  if (mode !== percentMode) {
    document.querySelector('input[data-k="q_a"]').value = setup[2];
    document.querySelector('input[data-k="q_b"]').value = setup[5];
    percentMode = mode;
  }
  const A = val('q_a'), B = val('q_b');
  const pct = n => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '%';
  const amt = n => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  if (mode === 'of') {
    out.innerHTML = `<div>${amt(A)}의 ${pct(B)}</div><div class="big">${amt(A * B / 100)}</div>` +
      rows([['더하면', amt(A + A * B / 100)], ['빼면', amt(A - A * B / 100)]]);
  } else if (B === 0 && mode === 'ratio' || A === 0 && mode === 'change') {
    out.innerHTML = '0으로는 나눌 수 없어요. 숫자를 바꿔 주세요.';
  } else if (mode === 'ratio') {
    out.innerHTML = `<div>${amt(A)}는 ${amt(B)}의</div><div class="big">${pct(A / B * 100)}</div>`;
  } else {
    const c = (B - A) / A * 100;
    out.innerHTML = `<div>${c >= 0 ? '증가율' : '감소율'}</div><div class="big">${c >= 0 ? '+' : ''}${pct(c)}</div>` +
      rows([['처음 값', amt(A)], ['나중 값', amt(B)], [B >= A ? '늘어난 양' : '줄어든 양', amt(Math.abs(B - A))]]);
  }
}

function avgPrice() {
  const p1 = val('a_p1'), q1 = val('a_q1'), p2 = val('a_p2'), q2 = val('a_q2'), out = document.getElementById('a_out');
  const qty = q1 + q2;
  if (qty <= 0) { out.innerHTML = '수량을 넣어 주세요.'; return; }
  const cost = p1 * q1 + p2 * q2, avg = cost / qty;
  const now = val('a_now') || p2, value = now * qty, gain = value - cost;
  const sign = n => (n > 0 ? '+' : '') + n.toFixed(2).replace(/\.?0+$/, '') + '%';
  out.innerHTML = `<div>새 평균 단가</div><div class="big">${won(avg)}</div>` +
    rows([['전체 수량', qty.toLocaleString('ko-KR') + '주'], ['총 매수 금액', won(cost)],
      ['기존 평단가 대비', p1 ? sign((avg / p1 - 1) * 100) : '-'],
      [`현재가 ${won(now)} 기준 평가금액`, won(value)], ['수익률', sign(gain / cost * 100)], [gain >= 0 ? '수익' : '손실', won(Math.abs(gain))]]);
}

function dividend() {
  const mode = seg('b_mode'), r = val('b_rate') / 100, keep = 1 - num(seg('b_tax')) / 100, out = document.getElementById('b_out');
  document.querySelectorAll('#dividend [data-mode]').forEach(d => d.hidden = d.dataset.mode !== mode);
  if (r <= 0) { out.innerHTML = '배당수익률을 넣어 주세요.'; return; }
  const taxWon = n => (Math.round(n) > 0 ? '-' : '') + won(n);
  const bigNote = `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">1년 금융소득이 2,000만 원을 넘으면 금융소득종합과세 대상이라 세금이 더 나올 수 있어요.</p>`;
  if (mode === 'income') {
    const gross = val('b_amt') * r, net = gross * keep;
    out.innerHTML = `<div>1년 배당금 (세후)</div><div class="big">${won(net)}</div>` +
      rows([['1년 배당금 (세전)', won(gross)], ['세금', taxWon(gross - net)], ['한 달 평균 (세후)', won(net / 12)]]) + (gross > 20000000 ? bigNote : '');
  } else {
    const yearNet = val('b_want') * 12, gross = yearNet / keep, need = gross / r;
    out.innerHTML = `<div>필요한 투자금</div><div class="big">${won(need)}</div>` +
      rows([['1년 배당금 (세후)', won(yearNet)], ['1년 배당금 (세전)', won(gross)], ['세금', taxWon(gross - yearNet)]]) + (gross > 20000000 ? bigNote : '');
  }
}

function retirement() {
  const W = val('t_month'), until = val('t_until'), n = Math.round(val('t_years') * 12), inf = val('t_inf') / 100, r = val('t_r') / 100;
  const out = document.getElementById('t_out');
  if (n <= 0) { out.innerHTML = '은퇴 후 생활할 기간을 넣어 주세요.'; return; }
  const first = W * Math.pow(1 + inf, until); // 은퇴할 때 물가로 바뀐 한 달 생활비
  // 생활비는 물가만큼 오르고 남은 돈은 수익률만큼 불어나니, 그 차이(실질 수익률)로 매달 초에 꺼내 쓰는 돈을 거꾸로 계산해요
  const j = Math.pow((1 + r) / (1 + inf), 1 / 12) - 1;
  const need = Math.abs(j) < 1e-12 ? first * n : first * (1 - Math.pow(1 + j, -n)) / j * (1 + j);
  out.innerHTML = `<div>은퇴할 때 필요한 돈</div><div class="big">${won(need)}</div>` +
    rows([['은퇴할 때 한 달 생활비', won(first)], ['은퇴 후 마지막 해 한 달 생활비', won(first * Math.pow(1 + inf, Math.max(0, n / 12 - 1)))],
      ['지금 돈 가치로 바꾸면', won(need / Math.pow(1 + inf, until))]]) +
    `<p style="font-size:14px;margin:10px 0 0">이 돈을 모으려면 <a href="/goal/" style="color:var(--accent)">목표 저축 계산기</a>로 매달 얼마씩 저축해야 하는지 확인해 보세요.</p>`;
}

function carLoan() {
  const price = val('k_price'), down = Math.min(val('k_down'), price), n = num(seg('k_n')), i = val('k_r') / 100 / 12;
  const out = document.getElementById('k_out'), L = price - down;
  if (L <= 0) { out.innerHTML = `<div>매달 할부금</div><div class="big">0원</div><p style="font-size:14px;margin:8px 0 0">선수금으로 차값을 모두 내서 할부가 없어요.</p>`; return; }
  const M = i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); // 원리금균등
  const interest = M * n - L;
  out.innerHTML = `<div>매달 할부금</div><div class="big">${won(M)} <small>× ${n}개월</small></div>` +
    rows([['할부 원금', won(L)], ['총 이자', won(interest)], ['선수금', won(down)], ['실제로 내는 총 금액', won(down + M * n)]]);
}

function refinance() {
  const L = val('f_amt'), n = Math.round(val('f_n')), out = document.getElementById('f_out');
  if (L <= 0 || n <= 0) { out.innerHTML = '남은 원금과 기간을 넣어 주세요.'; return; }
  const pay = r => { const i = r / 100 / 12; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); }; // 원리금균등 월 상환액
  const mOld = pay(val('f_old')), mNew = pay(val('f_new'));
  const extra = L * val('f_fee') / 100 + val('f_cost'); // 갈아탈 때 드는 돈
  const save = (mOld - mNew) * n - extra, monthly = mOld - mNew;
  const back = monthly > 0 ? Math.ceil(extra / monthly) : null;
  out.innerHTML = `<div>${save >= 0 ? '갈아타면 아끼는 돈' : '갈아타면 손해 보는 돈'}</div><div class="big">${won(Math.abs(save))}</div>` +
    rows([['지금 대출 월 상환액', won(mOld)], ['새 대출 월 상환액', won(mNew)], [monthly >= 0 ? '매달 줄어드는 돈' : '매달 늘어나는 돈', won(Math.abs(monthly))],
      ['지금 대출 남은 이자', won(mOld * n - L)], ['새 대출 이자', won(mNew * n - L)], ['수수료 + 비용', won(extra)],
      ['수수료 되찾는 기간', back === null ? '되찾을 수 없어요' : back <= n ? `${back}개월` : '남은 기간 안에 못 되찾아요']]);
}

function unitPrice() {
  const unit = seg('u_unit'), per = unit === '개' ? 1 : 100, label = unit === '개' ? '1개당' : `100${unit}당`;
  document.querySelectorAll('#unit-price .u-unit').forEach(s => s.textContent = unit);
  const items = ['A', 'B', 'C'].map(n => {
    const price = val('u_p' + n), vol = val('u_v' + n), cnt = val('u_c' + n) || 1;
    return { n, price, total: vol * cnt, unitPrice: price > 0 && vol > 0 ? price / (vol * cnt) * per : null };
  }).filter(x => x.unitPrice !== null);
  const out = document.getElementById('u_out');
  if (!items.length) { out.innerHTML = '가격과 용량을 넣어 주세요.'; return; }
  const best = items.reduce((a, b) => (b.unitPrice < a.unitPrice ? b : a));
  const fmt = n => n.toLocaleString('ko-KR', { maximumFractionDigits: n < 100 ? 1 : 0 }) + '원';
  out.innerHTML = `<div>가장 저렴한 상품</div><div class="big">상품 ${best.n} <small>${label} ${fmt(best.unitPrice)}</small></div>` +
    rows(items.map(x => [`상품 ${x.n} (${x.total.toLocaleString('ko-KR')}${unit})`,
      `${label} ${fmt(x.unitPrice)}${x === best ? ' ✓' : ` (+${((x.unitPrice / best.unitPrice - 1) * 100).toFixed(1)}%)`}`]));
}

function fuel() {
  const mode = seg('e_mode'), out = document.getElementById('e_out');
  document.querySelectorAll('#fuel > [data-mode]').forEach(d => d.hidden = d.dataset.mode !== mode);
  if (mode === 'eff') {
    const km = val('e_dist'), l = val('e_liter');
    if (km <= 0 || l <= 0) { out.innerHTML = '주행 거리와 넣은 기름 양을 넣어 주세요.'; return; }
    out.innerHTML = `<div>내 차 연비</div><div class="big">${(km / l).toFixed(1)} <small>km/L</small></div>` +
      rows([['주행 거리', km.toLocaleString('ko-KR') + 'km'], ['넣은 기름', l.toLocaleString('ko-KR') + 'L'], ['100km 가는 데 드는 기름', (l / km * 100).toFixed(1) + 'L']]);
    return;
  }
  const km = val('e_km') * num(seg('e_trip')), eff = val('e_eff'), price = val('e_price'), ppl = Math.max(1, Math.round(val('e_ppl')));
  if (eff <= 0) { out.innerHTML = '연비를 넣어 주세요.'; return; }
  const liter = km / eff, cost = liter * price;
  out.innerHTML = `<div>유류비</div><div class="big">${won(cost)}</div>` +
    rows([['총 거리', km.toLocaleString('ko-KR') + 'km'], ['필요한 기름', liter.toFixed(1) + 'L'], ['1km당 기름값', won(price / eff)]]
      .concat(ppl > 1 ? [['한 사람당', won(cost / ppl)]] : []));
}

function dutchPay() {
  const total = val('n_total'), ppl = Math.max(1, Math.round(val('n_ppl'))), tip = num(seg('n_tip')) / 100, unit = num(seg('n_unit'));
  const sum = total * (1 + tip), each = sum / ppl;
  const rounded = Math.ceil(Math.round(each) / unit) * unit; // 계산한 사람이 손해 보지 않게 올림
  const extra = rounded * ppl - sum;
  document.getElementById('n_out').innerHTML = `<div>한 사람당</div><div class="big">${won(rounded)}</div>` +
    rows([['총 금액', won(total)]].concat(tip ? [[`팁 (${tip * 100}%)`, won(total * tip)], ['팁 포함 합계', won(sum)]] : [])
      .concat([['정확히 나누면', won(each)], [`${ppl}명이 내는 돈`, won(rounded * ppl)], ['남는 돈 (계산한 사람 몫)', won(extra)]]));
}

function dateCalc() {
  const mode = seg('z_mode'), out = document.getElementById('z_out');
  document.querySelectorAll('#date > [data-mode]').forEach(d => d.hidden = d.dataset.mode !== mode);
  const DAY = 86400000, W = '일월화수목금토';
  const now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()); // 기기의 오늘 날짜
  const read = k => { const v = document.querySelector(`input[data-k="${k}"]`).value; return v ? Date.parse(v + 'T00:00:00Z') : null; };
  const show = t => { const d = new Date(t); return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${W[d.getUTCDay()]})`; };
  const base = document.querySelector('input[data-k="z_base"]');
  if (!base.value) base.value = new Date(today).toISOString().slice(0, 10);
  if (mode === 'dday') {
    const t = read('z_target');
    if (t === null) { out.innerHTML = '목표 날짜를 넣어 주세요.'; return; }
    const d = Math.round((t - today) / DAY);
    out.innerHTML = `<div>${show(t)}</div><div class="big">${d === 0 ? 'D-day' : d > 0 ? 'D-' + d : 'D+' + (-d)}</div>` +
      rows([['오늘', show(today)], [d >= 0 ? '남은 날' : '지난 날', Math.abs(d).toLocaleString('ko-KR') + '일'], ['약', `${(Math.abs(d) / 7).toFixed(1)}주 · ${(Math.abs(d) / 30.44).toFixed(1)}개월`]]);
  } else if (mode === 'add') {
    const b = read('z_base'), n = Math.round(val('z_n')), inc = num(seg('z_inc1'));
    if (b === null) { out.innerHTML = '기준 날짜를 넣어 주세요.'; return; }
    const t = b + (n - inc) * DAY;
    out.innerHTML = `<div>${inc ? `${n}일째 되는 날` : `${n}일 뒤`}</div><div class="big">${show(t)}</div>` +
      rows([['기준 날짜', show(b)], ['오늘부터', (() => { const d = Math.round((t - today) / DAY); return d === 0 ? '오늘이에요' : d > 0 ? `${d}일 남았어요` : `${-d}일 지났어요`; })()]]);
  } else {
    const a = read('z_from'), b = read('z_to'), inc = num(seg('z_inc2'));
    if (a === null || b === null) { out.innerHTML = '두 날짜를 넣어 주세요.'; return; }
    const d = Math.round(Math.abs(b - a) / DAY) + inc;
    out.innerHTML = `<div>두 날짜 사이</div><div class="big">${d.toLocaleString('ko-KR')}일</div>` +
      rows([['시작', show(Math.min(a, b))], ['끝', show(Math.max(a, b))], ['약', `${(d / 7).toFixed(1)}주 · ${(d / 30.44).toFixed(1)}개월 · ${(d / 365).toFixed(2)}년`]]);
  }
}

// 페이지마다 계산기가 하나씩 있어서, 그 페이지에 있는 계산기만 계산해요
// ── 연봉 상위 몇 %: 국세청 근로소득 백분위(천분위) 자료, 2024년 귀속(2025년 신고) 2,107만 8,535명 ──
// [상위 몇 % 지점(구간 가운데), 그 구간 1인당 평균 총급여(만 원)] — 구간 사이는 직선으로 이어서 계산해요. 해마다 새 자료가 나오면 바꿔 주세요.
const SALARY_PCT = [[0.05,99937],[0.15,43898],[0.25,34951],[0.35,30162],[0.45,27054],[0.55,24747],[0.65,23086],[0.75,21763],[0.85,20752],[0.95,19953],[1.5,17332],[2.5,14717],[3.5,13117],[4.5,11984],[5.5,11136],[6.5,10456],[7.5,9925],[8.5,9498],[9.5,9117],[10.5,8770],[11.5,8454],[12.5,8162],[13.5,7887],[14.5,7626],[15.5,7377],[16.5,7148],[17.5,6932],[18.5,6727],[19.5,6534],[20.5,6352],[21.5,6180],[22.5,6022],[23.5,5874],[24.5,5727],[25.5,5583],[26.5,5446],[27.5,5314],[28.5,5186],[29.5,5063],[30.5,4947],[31.5,4837],[32.5,4737],[33.5,4634],[34.5,4537],[35.5,4443],[36.5,4350],[37.5,4263],[38.5,4182],[39.5,4101],[40.5,4021],[41.5,3945],[42.5,3870],[43.5,3799],[44.5,3728],[45.5,3660],[46.5,3601],[47.5,3543],[48.5,3480],[49.5,3417],[50.5,3358],[51.5,3299],[52.5,3239],[53.5,3179],[54.5,3121],[55.5,3064],[56.5,3009],[57.5,2964],[58.5,2905],[59.5,2853],[60.5,2797],[61.5,2749],[62.5,2696],[63.5,2645],[64.5,2597],[65.5,2543],[66.5,2508],[67.5,2475],[68.5,2430],[69.5,2384],[70.5,2311],[71.5,2243],[72.5,2168],[73.5,2090],[74.5,2008],[75.5,1922],[76.5,1838],[77.5,1763],[78.5,1671],[79.5,1584],[80.5,1499],[81.5,1412],[82.5,1320],[83.5,1236],[84.5,1170],[85.5,1079],[86.5,994],[87.5,913],[88.5,828],[89.5,767],[90.5,694],[91.5,616],[92.5,536],[93.5,456],[94.5,384],[95.5,305],[96.5,231],[97.5,165],[98.5,92],[99.5,21]];
const SALARY_AVG = 4475, SALARY_MID = 3388; // 1인당 평균, 가운데(상위 50%) 총급여 (만 원)
function salaryTop(man) { // 총급여(만 원) → 상위 몇 %
  const P = SALARY_PCT;
  if (man >= P[0][1]) return P[0][0];
  for (let i = 0; i < P.length - 1; i++) if (man >= P[i + 1][1]) return P[i][0] + (P[i][1] - man) / (P[i][1] - P[i + 1][1]) * (P[i + 1][0] - P[i][0]);
  return 99.9;
}
function salaryAt(top) { // 상위 몇 % → 그 지점 총급여(만 원)
  const P = SALARY_PCT;
  for (let i = 0; i < P.length - 1; i++) if (top <= P[i + 1][0]) return P[i][1] + (P[i + 1][1] - P[i][1]) * (Math.max(top, P[i][0]) - P[i][0]) / (P[i + 1][0] - P[i][0]);
  return P[P.length - 1][1];
}
const topText = t => t < 0.1 ? '0.1% 이내' : t.toFixed(1).replace(/\.0$/, '') + '%';

// ── 순자산 상위 %: 「2025년 가계금융복지조사」(2025.3월 말, 가구 기준) 순자산 분위 경계와 금액별 누적 비율 ──
// [순자산(만 원), 그 금액 이상인 가구 비율(%)] — 사이는 직선으로 잇고, 11억 넘는 부분은 위쪽 꼬리 모양(파레토)으로 어림해요
const NET_RANK = [[-10000, 99.5], [0, 97], [1210, 90], [5108, 80], [10000, 70.5], [10296, 70], [16472, 60], [20000, 55.1], [23860, 50],
  [30000, 43], [33050, 40], [46180, 30], [50000, 27.9], [69380, 20], [70000, 19.8], [100000, 11.8], [110020, 10]];
const NET_AGE = { y39: ['39세 이하', 21950], y40: ['40대', 48389], y50: ['50대', 55161], y60: ['60세 이상', 53591] }; // 가구주 나이별 평균 순자산(만 원)
const NET_MEDIAN = 23860, NET_AVG = 47144;
function assetTop(won0) {
  const x = won0 / 10000, P = NET_RANK;
  if (x <= P[0][0]) return P[0][1];
  if (x >= P[P.length - 1][0]) return Math.max(0.05, 10 * Math.pow(x / 110020, -1.51));
  for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [a, ta] = P[i - 1], [b, tb] = P[i]; return ta + (tb - ta) * (x - a) / (b - a); }
  return 50;
}
// ── 주택 취득세 (지방세법 제11조·제13조의2): 1주택 1~3%, 다주택·조정대상지역 중과 8·12% + 지방교육세 + 농어촌특별세 ──
function acqRate(p) { // 일반세율(%) — 6억~9억은 (취득가액 × 2/3억 − 3)%
  if (p <= 6e8) return 1;
  if (p <= 9e8) return Math.round((p / 1e8 * 2 / 3 - 3) * 100) / 100;
  return 3;
}
function acquisitionTax() {
  const p = val('at_price'), n = seg('at_count'), adj = seg('at_adj') === 'adj', big = seg('at_area') === 'big', first = seg('at_first') === 'yes', out = document.getElementById('at_out');
  if (!p) { out.innerHTML = '집값(취득가액)을 넣어 주세요.'; return; }
  const base = acqRate(p);
  const rate = n === '1' || n === 't2' ? base : n === '2' ? (adj ? 8 : base) : n === '3' ? (adj ? 12 : 8) : 12;
  const heavy = rate >= 8;
  const edu = heavy ? 0.4 : Math.round(base * 0.1 * 1000) / 1000, farm = big ? (rate === 12 ? 1 : rate === 8 ? 0.6 : 0.2) : 0;
  let tax = Math.floor(p * rate / 100);
  const cut = first && !heavy && p <= 12e8 ? Math.min(2000000, tax) : 0; tax -= cut;
  const eduAmt = Math.floor(p * edu / 100), farmAmt = Math.floor(p * farm / 100), total = tax + eduAmt + farmAmt;
  out.innerHTML = `<div>내야 할 취득세 (모두 합쳐서)</div><div class="big">${won(total)}</div>` +
    rows([['취득세율', `${rate}%${heavy ? ' (다주택 중과)' : ''}`], ['취득세', won(tax)], ...(cut ? [['생애최초 감면', `-${won(cut)}`]] : []), [`지방교육세 (${edu}%)`, won(eduAmt)], [`농어촌특별세 (${farm}%)`, farm ? won(farmAmt) : '0원 (85㎡ 이하)'], ['집값 대비', `${(total / p * 100).toFixed(2)}%`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">잔금일(또는 등기일)로부터 60일 안에 내야 해요. ${n === 't2' ? '일시적 2주택은 3년 안에 예전 집을 팔아야 일반세율이 유지돼요. ' : ''}실제 세액은 위택스에서 확인하세요.</p>`;
}
// ── 부동산 중개보수 (공인중개사법 시행규칙, 주택): 매매·전세·월세 상한요율과 한도액 ──
function brokerageFee() {
  const k = seg('bf_kind'), amt = val('bf_amt'), rent = val('bf_rent'), vat = seg('bf_vat') === 'yes', out = document.getElementById('bf_out');
  if (!amt) { out.innerHTML = k === 'buy' ? '매매가를 넣어 주세요.' : '보증금을 넣어 주세요.'; return; }
  let base = amt;
  if (k === 'rent') { base = amt + rent * 100; if (base < 5e7) base = amt + rent * 70; } // 월세는 '보증금 + 월세×100' (5천만 원 미만이면 ×70)
  const T = k === 'buy' ? [[5e7, 0.6, 250000], [2e8, 0.5, 800000], [9e8, 0.4, 0], [12e8, 0.5, 0], [15e8, 0.6, 0], [Infinity, 0.7, 0]]
    : [[5e7, 0.5, 200000], [1e8, 0.4, 300000], [6e8, 0.3, 0], [12e8, 0.4, 0], [15e8, 0.5, 0], [Infinity, 0.6, 0]];
  const [, r, cap] = T.find(([lim]) => base < lim), raw = Math.floor(base * r / 100), fee = cap ? Math.min(raw, cap) : raw, withVat = vat ? Math.floor(fee * 1.1) : fee;
  out.innerHTML = `<div>중개수수료 최대 (한쪽 기준)</div><div class="big">${won(withVat)}</div>` +
    rows([['거래금액', `${won(base)}${k === 'rent' ? ' (월세 환산)' : ''}`], ['상한요율', `${r}%`], ['한도액', cap ? won(cap) : '없음'], ['중개수수료', won(fee)], ...(vat ? [['부가세 10%', won(withVat - fee)]] : [])]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">법으로 정한 최대 금액이에요. 중개사와 협의해서 더 낮출 수 있고, 파는 사람·사는 사람이 각각 내요.</p>`;
}
// ── 목돈 굴리기 비교 (카카오뱅크 '1,000만 원을 투자하면?'처럼): 같은 돈을 어디에 두면 세후 얼마가 붙는지 금리순으로 ──
function lumpSum() {
  const P = val('ls_amt'), m = Math.max(1, Math.min(120, Math.round(val('ls_m')))), out = document.getElementById('ls_out');
  if (!P) { out.innerHTML = '굴릴 돈을 넣어 주세요.'; return; }
  const opts = [
    ['파킹통장', val('ls_park'), 0.154, '언제든 꺼낼 수 있어요. 금리는 은행이 바꿀 수 있어요.'],
    ['정기예금', val('ls_dep'), 0.154, '중간에 깨면 약속한 이자를 못 받아요. 예금자보호 1억 원까지.'],
    ['채권 (만기까지 보유)', val('ls_bond'), 0.154, '이자에만 세금이 붙어요. 할인채는 세금이 더 적을 수 있어요. 예금자보호는 없어요.'],
    ['ISA 안에서 예금', val('ls_dep'), -1, '이자 200만 원까지 세금 0원, 넘는 부분 9.9%. 3년은 넣어 둬야 해요.'],
  ].map(([n, r, tax, note]) => {
    const gross = P * r / 100 * m / 12, t = tax < 0 ? Math.max(0, gross - 2000000) * 0.099 : gross * tax;
    return { n, r, net: Math.floor(gross - t), tax: Math.floor(t), note };
  }).filter(o => o.r > 0).sort((a, b) => b.net - a.net);
  if (!opts.length) { out.innerHTML = '금리를 넣어 주세요.'; return; }
  out.innerHTML = `<div>${korean(P) || won(P)}을 ${m}개월 두면</div><div class="big">최대 +${won(opts[0].net)}</div>` +
    `<ul class="ls-list">${opts.map((o, i) => `<li><em>${i + 1}</em><div><b>${o.n}</b><small>연 ${o.r}% · 세금 ${won(o.tax)}</small><p>${o.note}</p></div><strong>+${won(o.net)}</strong></li>`).join('')}</ul>` +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">세후 이자 기준이에요(단리, 이자소득세 15.4%). 실제 금리는 상품과 날짜마다 달라요. 한 곳에 1억 원이 넘으면 나눠 넣으세요.</p>`;
}
// ── 중고 시세 어림: 물건 종류별로 산 직후 한 번 떨어지고(첫 감가), 그 뒤 해마다 일정 비율씩 줄어든다고 보고 계산해요 ──
// [이름, 산 직후 남는 비율, 1년마다 줄어드는 비율] — 중고거래에서 흔히 보이는 흐름을 돈셈이 어림한 값이에요
const USED = { phone: ['스마트폰', 0.8, 0.28], laptop: ['노트북·태블릿', 0.78, 0.22], appliance: ['가전', 0.65, 0.15], luxury: ['명품 가방·시계', 0.8, 0.05], bike: ['자전거·운동기구', 0.65, 0.15], furniture: ['가구', 0.45, 0.2], etc: ['기타', 0.6, 0.2] };
const USED_COND = { new: ['새것 같아요', 1.05], good: ['깨끗해요', 1], used: ['사용감 있어요', 0.85], broken: ['고장·하자 있어요', 0.45] };
function usedPrice() {
  const price = val('up_price'), m = Math.max(0, Math.min(240, Math.round(val('up_m')))), out = document.getElementById('up_out');
  const k = USED[seg('up_kind')] || USED.phone, c = USED_COND[seg('up_cond')] || USED_COND.good, box = seg('up_box') === 'yes';
  if (!price) { out.innerHTML = '산 가격을 넣어 주세요.'; return; }
  const boxF = ['phone', 'laptop', 'luxury'].includes(seg('up_kind')) ? (box ? 1.03 : 0.97) : 1; // 박스·구성품은 전자기기·명품에서 값이 달라져요
  const at = mm => price * (mm < 1 ? (1 + k[1]) / 2 : k[1]) * Math.pow(1 - k[2], mm / 12) * c[1] * boxF;
  const r1000 = v => Math.max(0, Math.round(v / 1000) * 1000), v = at(m), lo = r1000(v * 0.88), hi = r1000(v * 1.1), mid = r1000(v);
  const v6 = r1000(at(m + 6)), v12 = r1000(at(m + 12)), left = Math.round(mid / price * 100);
  out.innerHTML = `<div>${k[0]} · ${m ? `${m}개월 사용` : '거의 안 씀'} · ${c[0]}</div><div class="big">${won(mid)}</div>` +
    rows([['예상 시세 범위', `${won(lo)} ~ ${won(hi)}`], ['올릴 때 가격', `${won(hi)} (가격 제안은 받기로)`], ['이 아래로는 팔지 않기', won(lo)], ['산 값 대비', `${left}% 남았어요`],
      ['6개월 더 쓰고 팔면', `${won(v6)} (${won(mid - v6)} 덜 받아요)`], ['1년 더 쓰고 팔면', `${won(v12)} (${won(mid - v12)} 덜 받아요)`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">물건 종류별 평균적인 값 떨어지는 흐름으로 어림한 값이에요. 같은 모델이 실제로 얼마에 팔렸는지 중고거래 앱의 '거래완료' 가격을 꼭 함께 보세요.</p>`;
}
// ── 배달비 계산기: 한 달 배달에 쓰는 돈, 배달팁만 모은 돈, 멤버십 본전, 포장·집밥으로 바꾸면 아끼는 돈 ──
function deliveryCost() {
  const n = Math.max(0, Math.min(200, Math.round(val('dv_n')))), amt = val('dv_amt'), tip = val('dv_tip'), sub = val('dv_sub'), out = document.getElementById('dv_out');
  if (!n || !amt) { out.innerHTML = '한 달에 몇 번, 한 번에 얼마쯤 시키는지 넣어 주세요.'; return; }
  const month = n * (amt + tip), year = month * 12, tipYear = n * tip * 12;
  const cut = Math.min(2, n), save = cut * (amt + tip), r = 0.04 / 12, fv = Math.round(save * ((Math.pow(1 + r, 120) - 1) / r) / 10000) * 10000; // 한 달 2번 줄인 돈을 10년 연 4%로 모으면
  const subLine = sub ? (tip ? [['멤버십 본전', `한 달 ${Math.ceil(sub / tip)}번 넘게 시키면 이득`], ['지금 내 경우', n * tip >= sub ? `한 달 ${won(n * tip - sub)} 이득이에요` : `한 달 ${won(sub - n * tip)} 손해예요`]] : [['멤버십 본전', '배달팁이 0원이면 멤버십은 필요 없어요']]) : [];
  out.innerHTML = `<div>한 달 배달에 쓰는 돈</div><div class="big">${won(month)}</div>` +
    rows([['1년이면', won(year)], ['그중 배달팁만 1년', won(tipYear)], ...subLine,
      ['포장(픽업)으로 바꾸면', `1년 ${won(tipYear)} 아껴요`], [`한 달 ${cut}번만 집밥으로`, `1년 ${won(save * 12)} 아껴요`], ['그 돈을 10년 모으면', `약 ${korean(fv) || won(fv)} (연 4%)`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">집밥 재료비는 빼지 않은 금액이에요. 배달팁은 가게와 거리마다 달라서 평소 내는 금액으로 넣어 주세요.</p>`;
}
// ── 전세 안심 진단 (다방 '안심진단'처럼): 집값 대비 빚 + 보증금이 얼마나 되는지로 깡통전세 위험을 미리 봐요 ──
function jeonseCheck() {
  const price = val('jc_price'), dep = val('jc_dep'), loan = val('jc_loan'), other = val('jc_other'), out = document.getElementById('jc_out');
  if (!price || !dep) { out.innerHTML = '집 시세와 전세 보증금을 넣어 주세요.'; return; }
  const ratio = (loan + other + dep) / price * 100, jr = dep / price * 100;
  const lv = ratio <= 70 ? ['🟢 비교적 안전해요', '빚과 보증금을 다 합쳐도 집값의 70% 아래예요.'] : ratio <= 80 ? ['🟡 주의가 필요해요', '집값이 조금만 떨어져도 보증금을 다 못 돌려받을 수 있어요.'] : ['🔴 위험해요 (깡통전세 우려)', '집을 팔아도 빚과 보증금을 다 갚기 어려운 수준이에요. 계약을 다시 생각해 보세요.'];
  const auction = price * 0.7, back = Math.max(0, Math.min(dep, auction - loan - other)), lose = dep - back; // 경매로 시세의 70%에 팔린다고 가정
  const hug = dep + loan <= price * 0.9; // HUG 전세보증: (보증금 + 선순위 채권) ≤ 주택가격 × 90%
  out.innerHTML = `<div>집값 대비 빚 + 보증금 ${Math.round(ratio)}%</div><div class="big">${lv[0]}</div>` +
    rows([['내 판단 기준', lv[1]], ['전세가율 (보증금 ÷ 시세)', `${jr.toFixed(1)}%`], ['빚 + 보증금 합계', won(loan + other + dep)],
      ['집이 경매로 시세의 70%에 팔리면', lose > 0 ? `${won(back)}만 돌려받아요 (${won(lose)} 손해)` : '보증금을 다 돌려받을 수 있어요'],
      ['전세보증보험 (HUG) 기준', hug ? '보증금 + 선순위 빚이 집값의 90% 안이라 가입을 노려볼 수 있어요' : '보증금 + 선순위 빚이 집값의 90%를 넘어서 가입이 어려울 수 있어요']]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">대략 미리 보는 계산이에요. 계약 전에 등기부등본, 집주인 세금 체납, 보증보험 가입 가능 여부를 꼭 직접 확인하세요.</p>`;
}
// ── 청약 가점 (호갱노노 '청약 진단'처럼): 무주택 기간 32점 + 부양가족 35점 + 청약통장 17점 = 84점 만점 ──
function subscriptionScore() {
  const home = seg('sc_home') !== 'no', y = Math.max(0, val('sc_y')), n = Math.max(0, Math.min(10, Math.round(val('sc_n')))), m = Math.max(0, Math.round(val('sc_m'))), out = document.getElementById('sc_out');
  const pH = !home ? 0 : y < 1 ? 2 : Math.min(32, 2 + 2 * Math.floor(y)); // 1년 미만 2점, 1년마다 +2점, 15년 이상 32점
  const pN = Math.min(35, 5 + 5 * n); // 0명 5점, 1명마다 +5점, 6명 이상 35점
  const pM = m < 6 ? 1 : m < 12 ? 2 : Math.min(17, 2 + Math.floor(m / 12)); // 6개월 미만 1점, 6개월~1년 2점, 1년마다 +1점, 15년 이상 17점
  const total = pH + pN + pM, nextY = (home ? Math.min(32, pH < 2 ? 2 : pH + 2) : 0) + pN + Math.min(17, m < 6 ? 2 : pM + 1);
  out.innerHTML = `<div>내 청약 가점</div><div class="big">${total}점 <small style="font-size:.5em;color:var(--muted)">/ 84점</small></div>
    <div class="rank-bar" aria-hidden="true"><i style="left:${Math.max(1, Math.min(99, total / 84 * 100))}%"></i></div>` +
    rows([['무주택 기간', `${pH}점 / 32점${home ? '' : ' (집이 있으면 0점)'}`], ['부양가족', `${pN}점 / 35점`], ['청약통장 가입 기간', `${pM}점 / 17점`],
      ['1년 뒤 같은 조건이면', `${nextY}점 (${nextY - total >= 0 ? '+' : ''}${nextY - total}점)`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">부양가족 1명이 5점으로 가장 커요. 인기 단지일수록 높은 점수가 필요하니, 모집공고의 지난 당첨 가점을 함께 확인하세요.</p>`;
}
// ── 덕질 비용 계산기 (위버스 샵·멤버십처럼): 앨범·굿즈·공연·구독을 1년으로 모아 보고, 월급 대비 얼마인지 ──
function fanBudget() {
  const alb = val('fb_alb') * val('fb_albp'), goods = val('fb_goods'), con = val('fb_con') * val('fb_conp'), sub = val('fb_sub') * 12, trip = val('fb_trip'), pay = val('fb_pay'), out = document.getElementById('fb_out');
  const year = alb + goods + con + sub + trip;
  if (!year) { out.innerHTML = '1년에 쓰는 덕질 비용을 하나라도 넣어 주세요.'; return; }
  const month = year / 12, parts = [['앨범', alb], ['굿즈·포토카드', goods], ['콘서트·팬미팅', con], ['멤버십·구독', sub], ['교통·숙박', trip]].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const r = 0.035 / 12, fv10 = Math.round(month * ((Math.pow(1 + r, 120) - 1) / r) / 10000) * 10000; // 같은 돈을 매달 연 3.5%로 10년 모으면
  out.innerHTML = `<div>1년 덕질 비용</div><div class="big">${won(Math.round(year))}</div>` +
    rows([['한 달 평균', won(Math.round(month))], ...parts.map(([n, v]) => [n, `${won(Math.round(v))} (${Math.round(v / year * 100)}%)`]),
      ...(pay ? [['월 실수령액 대비', `${(month / pay * 100).toFixed(1)}%`]] : []), ['같은 돈을 10년 모으면', `약 ${korean(fv10) || won(fv10)} (연 3.5%)`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${pay && month / pay > 0.15 ? '월 실수령액의 15%가 넘어요. 생활비·저축을 먼저 떼어 두고 남은 돈 안에서 즐기면 오래 덕질할 수 있어요.' : '덕질 예산을 정해 두고 가계부 문화·여가에 적으면 넘기 전에 알 수 있어요.'}</p>`;
}
// ── 대출 한도 (카카오페이 '예상 대출 조건'처럼): DSR = 모든 대출의 1년 원리금 ÷ 연소득. 은행 40%, 2금융권 50% 안에서 빌릴 수 있어요 ──
function loanLimit() {
  const inc = val('ll_inc'), credit = seg('ll_kind') === 'credit', rate = val('ll_rate'), stress = Math.max(0, val('ll_stress')), exist = val('ll_exist'), dsr = seg('ll_dsr') === 'second' ? 0.5 : 0.4, out = document.getElementById('ll_out');
  const years = credit ? 5 : Math.max(1, Math.min(50, val('ll_term'))), n = years * 12; // 신용대출은 DSR을 셀 때 5년에 나눠 갚는다고 봐요
  if (!inc) { out.innerHTML = '연소득을 넣어 주세요.'; return; }
  const yearPay = inc * dsr - exist;
  if (yearPay <= 0) { out.innerHTML = `<div>더 빌릴 수 있는 돈</div><div class="big">0원</div><p style="font-size:13px;color:var(--muted);margin:10px 0 0">지금 대출의 1년 원리금이 이미 연소득의 ${dsr * 100}%를 넘어요. 기존 대출을 줄이거나 소득이 늘면 다시 계산해 보세요.</p>`; return; }
  const pv = (pay, r) => r ? pay * (1 - Math.pow(1 + r, -n)) / r : pay * n, pmt = (P, r) => r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
  const r1 = (rate + stress) / 100 / 12, max = Math.floor(pv(yearPay / 12, r1) / 1e5) * 1e5;
  const shown = credit ? Math.min(max, inc) : max, monthly = Math.round(pmt(shown, rate / 100 / 12)); // 보여 주는 한도를 다 빌렸을 때
  out.innerHTML = `<div>DSR ${dsr * 100}% 기준 예상 최대 한도</div><div class="big">${korean(shown) || won(shown)}</div>` +
    rows([['1년에 갚을 수 있는 원리금', won(Math.round(yearPay))], ['한도 계산에 쓴 금리', `${(rate + stress).toFixed(2)}%${stress ? ` (금리 ${rate}% + 스트레스 ${stress}%p)` : ''}`],
      ['다 빌리면 매달 갚을 돈', `${won(monthly)} (${years}년 원리금균등, 금리 ${rate}%)`], ...(credit && max > inc ? [['DSR로 계산한 한도', `${korean(max) || won(max)} (보통 연소득 안에서 나와요)`]] : [])]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${credit ? '은행 신용대출은 신용점수와 직장에 따라 보통 연소득 안에서 정해져요.' : '주택담보대출은 집값의 일정 비율(LTV)도 함께 넘을 수 없어요.'} 실제 한도와 금리는 금융회사 심사로 정해져요.</p>`;
}
// ── 내 시간 가치: 실수령액 ÷ 일하는 시간 (출퇴근까지 넣은 '진짜 시급'도) ──
function timeValue() {
  const pay = val('tv_pay'), h = Math.min(120, val('tv_h')), c = Math.min(8, val('tv_c')), price = val('tv_price'), out = document.getElementById('tv_out');
  if (!pay || !h) { out.innerHTML = '한 달 실수령액과 일하는 시간을 넣어 주세요.'; return; }
  const mh = h * 52 / 12, per = pay / mh, real = pay / (mh + c * 5 * 52 / 12);
  const hm = n => { const t = Math.round(n * 60); return t < 60 ? `${t}분` : `${Math.floor(t / 60).toLocaleString('ko-KR')}시간${t % 60 ? ` ${t % 60}분` : ''}`; };
  out.innerHTML = `<div>내 1시간의 가치</div><div class="big">${won(Math.round(per))}</div>` +
    rows([['출퇴근까지 넣은 진짜 시급', won(Math.round(real))], ['1분의 가치', won(Math.round(per / 60))], ['한 달 일하는 시간', `약 ${Math.round(mh)}시간`],
      ...(price ? [['이 물건을 사려면', `${hm(price / per)} 일해야 해요`], ['하루 8시간 기준', `약 ${(price / per / 8).toFixed(1)}일`], ['커피 한 잔(4,500원)은', `${hm(4500 / per)} 노동`]] : [])]) +
    (real < MIN_WAGE_2026 ? `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">출퇴근 시간까지 넣으면 올해 최저시급(${won(MIN_WAGE_2026)})보다 낮아요.</p>` : '');
}
function assetRank() {
  const net = val('ar_net'), age = NET_AGE[seg('ar_age')] || NET_AGE.y39, out = document.getElementById('ar_out');
  if (!net && net !== 0) { out.innerHTML = '순자산을 넣어 주세요.'; return; }
  const t = assetTop(net), man = v => korean(Math.abs(v) * 10000) || '0원';
  const cmp = (base, label) => [`${label} ${man(base)}보다`, Math.abs(net / 10000 - base) < 1 ? '거의 같아요' : `${man(net / 10000 - base)} ${net / 10000 >= base ? '많아요' : '적어요'}`];
  const next = NET_RANK.find(([v, top]) => v * 10000 > net && top < t - 0.05 && v % 10000 === 0); // 바로 위 단계 (1억·2억·3억처럼 딱 떨어지는 금액)
  // 뱅크샐러드처럼 피라미드 위에 내 자리를 점선으로
  const yPos = Math.max(6, Math.min(94, t)); // 위에서부터 %
  out.innerHTML = `<div>우리나라 가구 중</div><div class="big">상위 ${topText(t)}</div>
    <div class="ar-pyr" aria-hidden="true"><svg viewBox="0 0 200 120"><polygon points="100,4 196,116 4,116" class="ar-tri"/><polygon points="100,4 ${100 + 96 * yPos / 100},${4 + 112 * yPos / 100} ${100 - 96 * yPos / 100},${4 + 112 * yPos / 100}" class="ar-top"/><line x1="0" x2="200" y1="${4 + 112 * yPos / 100}" y2="${4 + 112 * yPos / 100}" class="ar-line"/></svg><span style="top:${((4 + 112 * yPos / 100) / 1.2).toFixed(1)}%">나</span></div>` +
    rows([['순자산 (자산 − 부채)', won(net)], cmp(NET_MEDIAN, '가운데(중위) 가구'), cmp(NET_AVG, '평균 가구'), cmp(age[1], `가구주 ${age[0]} 평균`),
      ...(next ? [[`상위 ${topText(next[1])}까지`, `${man(next[0] - net / 10000)} 더 모으면 돼요`]] : [])]) +
    `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">가구 기준이에요. 혼자 살면 내 순자산, 가족과 함께라면 가구 전체 순자산을 넣어야 정확해요.${t < 10 ? ' 상위 10% 안쪽은 공식 경계가 없어서 어림한 값이에요.' : ''}</p>`;
}
function salaryRank() {
  const year = (seg('sr_mode') === 'month' ? val('sr_amt') * 12 : val('sr_amt')) / 10000, out = document.getElementById('sr_out');
  if (!year) { out.innerHTML = '연봉이나 월급을 넣어 주세요.'; return; }
  const t = salaryTop(year), people = 21078535, above = Math.round(people * t / 100 / 10000);
  const diff = year - SALARY_AVG;
  out.innerHTML = `<div>2024년 근로소득자 2,108만 명 중</div><div class="big">상위 ${topText(t)}</div>
    <div class="rank-bar" aria-hidden="true"><i style="left:${Math.min(99, Math.max(1, 100 - t))}%"></i></div><div class="rank-ends"><span>하위</span><span>상위</span></div>` +
    rows([['연봉 (세전 총급여)', won(year * 10000)], ['나보다 많이 버는 사람', t < 0.1 ? '약 2만 명 이내' : `약 ${above.toLocaleString('ko-KR')}만 명`],
      ['평균 연봉 4,475만 원보다', `${korean(Math.abs(diff) * 10000) || '거의 같아요'} ${Math.abs(diff) < 1 ? '' : diff >= 0 ? '많아요' : '적어요'}`], ['가운데(중위) 연봉 3,388만 원보다', `${korean(Math.abs(year - SALARY_MID) * 10000) || '거의 같아요'} ${Math.abs(year - SALARY_MID) < 1 ? '' : year >= SALARY_MID ? '많아요' : '적어요'}`]]);
}

// ── ISA 절세: 일반 계좌(이자·배당 15.4%)와 ISA(비과세 한도 뒤 9.9% 분리과세) 세금 비교. 2026년 현행 기준 ──
const ISA_FREE = { general: 2000000, low: 4000000 }; // 비과세 한도: 일반형 200만, 서민형·농어민형 400만 원
function isaCalc() {
  const type = seg('is_type'), r = val('is_r') / 100, y = Math.max(1, Math.min(30, Math.round(val('is_y'))));
  const want = val('is_amt'), yearly = Math.min(want, 20000000); // 납입 한도: 1년 2,000만 원, 총 1억 원
  let bal = 0, paid = 0;
  for (let i = 0; i < y; i++) { const add = Math.min(yearly, 100000000 - paid); paid += add; bal = (bal + add) * (1 + r); } // 해마다 초에 넣는다고 보고 계산
  const gain = bal - paid, free = ISA_FREE[type] || ISA_FREE.general;
  const normalTax = Math.max(0, gain) * 0.154, isaTax = Math.max(0, gain - free) * 0.099;
  return { y, want, yearly, paid, bal, gain, free, normalTax, isaTax, saved: normalTax - isaTax };
}
function isa() {
  const o = isaCalc(), out = document.getElementById('is_out');
  if (!o.yearly) { out.innerHTML = '1년에 넣을 돈을 넣어 주세요.'; return; }
  const note = t => `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">${t}</p>`;
  out.innerHTML = `<div>ISA로 아끼는 세금</div><div class="big">${won(o.saved)}</div>` +
    rows([['넣은 돈 (원금)', won(o.paid)], [`${o.y}년 뒤 평가액 (세전)`, won(o.bal)], ['수익', won(o.gain)],
      ['일반 계좌였다면 세금 (15.4%)', won(o.normalTax)], [`ISA 세금 (${o.free / 10000}만 원까지 0원, 넘는 부분 9.9%)`, won(o.isaTax)], ['ISA 세후 받는 돈', won(o.bal - o.isaTax)]]) +
    (o.want > 20000000 ? note('ISA는 1년에 2,000만 원까지만 넣을 수 있어서 2,000만 원으로 계산했어요.') : '') +
    (o.paid < o.yearly * o.y ? note('ISA는 모두 합쳐 1억 원까지만 넣을 수 있어서, 1억 원을 넘는 부분은 빼고 계산했어요.') : '') +
    (o.y < 3 ? note('ISA는 3년 이상 유지해야 세금 혜택을 받아요. 3년 전에 해지하면 일반 계좌처럼 세금을 내요.') : '');
}

// ── 연금저축·IRP: 세액공제 환급액 + 모은 돈으로 받는 연금. 2026년 현행 기준 ──
function pensionCalc() {
  const pay = val('pn_pay'), ps = val('pn_ps'), irp = val('pn_irp'), r = val('pn_r') / 100;
  const y = Math.max(1, Math.min(40, Math.round(val('pn_y')))), n = Math.max(1, Math.min(40, Math.round(val('pn_n'))));
  const base = Math.min(Math.min(ps, 6000000) + irp, 9000000); // 공제 한도: 연금저축 600만, IRP 합쳐 900만 원
  const rate = pay > 55000000 ? 0.132 : 0.165; // 총급여 5,500만 원 이하 16.5%, 넘으면 13.2% (지방소득세 포함)
  const refund = Math.floor(base * rate);
  let bal = 0;
  for (let i = 0; i < y; i++) bal = (bal + ps + irp) * (1 + r);
  // IRP 계좌 수수료: 은행 IRP는 보통 연 0.1~0.5%가 잔액에서 빠져요. 수수료 0% 계좌와 비교해요
  const fee = Math.max(0, Math.min(3, val('pn_fee'))) / 100;
  let i0 = 0, i1 = 0;
  for (let i = 0; i < y; i++) { i0 = (i0 + irp) * (1 + r); i1 = (i1 + irp) * (1 + r) * (1 - fee); }
  const feeLoss = Math.max(0, i0 - i1);
  const paid = (ps + irp) * y, mr = r / 12, m = n * 12;
  const monthly = bal ? (mr ? bal * mr / (1 - Math.pow(1 + mr, -m)) : bal / m) : 0; // 받는 동안에도 같은 수익률로 굴린다고 봐요
  const freeShare = bal ? Math.min(1, (ps + irp - base) * y / bal) : 0; // 세액공제를 안 받은 원금은 받을 때 세금이 없어요
  const tax = monthly * (1 - freeShare) * 0.055; // 연금소득세: 55~69세 5.5% (70대 4.4%, 80세 이상 3.3%)
  return { pay, ps, irp, y, n, base, rate, refund, bal, paid, monthly, fee, feeLoss, net: monthly - tax, over: monthly * 12 * (1 - freeShare) > 15000000, room: Math.max(0, 9000000 - base), psOver: ps > 6000000 };
}
function pension() {
  const o = pensionCalc(), out = document.getElementById('pn_out');
  if (!o.ps && !o.irp) { out.innerHTML = '연금저축이나 IRP에 1년에 넣을 돈을 넣어 주세요.'; return; }
  const note = t => `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">${t}</p>`;
  out.innerHTML = `<div>연말정산에서 매년 돌려받는 돈</div><div class="big">${won(o.refund)} <small>/ 년</small></div>` +
    rows([['세액공제 받는 금액', won(o.base)], ['공제율', o.rate === 0.165 ? '16.5% (총급여 5,500만 원 이하)' : '13.2% (총급여 5,500만 원 초과)'], [`${o.y}년 동안 돌려받는 돈`, won(o.refund * o.y)],
      ['넣은 돈 (원금)', won(o.paid)], [`${o.y}년 뒤 모인 돈 (세전)`, won(o.bal)], [`${o.n}년 동안 매달 받는 연금 (세전)`, won(o.monthly)], ['연금소득세 뺀 금액 (55~69세 기준)', won(o.net)]]) +
    (o.irp && o.fee ? `<p class="pn-fee"><b>IRP 수수료 연 ${+(o.fee * 100).toFixed(2)}%면 ${o.y}년 동안 약 ${won(Math.round(o.feeLoss / 1e4) * 1e4)}이 수수료로 빠져요.</b>수수료 0원 계좌(증권사 다이렉트 IRP 등)로 <b>해지 말고 '계좌 이전'</b>을 하면 세금 없이 옮길 수 있어요. <a href="/guide/irp-transfer/">IRP 계좌 이전 6단계 ›</a></p>` : '') +
    (o.psOver ? note('연금저축은 600만 원까지만 세액공제를 받아요. 넘는 돈은 IRP에 넣어야 900만 원까지 채울 수 있어요.') : '') +
    (o.over ? note('세금이 붙는 연금이 1년에 1,500만 원을 넘으면, 16.5% 분리과세와 종합과세 중 하나를 골라야 해요. 받는 기간을 늘려 1년에 받는 금액을 줄이면 저율(3.3~5.5%)로 받을 수 있어요.') : '');
}

// ── 법인세: 2026년 1월 1일 이후 시작하는 사업연도부터 전 구간 1%p 인상 (2025년 12월 국회 통과) ──
const CORP_BRACKETS = { // [구간 상한(원), 세율]
  2026: [[2e8, 0.10], [2e10, 0.20], [3e11, 0.22], [Infinity, 0.25]],
  2025: [[2e8, 0.09], [2e10, 0.19], [3e11, 0.21], [Infinity, 0.24]],
};
function corpTax(base, year) {
  let tax = 0, low = 0;
  for (const [top, r] of CORP_BRACKETS[year] || CORP_BRACKETS[2026]) { if (base > low) tax += (Math.min(base, top) - low) * r; low = top; }
  return Math.floor(tax);
}
// 종합소득세는 연말정산 계산기와 같은 세율표(TAX_BRACKETS)와 incomeTaxOf()를 써요
const marginalRate = base => TAX_BRACKETS.find(b => Math.max(base, 0) <= b[0])[1];
function corporateTax() {
  const base = val('ct_base'), year = seg('ct_year') === '2025' ? 2025 : 2026, out = document.getElementById('ct_out');
  if (!base) { out.innerHTML = '과세표준(세금을 매기는 이익)을 넣어 주세요.'; return; }
  const tax = corpTax(base, year), local = Math.floor(tax * 0.1), other = corpTax(base, year === 2026 ? 2025 : 2026);
  out.innerHTML = `<div>내야 할 법인세 (지방소득세 포함)</div><div class="big">${won(tax + local)}</div>` +
    rows([['법인세', won(tax)], ['법인 지방소득세 (10%)', won(local)], ['실제 세율', pct((tax + local) / base * 100, 2)],
      [year === 2026 ? '2025년 세율이었다면' : '2026년 세율이면', `${won(Math.floor(other * 1.1))} (${year === 2026 ? '+' : '-'}${won(Math.abs(tax - other) * 1.1)})`]]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">중소기업 세액감면·공제, 최저한세는 빼고 계산했어요. 실제 신고는 세무사와 확인하세요.</p>`;
}
function incomeTaxCalc() {
  const mode = seg('it_mode'), income = val('it_income'), cost = val('it_cost'), fam = Math.max(1, Math.round(val('it_fam'))), extra = val('it_extra');
  const profit = Math.max(0, income - cost), base = Math.max(0, profit - 1500000 * fam - extra);
  const calc = Math.floor(incomeTaxOf(base)), final = Math.max(0, calc - 70000); // 표준세액공제 7만 원
  const owe = Math.floor(final * 1.1), paid = mode === 'free' ? Math.floor(income * 0.03) + Math.floor(income * 0.003) : 0; // 프리랜서: 3% + 지방 0.3% 원천징수
  return { mode, income, cost, profit, base, calc, final, owe, paid, diff: paid - owe, rate: marginalRate(base) };
}
function incomeTax() {
  const o = incomeTaxCalc(), out = document.getElementById('it_out');
  if (!o.income) { out.innerHTML = '1년 수입을 넣어 주세요.'; return; }
  const head = o.mode === 'free' ? (o.diff >= 0 ? ['5월에 돌려받는 돈', o.diff] : ['5월에 더 내야 할 돈', -o.diff]) : ['내야 할 종합소득세 (지방소득세 포함)', o.owe];
  out.innerHTML = `<div>${head[0]}</div><div class="big">${won(head[1])}</div>` +
    rows([['소득금액 (수입 - 경비)', won(o.profit)], ['과세표준 (공제 뺀 금액)', won(o.base)], ['적용 세율 구간', pct(o.rate * 100, 0)],
      ['종합소득세', won(o.final)], ['지방소득세 (10%)', won(o.owe - o.final)], ...(o.mode === 'free' ? [['이미 떼인 세금 (3.3%)', won(o.paid)]] : [])]) +
    `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">기본공제(1인 150만 원)와 표준세액공제 7만 원만 넣은 어림값이에요. 다른 소득이 있거나 감면을 받으면 달라져요.</p>`;
}

// ── 투자 계산: 해외주식 양도세 · ETF 보수 비교 · 손실 회복 수익률 · 금융소득종합과세 ──
const smallNote = t => `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">${t}</p>`;
function overseasTaxCalc() {
  const gain = val('os_gain'), loss = val('os_loss'), fee = val('os_fee'), net = gain - loss - fee, base = Math.max(0, net - 2500000);
  const tax = Math.floor(base * 0.2), local = Math.floor(base * 0.02);
  return { gain, loss, fee, net, base, tax, local, total: tax + local };
}
function overseasTax() {
  const o = overseasTaxCalc(), out = document.getElementById('os_out');
  if (!o.gain && !o.loss) { out.innerHTML = '올해 판 종목의 수익을 넣어 주세요.'; return; }
  out.innerHTML = `<div>내야 할 양도소득세 (지방소득세 포함)</div><div class="big">${won(o.total)}</div>` +
    rows([['순수익 (수익 - 손실 - 경비)', (o.net < 0 ? '-' : '') + won(Math.abs(o.net))], ['기본공제', o.net > 0 ? '-' + won(Math.min(2500000, o.net)) : '0원'], ['과세표준', won(o.base)],
      ['양도소득세 (20%)', won(o.tax)], ['지방소득세 (2%)', won(o.local)]]) +
    (o.net < 0 ? smallNote('손실이 더 커서 세금이 없어요. 해외주식 손실은 다음 해로 넘어가지 않아요.') : '') + smallNote('다음 해 5월 1~31일에 홈택스에서 신고해요.');
}
const fvMonthly = (init, add, yearRate, years) => {
  const n = Math.round(years * 12), i = Math.pow(1 + yearRate, 1 / 12) - 1;
  return i === 0 ? init + add * n : init * Math.pow(1 + i, n) + add * (Math.pow(1 + i, n) - 1) / i;
};
function etfFeeCalc() {
  const init = val('ef_init'), add = val('ef_add'), r = val('ef_r') / 100, y = Math.min(60, Math.max(0, val('ef_y'))), a = val('ef_a') / 100, b = val('ef_b') / 100;
  const put = init + add * Math.round(y * 12), A = fvMonthly(init, add, r - a, y), B = fvMonthly(init, add, r - b, y), zero = fvMonthly(init, add, r, y);
  return { init, add, r, y, a, b, put, A, B, zero };
}
function etfFee() {
  const o = etfFeeCalc(), out = document.getElementById('ef_out');
  if (!o.y || !(o.init + o.add)) { out.innerHTML = '투자금과 기간을 넣어 주세요.'; return; }
  const lo = Math.min(o.a, o.b), cheap = o.a <= o.b ? 'A' : 'B', diff = Math.abs(o.A - o.B), p = n => pct(n * 100, 2);
  out.innerHTML = `<div>${o.a === o.b ? '두 ETF의 차이' : `${o.y}년 뒤 보수 낮은 ${cheap} ETF가 더 받는 돈`}</div><div class="big">${won(diff)}</div>` +
    rows([[`A ETF (보수 ${p(o.a)})`, won(o.A)], [`B ETF (보수 ${p(o.b)})`, won(o.B)], ['넣은 돈 합계', won(o.put)],
      [`보수 ${p(lo)}로 덜 불어난 돈`, won(o.zero - Math.max(o.A, o.B))], [`보수 ${p(Math.max(o.a, o.b))}로 덜 불어난 돈`, won(o.zero - Math.min(o.A, o.B))]]);
}
function lossRecoveryCalc() {
  const mode = seg('lr_mode'), buy = val('lr_buy'), now = val('lr_now');
  const loss = mode === 'price' ? (buy > 0 ? Math.max(0, 1 - now / buy) : 0) : Math.min(99.99, Math.max(0, val('lr_loss'))) / 100;
  const need = loss >= 1 ? Infinity : 1 / (1 - loss) - 1, r = val('lr_r') / 100;
  const years = r > 0 && loss > 0 ? Math.log(1 / (1 - loss)) / Math.log(1 + r) : 0;
  return { mode, buy, now, loss, need, r, years };
}
function lossRecovery() {
  const o = lossRecoveryCalc(), out = document.getElementById('lr_out');
  document.querySelectorAll('#loss-recovery [data-mode]').forEach(d => d.hidden = d.dataset.mode !== o.mode);
  if (o.mode === 'price' && (!o.buy || !o.now)) { out.innerHTML = '매수가와 현재가를 넣어 주세요.'; return; }
  if (o.mode === 'price' && o.now >= o.buy) { out.innerHTML = `<div>지금 수익 중이에요</div><div class="big">+${pct((o.now / o.buy - 1) * 100, 2)}</div>`; return; }
  if (!o.loss) { out.innerHTML = '손실률을 넣어 주세요.'; return; }
  const yr = o.years ? (o.years < 1 ? `약 ${Math.max(1, Math.round(o.years * 12))}개월` : `약 ${o.years.toFixed(1).replace(/\.0$/, '')}년`) : '-';
  const table = [10, 20, 30, 50, 70, 90].map(l => [`-${l}%`, `+${pct((1 / (1 - l / 100) - 1) * 100, 1)}`]);
  out.innerHTML = `<div>본전까지 올라야 하는 비율</div><div class="big">+${pct(o.need * 100, 2)}</div>` +
    rows([['지금 손실률', '-' + pct(o.loss * 100, 2)], ...(o.mode === 'price' ? [['본전 가격', won(o.buy)], ['올라야 하는 금액 (1주)', won(o.buy - o.now)]] : []),
      [`연 ${pct(o.r * 100, 1)}씩 오르면 걸리는 시간`, yr]]) +
    `<p style="font-size:13px;font-weight:600;margin:16px 0 0">손실률별 본전 상승률</p>` + rows(table);
}
function finIncomeCalc() {
  const I = val('fi_int'), D = val('fi_div'), F = I + D, mode = seg('fi_mode'), Y = mode === 'pay' ? val('fi_pay') : 0;
  // 직장인 과세표준 어림: 총급여 - 근로소득공제 - 본인 기본공제 - 4대보험료(국민연금 4.75%·건강 약 3.94%·고용 0.9%)
  const B = Y ? Math.max(0, Y - earnedDed(Y) - 1.5e6 - Y * 0.0959) : 0, TH = 2e7;
  const withheld = Math.floor(F * 0.14), base = incomeTaxOf(B);
  let total = base + withheld, over = F > TH, gen = 0, cmp = 0;
  if (over) {
    gen = TH * 0.14 + incomeTaxOf(B + F - TH);   // ① 2천만 원까지 14%, 넘는 부분은 다른 소득과 합쳐 누진세율
    cmp = F * 0.14 + base;                        // ② 금융소득 전부 14% + 다른 소득 누진세율
    total = Math.max(gen, cmp);
  }
  const extra = Math.max(0, Math.floor((total - base - withheld) * 1.1));
  return { I, D, F, Y, B, mode, over, withheld, extra, gen, cmp, rateAll: F ? (F * 0.154 + extra) / F : 0 };
}
function finIncome() {
  const o = finIncomeCalc(), out = document.getElementById('fi_out');
  document.querySelectorAll('#financial-income-tax [data-mode]').forEach(d => d.hidden = d.dataset.mode !== o.mode);
  if (!o.F) { out.innerHTML = '1년 이자나 배당을 넣어 주세요.'; return; }
  if (!o.over) {
    out.innerHTML = `<div>종합과세 대상이 아니에요</div><div class="big">더 낼 세금 0원</div>` +
      rows([['금융소득 합계', won(o.F)], ['2,000만 원까지 남은 금액', won(2e7 - o.F)], ['받을 때 뗀 세금 (15.4%)', won(Math.floor(o.F * 0.154))]]) +
      smallNote('받을 때 15.4%를 떼는 것으로 끝나요. 다른 사람과 합치지 않고 한 사람씩 계산해요.');
    return;
  }
  out.innerHTML = `<div>5월에 더 낼 세금 (지방소득세 포함, 어림)</div><div class="big">${won(o.extra)}</div>` +
    rows([['금융소득 합계', won(o.F)], ['2,000만 원을 넘은 금액', won(o.F - 2e7)], ['받을 때 이미 뗀 세금 (15.4%)', won(Math.floor(o.F * 0.154))],
      ['금융소득 실제 세율', pct(o.rateAll * 100, 1)], ...(o.Y ? [['다른 소득 과세표준 (어림)', won(o.B)]] : [])]) +
    (o.extra ? '' : smallNote('넘는 부분의 세율이 14%보다 높지 않아서, 이미 뗀 세금 말고 더 낼 돈이 없어요.')) +
    (o.Y ? smallNote('직장인은 월급 말고 다른 소득이 2,000만 원을 넘으면 건강보험료(소득월액보험료)가 따로 붙어요.') : smallNote('피부양자는 금융소득이 많으면 건강보험 피부양자에서 빠질 수 있어요.'));
}

const calc = { s_out: savings, d_out: deposit, l_out: loan, c_out: compound, v_out: severance, r_out: rent, x_out: vat, h_out: holidayPay, p_out: prepayment, i_out: inflation, o_out: discount, w_out: wage, g_out: goal, y_out: pyeong, q_out: percent, a_out: avgPrice, b_out: dividend, t_out: retirement, k_out: carLoan, f_out: refinance, u_out: unitPrice, e_out: fuel, n_out: dutchPay, z_out: dateCalc, m_out: salary, j_out: unemployment, ys_out: yearEnd, sr_out: salaryRank, ar_out: assetRank, tv_out: timeValue, ls_out: lumpSum, at_out: acquisitionTax, bf_out: brokerageFee, is_out: isa, pn_out: pension, ct_out: corporateTax, it_out: incomeTax, os_out: overseasTax, ef_out: etfFee, lr_out: lossRecovery, fi_out: finIncome, up_out: usedPrice, dv_out: deliveryCost, fb_out: fanBudget, jc_out: jeonseCheck, sc_out: subscriptionScore, ll_out: loanLimit };
// ── 한 줄 정리: 결과 숫자가 "나한테 무슨 뜻인지" 알려 주는 문장 ──
const pct = (n, d = 1) => n.toLocaleString('ko-KR', { maximumFractionDigits: d }) + '%';
const MIN_WAGE_2026 = 10320; // 2026년 최저시급
const insights = {
  os_out() {
    const o = overseasTaxCalc();
    if (o.net <= 0) return '';
    if (o.net <= 2500000) return `수익이 기본공제 250만 원 안이라 세금이 없어요. 올해 ${won(2500000 - o.net)}까지는 더 팔아도 세금이 0원이에요.`;
    return `손실 난 종목을 올해 안에 100만 원어치 정리하면 세금이 약 ${won(Math.min(o.base, 1000000) * 0.22)} 줄어요. 수익을 해마다 250만 원씩 나눠 팔면 매년 공제를 받아요.`;
  },
  ef_out() {
    const o = etfFeeCalc();
    if (!o.y || o.a === o.b) return '';
    const hi = Math.max(o.a, o.b), lo = Math.min(o.a, o.b), d = Math.abs(o.A - o.B);
    return `보수 차이는 ${pct((hi - lo) * 100, 2)}p뿐이지만, ${o.y}년 동안 쌓이면 넣은 돈의 ${pct(d / o.put * 100, 1)}만큼 차이가 나요.`;
  },
  lr_out() {
    const o = lossRecoveryCalc();
    if (!o.loss || o.loss >= 1) return '';
    return `손실이 ${pct(o.loss * 100, 0)}일 때 본전까지는 ${pct(o.need * 100, 0)}가 필요해요. 손실이 커질수록 필요한 상승률은 훨씬 빨리 커져요.`;
  },
  fi_out() {
    const o = finIncomeCalc();
    if (!o.F) return '';
    if (!o.over) return o.F > 1.5e7 ? `2,000만 원까지 ${won(2e7 - o.F)} 남았어요. 넘을 것 같으면 ISA나 연금저축 계좌로 나눠 보세요.` : '';
    return `ISA·연금저축 계좌 안에서 생긴 이자·배당은 2,000만 원 계산에 들어가지 않아요. 넘는 ${won(o.F - 2e7)} 중 일부라도 옮기면 종합과세되는 금액이 줄어요.`;
  },
  ct_out() {
    const base = val('ct_base');
    if (!base) return '';
    const corp = corpTax(base, seg('ct_year') === '2025' ? 2025 : 2026) * 1.1, personal = Math.floor(incomeTaxOf(base)) * 1.1;
    if (personal <= corp) return `같은 이익이면 개인사업자 종합소득세(약 ${won(personal)})가 더 적거나 비슷해요. 이익이 작을 때는 법인이 꼭 유리하진 않아요.`;
    return `같은 이익을 개인사업자로 내면 종합소득세가 약 ${won(personal)}으로, 법인보다 ${won(personal - corp)} 많아요. 다만 법인 돈을 대표가 가져갈 때는 급여·배당 세금이 따로 붙어요.`;
  },
  it_out() {
    const o = incomeTaxCalc();
    if (!o.income || !o.base) return '';
    return `경비 영수증을 100만 원 더 챙기면 세금이 약 ${won(Math.round(1000000 * o.rate * 1.1))} 줄어요. (지금 구간 세율 ${Math.round(o.rate * 100)}% 기준)`;
  },
  is_out() {
    const o = isaCalc();
    if (!o.yearly || o.bal <= 0) return '';
    const move = Math.min(o.bal * 0.1, 3000000);
    return `만기 후 연금저축·IRP로 옮기면 옮긴 돈의 10%(최대 300만 원)를 연금 세액공제에 더 넣을 수 있어요. 다 옮기면 약 ${won(move * 0.132)}~${won(move * 0.165)}을 한 번 더 돌려받아요.`;
  },
  pn_out() {
    const o = pensionCalc();
    if (!o.ps && !o.irp) return '';
    return o.room > 0 ? `IRP에 ${korean(o.room) || won(o.room)} 더 넣으면, 1년에 ${won(Math.floor(o.room * o.rate))}을 더 돌려받아요. (한도 900만 원)`
      : '세액공제 한도 900만 원을 꽉 채웠어요. 55세 전에 중도 해지하면 공제받은 돈과 수익에 16.5% 세금이 붙으니 오래 두는 게 좋아요.';
  },
  sr_out() {
    const year = (seg('sr_mode') === 'month' ? val('sr_amt') * 12 : val('sr_amt')) / 10000;
    if (!year) return '';
    const t = salaryTop(year), goal = [50, 30, 20, 10, 5, 1].find(g => g < t - 0.05);
    if (!goal) return '상위 1% 안이에요. 근로소득자 100명 중 가장 많이 버는 1명이에요.';
    const need = salaryAt(goal) - year;
    return `상위 ${goal}%에 들려면 연봉이 약 ${korean(Math.round(salaryAt(goal)) * 10000)}이어야 해요. 지금보다 ${korean(Math.round(need) * 10000) || '조금'} 더 필요해요.`;
  },
  s_out() {
    const P = val('s_amt'), n = Math.floor(val('s_n')), r = val('s_r'), tax = num(seg('s_tax')) / 100;
    if (!P || !n || !r) return '';
    const net = P * (r / 1200) * n * (n + 1) / 2 * (1 - tax);
    return `연 ${pct(r, 2)} 적금이지만, 넣은 돈 대비 실제로 받는 이자는 ${pct(net / (P * n) * 100, 2)}예요. 매달 나눠 넣어서 늦게 넣은 돈은 이자를 덜 받기 때문이에요.`;
  },
  d_out() {
    const A = val('d_amt'), n = Math.min(600, Math.floor(val('d_n'))), r = val('d_r') / 100, tax = num(seg('d_tax')) / 100;
    if (!A || !n || !r) return '';
    return `세금을 떼면 한 달에 약 ${won(A * r / 12 * (1 - tax))}씩 이자가 생기는 셈이에요.`;
  },
  l_out() {
    const L = val('l_amt'), n = Math.max(1, Math.floor(val('l_n'))), i = val('l_r') / 1200, type = seg('l_type');
    if (!L || !i) return '';
    const eq = (L * i / (1 - Math.pow(1 + i, -n))) * n - L, pr = L * i * (n + 1) / 2, bu = L * i * n;
    const mine = { equal: eq, principal: pr, bullet: bu }[type];
    if (type === 'principal') return `총 이자가 원금의 ${pct(mine / L * 100)}예요. 세 가지 방식 중 이자가 가장 적은 방식이에요.`;
    return `총 이자가 원금의 ${pct(mine / L * 100)}예요. 원금균등으로 갚으면 총 이자를 ${won(mine - pr)} 아낄 수 있어요.`;
  },
  c_out() {
    const r = val('c_r');
    if (!r) return '';
    return `연 ${pct(r)} 수익이면 약 ${(72 / r).toFixed(1)}년마다 돈이 두 배가 돼요 (72의 법칙). 일찍 시작할수록 복리 효과가 커져요.`;
  },
  v_out() {
    const out = document.getElementById('v_out'), daily = out.querySelector('.rows div:last-child b');
    if (!daily) return '';
    return `일한 1년마다 30일 치 평균임금(약 ${won(num(daily.textContent) * 30)})씩 퇴직금이 쌓이는 셈이에요.`;
  },
  r_out() {
    const r = val('r_rate') / 100;
    if (!r) return '';
    return seg('r_mode') === 'toMonthly'
      ? `보증금을 1,000만 원 더 내면 월세가 약 ${won(10000000 * r / 12)} 줄어요.`
      : `월세 1만 원은 보증금 약 ${won(10000 * 12 / r)}과 같은 값이에요.`;
  },
  x_out() {
    return seg('x_mode') === 'total' ? '부가세는 합계금액의 약 9.09%(11분의 1)예요. 합계를 1.1로 나누면 공급가액이 나와요.' : '공급가액에 1.1을 곱하면 부가세가 포함된 합계금액이에요.';
  },
  h_out() {
    const wage = val('h_wage'), h = val('h_hours');
    if (!wage || !h) return '';
    if (h < 15) return `주 15시간만 채우면 일주일에 주휴수당 ${won(15 / 40 * 8 * wage)}을 더 받을 수 있어요.`;
    const weekly = wage * h + Math.min(h, 40) / 40 * 8 * wage;
    return `주휴수당까지 합치면 실제 시급은 ${won(weekly / h)}으로 오르는 셈이에요.`;
  },
  p_out() {
    const out = document.getElementById('p_out'), b = out.querySelectorAll('.rows b');
    if (b.length < 3) return '';
    const total = num(b[1].textContent), A = val('p_amt'), rate = val('p_rate') / 100;
    return `하루 늦게 갚을 때마다 수수료가 약 ${won(A * rate / total)}씩 줄어요. 한 달 뒤에 갚으면 약 ${won(A * rate * 30 / total)}을 아껴요.`;
  },
  i_out() {
    const r = val('i_rate');
    if (!r) return '';
    return `돈의 가치를 지키려면 적어도 연 ${pct(r)}보다 높은 이자나 수익을 받아야 해요.`;
  },
  o_out() {
    if (seg('o_mode') === 'rate') {
      const L = val('o_list'), S = val('o_sale');
      return L && S && S < L ? `정가의 ${pct(S / L * 100)}만 내고 사는 거예요.` : '';
    }
    const r1 = val('o_rate'), r2 = val('o_rate2');
    if (!r2) return '';
    return `할인율을 그냥 더한 ${pct(r1 + r2)}가 아니라 ${pct((1 - (1 - r1 / 100) * (1 - r2 / 100)) * 100)}만큼 할인돼요. 쿠폰은 이미 깎인 가격에서 한 번 더 깎아 주기 때문이에요.`;
  },
  w_out() {
    const out = document.getElementById('w_out'), b = out.querySelector('.rows b');
    if (!b) return '';
    const hour = num(b.textContent), diff = hour - MIN_WAGE_2026;
    if (Math.abs(diff) < 1) return '2026년 최저시급(10,320원)과 같아요.';
    return diff > 0 ? `2026년 최저시급(10,320원)보다 시간당 ${won(diff)} 많아요.` : `2026년 최저시급(10,320원)보다 시간당 ${won(-diff)} 적어요. 근로계약 조건을 꼭 확인해 보세요.`;
  },
  m_out() {
    const s = salaryInput();
    if (!s.month) return '';
    const r = takeHome(s.month, s.free, s.fam, s.kids, s.rate, s.cut), raise = takeHome(s.month + Math.round(10000000 / (s.sev ? 13 : 12)), s.free, s.fam, s.kids, s.rate, s.cut);
    return `세전 월급의 ${pct(r.net / s.month * 100)}를 받아요. 연봉이 1,000만 원 오르면 한 달 실수령액은 약 ${won(Math.round((raise.net - r.net) / 1000) * 1000)} 늘어요.`;
  },
  j_out() {
    const M = val('j_pay'), big = document.querySelector('#j_out .big');
    if (!M || !big) return '';
    const month = Math.floor(num(big.dataset.final || big.textContent) / jobDays()) * 30;
    return `한 달에 약 ${won(month)}을 받아요. 그만두기 전 세전 월급의 ${pct(month / M * 100, 0)} 정도이고, 실업급여는 세금을 떼지 않아요.`;
  },
  ys_out() {
    const o = yearEndInput();
    if (!o.pay) return '';
    const r = yearEndTax(o), used = o.credit + o.debit;
    if (used < r.th) return `카드 공제는 총급여의 25%(${won(r.th)})를 넘게 쓴 돈부터 시작돼요. 아직 ${won(r.th - used)} 더 써야 공제가 시작돼요.`;
    const more = r.tax - yearEndTax(Object.assign({}, o, { pension: o.pension + 1e6 })).tax;
    if (more > 0 && o.pension + 1e6 <= 9e6) return `연금저축·IRP에 100만 원을 더 넣으면 세금이 약 ${won(Math.round(more * 1.1 / 100) * 100)} 더 줄어요 (지방소득세 포함).`;
    return '25%를 넘게 쓴 다음부터는 신용카드(15%)보다 체크카드·현금영수증(30%)이 공제를 두 배 받아요.';
  },
  g_out() {
    const big = document.querySelector('#g_out .big');
    if (!big) return '';
    const P = num(big.textContent);
    return P ? `하루로 치면 약 ${won(P / 30.44)}씩 모으면 돼요.` : '';
  },
  y_out() {
    const m2 = seg('y_mode') === 'm2' ? val('y_area') : val('y_area') * 400 / 121, price = val('y_price');
    if (!m2) return '';
    if (price > 0) return `1평(약 3.3㎡)이 ${won(price / (m2 * 121 / 400))}이라는 뜻이에요.`;
    return `대략 가로세로 ${Math.sqrt(m2).toFixed(1)}m인 정사각형 크기예요.`;
  },
  q_out() {
    const mode = seg('q_mode'), A = val('q_a'), B = val('q_b');
    if (mode === 'change' && A && B) return `다시 처음 값으로 돌아가려면 ${pct(Math.abs(A / B - 1) * 100, 2)} ${B > A ? '내려야' : '올라야'} 해요. 오르고 내릴 때 기준이 달라서 그래요.`;
    if (mode === 'ratio' && A && B && A < B) return `대략 ${(B / A).toFixed(1)}분의 1이에요.`;
    return '';
  },
  a_out() {
    const p1 = val('a_p1'), q1 = val('a_q1'), p2 = val('a_p2'), q2 = val('a_q2'), now = val('a_now') || p2;
    if (!(q1 + q2) || !now) return '';
    const avg = (p1 * q1 + p2 * q2) / (q1 + q2);
    return avg > now ? `원금을 되찾으려면 주가가 평균 단가 ${won(avg)}까지, 지금보다 ${pct((avg / now - 1) * 100)} 올라야 해요.` : `지금 가격이 평균 단가보다 높아서 수익 중이에요.`;
  },
  b_out() {
    const r = val('b_rate'), keep = 1 - num(seg('b_tax')) / 100;
    if (!r) return '';
    if (seg('b_mode') === 'income') return `세금을 떼면 실제 배당수익률은 연 ${pct(r * keep, 2)}예요.`;
    const need = val('b_want') * 12 / keep / (r / 100), need2 = val('b_want') * 12 / keep / ((r + 1) / 100);
    return `배당수익률이 1%p 높은 ${pct(r + 1)}라면 필요한 돈이 약 ${won(need - need2)} 줄어요.`;
  },
  t_out() {
    const big = document.querySelector('#t_out .big'), until = val('t_until');
    if (!big || !until) return '';
    return `은퇴까지 ${until}년 동안 이자 없이 모은다면 매달 약 ${won(num(big.textContent) / (until * 12))}이 필요해요. 투자로 불리면 이보다 적게 모아도 돼요.`;
  },
  k_out() {
    const price = val('k_price'), down = val('k_down'), n = num(seg('k_n')), i = val('k_r') / 1200, L = price - down;
    if (L <= 0 || !i) return '';
    const interest = x => (x * i / (1 - Math.pow(1 + i, -n))) * n - x;
    return `총 이자는 차값의 ${pct(interest(L) / price * 100)}예요. 선수금을 100만 원 더 내면 총 이자가 약 ${won(interest(L) - interest(Math.max(0, L - 1000000)))} 줄어요.`;
  },
  f_out() {
    const L = val('f_amt'), n = Math.round(val('f_n')), oldR = val('f_old');
    if (!L || !n) return '';
    const pay = r => { const i = r / 1200; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); };
    const extra = L * val('f_fee') / 100 + val('f_cost'), saveAt = r => (pay(oldR) - pay(r)) * n - extra;
    if (saveAt(0) <= 0) return '수수료와 비용이 너무 커서, 금리가 0%여도 갈아타는 게 손해예요.';
    let lo = 0, hi = oldR; // 이득과 손해가 갈리는 금리를 찾아요
    for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; saveAt(mid) > 0 ? lo = mid : hi = mid; }
    return `수수료와 비용까지 따지면, 새 대출 금리가 연 ${lo.toFixed(2)}%보다 낮아야 갈아타는 게 이득이에요.`;
  },
  u_out() {
    const per = seg('u_unit') === '개' ? 1 : 100;
    const items = ['A', 'B', 'C'].map(n => ({ n, p: val('u_p' + n), t: val('u_v' + n) * (val('u_c' + n) || 1) })).filter(x => x.p > 0 && x.t > 0);
    if (items.length < 2) return '';
    items.forEach(x => x.u = x.p / x.t);
    items.sort((a, b) => a.u - b.u);
    const best = items[0], worst = items[items.length - 1];
    if (worst.u === best.u) return '단가가 똑같아요. 필요한 양에 맞춰 고르면 돼요.';
    return `상품 ${best.n}만큼의 양을 상품 ${worst.n}로 사면 ${won((worst.u - best.u) * best.t)}을 더 내야 해요.`;
  },
  e_out() {
    if (seg('e_mode') !== 'cost') return '';
    const km = val('e_km') * num(seg('e_trip')), eff = val('e_eff'), price = val('e_price');
    if (!km || !eff || !price) return '';
    return `연비가 1km/L만 좋아져도 이번 이동에서 약 ${won(km / eff * price - km / (eff + 1) * price)}을 아껴요.`;
  },
  n_out() {
    const total = val('n_total'), ppl = Math.max(1, Math.round(val('n_ppl'))), tip = num(seg('n_tip')) / 100, unit = num(seg('n_unit'));
    const each = total * (1 + tip) / ppl, rounded = Math.ceil(Math.round(each) / unit) * unit;
    if (!total) return '';
    return rounded - each < 0.5 ? '딱 나누어떨어져서 남는 돈이 없어요.' : `한 사람당 ${won(rounded - each)}씩만 더 내면, 계산한 사람이 손해 보지 않아요.`;
  },
  z_out() {
    if (seg('z_mode') !== 'dday') return '';
    const v = document.querySelector('input[data-k="z_target"]').value;
    if (!v) return '';
    const now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), t = Date.parse(v + 'T00:00:00Z');
    if (t <= today) return '';
    let work = 0;
    for (let d = today + 86400000; d <= t; d += 86400000) { const w = new Date(d).getUTCDay(); if (w && w < 6) work++; }
    return `오늘을 빼고 주말을 제외하면 평일은 ${work}일 남았어요 (공휴일은 따로 빼 주세요).`;
  },
};
function addInsight(id) {
  const out = document.getElementById(id);
  if (!insights[id] || !out.querySelector('.big')) return;
  const s = insights[id]();
  if (s) out.insertAdjacentHTML('beforeend', `<p class="insight"><b>한 줄 정리</b>${s}</p>`);
}
function runAll() { for (const id in calc) if (document.getElementById(id)) { calc[id](); addInsight(id); } afterRun(); }

// 입력할 때 콤마 자동 표시
document.querySelectorAll('input[inputmode="numeric"]').forEach(el => {
  el.addEventListener('input', () => {
    const d = el.value.replace(/[^0-9]/g, '');
    el.value = d ? Number(d).toLocaleString('ko-KR') : '';
  });
});
document.addEventListener('input', runAll);
document.querySelectorAll('.seg').forEach(g => g.addEventListener('click', e => {
  const t = e.target.closest('button'); // 버튼 안 작은 글씨(예: 고령자·장애인·경력단절)를 눌러도 눌리게
  if (!t || !g.contains(t)) return;
  g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t));
  runAll();
}));

// 지금 보고 있는 계산기 메뉴에 색 칠하기
document.querySelectorAll('nav a, .mm-tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === location.pathname));
// 휴대폰에서 메뉴가 옆으로 길 때, 지금 메뉴가 보이도록 밀어 두기
const onNav = document.querySelector('nav a.on');
if (onNav) onNav.parentElement.scrollLeft = onNav.offsetLeft - onNav.parentElement.offsetLeft - 16;

// ── 결과 공유: 입력한 값을 링크 뒤에 붙여서, 받은 사람도 같은 결과를 보게 해요 ──
function readState() {
  const q = new URLSearchParams();
  document.querySelectorAll('input[data-k]').forEach(el => {
    const v = el.inputMode === 'numeric' ? el.value.replace(/[^0-9]/g, '') : el.value.trim();
    if (v !== '') q.set(el.dataset.k, v);
  });
  document.querySelectorAll('.seg[data-k]').forEach(g => { const on = g.querySelector('.on'); if (on) q.set(g.dataset.k, on.dataset.v); });
  return q;
}
function applyState(q) {
  let used = false;
  document.querySelectorAll('input[data-k]').forEach(el => {
    if (!q.has(el.dataset.k)) return;
    const v = q.get(el.dataset.k);
    el.value = el.inputMode === 'numeric' && /^\d+$/.test(v) ? Number(v).toLocaleString('ko-KR') : v;
    used = true;
  });
  document.querySelectorAll('.seg[data-k]').forEach(g => {
    const b = q.has(g.dataset.k) && g.querySelector(`button[data-v="${CSS.escape(q.get(g.dataset.k))}"]`);
    if (b) { g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); used = true; }
  });
  if (document.querySelector('.seg[data-k="q_mode"]')) percentMode = seg('q_mode'); // 퍼센트 계산기가 예시 숫자로 덮어쓰지 않게
  return used;
}
// ── 가계부 연속 기록: 기록이 있는 날이 오늘(또는 어제)까지 며칠 이어졌는지 세요. 따로 저장하지 않고 기록 날짜로 계산해요 ──
const STREAK_BADGES = [[3, '🌱', '새싹'], [7, '🔥', '일주일'], [14, '⭐', '2주'], [30, '🏅', '한 달'], [100, '👑', '100일']];
// 연속 기록에 들어가는 날: 가계부에 적은 날 + 무지출 도장 찍은 날 + 복구권으로 채운 날
// (미라클하지 않아도 괜찮아요: 안 쓴 날도 기록이고, 하루 빠지면 복구권으로 이어 가요)
const readRestore = () => { try { const r = JSON.parse(localStorage.getItem('donsem:restore')); return r && Array.isArray(r.used) ? r : { used: [] }; } catch (e) { return { used: [] }; } };
function streakDays(entries) {
  const days = new Set((entries || []).map(e => e.date));
  try { const ns = JSON.parse(localStorage.getItem('donsem:nospend')); if (ns && Array.isArray(ns.days)) ns.days.forEach(x => days.add(x)); } catch (e) { /* 없으면 넘어가요 */ }
  readRestore().used.forEach(x => days.add(x));
  return days;
}
// 복구권: 기록한 날 7일마다 1장 (최대 2장까지 모아 둬요). 어제만 비었으면 어제를 채울 수 있어요
function restoreInfo(entries) {
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const r = readRestore(), days = streakDays(entries), real = days.size - r.used.length;
  const tickets = Math.max(0, Math.min(2, Math.floor(real / 7) - r.used.length));
  const t = new Date(), y1 = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1), y2 = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 2);
  return { tickets, gap: !days.has(ymd(y1)) && days.has(ymd(y2)) ? ymd(y1) : null };
}
function useRestore(day) {
  const r = readRestore();
  if (!r.used.includes(day)) r.used = [...r.used, day].sort();
  try { localStorage.setItem('donsem:restore', JSON.stringify(r)); return true; } catch (e) { return false; }
}
function budgetStreak(entries) {
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const days = streakDays(entries), d = new Date();
  const recordedToday = days.has(ymd(d));
  if (!recordedToday) d.setDate(d.getDate() - 1); // 오늘 아직 안 썼어도 어제까지 이어졌으면 끊긴 게 아니에요
  let current = 0;
  while (days.has(ymd(d))) { current++; d.setDate(d.getDate() - 1); }
  let best = 0, run = 0, prev = null;
  [...days].filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort().forEach(x => {
    const t = Date.parse(x + 'T00:00:00Z');
    run = prev !== null && t - prev === 864e5 ? run + 1 : 1; prev = t; best = Math.max(best, run);
  });
  return { current, best, recordedToday, next: STREAK_BADGES.find(([n]) => n > current) };
}
// 방금 기록으로 배지를 새로 받았으면 축하 문구를, 아니면 ''를 돌려줘요
function streakCheer(before, entries) {
  const after = budgetStreak(entries);
  if (after.current <= before.current || after.current <= before.best) return '';
  const hit = STREAK_BADGES.find(([n]) => n === after.current);
  return hit ? `${hit[1]} ${hit[0]}일 연속 기록! '${hit[2]}' 배지를 받았어요` : '';
}

// 알림은 한 번에 하나만: 이미 떠 있으면 새 글자로 바꿔 끼우고 시간을 다시 세요 (빠르게 여러 번 눌러도 겹치지 않게)
let toastEl = null, toastHide = 0, toastGone = 0;
function toast(msg) {
  clearTimeout(toastHide); clearTimeout(toastGone);
  if (toastEl && toastEl.isConnected) {
    toastEl.textContent = msg;
    toastEl.classList.remove('bump'); void toastEl.offsetWidth; toastEl.classList.add('bump', 'show'); // 살짝 통 튀며 글자만 바뀌어요
  } else {
    toastEl = document.createElement('div');
    toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.textContent = msg; document.body.appendChild(toastEl);
    const t = toastEl; setTimeout(() => t.classList.add('show'), 10);
  }
  const t = toastEl;
  toastHide = setTimeout(() => { t.classList.remove('show'); toastGone = setTimeout(() => { t.remove(); if (toastEl === t) toastEl = null; }, 300); }, 2200);
}
async function copyLink(url, btn) {
  try { await navigator.clipboard.writeText(url); }
  catch (e) { const a = document.createElement('textarea'); a.value = url; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  toast('링크를 복사했어요. 카톡이나 문자에 붙여 넣으세요.');
  if (btn) doneMark(btn, '복사됨');
}
// 아이폰 같은 손맛 ⑧: 누른 버튼 글자가 잠깐 '✓ 복사됨'으로 바뀌었다가 돌아와요
function doneMark(btn, text) {
  if (btn.dataset.label === undefined) btn.dataset.label = btn.textContent;
  clearTimeout(btn.doneT);
  btn.textContent = '✓ ' + text; btn.classList.add('done');
  btn.doneT = setTimeout(() => { btn.textContent = btn.dataset.label; delete btn.dataset.label; btn.classList.remove('done'); }, 1600);
}
// ── 토스처럼 편하게 ①: 하던 것 기억하기 (이 기기 브라우저에만 저장돼요) ──
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장이 막힌 브라우저 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 저장이 막힌 브라우저 */ } },
};
const SAVE_KEY = 'donsem:last:' + location.pathname, RECENT_KEY = 'donsem:recent';
let ready = false;
function remember() {
  if (!ready || !result) return;
  store.set(SAVE_KEY, readState().toString());
  const d0 = new Date();
  store.set('donsem:daily-calc', `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`); // '오늘의 돈셈' ③ 계산기 하나 따져 보기
  markDailyFull();
  const big = result.querySelector('.big');
  let list = [];
  try { list = JSON.parse(store.get(RECENT_KEY)) || []; } catch (e) { list = []; }
  list = list.filter(x => x.p !== location.pathname);
  list.unshift({ p: location.pathname, name: document.querySelector('.card h1').textContent.trim(), big: big ? big.textContent.trim() : '' });
  store.set(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
}

// ── 토스처럼 편하게 ②: 금액을 한글로 읽어 주기 (100,000,000 → 1억 원) ──
function korean(n) {
  n = Math.floor(n);
  if (n < 10000) return '';
  const parts = [], jo = Math.floor(n / 1e12), eok = Math.floor(n % 1e12 / 1e8), man = Math.floor(n % 1e8 / 1e4), rest = n % 1e4;
  if (jo) parts.push(jo.toLocaleString('ko-KR') + '조');
  if (eok) parts.push(eok.toLocaleString('ko-KR') + '억');
  if (man) parts.push(man.toLocaleString('ko-KR') + '만');
  if (rest) parts.push(rest.toLocaleString('ko-KR'));
  return parts.join(' ') + (rest ? '원' : ' 원');
}
// ── 토스처럼 편하게 ③: 빠른 금액 버튼 (+10만, +100만 …) ──
const moneyInputs = [...document.querySelectorAll('.card .field')]
  .filter(f => !f.closest('.pair') && f.querySelector('span') && f.querySelector('span').textContent.trim() === '원')
  .map(f => f.querySelector('input'));
moneyInputs.forEach(el => {
  const base = num(el.defaultValue);
  const steps = base >= 10000000 ? [[1e6, '+100만'], [1e7, '+1000만'], [1e8, '+1억']] : base >= 100000 ? [[1e4, '+1만'], [1e5, '+10만'], [1e6, '+100만']] : [];
  const below = document.createElement('div');
  below.className = 'below';
  below.innerHTML = (steps.length ? '<div class="quick">' + steps.map(([v, t]) => `<button type="button" data-add="${v}">${t}</button>`).join('') + '<button type="button" data-add="clear">지우기</button></div>' : '') + '<span class="krw" aria-live="polite"></span>';
  el.closest('.field').after(below);
  below.addEventListener('click', e => {
    const add = e.target.dataset && e.target.dataset.add;
    if (!add) return;
    el.value = add === 'clear' ? '' : (num(el.value) + Number(add)).toLocaleString('ko-KR');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (add === 'clear') el.focus();
  });
});
// ── 토스처럼 편하게 ④: 어려운 말 풀이 (칸 이름 옆 ? 버튼) ──
const GLOSSARY = [
  ['이자 방식', '단리는 넣은 돈에만 이자가 붙고, 월복리는 매달 붙은 이자에도 다시 이자가 붙어요. 같은 금리면 월복리가 조금 더 받아요.'],
  ['과세', '이자에 붙는 세금이에요. 보통은 15.4%를 떼고, 세금우대 상품은 9.5%, 비과세 상품은 세금이 없어요. 내 통장이 어디에 해당하는지는 가입한 은행에서 확인할 수 있어요.'],
  ['상환 방식', '원리금균등은 매달 같은 금액을 갚아요. 원금균등은 처음에 많이 갚고 점점 줄어요. 만기일시는 매달 이자만 내다가 마지막에 원금을 한 번에 갚아요.'],
  ['연 이자율', '1년 동안 붙는 이자의 비율이에요. 한 달 이자는 연 이자율을 12로 나눠서 계산해요.'],
  ['연 수익률', '1년 동안 돈이 불어나는 비율이에요. 주식, 펀드처럼 해마다 달라지는 투자는 평균으로 넣어 보세요.'],
  ['연 물가상승률', '물건값이 1년에 오르는 비율이에요. 한국은행은 2%를 목표로 해서 보통 2~3%를 넣어요.'],
  ['전월세 전환율', '전세 보증금을 월세로 바꿀 때 쓰는 1년 이율이에요. 주택은 법으로 상한이 있어서 한국은행 기준금리 + 2%p를 넘을 수 없어요.'],
  ['중도상환수수료율', '대출을 약속보다 일찍 갚을 때 내는 수수료 비율이에요. 대출 계약서나 은행 앱의 대출 상세에서 확인할 수 있어요.'],
  ['수수료 내는 기간', '중도상환수수료를 내야 하는 기간이에요. 보통 대출받은 날부터 3년이고, 이 기간이 지나면 수수료 없이 갚을 수 있어요.'],
  ['최근 3개월 월급', '세금을 떼기 전 금액(세전)이에요. 기본급에 매달 받는 수당까지 더해서 넣어 주세요.'],
  ['1년 동안 받은 상여금', '보너스처럼 1년에 몇 번 받는 돈이에요. 퇴직금에는 1년 치의 3/12만큼만 들어가요.'],
  ['1년 동안 받은 연차수당', '쓰지 못한 연차를 돈으로 받은 금액이에요. 퇴직금에는 1년 치의 3/12만큼만 들어가요.'],
  ['비과세액', '세금과 4대보험이 붙지 않는 돈이에요. 회사에서 주는 식대는 한 달 20만 원까지 비과세예요. 잘 모르면 20만 원으로 두세요.'],
  ['부양가족 수', '나를 포함해서 세금 공제를 받는 가족 수예요. 혼자면 1, 배우자와 둘이면 2를 넣어요. 소득이 많은 가족(1년 소득 100만 원 초과, 월급만 받으면 총급여 500만 원 초과)은 빼요.'],
  ['8~20세 자녀 수', '부양가족 중 8세 이상 20세 이하 자녀 수예요. 한 명이면 매달 떼는 세금이 20,830원 줄어요.'],
  ['연봉에 퇴직금', '"퇴직금 포함" 연봉이면 1년 치를 13으로 나눠 매달 주고, 남은 1/13은 퇴직금으로 쌓아요. 근로계약서에 퇴직금 포함이라고 적혀 있을 때만 바꾸세요.'],
  ['그만두기 전 3개월 평균 월급', '세금 떼기 전(세전) 금액이에요. 기본급에 매달 받던 수당까지 더해서 넣어 주세요.'],
  ['고용보험 가입기간', '고용보험에 가입해 일한 기간이에요. 여러 회사를 다녔다면 합칠 수 있어요(예전 회사에서 실업급여를 받았다면 그 전 기간은 빠져요). 고용24에서 확인할 수 있어요.'],
  ['하루 근무시간', '근로계약서에 적힌 하루 일하는 시간(소정근로시간)이에요. 8시간보다 짧으면 하루 하한액도 그만큼 줄어요.'],
  ['총급여', '1년 동안 받은 돈 중 비과세(식대 등)를 뺀 금액이에요. 상여금도 들어가요. 원천징수영수증의 "총급여"와 같아요.'],
  ['이미 낸 소득세', '1년 동안 월급에서 미리 뗀 소득세 합계예요. 급여명세서의 소득세 × 12로 넣거나, 모르면 비워 두세요. 지방소득세는 빼고 넣어 주세요.'],
  ['8세 이상 자녀 수', '기본공제를 받는 8세 이상(보통 20세 이하) 자녀예요. 첫째 25만 원, 둘째 30만 원, 셋째부터 40만 원씩 세금을 깎아 줘요.'],
  ['체크카드', '체크카드와 현금영수증은 신용카드보다 공제율이 두 배(30%)예요. 대중교통, 전통시장은 여기에 넣어도 돼요.'],
  ['연금저축', '연금저축과 IRP에 넣은 돈은 1년에 900만 원까지 세금을 돌려받아요 (총급여 5,500만 원 이하 15%, 넘으면 12%).'],
  ['월세 낸 돈', '무주택 세대주가 총급여 8,000만 원 이하일 때 받아요. 주민등록 주소가 그 집이어야 해요.'],
  ['의료비', '총급여의 3%를 넘게 쓴 의료비부터 15%를 돌려받아요. 실손보험으로 돌려받은 돈은 빼고 넣어 주세요.'],
  ['보장성 보험료', '실손·암보험처럼 다치거나 아플 때 받는 보험이에요. 1년 100만 원까지 12%를 돌려받아요.'],
  ['일주일 근무시간', '쉬는 시간을 뺀, 일하기로 약속한 시간이에요. 하루 5시간씩 주 4일이면 20시간이에요.'],
  ['할부 금리', '할부로 낸 돈에 붙는 1년 이율이에요. 카드사나 캐피탈의 할부 조건에서 확인할 수 있어요.'],
  ['선수금', '차를 살 때 처음에 한 번에 내는 돈이에요. 많이 낼수록 할부 원금과 이자가 줄어요.'],
  ['배당수익률', '주가 대비 1년에 받는 배당금 비율이에요. 주식 앱에서 종목마다 확인할 수 있어요.'],
  ['지금 가진 주식의 평균 단가', '지금까지 산 주식의 평균 가격(평단가)이에요. 증권 앱의 잔고 화면에 나와요.'],
  ['그 밖의 비용', '새 대출을 받을 때 드는 인지세, 근저당 설정비 같은 돈이에요. 없거나 모르면 0으로 둬도 돼요.'],
  ['연비', '기름 1L로 갈 수 있는 거리예요. 계기판이나 자동차 설명서에서 확인할 수 있어요.'],
  ['단위', 'g·ml는 100g(100ml)당 가격으로, 개는 1개당 가격으로 비교해요.'],
  ['맞출 단위', '한 사람당 금액을 이 단위로 올려서 맞춰요. 계산한 사람이 모자란 돈을 채우지 않아도 돼요.'],
];
document.querySelectorAll('.card label').forEach(label => {
  const text = label.textContent.trim(), hit = GLOSSARY.find(([k]) => text.startsWith(k));
  if (!hit) return;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'info'; btn.textContent = '?';
  btn.setAttribute('aria-label', `${hit[0]} 설명 보기`); btn.setAttribute('aria-expanded', 'false');
  label.append(btn);
  btn.addEventListener('click', e => {
    e.preventDefault();
    const open = label.nextElementSibling && label.nextElementSibling.classList.contains('tip');
    if (open) label.nextElementSibling.remove();
    else { const tip = document.createElement('p'); tip.className = 'tip'; tip.textContent = hit[1]; label.after(tip); }
    btn.setAttribute('aria-expanded', String(!open));
  });
});

// ── 토스처럼 편하게 ⑤: 결과 숫자가 아이폰처럼 자리마다 또르르 굴러가며 바뀌기 ──
// 바뀐 자리 숫자만 <span>으로 감싸 굴려요. 글자 자체는 그대로라 저장·공유·엑셀은 최종 숫자를 읽어요
const calmMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastBig = null;
// ── 토스처럼 숫자가 '좌라락' 굴러가며 바뀌어요 ──
// 글자를 쪼개서 줄 안에 넣으면 아이폰에서 숫자가 처졌어요. 그래서 진짜 글자는 그대로 두고(잠깐 투명하게),
// 그 위에 같은 자리·같은 크기로 숫자 띠를 겹쳐서 굴린 뒤, 다 굴러가면 띠를 치워요.
function rollText(el, from) {
  const node = el.firstChild;
  if (calmMotion || !el.animate || !node || node.nodeType !== 3 || from == null) return;
  const to = node.textContent;
  if (from === to) return;
  const toDigits = to.replace(/[^\d]/g, ''), fromDigits = String(from).replace(/[^\d]/g, '');
  if (!toDigits) return;
  if (el._odo) { el._odo.remove(); el._odo = null; }
  const host = el.parentElement; // 띠는 글자 옆(부모 안)에 겹쳐요 — 글자 안에 넣으면 복사·공유되는 글자에 섞여요
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const box = host.getBoundingClientRect(), up = Number(toDigits) >= Number(fromDigits || 0);
  const layer = document.createElement('span');
  layer.className = 'odo'; layer.setAttribute('aria-hidden', 'true');
  layer.style.color = getComputedStyle(el).color;
  const range = document.createRange();
  let di = toDigits.length; // 오른쪽(일의 자리)부터 자리를 맞춰 비교해요
  const cols = [];
  for (let i = to.length - 1; i >= 0; i--) {
    const ch = to[i];
    range.setStart(node, i); range.setEnd(node, i + 1);
    const r = range.getClientRects()[0];
    if (!r || !r.width) continue;
    const col = document.createElement('span');
    col.className = 'odo-col';
    const pad = r.height * 0.15; // 글자 양옆이 잘리지 않게 칸을 조금 넓히고 그만큼 안쪽으로 밀어요
    col.style.cssText = `left:${r.left - box.left - pad}px;top:${r.top - box.top}px;width:${r.width + pad * 2}px;padding-left:${pad}px;height:${r.height}px;line-height:${r.height}px`;
    if (/\d/.test(ch)) {
      di--;
      const oldCh = fromDigits[fromDigits.length - (toDigits.length - di)];
      const a = oldCh === undefined ? 0 : Number(oldCh), z = Number(ch);
      if (oldCh !== undefined && a === z) { col.textContent = ch; cols.push(col); continue; }
      // 지나가는 숫자들을 띠로 세워요 (올라갈 땐 a→z, 내려갈 땐 거꾸로), 한 바퀴 이상 돌면 더 길게
      const seq = [], steps = ((up ? z - a : a - z) + 10) % 10 || 10, turns = Math.min(toDigits.length - 1 - di, 1);
      for (let k = 0; k <= steps + turns * 10; k++) seq.push((up ? a + k : a - k + 100) % 10);
      const strip = document.createElement('span');
      strip.className = 'odo-strip';
      strip.innerHTML = seq.map(n => `<span>${n}</span>`).join('');
      col.append(strip); cols.push(col);
      const dist = (seq.length - 1) * r.height, delay = Math.min(toDigits.length - 1 - di, 8) * 35;
      strip.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }],
        { duration: 650 + (toDigits.length - 1 - di) * 40, delay, easing: 'cubic-bezier(.2, .9, .25, 1)', fill: 'both' });
    } else { col.textContent = ch; cols.push(col); }
  }
  layer.append(...cols);
  ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'fontVariantNumeric'].forEach(k => { layer.style[k] = getComputedStyle(el)[k]; });
  host.append(layer); el._odo = layer;
  el.classList.add('odo-on');
  clearTimeout(el._odoT);
  el._odoT = setTimeout(() => { layer.remove(); if (el._odo === layer) { el._odo = null; el.classList.remove('odo-on'); } }, 1100);
}
// 다른 화면(가계부·자산 합계)에서도 숫자를 바꿀 때 굴려요
function setRoll(el, text) {
  if (!el) return;
  const from = el.dataset.rollFrom ?? null;
  el.textContent = text; el.dataset.rollFrom = text;
  rollText(el, from);
}
function animateBig() {
  const big = document.querySelector('.card .result .big');
  if (!big) { lastBig = null; return; }
  const node = big.firstChild;
  const m = node && node.nodeType === 3 && node.textContent.match(/[\d,]+(\.\d+)?/);
  if (!m) { lastBig = null; return; }
  big.dataset.final = node.textContent;
  const to = node.textContent, from = lastBig;
  lastBig = to;
  if (from === null || from === to || !ready) return;
  rollText(big, from);
}

// ── 토스처럼 편하게 ⑥: 휴대폰에서 결과가 화면 밖에 있으면 아래에 띄워 두기 ──
let dock = null, resultVisible = true;
function updateDock() {
  const res = document.querySelector('.card .result');
  if (!res) return;
  if (!dock) {
    dock = document.createElement('button');
    dock.type = 'button'; dock.className = 'dock'; dock.setAttribute('aria-label', '계산 결과로 이동');
    dock.innerHTML = '<span class="dock-label"></span><b class="dock-value"></b><span class="dock-go">결과 보기 ↓</span>';
    dock.addEventListener('click', () => res.scrollIntoView({ behavior: calmMotion ? 'auto' : 'smooth', block: 'center' }));
    document.body.append(dock);
    new IntersectionObserver(([e]) => { resultVisible = e.isIntersecting; dock.classList.toggle('show', !resultVisible && !!res.querySelector('.big')); }).observe(res);
  }
  const head = res.querySelector('div'), big = res.querySelector('.big');
  dock.querySelector('.dock-label').textContent = head ? head.textContent.trim() : '';
  dock.querySelector('.dock-value').textContent = big ? big.textContent.trim() : '';
  dock.classList.toggle('show', !resultVisible && !!big);
}

function afterRun() {
  moneyInputs.forEach(el => { el.closest('.field').nextElementSibling.querySelector('.krw').textContent = korean(num(el.value)); });
  animateBig();
  updateDock();
  remember();
  if (window.updateNext) window.updateNext(); // 숫자를 바꾸면 추천 링크의 숫자도 같이
  if (window.updateSave) window.updateSave(); // 저장하기 버튼의 금액도 같이
}

const result = document.querySelector('.card .result');
if (result) {
  const defaults = readState().toString();
  const fromLink = applyState(new URLSearchParams(location.search));
  const note = document.createElement('p');
  note.className = 'shared-note';
  if (fromLink) {
    note.textContent = '공유받은 링크로 열려서, 보낸 사람이 입력한 숫자로 계산했어요.';
    result.before(note);
  } else {
    const saved = store.get(SAVE_KEY);
    if (saved && saved !== defaults && applyState(new URLSearchParams(saved))) {
      note.innerHTML = '지난번에 입력한 숫자를 불러왔어요. <button type="button" class="reset">처음 값으로</button>';
      note.querySelector('.reset').addEventListener('click', () => { store.del(SAVE_KEY); location.replace(location.pathname); });
      result.before(note);
    }
  }
  const bar = document.createElement('div');
  bar.className = 'share';
  bar.innerHTML = '<button type="button" class="btn fill" data-act="share">결과 공유하기</button><button type="button" class="btn line" data-act="copy">링크 복사</button><button type="button" class="btn line" data-act="xlsx">엑셀로 저장</button>';
  result.after(bar);
  bar.addEventListener('click', async e => {
    const act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    const url = `${location.origin}${location.pathname}?${readState()}`;
    const head = result.querySelector('div') ? result.querySelector('div').textContent.trim() : '';
    const big = result.querySelector('.big') ? result.querySelector('.big').textContent.trim() : '';
    const name = document.querySelector('.card h1').textContent.trim();
    if (act === 'xlsx') { saveXlsx(name, url); return doneMark(e.target, '저장됨'); }
    if (act === 'share' && navigator.share) {
      try { await navigator.share({ title: `${name} - 돈셈`, text: `[돈셈 ${name}] ${head} ${big}`, url }); } catch (err) { /* 공유 창을 닫은 경우 */ }
    } else copyLink(url, e.target);
  });
}
runAll();
ready = true;
remember(); // 이 계산기를 '최근 쓴 계산기'에 올려요

// 첫 화면: 최근 쓴 계산기
if (document.body.classList.contains('home')) {
  let list = [];
  try { list = JSON.parse(store.get(RECENT_KEY)) || []; } catch (e) { list = []; }
  if (list.length) {
    const sec = document.createElement('section');
    sec.className = 'group recent';
    sec.innerHTML = '<h2>최근 쓴 계산기</h2><div class="tiles"></div>';
    list.forEach(x => {
      const a = document.createElement('a');
      a.className = 'tile'; a.href = x.p;
      a.innerHTML = '<h3></h3><p></p><span class="go">이어서 계산하기 ›</span>';
      a.querySelector('h3').textContent = x.name;
      a.querySelector('p').textContent = x.big ? '최근 결과 ' + x.big : '';
      sec.querySelector('.tiles').append(a);
    });
    (document.querySelector('.duo') || document.getElementById('daily') || document.querySelector('.hero')).after(sec); // 첫 화면 큰 칸들 다음에
  }
}

// ── 앱처럼 쓰기: 홈 화면에 추가하면 주소창 없이 열리고, 인터넷이 끊겨도 열려요 ──
if ('serviceWorker' in navigator) {
  // 사이트를 새로 올리면 처음 한 번은 기기에 보관된 옛 화면이 떠요 → 새 파일을 다 받으면(열고 10초 안이면) 한 번 새로 고쳐서 바로 새 화면을 보여 줘요
  const had = !!navigator.serviceWorker.controller, t0 = Date.now();
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had && Date.now() - t0 < 10000 && !document.querySelector('input:focus, textarea:focus')) location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* 지원하지 않는 환경 */ }));
}
const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const INSTALL_KEY = 'donsem:install-dismissed';
function installCard(html) {
  if (standalone || store.get(INSTALL_KEY) || document.querySelector('.install')) return null;
  const anchor = document.querySelector('.hero') || document.querySelector('#budget, #assets'); // 첫 화면, 가계부, 내 자산에서만 보여 줘요
  if (!anchor) return null;
  const el = document.createElement('div');
  el.className = 'install';
  el.innerHTML = html + '<button type="button" class="install-x" aria-label="안내 닫기">×</button>';
  anchor.after(el);
  el.querySelector('.install-x').addEventListener('click', () => { store.set(INSTALL_KEY, '1'); el.remove(); });
  return el;
}
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  const el = installCard('<div class="install-text"><b>돈셈을 앱처럼 쓰세요</b><span>홈 화면에 아이콘을 만들어 가계부를 바로 열 수 있어요</span></div><button type="button" class="btn fill install-go">설치</button>');
  if (el) el.querySelector('.install-go').addEventListener('click', async () => {
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    installEvent = null; el.remove();
    if (choice.outcome === 'accepted') toast('홈 화면에 돈셈을 추가했어요.');
  });
});
if (isIOS && !standalone) installCard('<div class="install-text"><b>돈셈을 앱처럼 쓰세요</b><ol class="ins-steps"><li><i>1</i><svg class="ins-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg><span><b>공유</b> 버튼 누르기 <small>(안 보이면 주소창 ≡ 또는 ⋯ 안에 있어요)</small></span></li><li><i>2</i><svg class="ins-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg><span><b>홈 화면에 추가</b> 고르기</span></li></ol></div>');
window.addEventListener('appinstalled', () => { const el = document.querySelector('.install'); if (el) el.remove(); });


// ── 화면 모드 버튼: 라이트 → 다크 → 기기 설정 따라가기 ──
const THEME_KEY = 'donsem:theme';
const THEME_ICON = {
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>',
};
const THEME_NAME = { light: '라이트', dark: '다크', auto: '기기 설정 따라가기' };
// 휴대폰 맨 위(시계·배터리 줄) 색: 아이폰은 이 값이 '바뀐' 것을 잘 알아채지 못해서, 표시를 통째로 새로 갈아 끼워요
function setThemeColor(color) {
  const old = document.querySelector('meta[name="theme-color"]');
  if (old && old.content === color) return;
  const meta = document.createElement('meta');
  meta.name = 'theme-color'; meta.content = color;
  if (old) old.replaceWith(meta); else document.head.append(meta);
}
function applyTheme(t, announce) {
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  setThemeColor(dark ? '#000000' : '#ffffff');
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.querySelector('svg').innerHTML = THEME_ICON[t];
    b.setAttribute('aria-label', `화면 모드 바꾸기 (지금: ${THEME_NAME[t]})`);
    b.title = `화면 모드: ${THEME_NAME[t]}`;
  });
  if (announce) toast(t === 'auto' ? '기기 설정에 맞춰 라이트·다크가 바뀌어요.' : `${THEME_NAME[t]} 모드로 바꿨어요.`);
}
applyTheme(document.documentElement.dataset.theme || 'light', false);
document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => {
  const order = ['light', 'dark', 'auto'], next = order[(order.indexOf(document.documentElement.dataset.theme) + 1) % 3];
  store.set(THEME_KEY, next);
  applyTheme(next, true);
}));
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (document.documentElement.dataset.theme === 'auto') applyTheme('auto', false); });

// ── 휴대폰 하단 탭: 홈 · 계산기 · 부동산 · 캘린더(가계부 달력) · 마이 ── (＋기록 창은 첫 화면 '오늘 쓴 돈 정리'에서 열려요)
(() => {
  const path = location.pathname;
  const MONEY = ['/budget/', '/fixed/', '/assets/', '/goals/', '/money-calendar/'], MY = ['/my/', '/about/', '/privacy/', '/collection/'];
  const HOME = ['/', '/quiz/', '/money-type/', '/no-spend/']; // 퀴즈·돈BTI·무지출은 홈에서 들어가는 곳이라 '홈'이 켜져요 (예전엔 '계산기'가 켜졌어요)
  const ESTATE = ['/real-estate/', '/acquisition-tax/', '/brokerage-fee/', '/jeonse-check/', '/subscription-score/'];
  const SHOP = ['/shop/', '/shop/deals/', '/market/', '/shop/budget-template/', '/shop/year-end-kit/', '/shop/starter-kit/', '/shop/pay/', '/terms/', '/refund/'];
  const active = HOME.includes(path) ? 'home' : MONEY.includes(path) ? 'money' : MY.includes(path) ? 'my' : ESTATE.includes(path) ? 'estate' : SHOP.includes(path) ? 'shop' : 'calc';
  const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const tabs = [
    ['home', '/', '홈', ic('<path d="M4 10.4 12 4l8 6.4v8.6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 16.2h5"/>')], // 크림처럼 집 모양 (가운데 짧은 선은 문)
    ['calc', '/calculators/', '계산기', ic('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>')],
    ['shop', '/shop/', '쇼핑', ic('<path d="M5.8 8h12.4l1.2 12.5H4.6z"/><path d="M9 10.8V7a3 3 0 0 1 6 0v3.8"/>')], // 가운데 쇼핑 (토스처럼). 마이는 오른쪽 위 사람 아이콘으로 옮겼어요
    ['estate', '/real-estate/', '부동산', ic('<path d="M3 20.5h18"/><path d="M5 20.5v-9.5l4-1.8"/><path d="M9 20.5V5.2L15 3v17.5"/><path d="M15 9l4 1.6v9.9"/><path d="M11.4 7.6h1.2M11.4 10.8h1.2M11.4 14h1.2M11.4 17.2h1.2M6.6 14.2h.8M6.6 17.2h.8M16.6 13.4h.8M16.6 16.6h.8"/>')], // 아파트실거래가 앱처럼 아파트 건물
    ['money', '/budget/', '캘린더', ic('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')], // 누르면 가계부 달력이 맨 위에 보여요
  ];
  const bar = document.createElement('div'); // <nav>는 계산기 메뉴용 스타일이 붙어 있어서 div로
  bar.className = 'tabbar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', '아래 메뉴');
  bar.innerHTML = tabs.map(([id, href, label, svg]) => id === 'add'
    ? `<button type="button" class="tab-add" aria-label="지출이나 수입 바로 기록하기"><span>${svg}</span><span class="tab-label">${label}</span></button>`
    : `<a href="${href}" class="${id === active ? 'on' : ''}"${id === active ? ' aria-current="page"' : ''}>${svg}<span class="tab-label">${label}</span></a>`).join(''); // 글자는 따로 감싸서, 내릴 때 글자만 접혀 작아져요
  document.body.append(bar);
  document.body.classList.add('has-tabbar');

  // ── ＋기록 (머니차곡처럼): 「애플뮤직 8900」처럼 대충 써도 브랜드·분류·날짜를 알아서 채워요 ──
  const CATS = { out: ['식비', '카페·간식', '교통', '쇼핑', '생활', '주거·통신', '구독', '의료', '문화·여가', '경조사', '기타'], in: ['월급', '용돈', '부수입', '이자·배당', '기타'] };
  const H = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymdOf(new Date());
  const dayOff = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymdOf(d); };
  const W7 = '일월화수목금토';
  const dateLabel = s => s === today() ? '오늘' : s === dayOff(1) ? '어제' : s === dayOff(2) ? '그저께' : `${Number(s.slice(5, 7))}월 ${Number(s.slice(8))}일`;
  // 브랜드 (머니차곡처럼 묶음별): [그림 이름, 보일 이름, 찾을 말들, 분류, 바탕색, 글자] — 그림은 /icons/brand/그림이름.jpg (각 회사 공식 앱 아이콘)
  const BGROUPS = [
    ['카페', '카페·간식', [['gongcha', '공차', '공차 gongcha', '#B2002D', '공'], ['theventi', '더벤티', '더벤티 벤티', '#4E2A84', 'V'], ['dunkin', '던킨', '던킨 dunkin', '#FF671F', 'D'], ['megacoffee', '메가커피', '메가커피 메가mgc 메가컴피', '#FFD400', 'M'], ['bluebottle', '블루보틀', '블루보틀 bluebottle', '#0082C9', 'B'], ['paikdabang', '빽다방', '빽다방', '#FFD800', '빽'], ['starbucks', '스타벅스', '스타벅스 스벅 starbucks', '#00704A', '★'], ['woojicoffee', '우지커피', '우지커피', '#1d1d1f', 'W'], ['ediya', '이디야커피', '이디야 ediya', '#1D2A5E', 'E'], ['coffeebean', '커피빈', '커피빈 coffeebean', '#5B2C83', 'C'], ['compose', '컴포즈커피', '컴포즈', '#FFC400', 'C'], ['tomntoms', '탐앤탐스', '탐앤탐스 탐탐', '#3B1F14', 'T'], ['tenpercent', '텐퍼센트', '텐퍼센트 텐퍼', '#E4572E', '10'], ['twosome', '투썸플레이스', '투썸 twosome', '#D6001C', 'T'], ['paulbassett', '폴바셋', '폴바셋', '#1d1d1f', 'P'], ['hollys', '할리스', '할리스 hollys', '#C8102E', 'H']]],
    ['패스트푸드', '식비', [['lotteria', '롯데리아', '롯데리아 롯리', '#E60012', 'L'], ['momstouch', '맘스터치', '맘스터치 맘터', '#E2231A', 'M'], ['mcdonalds', '맥도날드', '맥도날드 맥날 맥도 mcdonald', '#DA291C', 'M'], ['burgerking', '버거킹', '버거킹 버킹 burgerking', '#D62300', 'B'], ['subway', '서브웨이', '서브웨이 써브웨이 subway', '#008938', 'S'], ['shakeshack', '쉐이크쉑', '쉐이크쉑 쉑쉑 shakeshack', '#1d1d1f', 'S'], ['yupdduk', '엽기떡볶이', '엽기떡볶이 엽떡', '#E60012', '엽'], ['kfc', 'KFC', 'kfc 케이에프씨', '#E4002B', 'K']]],
    ['치킨', '식비', [['kyochon', '교촌치킨', '교촌', '#A57A3A', '교'], ['goobne', '굽네치킨', '굽네', '#C8102E', '굽'], ['nene', '네네치킨', '네네치킨 네네', '#FFD200', 'N'], ['bbq', 'BBQ', 'bbq 비비큐', '#C8102E', 'B'], ['bhc', 'BHC', 'bhc', '#E60012', 'b']]],
    ['피자', '식비', [['dominos', '도미노피자', '도미노', '#006491', 'D'], ['papajohns', '파파존스', '파파존스', '#00703C', 'P'], ['pizzahut', '피자헛', '피자헛', '#EE3124', 'P']]],
    ['베이커리/디저트', '카페·간식', [['tlj', '뚜레쥬르', '뚜레쥬르', '#006B3F', 'T'], ['baskin', '배스킨라빈스', '배스킨 베라 배라', '#E1137C', 'B'], ['sulbing', '설빙', '설빙', '#7A5230', '설'], ['sungsimdang', '성심당', '성심당', '#B8001F', '성'], ['yoajung', '요아정', '요아정 요거트아이스크림', '#F49AC1', '요'], ['parisbaguette', '파리바게뜨', '파리바게뜨 파바', '#1F4FA3', 'P']]],
    ['배달앱', '식비', [['baemin', '배달의민족', '배달의민족 배민 baemin', '#2AC1BC', '배'], ['yogiyo', '요기요', '요기요 yogiyo', '#FA0050', '요'], ['coupangeats', '쿠팡이츠', '쿠팡이츠 쿠팡잇츠', '#00A5E5', '이']]],
    ['편의점', '식비', [['ministop', '미니스톱', '미니스톱', '#0055A5', 'M'], ['seveneleven', '세븐일레븐', '세븐일레븐 7eleven 세븐', '#008061', '7'], ['emart24', '이마트24', '이마트24', '#FFB81C', '24'], ['cu', 'CU', 'cu 씨유', '#652F8D', 'CU'], ['gs25', 'GS25', 'gs25 지에스25', '#00A0E2', 'GS']]],
    ['마트', '생활', [['nobrand', '노브랜드', '노브랜드', '#FFD200', 'N'], ['lottemart', '롯데마트', '롯데마트', '#ED1C24', 'L'], ['emart', '이마트', '이마트 emart', '#FFB81C', 'E'], ['costco', '코스트코', '코스트코 costco', '#E31837', 'C'], ['traders', '트레이더스', '트레이더스', '#1d1d1f', 'T'], ['hanaro', '하나로마트', '하나로마트 하나로', '#00A651', '하'], ['homeplus', '홈플러스', '홈플러스', '#E2001A', 'H']]],
    ['쇼핑', '쇼핑', [['kyobo', '교보문고', '교보문고 교보', '#3B7D23', '교', '문화·여가'], ['naverpay', '네이버쇼핑', '네이버쇼핑 네이버페이 스마트스토어 네이버플러스스토어', '#03C75A', 'N'], ['daiso', '다이소', '다이소 daiso', '#E60012', 'D', '생활'], ['daangn', '당근마켓', '당근마켓 당근', '#FF6F0F', '당'], ['musinsa', '무신사', '무신사 musinsa', '#1d1d1f', 'M'], ['muji', '무인양품', '무인양품 muji', '#7F0019', 'M'], ['samsung', '삼성전자', '삼성전자 삼성 samsung', '#1428A0', 'S'], ['artbox', '아트박스', '아트박스', '#1d1d1f', 'A'], ['oliveyoung', '올리브영', '올리브영 올영', '#86BC25', 'O'], ['uniqlo', '유니클로', '유니클로 uniqlo', '#E60012', 'U'], ['kakaopay', '카카오페이', '카카오페이', '#FFEB00', 'P', '기타'], ['coupang', '쿠팡', '쿠팡 coupang', '#E52528', 'C'], ['toss', '토스', '토스 toss', '#0064FF', 'T', '기타'], ['aliexpress', '알리익스프레스', '알리익스프레스 aliexpress 알리', '#FF4747', 'A']]],
    ['교통', '교통', [['greencar', '그린카', '그린카', '#00B050', 'G'], ['socar', '쏘카', '쏘카 socar', '#00B8FF', 'S'], ['kakaot', '카카오택시', '카카오택시 카카오t 카택', '#FFCD00', 'T'], ['korail', '코레일', '코레일 ktx korail', '#004EA2', 'K'], ['tada', '타다', '타다 tada', '#1d1d1f', 'T'], ['tmoney', '티머니', '티머니 tmoney', '#F4A100', 'T'], ['uber', '우버', '우버 uber', '#1d1d1f', 'U'], ['srt', 'SRT', 'srt', '#5A2D82', 'S'], ['gscaltex', 'GS칼텍스', 'gs칼텍스', '#00A651', 'GS'], ['skenergy', 'SK에너지', 'sk에너지', '#EA002C', 'SK'], ['soil', 'S-OIL', 's-oil 에쓰오일 에스오일', '#FFD200', 'S'], ['koreanair', '대한항공', '대한항공', '#00256C', 'K'], ['jejuair', '제주항공', '제주항공', '#FF5000', 'J']]],
    ['통신', '주거·통신', [['kt', 'KT', 'kt 케이티', '#1d1d1f', 'kt'], ['lguplus', 'LG U+', 'lgu+ 유플러스 lg유플러스 엘지유플러스', '#E6007E', 'U+'], ['skt', 'SKT', 'skt sk텔레콤', '#EA002C', 'SK']]],
    ['구독/콘텐츠', '구독', [['naverplus', '네이버플러스', '네이버플러스 네플멤 네이버멤버십', '#03C75A', 'N+'], ['netflix', '넷플릭스', '넷플릭스 넷플 netflix', '#E50914', 'N'], ['disney', '디즈니+', '디즈니 disney', '#113CCF', 'D+'], ['laftel', '라프텔', '라프텔 laftel', '#816BFF', 'L'], ['ridi', '리디', '리디 ridi', '#1E9EFF', 'R'], ['melon', '멜론', '멜론 melon', '#00CD3C', '멜'], ['spotify', '스포티파이', '스포티파이 스포티 spotify', '#1DB954', 'S'], ['watcha', '왓챠', '왓챠 watcha', '#FF0558', 'W'], ['wavve', '웨이브', '웨이브 wavve', '#1F4FFF', 'W'], ['youtube', '유튜브 프리미엄', '유튜브 유튭 youtube 유튜브프리미엄', '#FF0000', '▶'], ['coupangplay', '쿠팡플레이', '쿠팡플레이 쿠플', '#E52528', '▶'], ['tving', '티빙', '티빙 tving', '#FF153C', 'T'], ['applemusic', 'Apple Music', '애플뮤직 applemusic 애뮤 애플음악', '#FA2D48', '♪'], ['icloud', 'iCloud+', '아이클라우드 icloud 아이클라우드플러스', '#3B9BF5', '☁'], ['appletv', 'Apple TV+', '애플tv appletv 애플티비', '#1d1d1f', 'tv'], ['appleone', 'Apple', 'apple 앱스토어 appstore 애플원 appleone', '#1d1d1f', 'A', '', 'apple'], ['gemini', 'Gemini', '제미나이 제미니 gemini 구글ai 구글원ai', '#4285F4', 'G'], ['perplexity', '퍼플렉시티', '퍼플렉시티 perplexity', '#20808D', 'P'], ['copilot', 'Copilot', '코파일럿 copilot', '#0078D4', 'C'], ['grok', 'Grok', '그록 grok', '#1d1d1f', 'G'], ['youtubemusic', '유튜브 뮤직', '유튜브뮤직 유튭뮤직 youtubemusic 유뮤', '#FF0000', '▶'], ['googleone', 'Google One', '구글원 googleone 구글드라이브 구글포토', '#4285F4', '1'], ['duolingo', '듀오링고', '듀오링고 duolingo', '#58CC02', 'D'], ['canva', '캔바', '캔바 canva', '#7D2AE8', 'C'], ['dropbox', '드롭박스', '드롭박스 dropbox', '#0061FF', 'D'], ['webtoon', '네이버웹툰', '네이버웹툰 웹툰 webtoon', '#00DC64', 'W'], ['kakaopage', '카카오페이지', '카카오페이지 kakaopage', '#FFCD00', 'P'], ['series', '네이버 시리즈', '네이버시리즈 시리즈온', '#00DC64', 'S'], ['kindle', '킨들', '킨들 kindle', '#1d1d1f', 'K'], ['audible', '오디블', '오디블 audible', '#F8991C', 'A'], ['playstation', '플레이스테이션', '플레이스테이션 플스 psn ps플러스 playstation', '#0070D1', 'P'], ['discord', '디스코드', '디스코드 니트로 discord', '#5865F2', 'D'], ['instagram', '인스타그램', '인스타그램 인스타 instagram', '#E1306C', 'I'], ['x', 'X', '트위터 twitter 엑스프리미엄', '#1d1d1f', 'X'], ['linkedin', '링크드인', '링크드인 linkedin', '#0A66C2', 'in'], ['tinder', '틴더', '틴더 tinder', '#FE3C72', 'T'], ['chatgpt', 'ChatGPT', 'chatgpt 챗gpt 챗지피티 지피티 gpt openai', '#10A37F', 'G'], ['googleplay', 'Google Play', '구글플레이 googleplay 플레이스토어', '#01875F', 'G'],
      ['claude', 'Claude', 'claude 클로드', '#D97757', 'C'], ['notion', '노션', '노션 notion', '#191919', 'N'], ['adobe', '어도비', '어도비 adobe 포토샵', '#FA0F00', 'A'], ['microsoft', '마이크로소프트', '마이크로소프트 microsoft ms365 오피스365', '#0078D4', 'M'], ['google', '구글', '구글 google', '#4285F4', 'G'], ['millie', '밀리의서재', '밀리의서재 밀리', '#FFD84D', '밀'], ['coupangwow', '쿠팡 와우', '쿠팡와우 로켓와우 와우멤버십', '#E52528', 'W', '', 'coupang'], ['baeminclub', '배민클럽', '배민클럽', '#2AC1BC', '배', '', 'baemin']]],
    ['온라인쇼핑', '쇼핑', [['st11', '11번가', '11번가', '#FF0038', '11'], ['ably', '에이블리', '에이블리 ably', '#FF4C6A', 'a'], ['auction', '옥션', '옥션 auction', '#E3001B', 'A'], ['zigzag', '지그재그', '지그재그 zigzag', '#FF4185', 'Z'], ['gmarket', '지마켓', '지마켓 g마켓 gmarket', '#00A04A', 'G'], ['kurly', '컬리', '컬리 마켓컬리 kurly', '#5F0080', 'K', '생활'], ['temu', '테무', '테무 temu', '#FB7701', 'T'], ['tmon', '티몬', '티몬 tmon', '#FF5A2E', 'T'], ['ssg', 'SSG닷컴', 'ssg 쓱닷컴 에스에스지', '#FF5452', 'S'], ['ohouse', '오늘의집', '오늘의집', '#35C5F0', '오', '생활'], ['kream', '크림', 'kream 크림앱', '#1d1d1f', 'K'], ['bunjang', '번개장터', '번개장터 번장', '#1d1d1f', '번'], ['29cm', '29CM', '29cm', '#1d1d1f', '29'], ['wconcept', 'W컨셉', 'w컨셉 더블유컨셉 wconcept', '#1d1d1f', 'W']]],
    ['음악', '구독', [['bugs', '벅스', '벅스 bugs', '#FF3C5F', 'B'], ['genie', '지니뮤직', '지니뮤직 지니 genie', '#2a7de1', 'G'], ['flo', 'FLO', '플로 flo', '#3F3FFF', 'F']]],
    ['문화/여가', '문화·여가', [['life4cut', '인생네컷', '인생네컷', '#F48FB1', '4'], ['photoism', '포토이즘', '포토이즘', '#1d1d1f', 'P'], ['cgv', 'CGV', 'cgv', '#E71A0F', 'C'], ['megabox', '메가박스', '메가박스', '#352263', 'M'], ['lottecinema', '롯데시네마', '롯데시네마', '#ED1C24', 'L'], ['interpark', '인터파크', '인터파크', '#EF3E43', 'I'], ['yanolja', '야놀자', '야놀자', '#FF3478', 'Y'], ['yeogi', '여기어때', '여기어때', '#F7323F', 'Y'], ['airbnb', '에어비앤비', '에어비앤비 airbnb', '#FF5A5F', 'A'], ['yes24', '예스24', '예스24 yes24', '#1D4F91', 'Y'], ['nintendo', '닌텐도', '닌텐도 nintendo', '#E60012', 'N'], ['steam', '스팀', '스팀 steam', '#171A21', 'S']]],
    ['기타', '기타', [['naver', '네이버', '네이버 naver', '#03C75A', 'N', '쇼핑'], ['apple', '애플', '애플스토어 애플', '#1d1d1f', 'A', '구독', 'apple'], ['epost', '우체국', '우체국 우편 택배비', '#E60012', '우', '생활'], ['kakao', '카카오', '카카오 kakao 카카오톡', '#FFEB00', 'K']]],
  ];
  const BRANDS = BGROUPS.flatMap(([group, gcat, list]) => list.map(([id, name, keys, bg, ch, cat, img]) => ({ id, img: img || id, name, group, keys: keys.split(' '), cat: cat || gcat, bg, ch, fg: /^#(FF[CDE]|FFD|F[4-9A-F][9A-F])/i.test(bg) ? '#222' : '#fff' })));
  const BIMG = new Set('ably adobe airbnb aliexpress apple auction baemin baskin bbq bhc bugs burgerking cgv chatgpt claude coffeebean compose costco coupang coupangeats coupangplay cu daangn daiso disney dominos ediya emart emart24 epost flo genie gmarket gongcha goobne google googleplay greencar gs25 gscaltex hanaro hollys homeplus interpark jejuair kakao kakaopay kakaot kfc korail koreanair kt kurly kyobo kyochon laftel lguplus life4cut lottecinema lottemart lotteria mcdonalds megabox megacoffee melon microsoft millie momstouch muji musinsa naver naverpay naverplus nene netflix nintendo notion oliveyoung paikdabang papajohns parisbaguette paulbassett photoism pizzahut ridi samsung seveneleven skt socar soil spotify srt ssg st11 starbucks steam subway sulbing sungsimdang tada temu tenpercent theventi tlj tmoney tomntoms toss tving twosome uber uniqlo watcha wavve woojicoffee yanolja yeogi yes24 yoajung yogiyo youtube yupdduk zigzag applemusic icloud appletv gemini perplexity copilot grok youtubemusic googleone duolingo canva dropbox webtoon kakaopage series kindle audible playstation discord instagram x linkedin tinder ohouse kream bunjang 29cm wconcept'.split(' ')), BSVG = new Set(['apple', 'googleplay', 'microsoft', 'icloud']); // 그림이 있는 브랜드 (없으면 브랜드 색 + 글자)
  const MYB = 'donsem:qa-brands'; // 직접 추가한 브랜드 [{ name, cat }]
  const myBrands = () => { try { const a = JSON.parse(localStorage.getItem(MYB)); return Array.isArray(a) ? a.filter(x => x && x.name) : []; } catch (e) { return []; } };
  const myBrandObj = x => ({ id: 'my-' + x.name, img: '', name: x.name, group: '직접 추가', keys: [x.name], cat: x.cat || '기타', bg: '#7040A1', ch: [...x.name][0], fg: '#fff', mine: true });
  const BKEYS = BRANDS.flatMap(b => b.keys.map(k => [k, b])).sort((a, b) => b[0].length - a[0].length); // 긴 말부터 (쿠팡이츠가 쿠팡보다 먼저)
  // 브랜드가 아니어도 흔한 말로 분류를 맞춰요
  const WORDS = {
    '식비': '점심 저녁 아침 밥 식당 외식 배달 치킨 피자 햄버거 버거 떡볶이 분식 김밥 라면 편의점 회식 술 맥주 소주 고기 삼겹살 초밥 국밥 짜장 짬뽕 야식 식비 도시락 샐러드 냉면 칼국수 돈가스 파스타 쌀국수 마라탕',
    '카페·간식': '커피 카페 아메리카노 라떼 음료 디저트 케이크 빵 베이커리 아이스크림 간식 과자 쿠키 마카롱 버블티 빙수 도넛 젤리 초콜릿',
    '교통': '택시 버스 지하철 교통 기차 주유 기름 톨게이트 통행료 주차 따릉이 킥보드 비행기 항공 고속버스',
    '쇼핑': '쇼핑 옷 의류 신발 가방 화장품 액세서리 악세 향수 노트북 휴대폰 이어폰 운동화 바지 티셔츠 원피스 스타킹 양말',
    '생활': '생활 생필품 세제 휴지 마트 장보기 미용실 헤어 네일 세탁 빨래방 청소 샴푸 치약',
    '주거·통신': '월세 관리비 전기 가스 수도 전기세 가스비 수도세 인터넷 통신비 폰요금 핸드폰요금 휴대폰요금 요금제',
    '구독': '구독 멤버십 정기결제 프리미엄',
    '의료': '병원 약국 약 치과 한의원 진료 안과 피부과 정형외과 내과 검진 영양제',
    '문화·여가': '영화 공연 콘서트 전시 뮤지컬 책 도서 게임 노래방 pc방 피시방 여행 숙소 호텔 펜션 운동 헬스 필라테스 요가 수영 볼링 골프 티켓',
    '경조사': '축의금 조의금 부조 경조사 결혼식 장례식 돌잔치 선물',
  };
  const IN_WORDS = { '월급': '월급 급여 봉급 상여 보너스 성과급 인센티브', '용돈': '용돈', '이자·배당': '이자 배당', '부수입': '환급 부업 알바 알바비 중고판매 판매 부수입 캐시백 리워드 앱테크', '기타': '수입 입금' };
  const CAT_ALIAS = { '식비': '식비 밥', '카페·간식': '카페 간식 카페·간식', '교통': '교통', '쇼핑': '쇼핑 의류', '생활': '생활', '주거·통신': '주거 통신 주거·통신', '구독': '구독', '의료': '의료 병원', '문화·여가': '문화 여가 문화·여가', '경조사': '경조사', '기타': '기타' };
  const norm = s => String(s).toLowerCase().replace(/[\s·.\-_']/g, '');
  const LEARN = 'donsem:qa-learn'; // '카테고리 바꾸기'로 고른 분류를 기억해요 (다음부터 같은 이름은 그 분류로)
  const learned = () => { try { return JSON.parse(localStorage.getItem(LEARN)) || {}; } catch (e) { return {}; } };
  const brandOf = name => { const n = norm(name); if (!n) return null; const mine = myBrands().map(myBrandObj).filter(b => n.includes(norm(b.name))).sort((a, b) => b.name.length - a.name.length)[0]; if (mine) return mine; const hit = BKEYS.find(([k]) => n.includes(norm(k))); return hit ? hit[1] : null; };
  const wordCat = (name, map) => { const n = norm(name); for (const [c, ws] of Object.entries(map)) if (ws.split(' ').some(w => n.includes(norm(w)))) return c; return ''; };
  // 금액 글자 정리: 3만5천 → 35000, 1.5만 → 15000, 12,000 → 12000
  const fixNums = s => s.replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/(\d+(?:\.\d+)?)\s*만\s*(\d+)\s*천/g, (m, a, b) => String(Math.round(a * 1e4 + b * 1e3)))
    .replace(/(\d+(?:\.\d+)?)\s*만\s*(\d{1,4})(?![\d천])/g, (m, a, b) => String(Math.round(a * 1e4 + Number(b))))
    .replace(/(\d+(?:\.\d+)?)\s*(억|만|천)/g, (m, a, u) => String(Math.round(a * { 억: 1e8, 만: 1e4, 천: 1e3 }[u])));
  function pickDate(line, setD) {
    const y = new Date().getFullYear(), ok = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31;
    const md = (m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    line = line.replace(/(^|\s)(오늘|어제|그저께|그제)(?=\s|$)/, (m, p, w) => { setD(dayOff({ 오늘: 0, 어제: 1, 그제: 2, 그저께: 2 }[w])); return p + ' '; });
    line = line.replace(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/, (m, a, b) => ok(+a, +b) ? (setD(md(+a, +b)), ' ') : m);
    line = line.replace(/(^|\s)(\d{1,2})\/(\d{1,2})(?=\s|$)/, (m, p, a, b) => ok(+a, +b) ? (setD(md(+a, +b)), p + ' ') : m);
    line = line.replace(/^\s*(\d{2})(\d{2})(?=\s+\S*\D)/, (m, a, b) => ok(+a, +b) && /\d/.test(line.slice(m.length)) ? (setD(md(+a, +b)), ' ') : m); // 0701 택시 9800
    return line;
  }
  function parse(text, baseDate) {
    const items = [], learn = learned();
    String(text).split(/\n|;/).forEach((raw, li) => {
      let date = '', inst = 0, dutch = 0, line = ' ' + raw.trim() + ' ';
      if (!raw.trim()) return;
      line = pickDate(line, d => { date = d; });
      line = line.replace(/(\d{1,2})\s*개월\s*할부|할부\s*(\d{1,2})\s*개월?/, (m, a, b) => { inst = Number(a || b); return ' '; });
      line = line.replace(/(?:더치(?:페이)?|[nN엔]빵)\s*(\d{1,2})\s*명?|(\d{1,2})\s*명\s*(?:이서\s*)?(?:더치(?:페이)?|[nN엔]빵)/, (m, a, b) => { dutch = Number(a || b); return ' '; });
      line = fixNums(line);
      const re = /(^|[^\p{L}\d.])(\d+(?:\.\d+)?)\s*(?:원|₩)?(?![\p{L}\d])/gu;
      const segs = []; let last = 0, m;
      while ((m = re.exec(line))) { const st = m.index + m[1].length; segs.push({ name: line.slice(last, st), amt: Math.round(Number(m[2])) }); last = re.lastIndex; }
      const tail = line.slice(last);
      if (!segs.length) segs.push({ name: tail, amt: 0 });
      else if (tail.trim()) { const lastS = segs[segs.length - 1]; if (!lastS.name.trim()) lastS.name = tail; else lastS.name += ' ' + tail; }
      segs.forEach((s, si) => {
        let name = s.name.replace(/[:：\-–,]+/g, ' ').replace(/(^|\s)원(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim(), type = 'out', cat = '';
        if (/^\+/.test(name)) { type = 'in'; name = name.replace(/^\+\s*/, ''); }
        const first = name.split(' ')[0], rest = name.slice(first.length).trim();
        const alias = Object.entries(CAT_ALIAS).find(([, ws]) => ws.split(' ').includes(first));
        if (alias && rest) { cat = alias[0]; name = rest; }
        const brand = brandOf(name), l = learn[norm(name)] || (brand && learn['b:' + brand.name]);
        if (!cat && type === 'out' && wordCat(name, IN_WORDS) && !brand) { type = 'in'; cat = wordCat(name, IN_WORDS); }
        if (!cat && l) { type = l[0]; cat = l[1]; }
        if (!cat && type === 'in') cat = wordCat(name, IN_WORDS) || '기타';
        if (!cat) cat = (brand && brand.cat) || wordCat(name, WORDS) || '기타';
        if (!CATS[type].includes(cat)) cat = CATS[type][0];
        items.push({ key: `${li}-${si}`, name, amt: s.amt, total: s.amt, type, cat, date: date || baseDate, brand, dutch: dutch > 1 ? dutch : 0, inst: inst > 1 ? inst : 0 });
      });
    });
    items.forEach(it => { if (it.dutch) it.amt = Math.round(it.total / it.dutch); });
    return items;
  }
  const badge = (it, size = 40) => it.brand
    ? (BIMG.has(it.brand.img) ? `<img class="qa-logo pic" src="/icons/brand/${it.brand.img}.${BSVG.has(it.brand.img) ? 'svg' : 'jpg'}" alt="" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px">`
      : `<span class="qa-logo" style="width:${size}px;height:${size}px;background:${it.brand.bg};color:${it.brand.fg};font-size:${Math.round(size * (it.brand.ch.length > 1 ? .36 : .46))}px">${H(it.brand.ch)}</span>`)
    : `<span class="qa-logo plain" style="width:${size}px;height:${size}px">${catIcon(it.cat, Math.round(size * .66))}</span>`;
  // 가계부·달력에서도 이름 옆에 앱 아이콘을 보여 줘요 (머니차곡처럼). 모르는 이름이면 ''
  window.donsemBrandIco = (name, size = 40) => { const b = brandOf(String(name || '').replace(/\s*\(고정지출\)$/, '')); return b ? badge({ brand: b }, size).replace('class="qa-logo', 'class="qa-logo bico') : ''; };
  const CAL_ICO = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const DOWN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';


  // 구독으로 적으면 고정지출(매달 그날)에도 넣어서 다음 달부터 캘린더에 미리 보여요.
  // 이번 달 기록은 id를 fx-고정지출id-YYYY-MM 으로 붙여서, 같은 달에 두 번 세지 않아요
  const FKEY = 'donsem:fixed';
  const loadFixed = () => { try { const f = JSON.parse(localStorage.getItem(FKEY)); return f && Array.isArray(f.items) ? f : { items: [] }; } catch (e) { return { items: [] }; } };
  const sameSub = (x, name) => { const b1 = brandOf(x.name), b2 = brandOf(name); return norm(x.name) === norm(name) || (b1 && b2 && b1.name === b2.name && b1.cat === '구독'); };
  function linkSub(row, entries, fx) { // → { id, made, item }
    const name = (row.memo || '').replace(/\s*\(.*\)$/, '').trim();
    if (row.type !== 'out' || row.cat !== '구독' || !name) return null;
    const ym = row.date.slice(0, 7);
    const mon = fx.items.filter(x => x && x.cycle !== 'year');
    let item = mon.find(x => norm(x.name) === norm(name)), made = false; // 이름이 똑같을 때만 같은 구독 (iCloud와 애플뮤직은 둘 다 Apple이지만 다른 구독)
    if (!item) { item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.slice(0, 30), cat: '구독', amt: row.amt, cycle: 'month', day: Number(row.date.slice(8)) }; fx.items.push(item); made = true; }
    const day = Number(row.date.slice(8)), moved = !made && Number(item.day) !== day;
    if (moved) item.day = day; // 실제로 낸 날로 결제일을 맞춰요 (다음 달부터 그날에 보여요)
    const id = `fx-${item.id}-${ym}`;
    return entries.some(e => e.id === id) ? { id: null, made, moved, item } : { id, made, moved, item };
  }
  // 구독 기록 ↔ 고정지출 맞추기: 페이지를 열 때마다, 그리고 가계부에서 기록을 고칠 때마다 확인해요.
  // 이번 달·지난달 '구독' 기록인데 고정지출에 없으면 넣어요. 고정지출에서 지운 이름(donsem:fixed-gone)은 다시 넣지 않아요
  const GONE = 'donsem:fixed-gone';
  const goneList = () => { try { const a = JSON.parse(localStorage.getItem(GONE)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  function subSync(entries) {
    if (!Array.isArray(entries)) return false;
    const fx = loadFixed(), gone = goneList(), d = new Date(), since = ymdOf(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    let changedE = false, changedF = false;
    entries.forEach(e => {
      if (!e || e.type !== 'out' || e.cat !== '구독' || !e.memo || e.date < since) return;
      const name = String(e.memo).replace(/\s*\(.*\)$/, '').trim();
      if (!name || gone.includes(norm(name))) return;
      const m = /^fx-(.+)-(\d{4}-\d{2})$/.exec(String(e.id));
      if (m && fx.items.some(x => x && x.id === m[1])) return; // 이미 연결돼 있어요
      if (m) { fx.items.push({ id: m[1], name: name.slice(0, 30), cat: '구독', amt: e.amt, cycle: 'month', day: Number(e.date.slice(8)) }); changedF = true; return; } // 고정지출이 사라졌으면 다시 만들어요
      const r = linkSub(Object.assign({}, e, { memo: name }), entries, fx);
      if (!r) return;
      if (r.made || r.moved) changedF = true;
      if (r.id) { e.id = r.id; changedE = true; }
    });
    if (changedF) { try { localStorage.setItem(FKEY, JSON.stringify(fx)); window.dispatchEvent(new Event('donsem:fixed-sync')); } catch (err) { /* 괜찮아요 */ } }
    return changedE;
  }
  window.donsemSubSync = subSync;
  window.donsemFixedGone = name => { const g = goneList(), n = norm(name); if (n && !g.includes(n)) { g.push(n); try { localStorage.setItem(GONE, JSON.stringify(g.slice(-50))); } catch (e) { /* 괜찮아요 */ } } };
  try {
    const b = JSON.parse(localStorage.getItem('donsem:budget'));
    if (b && Array.isArray(b.entries) && subSync(b.entries)) localStorage.setItem('donsem:budget', JSON.stringify(b));
  } catch (e) { /* 괜찮아요 */ }
  let mode = 'quick', type = 'out', cat = CATS.out[0], dDate = '', sheet = null, ov = {}, items = [], sub = '', subFor = null, calY = 0, calM = 0, subCat = '식비';
  // 자주 쓰는 기록: 최근 90일 동안 같은 분류·금액·메모로 두 번 넘게 적은 지출 → 누르면 빠른 입력에 한 줄 더해져요
  function favList() {
    let b; try { b = JSON.parse(localStorage.getItem('donsem:budget')); } catch (e) { b = null; }
    const es = b && Array.isArray(b.entries) ? b.entries : [], since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), cnt = {};
    es.forEach(e => { if (String(e.id).startsWith('fx-') || e.date < since) return; const k = `${e.type}|${e.cat}|${e.amt}|${e.memo || ''}`; cnt[k] = cnt[k] || { n: 0, last: '', type: e.type, cat: e.cat, amt: e.amt, memo: e.memo || '' }; cnt[k].n++; if (e.date > cnt[k].last) cnt[k].last = e.date; });
    const mine = Object.values(cnt).filter(x => x.n >= 2).sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 6);
    return mine.length ? mine : [{ type: 'out', memo: '커피', amt: 4500 }, { type: 'out', memo: '점심', amt: 12000 }, { type: 'in', memo: '월급', amt: 3000000 }];
  }
  function drawFav() {
    const list = favList(), row = t => list.filter(x => x.type === t).map(x => `<button type="button" data-fav="${H((x.memo || x.cat) + ' ' + x.amt)}">${H(x.memo || x.cat)} ${x.amt.toLocaleString('ko-KR')}</button>`).join('');
    const o = row('out'), i = row('in');
    sheet.querySelector('.qa-short').innerHTML = (o ? `<div><b class="out">지출</b>${o}</div>` : '') + (i ? `<div><b class="in">수입</b>${i}</div>` : '');
  }
  const baseDate = () => dDate || today();
  function drawItems() {
    const ta = sheet.querySelector('.qa-text');
    items = parse(ta.value, baseDate()).map(it => Object.assign(it, ov[it.key] || {}));
    const box = sheet.querySelector('.qa-items');
    box.innerHTML = items.map((it, i) => `<div class="qa-item">
        <div class="qa-it-top">${badge(it)}<div class="qa-it-t"><b>${H(it.name || it.cat)}</b><span>${it.type === 'in' ? '수입' : '지출'} · ${H(it.cat)}</span></div>
          <b class="qa-it-amt${it.type === 'in' ? ' in' : ''}">${it.amt ? `${it.type === 'in' ? '+' : ''}${it.amt.toLocaleString('ko-KR')}원` : '<em>금액?</em>'}</b></div>
        ${it.dutch ? `<p class="qa-it-note">${it.total.toLocaleString('ko-KR')}원을 ${it.dutch}명이 나눠서 내 몫만 적어요</p>` : ''}
        ${it.inst && it.amt ? `<p class="qa-it-note">${it.inst}개월 할부 · 매달 ${Math.floor(it.amt / it.inst).toLocaleString('ko-KR')}원씩 ${it.inst}번 적어요</p>` : ''}
        <div class="qa-it-chips"><button type="button" data-sub="date" data-i="${i}">${CAL_ICO}${dateLabel(it.date)}${DOWN}</button><button type="button" data-sub="cat" data-i="${i}">카테고리 바꾸기</button><button type="button" data-flip="${i}">${it.type === 'in' ? '지출로' : '수입으로'}</button></div>
      </div>`).join('');
    box.hidden = !items.length;
    const n = items.filter(x => x.amt).length;
    sheet.querySelector('.qa-save').textContent = mode === 'quick' ? (n > 1 ? `${n}건 저장` : '저장') : (type === 'out' ? '지출 기록하기' : '수입 기록하기');
    ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
  }
  const catGrid = (t, on) => `<div class="qa-grid">${CATS[t].map(c => `<button type="button" class="${c === on ? 'on' : ''}" data-cat="${H(c)}">${catIcon(c, 34)}<span>${H(c)}</span></button>`).join('')}</div>`;
  function drawDirect() {
    sheet.querySelector('.qa-dcats').innerHTML = catGrid(type, cat);
    sheet.querySelector('.qa-ddate').innerHTML = `${CAL_ICO}${dateLabel(baseDate())}${DOWN}`;
    sheet.querySelectorAll('.qa-type button').forEach(x => x.classList.toggle('on', x.dataset.v === type));
    sheet.querySelector('.qa-type').dataset.on = type;
    sheet.querySelector('.qa-save').textContent = type === 'out' ? '지출 기록하기' : '수입 기록하기';
  }
  function setMode(m) {
    mode = m;
    sheet.querySelectorAll('.qa-tabs:not(.qa-type) button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    sheet.querySelector('.qa-tabs:not(.qa-type)').dataset.on = m;
    sheet.querySelector('.qa-quick').hidden = m !== 'quick';
    sheet.querySelector('.qa-direct').hidden = m === 'quick';
    if (m === 'quick') drawItems(); else drawDirect();
    sheet.querySelector('.qa-err').textContent = '';
  }
  // ── 아래에서 한 장 더 올라오는 작은 창: 날짜 · 카테고리 · 쓰는 법 ──
  function calHTML(sel) {
    const first = new Date(calY, calM, 1), days = new Date(calY, calM + 1, 0).getDate(), t = today();
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) { const s = ymdOf(new Date(calY, calM, d)); cells += `<button type="button" data-day="${s}" class="${s === sel ? 'on' : ''}${s === t ? ' today' : ''}">${d}</button>`; }
    return `<div class="qa-cal-h"><b>${calY}년 ${calM + 1}월</b><span><button type="button" data-cm="-1" aria-label="지난달">‹</button><button type="button" data-cm="1" aria-label="다음 달">›</button></span></div>
      <div class="qa-cal-w">${[...W7].map(w => `<span>${w}</span>`).join('')}</div><div class="qa-cal-g">${cells}</div>`;
  }
  const curSubDate = () => subFor === 'direct' ? baseDate() : (items[subFor] || {}).date || baseDate();
  function drawSub() {
    const s = sheet.querySelector('.qa-sub-in');
    if (sub === 'date') {
      const sel = curSubDate();
      s.innerHTML = `<div class="qa-sub-head"><b>날짜</b><button type="button" class="qa-x" data-subx="1" aria-label="닫기">×</button></div>
        <div class="qa-quickd">${[[0, '오늘'], [1, '어제'], [2, '그저께']].map(([n, l]) => `<button type="button" data-day="${dayOff(n)}" class="${dayOff(n) === sel ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="qa-cal">${calHTML(sel)}</div>`;
    } else if (sub === 'cat') {
      const it = subFor === 'direct' ? { type, cat, name: '' } : items[subFor] || {};
      const who = it.brand ? it.brand.name : it.name;
      s.innerHTML = `<div class="qa-sub-head"><b>카테고리</b><button type="button" class="qa-x" data-subx="1" aria-label="닫기">×</button></div>
        ${who ? `<p class="qa-sub-cap">고르면 다음부터 '${H(who)}'도 이 카테고리로 기록해요.</p>` : ''}${catGrid(it.type || 'out', it.cat)}`;
    } else if (sub === 'help') {
      const ex = (t, c = '') => `<button type="button" class="qa-ex${c}" data-ex="${H(t)}">${H(t).replace(/\n/g, '<br>')}</button>`;
      const R = [['금액', '숫자만 쓰면 돼요. 12000, 1만2천, 3.5만, 12,000원 다 알아들어요'], ['여러 건', '줄을 바꾸거나 금액 뒤에 이어 쓰면 한 건씩 따로 저장돼요'], ['날짜', '7월1일, 7/1, 0701, 오늘, 어제, 그저께'], ['수입', '월급, 용돈, 환급, 이자, 배당 → 알아서 수입으로 / 앞에 + 를 붙여도 돼요'], ['할부', '노트북 1000000원 12개월 할부 → 매달 나눠서 적어요'], ['더치', '회식 100000원 더치 4 (4명 N빵도 돼요) → 내 몫만 적어요'], ['분류', '카페, 식비, 교통, 구독 같은 브랜드·말을 보고 골라요. 카테고리 이름을 앞에 쓰면 그 카테고리로 기록해요. 예: 의류 스타킹'], ['기억', "'카테고리 바꾸기'로 고르면 다음부터 같은 이름은 그 카테고리로 적어요"]];
      s.innerHTML = `<div class="qa-sub-head"><div><b>빠른 입력 도움말</b><p class="qa-sub-cap">예시를 누르면 입력칸에 바로 채워져요</p></div><button type="button" class="qa-x" data-subx="1" aria-label="닫기">×</button></div>
        <p class="qa-help-lab">여러 건을 한 번에</p>${ex('7월1일 점심 12000\n7/1 커피 4500\n0701 택시 9800', ' multi')}
        <p class="qa-help-lab">입력 예시</p><div class="qa-exs">${ex('애플뮤직 8900')}${ex('커피 4,500')}${ex('점심 1만2천')}${ex('월급 3,000,000')}${ex('회식 100000원 더치 4')}</div>
        <div class="qa-rules"><p>이렇게 알아들어요</p>${R.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        <div class="qa-help-foot"><span>✨ 브랜드 이름을 쓰면 앱 아이콘이 자동으로 붙어요</span><button type="button" data-sub="brands">목록 보기</button></div>`;
    } else if (sub === 'brands') {
      const mine = myBrands().map(myBrandObj), groups = [...(mine.length ? [['직접 추가', mine]] : []), ...BGROUPS.map(([g]) => [g, BRANDS.filter(b => b.group === g)])];
      s.innerHTML = `<div class="qa-sub-head"><b>브랜드 로고</b><span class="qa-bh-r"><span class="qa-bcount">직접 추가 ${mine.length}개 · 무제한</span><button type="button" class="qa-badd" data-sub="addbrand" aria-label="브랜드 직접 추가">＋</button><button type="button" class="qa-x" data-subx="1" aria-label="닫기">×</button></span></div>
        ${groups.map(([g, list]) => `<p class="qa-bgroup">${H(g)}</p><div class="qa-brands">${list.map(b => `<button type="button" data-ex="${H(b.name)} ">${badge({ brand: b }, 54)}<span>${H(b.name)}</span></button>`).join('')}</div>`).join('')}`;
    } else if (sub === 'addbrand') {
      s.innerHTML = `<div class="qa-sub-head"><div><b>브랜드 직접 추가</b><p class="qa-sub-cap">자주 가는 가게 이름을 넣으면, 다음부터 그 이름을 쓸 때 이 카테고리로 적어요</p></div><button type="button" class="qa-x" data-subx="1" aria-label="닫기">×</button></div>
        <div class="field"><input class="qa-bname" type="text" maxlength="20" placeholder="예: 동네빵집" aria-label="브랜드 이름" autocomplete="off"></div>
        <p class="qa-help-lab" style="margin-top:14px">카테고리</p>${catGrid('out', subCat)}
        <p class="err qa-berr" role="alert"></p><button type="button" class="btn fill wide qa-bsave">추가하기</button>`;
    }
  }
  function openSub(kind, forWhat) {
    if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur(); // 자판이 작은 창을 가리지 않게
    sub = kind; if (forWhat !== undefined) subFor = forWhat;
    if (kind === 'date') { const d = curSubDate(); calY = Number(d.slice(0, 4)); calM = Number(d.slice(5, 7)) - 1; }
    drawSub();
    const el = sheet.querySelector('.qa-sub');
    el.hidden = false; el.offsetHeight; el.classList.add('show');
    el.querySelector('.qa-sub-in').scrollTop = 0;
  }
  function closeSub() { const el = sheet && sheet.querySelector('.qa-sub'); if (!el) return; el.classList.remove('show'); sub = ''; setTimeout(() => { if (!sub) el.hidden = true; }, 300); }
  function setDay(s) {
    if (subFor === 'direct') { dDate = s; drawDirect(); }
    else if (items[subFor]) { const k = items[subFor].key; ov[k] = Object.assign(ov[k] || {}, { date: s }); drawItems(); }
    closeSub();
  }
  function setCat(c) {
    if (sub === 'addbrand') { const v = sheet.querySelector('.qa-bname').value; subCat = c; drawSub(); sheet.querySelector('.qa-bname').value = v; return; }
    if (sub !== 'cat') { cat = c; drawDirect(); return; } // 직접 입력 화면의 큰 카테고리
    if (subFor === 'direct') { cat = c; drawDirect(); }
    else if (items[subFor]) {
      const it = items[subFor], L = learned();
      ov[it.key] = Object.assign(ov[it.key] || {}, { cat: c });
      if (it.name) { L[norm(it.name)] = [it.type, c]; if (it.brand) L['b:' + it.brand.name] = [it.type, c]; try { localStorage.setItem(LEARN, JSON.stringify(L)); } catch (e) { /* 괜찮아요 */ } }
      drawItems();
    }
    closeSub();
  }
  let qaDate = ''; // 달력에서 '이날 쓴 돈 적기'를 누르면 그 날짜로 적어요 (없으면 오늘)
  function open(day) {
    qaDate = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'qa';
      sheet.innerHTML = `<div class="qa-dim" data-close="1"></div>
        <div class="qa-panel" role="dialog" aria-modal="true" aria-labelledby="qa-title">
          <div class="qa-grip"></div>
          <div class="qa-head"><b id="qa-title">바로 기록하기</b><button type="button" class="qa-x" data-close="1" aria-label="닫기">×</button></div>
          <div class="qa-tabs" data-on="quick"><i></i><button type="button" data-mode="quick" class="on">빠른 입력</button><button type="button" data-mode="direct">직접 입력</button></div>
          <div class="qa-quick">
            <div class="qa-hero"><img class="semi semi-bob" src="/icons/semi-happy.svg" width="92" height="92" alt="" aria-hidden="true"><b>말하듯이 적으면 셈이가 정리해요</b><span>내용과 금액만 적으면 자동으로 분류돼요</span></div>
            <div class="qa-tbox"><textarea class="qa-text" rows="1" maxlength="400" placeholder="예: 애플뮤직 8,900 커피 4,500" aria-label="빠른 입력: 이름과 금액" autocomplete="off" enterkeyhint="enter"></textarea></div>
            <div class="qa-tmeta"><span></span><button type="button" data-sub="help"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01"/></svg>쓰는 법</button></div>
            <div class="qa-items" hidden></div>
            <div class="qa-short-wrap"><p class="qa-short-cap">내 단축어 · 누르면 한 줄 더해져요</p><div class="qa-short"></div></div>
          </div>
          <div class="qa-direct" hidden>
            <div class="qa-tabs qa-type" data-on="out"><i></i><button type="button" data-v="out" class="on">지출</button><button type="button" data-v="in">수입</button></div>
            <div class="field qa-amt"><input inputmode="numeric" placeholder="0" aria-label="금액" autocomplete="off"><span>원</span></div>
            <p class="qa-kr"></p>
            <button type="button" class="qa-ddate" data-sub="date" data-direct="1"></button>
            <div class="qa-dcats"></div>
            <div class="field memo"><input class="qa-memo" type="text" maxlength="40" placeholder="메모 (선택)" aria-label="메모" autocomplete="off"></div>
          </div>
          <p class="err qa-err" role="alert"></p>
          <button type="button" class="btn fill wide qa-save">저장</button>
          <a class="qa-link" href="/budget/">가계부에서 전체 보기 ›</a>
        </div>
        <div class="qa-sub" hidden><div class="qa-sub-dim" data-subx="1"></div><div class="qa-sub-in" role="dialog" aria-modal="true"></div></div>`;
      document.body.append(sheet);
      const amt = sheet.querySelector('.qa-amt input'), ta = sheet.querySelector('.qa-text');
      amt.addEventListener('input', () => {
        const d = amt.value.replace(/[^0-9]/g, '');
        amt.value = d ? Number(d).toLocaleString('ko-KR') : '';
        sheet.querySelector('.qa-kr').textContent = korean(num(amt.value));
        sheet.querySelector('.qa-err').textContent = '';
      });
      ta.addEventListener('input', () => { if (!ta.value.trim()) ov = {}; sheet.querySelector('.qa-err').textContent = ''; drawItems(); });
      const addLine = t => { ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' + t : t; drawItems(); };
      sheet.addEventListener('click', e => {
        const t = e.target.closest('button, [data-close], [data-subx]');
        if (!t) return;
        if (t.dataset.close) return close();
        if (t.dataset.subx) return closeSub();
        if (t.dataset.mode) return setMode(t.dataset.mode);
        if (t.dataset.fav) return addLine(t.dataset.fav);
        if (t.dataset.ex) { if (mode !== 'quick') setMode('quick'); ta.value = t.dataset.ex; ov = {}; drawItems(); closeSub(); setTimeout(() => ta.focus(), 320); return; }
        if (t.dataset.sub) return openSub(t.dataset.sub, t.dataset.direct ? 'direct' : t.dataset.i !== undefined ? Number(t.dataset.i) : subFor);
        if (t.dataset.flip !== undefined) { const it = items[t.dataset.flip]; if (!it) return; const nt = it.type === 'in' ? 'out' : 'in'; ov[it.key] = Object.assign(ov[it.key] || {}, { type: nt, cat: CATS[nt].includes(it.cat) ? it.cat : (nt === 'in' ? (wordCat(it.name, IN_WORDS) || '기타') : ((it.brand && it.brand.cat) || wordCat(it.name, WORDS) || '기타')) }); return drawItems(); }
        if (t.dataset.day) return setDay(t.dataset.day);
        if (t.dataset.cm) { calM += Number(t.dataset.cm); if (calM < 0) { calM = 11; calY--; } if (calM > 11) { calM = 0; calY++; } sheet.querySelector('.qa-cal').innerHTML = calHTML(curSubDate()); return; }
        if (t.dataset.cat) return setCat(t.dataset.cat);
        if (t.classList.contains('qa-bsave')) {
          const nm = sheet.querySelector('.qa-bname').value.trim().slice(0, 20);
          if (!nm) { sheet.querySelector('.qa-berr').textContent = '이름을 넣어 주세요.'; return; }
          const list = myBrands().filter(x => norm(x.name) !== norm(nm)); list.push({ name: nm, cat: subCat });
          try { localStorage.setItem(MYB, JSON.stringify(list)); } catch (e) { /* 괜찮아요 */ }
          toast(`「${nm}」을(를) ${subCat}(으)로 기억할게요.`); drawItems(); openSub('brands'); return;
        }
        if (t.dataset.v) { type = t.dataset.v; cat = CATS[type][0]; drawDirect(); }
      });
      sheet.querySelector('.qa-save').addEventListener('click', save);
      sheet.addEventListener('keydown', e => {
        if (e.key === 'Escape') { if (sub) closeSub(); else close(); }
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); }
        if (e.key === 'Enter' && e.target === ta && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } // 컴퓨터: ⌘/Ctrl+Enter로 저장 (그냥 Enter는 줄 바꿈 = 여러 건)
      });
      // 자판이 열린 채로 지출/수입·분류를 누르면 자판이 닫히며 버튼이 미끄러져 엉뚱한 걸 누르게 돼요 → 누르는 순간 입력칸을 붙잡아 둬요
      sheet.addEventListener('pointerdown', e => { if (sheet.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && e.target.closest('.qa-type button, .qa-grid button, .qa-short button, .qa-tabs button, [data-flip]')) e.preventDefault(); });
      // 아이폰 자판이 올라오면 '저장' 버튼이 자판 뒤에 숨었어요 → 창을 자판 위 보이는 부분에 맞추고, 버튼은 창 아래에 붙여 둬요
      const vv = window.visualViewport;
      const fit = () => {
        if (!vv || !sheet.classList.contains('show')) return;
        const kb = vv.height < document.documentElement.clientHeight - 120;
        sheet.style.top = vv.offsetTop + 'px'; sheet.style.height = vv.height + 'px'; sheet.style.bottom = 'auto';
        sheet.classList.toggle('kb', !!kb);
      };
      if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
      sheet.addEventListener('focusin', fit); sheet.addEventListener('focusout', () => setTimeout(fit, 50));
      sheet.offsetHeight; // 처음 만든 창도 '아래에 숨은 모습'을 한 번 그린 뒤에 올려야 주르륵 올라와요
    }
    dDate = qaDate; ov = {};
    sheet.querySelector('.qa-text').value = '';
    drawFav(); setMode('quick');
    sheet.querySelector('#qa-title').textContent = qaDate && qaDate !== today() ? `${Number(qaDate.slice(5, 7))}월 ${Number(qaDate.slice(8))}일에 기록하기` : '바로 기록하기';
    sheet.classList.add('show');
    document.documentElement.classList.add('qa-open');
    setTimeout(() => sheet.querySelector('.qa-text').focus(), 60);
  }
  function close() {
    if (!sheet) return;
    closeSub();
    sheet.classList.remove('show', 'kb');
    sheet.style.top = sheet.style.height = sheet.style.bottom = '';
    document.documentElement.classList.remove('qa-open');
  }
  // 할부: 같은 날짜로 다음 달들에 한 번씩 (31일이 없는 달은 그달 마지막 날)
  const addMonth = (s, k) => { const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)) - 1 + k, d = Number(s.slice(8)); const last = new Date(y, m + 1, 0).getDate(); return ymdOf(new Date(y, m, Math.min(d, last))); };
  function save() {
    const err = sheet.querySelector('.qa-err'), rows = [];
    if (mode === 'quick') {
      if (!items.length) { err.textContent = '「애플뮤직 8900」처럼 이름과 금액을 써 주세요.'; sheet.querySelector('.qa-text').focus(); return; }
      const bad = items.find(x => !x.amt);
      if (bad) { err.textContent = `${bad.name || '한 줄'}에 금액이 없어요. 숫자를 같이 써 주세요.`; return; }
      if (items.some(x => x.amt > MAX_REC)) { err.textContent = '1,000억 원보다 큰 금액은 넣을 수 없어요. 숫자를 다시 확인해 주세요.'; return; }
      items.forEach(it => {
        const memo = (it.name + (it.dutch ? ` (${it.dutch}명 더치)` : '')).slice(0, 40);
        if (it.inst) { const per = Math.floor(it.amt / it.inst); for (let k = 0; k < it.inst; k++) rows.push({ type: it.type, cat: it.cat, amt: k === it.inst - 1 ? it.amt - per * (it.inst - 1) : per, date: addMonth(it.date, k), memo: `${it.name} 할부 ${k + 1}/${it.inst}`.slice(0, 40) }); }
        else rows.push({ type: it.type, cat: it.cat, amt: it.amt, date: it.date, memo });
      });
    } else {
      const amtEl = sheet.querySelector('.qa-amt input'), amt = num(amtEl.value);
      if (!amt) { err.textContent = '금액을 넣어 주세요.'; amtEl.focus(); return; }
      if (amt > MAX_REC) { err.textContent = '1,000억 원보다 큰 금액은 넣을 수 없어요. 숫자를 다시 확인해 주세요.'; amtEl.focus(); return; }
      rows.push({ type, cat, amt, date: baseDate(), memo: sheet.querySelector('.qa-memo').value.trim().slice(0, 40) });
    }
    let b;
    try { b = JSON.parse(localStorage.getItem('donsem:budget')); } catch (e) { b = null; }
    if (!b || !Array.isArray(b.entries)) b = { entries: [], budget: (b && b.budget) || 0 };
    const before = budgetStreak(b.entries);
    const fx = loadFixed(), subs = [], g0 = goneList(), g1 = g0.filter(n => !rows.some(r => r.cat === '구독' && norm(r.memo) === n));
    if (g1.length !== g0.length) { try { localStorage.setItem(GONE, JSON.stringify(g1)); } catch (e) { /* 괜찮아요 */ } } // 지웠던 구독을 다시 적으면 다시 고정지출로
    rows.forEach((r, i) => { const l = linkSub(r, b.entries, fx); if (l) subs.push(l); b.entries.push(Object.assign({ id: (l && l.id) || Date.now().toString(36) + i + Math.random().toString(36).slice(2, 6) }, r)); });
    try { localStorage.setItem('donsem:budget', JSON.stringify(b)); if (subs.length) localStorage.setItem(FKEY, JSON.stringify(fx)); }
    catch (e) { err.textContent = '이 브라우저에서는 저장할 수 없어요.'; return; }
    const one = rows[0], firstDay = rows.map(r => r.date).sort()[0];
    sheet.querySelector('.qa-amt input').value = ''; sheet.querySelector('.qa-memo').value = ''; sheet.querySelector('.qa-kr').textContent = ''; sheet.querySelector('.qa-text').value = '';
    close();
    const cnt = mode === 'quick' ? items.length : 1;
    const subMsg = subs.length ? (subs[0].made ? `구독이라 고정지출에도 넣었어요. 다음 달부터 매달 ${subs[0].item.day}일에 미리 보여요 📅` : subs[0].moved ? `「${subs[0].item.name}」 결제일을 매달 ${subs[0].item.day}일로 맞췄어요 📅` : `고정지출 「${subs[0].item.name}」(매달 ${subs[0].item.day}일)의 이번 달 결제로 적었어요.`) : '';
    toast(subMsg || streakCheer(before, b.entries) || (cnt > 1 ? `${cnt}건을 가계부에 기록했어요.` : `${one.memo && mode === 'quick' ? one.memo.replace(/ 할부 1\/\d+$/, '') : one.cat} ${won(mode === 'quick' && items[0].inst ? items[0].amt : one.amt)}을 가계부에 기록했어요.`));
    markDailyFull();
    if (typeof window.drawToday === 'function') window.drawToday();
    if (path === '/budget/') { try { if (firstDay !== today()) sessionStorage.setItem('donsem:selday', firstDay); } catch (e) { /* 괜찮아요 */ } setTimeout(() => location.reload(), 1200); } // 가계부를 보고 있었다면 바로 반영
  }
  window.openQuickAdd = open; // 아래 탭에서는 빠졌지만, 첫 화면 '오늘 쓴 돈 정리 → 기록'에서 이 창을 열어요
  // 떠 있는 '+ 기록' 버튼 (홈·캘린더, 휴대폰): 아래 탭 바로 위 오른쪽이라 엄지로 바로 눌러요
  if (path === '/' || path === '/budget/') {
    const fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'fab-add'; fab.setAttribute('aria-label', '지출이나 수입 바로 기록하기');
    fab.innerHTML = '<span aria-hidden="true">+</span>기록';
    fab.addEventListener('click', open);
    document.body.append(fab);
  }
})();

// ── 다음에 많이 보는 계산: 결과 아래에 이어서 볼 계산기를, 지금 넣은 숫자를 채운 채로 추천해요 ──
(() => {
  const res = document.querySelector('.card .result');
  if (!res) return;
  const slug = location.pathname.replace(/\//g, '');
  const raw = k => { const el = document.querySelector(`input[data-k="${k}"]`); return el ? el.value : ''; };
  const R = n => Math.max(0, Math.round(n));
  const yrs = months => Math.round(months / 12 * 100) / 100;
  const bigNum = () => { const b = res.querySelector('.big'); return b && b.firstChild ? num(String(b.dataset.final || b.firstChild.textContent).split(/[→/]/)[0]) : 0; };
  const rowNum = label => { const row = [...res.querySelectorAll('.rows div')].find(d => d.firstChild && d.firstChild.textContent.trim() === label); return row ? num(row.querySelector('b').textContent) : 0; };
  // [가는 곳, 제목, 이유, 넘길 숫자]
  const NEXT = {
    savings: () => [
      ['deposit', '같은 돈을 목돈으로 맡기면?', '예금 이자 계산기', { d_amt: R(val('s_amt') * val('s_n')), d_n: R(val('s_n')), d_r: val('s_r') }],
      ['goal', '목표 금액을 정하고 모으려면?', '목표 저축 계산기', { g_goal: R(bigNum()), g_now: 0, g_y: yrs(val('s_n')), g_r: val('s_r') }],
      ['inflation', '만기에 받는 돈, 그때 가치는?', '물가상승률 계산기', { i_amt: R(bigNum()), i_y: Math.max(1, Math.round(val('s_n') / 12)) }],
    ],
    deposit: () => [
      ['savings', '매달 나눠 넣으면 얼마 받을까?', '적금 이자 계산기', { s_amt: R(val('d_amt') / Math.max(1, val('d_n'))), s_n: R(val('d_n')), s_r: val('d_r') }],
      ['compound', '오래 굴리면 얼마가 될까?', '복리 계산기', { c_init: R(val('d_amt')), c_add: 0, c_r: val('d_r'), c_y: 10 }],
      ['inflation', '이 돈, 몇 년 뒤 가치는?', '물가상승률 계산기', { i_amt: R(val('d_amt')), i_y: 10 }],
    ],
    loan: () => [
      ['refinance', '금리 낮은 대출로 갈아타면?', '대출 갈아타기 계산기', { f_amt: R(val('l_amt')), f_n: R(val('l_n')), f_old: val('l_r') }],
      ['prepayment', '일찍 갚으면 수수료는?', '중도상환수수료 계산기', { p_amt: R(val('l_amt')) }],
      ['wage', '월급 대비 부담은 얼마나?', '시급·월급·연봉 계산기', {}],
    ],
    compound: () => [
      ['goal', '목표 금액을 정하면 매달 얼마씩?', '목표 저축 계산기', { g_now: R(val('c_init')), g_y: val('c_y'), g_r: val('c_r') }],
      ['inflation', '그때 돈의 가치는?', '물가상승률 계산기', { i_amt: R(bigNum()), i_y: R(val('c_y')) }],
      ['retirement', '노후에는 얼마가 필요할까?', '노후자금 계산기', {}],
    ],
    severance: () => [
      ['deposit', '퇴직금을 예금에 넣으면?', '예금 이자 계산기', { d_amt: R(bigNum()), d_n: 12 }],
      ['wage', '월급을 시급·연봉으로 보면?', '시급·월급·연봉 계산기', { w_mode: 'month', w_amt: R(val('v_pay')) }],
      ['date', '1년 채우는 날은 언제?', '날짜 계산기', { z_mode: 'add', z_base: raw('v_start'), z_n: 365, z_inc1: 1 }],
    ],
    rent: () => [
      ['pyeong', '이 집, 평당 얼마일까?', '평수 계산기', { y_price: R(val('r_jeonse')) }],
      ['loan', '전세대출 이자는 매달 얼마?', '대출 이자 계산기', { l_amt: R(val('r_jeonse') * 0.8), l_n: 24, l_type: 'bullet' }],
      ['goal', '보증금을 모으려면 매달 얼마?', '목표 저축 계산기', { g_goal: R(val('r_jeonse')) }],
    ],
    vat: () => [
      ['discount', '할인받으면 얼마일까?', '할인율 계산기', { o_list: R(seg('x_mode') === 'total' ? val('x_amt') : val('x_amt') * 1.1) }],
      ['percent', '몇 %인지 바로 계산하기', '퍼센트 계산기', {}],
    ],
    'holiday-pay': () => [
      ['wage', '이 시급이면 월급은?', '시급·월급·연봉 계산기', { w_mode: 'hour', w_amt: R(val('h_wage')), w_hours: val('h_hours') }],
      ['severance', '1년 넘게 일하면 퇴직금은?', '퇴직금 계산기', {}],
      ['dutch-pay', '모임비 나누기', '더치페이 계산기', {}],
    ],
    prepayment: () => [
      ['refinance', '갈아타면 수수료 내고도 이득일까?', '대출 갈아타기 계산기', { f_amt: R(val('p_amt')), f_fee: val('p_rate') }],
      ['loan', '남은 대출의 이자는?', '대출 이자 계산기', { l_amt: R(val('p_amt')) }],
    ],
    inflation: () => [
      ['compound', '물가보다 빨리 불리려면?', '복리 계산기', { c_init: R(val('i_amt')), c_y: R(val('i_y')) }],
      ['retirement', '물가를 반영한 노후자금은?', '노후자금 계산기', { t_inf: val('i_rate') }],
      ['deposit', '예금 이자로 지킬 수 있을까?', '예금 이자 계산기', { d_amt: R(val('i_amt')) }],
    ],
    discount: () => [
      ['unit-price', '용량까지 따지면 어느 게 쌀까?', '단가 계산기', {}],
      ['percent', '얼마에서 얼마로, 몇 % 내렸나?', '퍼센트 계산기', { q_mode: 'change', q_a: R(val('o_list')), q_b: R(seg('o_mode') === 'rate' ? val('o_sale') : val('o_list') * (1 - val('o_rate') / 100) * (1 - val('o_rate2') / 100)) }],
      ['dutch-pay', '같이 산 거라면 한 사람당 얼마?', '더치페이 계산기', { n_total: R(seg('o_mode') === 'rate' ? val('o_sale') : val('o_list') * (1 - val('o_rate') / 100) * (1 - val('o_rate2') / 100)) }],
    ],
    wage: () => [
      ['holiday-pay', '주휴수당은 얼마일까?', '주휴수당 계산기', { h_wage: R(rowNum('시급')), h_hours: val('w_hours') }],
      ['severance', '이 월급이면 퇴직금은?', '퇴직금 계산기', { v_pay: R(rowNum('월급')) }],
      ['goal', '월급으로 목표 모으기', '목표 저축 계산기', {}],
    ],
    salary: () => [
      ['salary-rank', '이 연봉, 상위 몇 %일까?', '연봉 상위 % 계산기', { sr_mode: 'year', sr_amt: R(seg('m_mode') === 'month' ? val('m_amt') * 12 : val('m_amt')) }],
      ['wage', '시급으로 치면 얼마일까?', '시급·월급·연봉 계산기', { w_mode: 'month', w_amt: R(rowNum('세전 월급')), w_hours: 40 }],
      ['savings', '실수령액의 20%를 적금에 넣으면?', '적금 이자 계산기', { s_amt: Math.max(10000, Math.round(bigNum() * 0.2 / 10000) * 10000), s_n: 12 }],
      ['severance', '이 월급이면 퇴직금은?', '퇴직금 계산기', { v_pay: R(rowNum('세전 월급')) }],
    ],
    'corporate-tax': () => [
      ['income-tax', '개인사업자라면 세금은 얼마?', '종합소득세 계산기', { it_mode: 'biz', it_income: R(val('ct_base')), it_cost: 0 }],
      ['vat', '부가세도 계산해 볼까?', '부가세 계산기', {}],
      ['salary', '대표 월급, 실수령액은?', '연봉 실수령액 계산기', {}],
    ],
    'income-tax': () => [
      ['corporate-tax', '법인으로 바꾸면 세금은?', '법인세 계산기', { ct_year: '2026', ct_base: R(Math.max(0, val('it_income') - val('it_cost'))) }],
      ['pension', '연금저축으로 세금 더 줄이기', '연금저축·IRP 계산기', {}],
      ['vat', '부가세도 계산해 볼까?', '부가세 계산기', {}],
    ],
    isa: () => [
      ['pension', 'ISA 만기 후 연금계좌로 옮기면?', '연금저축·IRP 계산기', {}],
      ['dividend', '배당 세금은 얼마나 나갈까?', '배당금 계산기', {}],
      ['compound', '같은 돈을 더 오래 굴리면?', '복리 계산기', { c_init: R(val('is_amt')), c_add: 0, c_r: val('is_r'), c_y: Math.max(5, Math.round(val('is_y'))) }],
    ],
    pension: () => [
      ['year-end-tax', '연말정산 전체로 보면 얼마 환급?', '연말정산 환급 계산기', { ys_pay: R(val('pn_pay')), ys_pension: R(val('pn_ps') + val('pn_irp')) }],
      ['retirement', '노후에 얼마가 필요할까?', '노후자금 계산기', {}],
      ['isa', 'ISA도 같이 하면 세금이 얼마나 줄까?', 'ISA 절세 계산기', {}],
    ],
    'salary-rank': () => [
      ['salary', '이 연봉, 실수령액은 얼마?', '연봉 실수령액 계산기', { m_mode: 'year', m_amt: R(seg('sr_mode') === 'month' ? val('sr_amt') * 12 : val('sr_amt')) }],
      ['year-end-tax', '연말정산으로 얼마나 돌려받을까?', '연말정산 환급 계산기', { ys_pay: R(seg('sr_mode') === 'month' ? val('sr_amt') * 12 : val('sr_amt')) }],
      ['money-type', '돈 성격도 궁금하다면?', '돈BTI 테스트', {}],
    ],
    unemployment: () => [
      ['severance', '퇴직금은 얼마일까?', '퇴직금 계산기', { v_pay: R(val('j_pay')), v_end: raw('j_end') }],
      ['date', '실업급여 받는 날수가 끝나는 날은?', '날짜 계산기', { z_mode: 'add', z_base: raw('j_end'), z_n: jobDays() }],
      ['salary', '다음 회사 월급, 실수령액은?', '연봉 실수령액 계산기', { m_mode: 'month', m_amt: R(val('j_pay')) }],
    ],
    'year-end-tax': () => [
      ['salary', '내 월급, 실수령액은?', '연봉 실수령액 계산기', { m_mode: 'year', m_amt: R(val('ys_pay')) }],
      ['compound', '연금저축에 매달 50만 원씩 넣으면?', '복리 계산기', { c_init: 0, c_add: 500000, c_y: 20 }],
      ['deposit', '환급받은 돈을 예금에 넣으면?', '예금 이자 계산기', bigNum() ? { d_amt: R(bigNum()), d_n: 12 } : {}],
    ],
    goal: () => [
      ['savings', '적금으로 넣으면 세후 이자는?', '적금 이자 계산기', { s_amt: R(bigNum()), s_n: R(val('g_y') * 12), s_r: val('g_r') }],
      ['compound', '투자로 모으면?', '복리 계산기', { c_init: R(val('g_now')), c_add: R(bigNum()), c_y: Math.max(1, Math.round(val('g_y'))) }],
      ['inflation', '목표 금액, 그때 가치는?', '물가상승률 계산기', { i_amt: R(val('g_goal')), i_y: Math.max(1, Math.round(val('g_y'))) }],
    ],
    pyeong: () => [
      ['rent', '전세를 월세로 바꾸면?', '전월세 전환 계산기', val('y_price') ? { r_jeonse: R(val('y_price')) } : {}],
      ['loan', '집 살 때 대출 이자는?', '대출 이자 계산기', val('y_price') ? { l_amt: R(val('y_price') * 0.6) } : {}],
    ],
    percent: () => [
      ['discount', '할인가 바로 계산하기', '할인율 계산기', {}],
      ['avg-price', '주식 평균 단가 계산하기', '물타기 계산기', {}],
    ],
    'avg-price': () => [
      ['percent', '수익률 따로 계산하기', '퍼센트 계산기', { q_mode: 'change', q_a: R(rowNum('총 매수 금액')), q_b: R(num((([...res.querySelectorAll('.rows div')].find(d => d.firstChild && d.firstChild.textContent.includes('평가금액')) || {}).textContent || '').split('평가금액')[1] || '')) }],
      ['dividend', '배당까지 받으면?', '배당금 계산기', { b_amt: R(rowNum('총 매수 금액')) }],
    ],
    dividend: () => [
      ['compound', '배당을 다시 투자하면?', '복리 계산기', { c_init: R(seg('b_mode') === 'income' ? val('b_amt') : 0), c_r: val('b_rate') }],
      ['goal', '필요한 투자금, 매달 얼마씩 모을까?', '목표 저축 계산기', seg('b_mode') === 'need' ? { g_goal: R(bigNum()) } : {}],
      ['retirement', '노후에 필요한 돈은?', '노후자금 계산기', {}],
    ],
    retirement: () => [
      ['goal', '이 돈을 모으려면 매달 얼마?', '목표 저축 계산기', { g_goal: R(bigNum()), g_now: 0, g_y: R(val('t_until')), g_r: 5 }],
      ['dividend', '배당으로 월 생활비를 받으려면?', '배당금 계산기', { b_mode: 'need', b_want: R(val('t_month')) }],
      ['compound', '꾸준히 투자하면 얼마가 될까?', '복리 계산기', { c_y: R(val('t_until')) }],
    ],
    'car-loan': () => [
      ['fuel', '한 달 기름값은 얼마?', '유류비 계산기', {}],
      ['loan', '할부 말고 대출로 사면?', '대출 이자 계산기', { l_amt: R(val('k_price') - val('k_down')), l_n: R(num(seg('k_n'))), l_r: val('k_r') }],
      ['refinance', '할부 금리 바꾸면 얼마 아낄까?', '대출 갈아타기 계산기', { f_amt: R(val('k_price') - val('k_down')), f_n: R(num(seg('k_n'))), f_old: val('k_r') }],
    ],
    refinance: () => [
      ['prepayment', '중도상환수수료 자세히 보기', '중도상환수수료 계산기', { p_amt: R(val('f_amt')), p_rate: val('f_fee') }],
      ['loan', '새 대출의 월별 상환표 보기', '대출 이자 계산기', { l_amt: R(val('f_amt')), l_n: R(val('f_n')), l_r: val('f_new') }],
    ],
    'unit-price': () => [
      ['discount', '할인까지 받으면?', '할인율 계산기', {}],
      ['dutch-pay', '같이 사서 나누면 한 사람당?', '더치페이 계산기', {}],
    ],
    fuel: () => [
      ['dutch-pay', '기름값, 같이 탄 사람끼리 나누기', '더치페이 계산기', seg('e_mode') === 'cost' ? { n_total: R(bigNum()) } : {}],
      ['car-loan', '차 살 때 할부는 얼마?', '자동차 할부 계산기', {}],
    ],
    'dutch-pay': () => [
      ['budget', '내 몫을 가계부에 적기', '가계부', null],
      ['discount', '할인받은 금액으로 나누기', '할인율 계산기', { o_list: R(val('n_total')) }],
    ],
    'overseas-stock-tax': () => [
      ['loss-recovery', '손실 난 종목, 본전까지 얼마나?', '손실 회복 수익률 계산기', {}],
      ['dividend', '배당 세금은 얼마나 나갈까?', '배당금 계산기', {}],
      ['isa', '국내 주식은 ISA로 하면?', 'ISA 절세 계산기', {}],
    ],
    'etf-fee': () => [
      ['compound', '보수 없이 복리로 굴리면?', '복리 계산기', { c_init: R(val('ef_init')), c_add: R(val('ef_add')), c_r: val('ef_r'), c_y: R(val('ef_y')) }],
      ['isa', 'ISA로 하면 세금은?', 'ISA 절세 계산기', {}],
      ['pension', '연금저축으로 ETF를 사면?', '연금저축·IRP 계산기', {}],
    ],
    'loss-recovery': () => [
      ['avg-price', '더 사서 평균 단가를 낮추면?', '물타기 계산기', seg('lr_mode') === 'price' ? { a_p1: R(val('lr_buy')), a_p2: R(val('lr_now')), a_now: R(val('lr_now')) } : {}],
      ['overseas-stock-tax', '손실을 팔면 세금이 줄까?', '해외주식 양도세 계산기', {}],
    ],
    'financial-income-tax': () => [
      ['dividend', '배당금은 얼마나 받을까?', '배당금 계산기', {}],
      ['isa', 'ISA로 옮기면 세금은?', 'ISA 절세 계산기', {}],
      ['salary', '내 월급 실수령액은?', '연봉 실수령액 계산기', {}],
    ],
    date: () => [
      ['savings', '적금 만기에 받는 돈은?', '적금 이자 계산기', {}],
      ['severance', '퇴직금은 얼마일까?', '퇴직금 계산기', {}],
    ],
  };
  if (!NEXT[slug]) return;
  const box = document.createElement('section');
  box.className = 'next';
  box.setAttribute('aria-label', '다음에 많이 보는 계산');
  (document.querySelector('.card .share') || res).after(box);
  window.updateNext = () => {
    let items;
    try { items = NEXT[slug](); } catch (e) { return; }
    box.innerHTML = '<h2>다음에 많이 보는 계산</h2>' + items.map(([to, title, name, params]) => {
      const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && !Number.isNaN(v)).map(([k, v]) => [k, String(v)])).toString() : '';
      const carry = q ? '<span class="carry">입력한 숫자 그대로</span>' : '';
      return `<a class="next-card" href="/${to}/${q ? '?' + q : ''}"><span class="next-name">${name}${carry}</span><b>${title}</b><span class="next-go">›</span></a>`;
    }).join('');
  };
  window.updateNext();
})();

// ── 저장하기: 계산 결과를 가계부·고정지출·내 자산·목표로 바로 보내요 ──
(() => {
  const res = document.querySelector('.card .result');
  if (!res) return;
  const slug = location.pathname.replace(/\//g, '');
  const now = new Date();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const after = months => { const d = new Date(now.getFullYear(), now.getMonth() + Math.round(months), now.getDate()); return iso(d); };
  const R = n => Math.max(0, Math.round(n));
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const bigNum = () => { const b = res.querySelector('.big'); return b && b.firstChild ? num(String(b.dataset.final || b.firstChild.textContent).split(/[→/×]/)[0]) : 0; };
  const rowNum = label => { const row = [...res.querySelectorAll('.rows div')].find(d => d.firstChild && d.firstChild.textContent.trim() === label); return row ? num(row.querySelector('b').textContent) : 0; };
  const monthlyPay = (L, n, i) => (i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)));

  // 저장하는 곳: [저장 키, 목록 칸, 보러 가는 주소, 이름]
  const DEST = {
    budget: ['donsem:budget', 'entries', '/budget/', '가계부', { entries: [], budget: 0 }],
    fixed: ['donsem:fixed', 'items', '/budget/#fixed', '고정지출', { items: [] }],
    assets: ['donsem:assets', 'items', '/budget/#assets', '내 자산', { items: [], history: {} }],
  };
  function put(dest, item) {
    const [key, list, , , empty] = DEST[dest];
    let d;
    try { d = JSON.parse(localStorage.getItem(key)); } catch (e) { d = null; }
    if (!d || !Array.isArray(d[list])) d = JSON.parse(JSON.stringify(empty));
    d[list].push(Object.assign({ id: id() }, item));
    try { localStorage.setItem(key, JSON.stringify(d)); return true; } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); return false; }
  }
  const day = now.getDate();
  // 계산기마다 [저장하는 곳, 버튼 글자, 넣을 내용] — 숫자는 지금 결과에서 바로 읽어요
  const SAVE = {
    loan: () => {
      const L = val('l_amt'), n = Math.max(1, Math.floor(val('l_n'))), i = val('l_r') / 1200, t = seg('l_type');
      const m = t === 'equal' ? monthlyPay(L, n, i) : t === 'principal' ? L / n + L * i : L * i;
      return [
        ['fixed', `고정지출에 매달 ${won(m)} 추가`, { name: '대출 상환', cat: '대출 상환', amt: R(m), cycle: 'month', day }],
        ['assets', `내 자산에 대출 ${won(L)}을 부채로 추가`, { kind: 'debt', cat: '기타 대출', name: '대출', amt: R(L) }],
      ];
    },
    'car-loan': () => {
      const L = val('k_price') - Math.min(val('k_down'), val('k_price')), n = num(seg('k_n')), i = val('k_r') / 1200;
      if (L <= 0) return [];
      return [
        ['fixed', `고정지출에 매달 ${won(monthlyPay(L, n, i))} 추가`, { name: '자동차 할부', cat: '대출 상환', amt: R(monthlyPay(L, n, i)), cycle: 'month', day }],
        ['assets', `내 자산에 할부 원금 ${won(L)}을 부채로 추가`, { kind: 'debt', cat: '기타 대출', name: '자동차 할부', amt: R(L) }],
      ];
    },
    rent: () => seg('r_mode') === 'toMonthly' && bigNum() ? [['fixed', `고정지출에 월세 ${won(bigNum())} 추가`, { name: '월세', cat: '주거·관리비', amt: R(bigNum()), cycle: 'month', day }]] : [],
    deposit: () => [['assets', `예금 ${won(val('d_amt'))}을 내 자산에 추가`, { kind: 'asset', cat: '예금·적금', name: '정기예금', amt: R(val('d_amt')) }]],
    wage: () => { const m = rowNum('월급'); return m ? [['budget', `이번 달 월급 ${won(m)}을 가계부 수입으로 기록`, { type: 'in', amt: R(m), cat: '월급', date: iso(now), memo: '월급 (계산기에서 저장)' }]] : []; },
    salary: () => bigNum() ? [['budget', `이번 달 실수령액 ${won(bigNum())}을 가계부 수입으로 기록`, { type: 'in', amt: R(bigNum()), cat: '월급', date: iso(now), memo: '월급 실수령액 (계산기에서 저장)' }]] : [],
    unemployment: () => bigNum() ? [['budget', `한 달 실업급여 ${won(Math.floor(bigNum() / jobDays()) * 30)}을 가계부 수입으로 기록`, { type: 'in', amt: R(Math.floor(bigNum() / jobDays()) * 30), cat: '기타', date: iso(now), memo: '실업급여 (계산기에서 저장)' }]] : [],
    'holiday-pay': () => { const m = rowNum('한 달 예상 월급 (주휴수당 포함)'); return m ? [['budget', `한 달 예상 월급 ${won(m)}을 가계부 수입으로 기록`, { type: 'in', amt: R(m), cat: '월급', date: iso(now), memo: '주휴수당 포함 월급' }]] : []; },
    severance: () => bigNum() ? [['assets', `퇴직금 ${won(bigNum())}을 내 자산에 추가`, { kind: 'asset', cat: '현금·입출금', name: '퇴직금', amt: R(bigNum()) }]] : [],
    'dutch-pay': () => [['budget', `내 몫 ${won(bigNum())}을 가계부 지출로 기록`, { type: 'out', amt: R(bigNum()), cat: '식비', date: iso(now), memo: '더치페이' }]],
    fuel: () => {
      if (seg('e_mode') !== 'cost' || !bigNum()) return [];
      const ppl = Math.max(1, Math.round(val('e_ppl'))), mine = bigNum() / ppl;
      return [['budget', `기름값${ppl > 1 ? ' 내 몫' : ''} ${won(mine)}을 가계부 지출로 기록`, { type: 'out', amt: R(mine), cat: '교통', date: iso(now), memo: '유류비' }]];
    },
  };
  if (!SAVE[slug]) return;
  const box = document.createElement('section');
  box.className = 'save';
  box.setAttribute('aria-label', '내 돈 관리에 저장');
  (document.querySelector('.card .share') || res).after(box);
  const done = new Set(); // 이번에 저장한 버튼 (같은 숫자로 두 번 저장되지 않게)
  let items = [];
  window.updateSave = () => {
    try { items = SAVE[slug]().filter(([, , it]) => (it.amt || it.target) > 0); } catch (e) { items = []; }
    box.hidden = !items.length;
    box.innerHTML = '<h2>내 돈 관리에 저장</h2>' + items.map(([dest, label, it], k) => {
      const sig = dest + JSON.stringify(it);
      return done.has(sig)
        ? `<a class="save-btn saved" href="${DEST[dest][2]}">✓ ${DEST[dest][3]}에 저장했어요 · 보러 가기 ›</a>`
        : `<button type="button" class="save-btn" data-k="${k}"><span class="save-to">${DEST[dest][3]}</span>${label}</button>`;
    }).join('');
  };
  box.addEventListener('click', e => {
    const b = e.target.closest('button.save-btn');
    if (!b) return;
    const [dest, , it] = items[Number(b.dataset.k)];
    if (put(dest, it)) {
      done.add(dest + JSON.stringify(it));
      toast(`${DEST[dest][3]}에 저장했어요.`);
      window.updateSave();
    }
  });
  window.updateSave();
})();

// ── 3D 아이콘 (Microsoft Fluent Emoji, MIT): 카드와 계산기 화면 맨 위에 그림을 넣어 글자만 있는 딱딱함을 덜어요 ──
const ICONS = ['year-end', 'savings', 'deposit', 'loan', 'compound', 'severance', 'rent', 'vat', 'holiday-pay', 'prepayment', 'inflation', 'discount', 'wage', 'goal', 'pyeong', 'percent', 'avg-price', 'dividend', 'retirement', 'car-loan', 'refinance', 'shop', 'unit-price', 'used-price', 'delivery', 'fan-budget', 'fuel', 'dutch-pay', 'date', 'salary', 'unemployment', 'year-end-tax', 'budget', 'fixed', 'assets', 'goals', 'quiz', 'money-type', 'salary-rank', 'no-spend', 'collection', 'isa', 'pension', 'corporate-tax', 'income-tax', 'money-calendar', 'invest', 'overseas-stock-tax', 'etf-fee', 'loss-recovery', 'financial-income-tax', 'hidden-money', 'guide', 'real-estate', 'acquisition-tax', 'brokerage-fee', 'jeonse-check', 'subscription-score', 'loan-limit', 'asset-rank', 'time-value', 'lump-sum'];
const iconOf = path => { const slug = String(path).split('#')[1] || String(path).replace(/\//g, ''); /* '/budget/#fixed' → 고정지출 아이콘 */ return ICONS.includes(slug) ? `<img class="ico" src="/icons/${slug}.webp" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''; };
// 가계부 카테고리 아이콘 (가계부 화면, + 빠른 기록에서 같이 써요)
const CAT_ICONS = { '식비': 'rice', '카페·간식': 'coffee', '교통': 'bus', '쇼핑': 'shopping', '생활': 'basket', '주거·통신': 'house', '구독': 'tv.png', '의료': 'pill', '문화·여가': 'popcorn', '경조사': 'envelope', '기타': 'package', '월급': 'banknote', '용돈': 'moneybag', '부수입': 'coin', '이자·배당': 'chart' };
const catSrc = cat => `/icons/cat/${CAT_ICONS[cat].includes('.') ? CAT_ICONS[cat] : CAT_ICONS[cat] + '.webp'}`; // 구독(tv.png)만 png
const catIcon = (cat, size = 20) => CAT_ICONS[cat] ? `<img class="cat-ico" src="${catSrc(cat)}" alt="" width="${size}" height="${size}">` : '';
function addTileIcon(t) {
  const img = iconOf(t.getAttribute('href'));
  if (!img || t.querySelector('.ico')) return;
  const badge = t.querySelector('.badge');
  t.insertAdjacentHTML('afterbegin', `<div class="tile-top">${img}</div>`);
  if (badge) t.querySelector('.tile-top').append(badge); // 배지는 아이콘 옆에
}
(() => {
  document.querySelectorAll('.tiles a.tile').forEach(addTileIcon);
  const card = document.querySelector('.wrap > .card');
  const img = card && iconOf(location.pathname);
  if (img && card.querySelector('h1')) card.querySelector('h1').insertAdjacentHTML('beforebegin', img.replace('class="ico"', 'class="page-ico"').replace(/width="44" height="44" loading="lazy" /, 'width="64" height="64" '));
})();

// ── 핵심 숫자: 계산기 카드에 그 계산기의 대표 숫자를 한 줄로 보여 줘요 (숫자는 각 계산기 안내와 같아요) ──
(() => {
  const KEY_FACTS = {
    '/salary/': '연봉 4천이면 월 <b>약 294만 원</b>',
    '/salary-rank/': '연봉 5천이면 <b>상위 30%</b>',
    '/year-end-tax/': '연금저축 넣으면 <b>최대 16.5%</b> 환급',
    '/unemployment/': '하루 최대 <b>68,100원</b>',
    '/loan/': '1억 · 연 4% · 30년이면 월 <b>약 47.7만 원</b>',
    '/wage/': '2026 최저시급 <b>10,320원</b>',
    '/holiday-pay/': '주 <b>15시간</b> 이상이면 받아요',
    '/severance/': '1년 일하면 <b>약 한 달 치</b> 월급',
    '/savings/': '월 50만 · 연 3.5% · 1년이면 세후 <b>약 9.6만 원</b>',
    '/deposit/': '1천만 원 · 연 3% · 1년이면 세후 <b>약 25.4만 원</b>',
    '/compound/': '연 7%면 <b>약 10년</b>에 2배',
    '/goal/': '1억 · 5년 · 연 3.5%면 월 <b>약 152만 원</b>',
    '/inflation/': '물가 2%면 10년 뒤 100만 원은 <b>약 82만 원</b> 가치',
    '/isa/': '수익 <b>200만 원까지 비과세</b>',
    '/corporate-tax/': '2026년부터 <b>10~25%</b>',
    '/income-tax/': '프리랜서 <b>3.3% 환급</b> 미리 보기',
    '/pension/': '1년 최대 <b>148만 5천 원</b> 환급',
    '/prepayment/': '대출받고 <b>3년</b> 지나면 수수료 0원',
    '/pyeong/': '1평은 <b>3.3058㎡</b>',
    '/vat/': '부가세는 <b>10%</b>',
    '/discount/': '20% 할인에 10% 쿠폰이면 <b>28%</b> 할인',
    '/dividend/': '배당소득세 <b>15.4%</b>를 떼고 받아요',
    '/overseas-stock-tax/': '<b>250만 원</b> 넘는 수익에 <b>22%</b>',
    '/etf-fee/': '보수 0.5% 차이, 20년이면 <b>1,000만 원+</b>',
    '/loss-recovery/': '-50%면 <b>+100%</b> 올라야 본전',
    '/financial-income-tax/': '이자·배당 <b>2,000만 원</b> 넘으면 합산',
  };
  document.querySelectorAll('.tiles a.tile').forEach(t => {
    const fact = KEY_FACTS[t.getAttribute('href')], p = t.querySelector('p');
    if (fact && p) p.insertAdjacentHTML('afterend', `<span class="key">${fact}</span>`);
  });
})();

// ── 즐겨찾기: 계산기 카드와 계산기 화면의 ☆를 누르면, 홈과 '모든 계산기' 맨 위에 모아 보여 줘요 ──
(() => {
  const KEY = 'donsem:favs';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); return false; } };
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
  const isCalc = href => /^\/[a-z-]+\/$/.test(href) && !['/budget/', '/fixed/', '/assets/', '/goals/', '/calculators/', '/my/', '/about/', '/privacy/'].includes(href);
  function toggle(path, name) {
    const list = read(), on = !list.includes(path);
    if (!write(on ? [path, ...list] : list.filter(p => p !== path))) return;
    const c = name.charCodeAt(name.length - 1), j = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '을' : '를'; // 받침에 맞는 조사
    toast(on ? `${name}${j} 즐겨찾기에 넣었어요. 홈 맨 위에서 바로 열 수 있어요.` : `${name}${j} 즐겨찾기에서 뺐어요.`);
    sync();
  }
  function starBtn(path, name) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fav'; b.dataset.path = path; b.dataset.name = name; b.innerHTML = STAR;
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggle(path, name); });
    return b;
  }

  // 계산기 카드마다 ☆ (홈, 모든 계산기)
  const info = {};
  document.querySelectorAll('.tiles:not(.mm-tiles) a.tile').forEach(t => {
    const href = t.getAttribute('href');
    if (!isCalc(href)) return;
    const name = t.querySelector('h3').textContent.trim();
    if (!info[href] || info[href].pop) info[href] = { name, desc: t.querySelector('p').textContent, pop: !!t.closest('.popular') }; // 짧은 '많이 찾는' 이름보다 원래 카드 이름을 써요
    t.append(starBtn(href, name));
  });
  // 계산기 화면에서도 ☆
  const card = document.querySelector('.card .result') && document.querySelector('.card');
  if (card && isCalc(location.pathname)) {
    const name = card.querySelector('h1').textContent.trim(), b = starBtn(location.pathname, name);
    b.classList.add('fav-page'); b.insertAdjacentHTML('beforeend', '<span>즐겨찾기</span>');
    card.prepend(b);
  }

  // 홈 · 모든 계산기 맨 위 "내 즐겨찾기"
  const anchor = document.querySelector('.popular') || document.querySelector('.duo') || (location.pathname === '/calculators/' && document.querySelector('.group'));
  let box = null;
  if (anchor) {
    box = document.createElement('section');
    box.className = 'fav-group';
    anchor.before(box);
    const q = document.getElementById('calc-q');
    if (q) q.addEventListener('input', () => { box.hidden = !!q.value.trim() || !read().some(p => info[p]); });
  }
  function sync() {
    const list = read();
    document.querySelectorAll('button.fav').forEach(b => {
      const on = list.includes(b.dataset.path);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${b.dataset.name} ${on ? '즐겨찾기에서 빼기' : '즐겨찾기에 넣기'}`);
    });
    if (!box) return;
    const favs = list.filter(p => info[p]);
    box.hidden = !favs.length;
    box.innerHTML = favs.length ? `<h2>내 즐겨찾기</h2><div class="tiles">${favs.map(p => `<a class="tile" href="${p}"><h3>${info[p].name}</h3><p>${info[p].desc}</p><span class="go">계산하기 ›</span></a>`).join('')}</div>` : '';
    box.querySelectorAll('a.tile').forEach(t => { addTileIcon(t); t.append(starBtn(t.getAttribute('href'), info[t.getAttribute('href')].name)); });
    box.querySelectorAll('button.fav').forEach(b => { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', `${b.dataset.name} 즐겨찾기에서 빼기`); });
  }
  sync();
})();

// ── 모든 계산기: 분류 버튼 (전체 · 즐겨찾기 · 저축·투자 …) ──
(() => {
  const list = document.getElementById('calc-list'), q = document.getElementById('calc-q');
  if (!list || !q) return;
  const groups = [...document.querySelectorAll('.group')], fav = document.querySelector('.fav-group');
  const bar = document.createElement('div');
  bar.className = 'cat-chips'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', '계산기 분류');
  const chips = [['all', '전체'], ['fav', '즐겨찾기'], ...groups.map((g, i) => [String(i), g.querySelector('h2').textContent.replace(/\s*·\s*/g, '·')])];
  bar.innerHTML = chips.map(([v, t], i) => `<button type="button" role="tab" data-v="${v}" class="${i ? '' : 'on'}" aria-selected="${!i}">${t}</button>`).join('');
  q.closest('.field').after(bar);
  const pick = v => bar.querySelectorAll('button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const v = b.dataset.v;
    if (q.value) { q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); } // 검색어는 지우고 분류로 봐요
    pick(v);
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const hasFav = fav && fav.querySelector('.tile');
    groups.forEach((g, i) => { g.hidden = !(v === 'all' || v === String(i)); });
    if (fav) fav.hidden = !hasFav || !(v === 'all' || v === 'fav');
    document.getElementById('calc-none').hidden = !(v === 'fav' && !hasFav);
    if (v === 'fav' && !hasFav) document.getElementById('calc-none').textContent = '아직 즐겨찾기가 없어요. 계산기 카드의 ☆를 눌러 보세요.';
  });
  q.addEventListener('input', () => { pick('all'); document.getElementById('calc-none').textContent = '찾는 계산기가 없어요. 다른 말로 검색해 보세요.'; });
})();

// ── 위쪽 메뉴: 분류를 누르면(컴퓨터는 올리기만 해도) 그 분류 계산기가 펼쳐져요 ──
const MENU = [
  ['돈 관리', [['/budget/', '캘린더 · 가계부', '지출 수입 예산 달력 일정'], ['/shop/', '돈셈 스토어', '엑셀 가계부 템플릿 재테크 구글 시트 구매'], ['/hidden-money/', '숨은 돈 찾기', '환급 공제 지원금 월세 의료비 근로장려금 놓친 돈'], ['/budget/#fixed', '고정지출', '구독 월세 보험'], ['/budget/#assets', '내 자산', '순자산 부채'], ['/money-calendar/', '돈 달력', '세금 일정 신고 납부 마감 디데이 연말정산 최저임금'], ['/guide/', '돈 가이드', '글 정리 연말정산 실업급여 실수령액 IRP 카드 공제 월세']]],
  ['챌린지 · 테스트', [['/quiz/', '오늘의 돈 퀴즈', '상식 OX 문제 금전운 돈나무'], ['/no-spend/', '무지출 챌린지', '절약 무지출 달력 도장'], ['/money-type/', '돈BTI 테스트', '소비 성향 성격 테스트 mbti'],
    ['/collection/', '내 컬렉션', '돈나무 배지 기록 모음']]],
  ['저축 · 투자', [['/invest/', '투자 계산 모음', '주식 ETF 세금 수수료'], ['/savings/', '적금 이자', '만기'], ['/deposit/', '예금 이자', '정기예금 만기'], ['/compound/', '복리 투자', '투자 수익'], ['/isa/', 'ISA 절세', '세금 비과세 계좌 주식'], ['/pension/', '연금저축·IRP', '세액공제 연말정산 노후'], ['/goal/', '목표 저축', '1억 모으기'],
    ['/dividend/', '배당금', '주식 배당 세금'], ['/avg-price/', '물타기', '평균 단가 주식'], ['/retirement/', '노후자금', '은퇴 연금'], ['/inflation/', '물가상승률', '화폐 가치'],
    ['/overseas-stock-tax/', '해외주식 양도세', '미국 주식 양도소득세 250만 원 공제 22% 손익통산'], ['/etf-fee/', 'ETF 보수 비교', '총보수 수수료 운용보수 장기 투자'], ['/loss-recovery/', '손실 회복 수익률', '본전 주식 하락 마이너스 손절'], ['/financial-income-tax/', '금융소득종합과세', '이자 배당 2천만 원 종합과세 건강보험료']]],
  ['대출 · 집', [['/real-estate/', '부동산 지도', '서울 아파트 지도 관심 단지 실거래가 시세 부동산 뉴스 재건축 재개발 압구정 성수 한남 은마'], ['/acquisition-tax/', '취득세', '주택 아파트 취득세 다주택 중과 생애최초'], ['/brokerage-fee/', '중개수수료', '복비 부동산 중개보수 전세 월세 매매'], ['/jeonse-check/', '전세 안심 진단', '깡통전세 전세사기 보증금 근저당 전세가율 보증보험'], ['/subscription-score/', '청약 가점', '청약 가점 점수 무주택 부양가족 청약통장 84점 분양'], ['/loan-limit/', '대출 한도', 'DSR 대출 한도 주담대 신용대출 스트레스 얼마까지 빌릴 수'], ['/loan/', '대출 이자', '원리금 균등 상환'], ['/refinance/', '대출 갈아타기', '대환'], ['/prepayment/', '중도상환수수료', '조기 상환'],
    ['/car-loan/', '자동차 할부', '차 할부'], ['/rent/', '전월세 전환', '전세 월세'], ['/pyeong/', '평수', '제곱미터 평당']]],
  ['월급 · 일', [['/salary/', '연봉 실수령액', '월급 세금 4대보험'], ['/salary-rank/', '연봉 상위 %', '연봉 순위 백분위 퍼센트'], ['/asset-rank/', '순자산 상위 %', '자산 순위 재산 백분위 가계금융복지조사'], ['/time-value/', '내 시간 가치', '시급 노동 시간 가격 몇 시간 충동구매'], ['/lump-sum/', '목돈 굴리기 비교', '1000만원 예금 파킹통장 채권 ISA 어디에 넣을까 이자'], ['/wage/', '시급·월급·연봉', '알바 최저시급'], ['/holiday-pay/', '주휴수당', '알바'],
    ['/severance/', '퇴직금', '퇴사'], ['/unemployment/', '실업급여', '퇴사 구직급여'], ['/year-end-tax/', '연말정산 환급', '13월의 월급 세금'], ['/year-end/', '연말정산 모아보기', '미리보기 체크리스트 일정 환급']]],
  ['생활 · 사업', [['/vat/', '부가세', '공급가액 세금'], ['/income-tax/', '종합소득세', '프리랜서 3.3% 환급 개인사업자 5월'], ['/corporate-tax/', '법인세', '법인 사업자 세율'], ['/discount/', '할인율', '세일 가격'], ['/percent/', '퍼센트', '비율 증가율'], ['/unit-price/', '단가 비교', '100g당 가격'], ['/used-price/', '중고 시세', '중고거래 얼마에 팔까 감가 시세'], ['/delivery/', '배달비', '배달 음식 배달팁 멤버십 구독 포장 픽업 외식'], ['/fan-budget/', '덕질 비용', '덕질 아이돌 앨범 굿즈 포토카드 콘서트 팬미팅 멤버십 팬사인회'],
    ['/fuel/', '유류비', '기름값 연비'], ['/dutch-pay/', '더치페이', 'n빵 정산'], ['/date/', '날짜', '디데이 d-day 며칠']]],
];
(() => {
  const top = document.querySelector('.topbar'), inner = top && top.querySelector('.topbar-in'), right = top && top.querySelector('.top-right');
  if (!inner || !right) return;
  const path = location.pathname, here = MENU.findIndex(([, items]) => items.some(([href]) => href === path));
  const short = t => t.replace(/\s*·\s*/g, '·');
  const item = ([href, name]) => `<a href="${href}"${href === path ? ' class="on" aria-current="page"' : ''}>${iconOf(href)}<span>${name}</span></a>`;

  // 컴퓨터: 로고 옆 분류 메뉴 / 휴대폰: 메뉴바 아래 한 줄 버튼 — 둘 다 같은 순서로 보여요 (돈 관리부터)
  const btn = (t, i) => `<button type="button" data-g="${i}" aria-expanded="false" aria-controls="gnav-panel"${i === here ? ' class="here"' : ''}>${short(t)}</button>`;
  const gnav = document.createElement('div');
  gnav.className = 'gnav'; gnav.setAttribute('role', 'navigation'); gnav.setAttribute('aria-label', '주요 메뉴');
  const onTab = (document.querySelector('.tabbar a.on') || {}).pathname; // 위쪽 메뉴는 아래 독바와 같은 4칸: 돈셈의 핵심 기능만 (홈은 로고를 누르면 가요)
  gnav.innerHTML = [['/calculators/', '계산기'], ['/shop/', '쇼핑'], ['/real-estate/', '부동산'], ['/budget/', '캘린더']].map(([h, t]) => `<a class="gnav-shop${h === onTab ? ' here' : ''}" href="${h}"${h === onTab ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  inner.querySelector('.brand').after(gnav);
  const sBtn = document.createElement('button');
  sBtn.type = 'button'; sBtn.className = 'search-btn'; sBtn.dataset.g = 'search'; sBtn.setAttribute('aria-label', '계산기 검색'); sBtn.setAttribute('aria-expanded', 'false');
  sBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  right.prepend(sBtn);
  document.body.classList.add('has-gnav');

  const wrap = document.createElement('div');
  wrap.className = 'gnav-layer';
  wrap.innerHTML = '<div class="gnav-dim"></div><div class="gnav-panel" id="gnav-panel" role="dialog" aria-modal="false"><div class="gnav-in"></div></div>';
  document.body.append(wrap);
  const panel = wrap.querySelector('.gnav-in');
  let open = null, timer = 0;

  const recentQ = () => { try { const v = JSON.parse(store.get('donsem:searches')); return Array.isArray(v) ? v.filter(r => r && r.q).slice(0, 10) : []; } catch (e) { return []; } };
  const saveQ = v => { v = String(v).trim().slice(0, 30); if (!v) return; const d = new Date(), l = recentQ().filter(r => r.q !== v); l.unshift({ q: v, d: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.` }); store.set('donsem:searches', JSON.stringify(l.slice(0, 10))); };
  function draw(g) {
    if (g === 'search') {
      panel.innerHTML = `<div class="gnav-head"><b>계산기 검색</b><button type="button" class="gnav-x" aria-label="닫기">×</button></div>
        <div class="field gnav-q"><input type="search" placeholder="예: 주휴, 대출, 퇴직금" autocomplete="off" aria-label="계산기 검색"></div><div class="gnav-list" aria-live="polite"></div>`;
      const q = panel.querySelector('input'), list = panel.querySelector('.gnav-list');
      const all = MENU.flatMap(([t, items]) => items.map(it => [...it, t]));
      // 초성 검색: 'ㅌㅈ'만 쳐도 '퇴직금'을 찾아요 (한글을 치는 중에 'ㅇ'만 보여도 바로 결과가 나와요)
      const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
      const cho = t => [...t].map(c => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c; }).join('');
      const find = () => {
        const s = q.value.replace(/\s/g, '').toLowerCase(), onlyCho = /^[ㄱ-ㅎ]+$/.test(s);
        const hits = s ? all.filter(([, name, kw, t]) => { const h = (name + kw + t).replace(/[\s·]/g, '').toLowerCase(); return h.includes(s) || (onlyCho && cho(name.replace(/[\s·]/g, '')).includes(s)); }) : all.filter(([href]) => ['/salary/', '/loan/', '/year-end-tax/', '/unemployment/', '/severance/', '/budget/'].includes(href));
        const rs = s ? [] : recentQ(), esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
        const recentHtml = rs.length ? `<div class="rq-head"><p class="gnav-cap">최근 검색어</p><button type="button" class="rq-all" data-rall="1">전체삭제</button></div><ul class="rq-list">${rs.map((r, i) => `<li><button type="button" class="rq-q" data-rq="${esc(r.q)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>${esc(r.q)}</button><span class="rq-d">${esc(r.d)}</span><button type="button" class="rq-x" data-rx="${i}" aria-label="${esc(r.q)} 지우기">×</button></li>`).join('')}</ul>` : '';
        list.innerHTML = recentHtml + (s ? '' : '<p class="gnav-cap">많이 찾는 것</p>') + (hits.length ? hits.map(item).join('') : '<p class="gnav-none">찾는 계산기가 없어요. 다른 말로 찾아보세요.</p>');
      };
      q.addEventListener('input', e => { e.stopPropagation(); find(); });
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = list.querySelector('a'); if (a) { saveQ(q.value); location.href = a.href; } } });
      // 최근 검색어: 고른 검색어만 날짜와 함께 10개까지 (네이버 쇼핑 검색처럼 하나씩 지우거나 전체삭제)
      list.addEventListener('click', e => {
        const rq = e.target.closest('[data-rq]'), rx = e.target.closest('[data-rx]'), all = e.target.closest('[data-rall]'), a = e.target.closest('a');
        if (rq) { q.value = rq.dataset.rq; find(); q.focus({ preventScroll: true }); return; }
        if (rx) { const l = recentQ(); l.splice(+rx.dataset.rx, 1); store.set('donsem:searches', JSON.stringify(l)); find(); return; }
        if (all) { store.del('donsem:searches'); find(); return; }
        if (a && q.value.trim()) saveQ(q.value);
      });
      find();
      setTimeout(() => q.focus({ preventScroll: true }), 30);
    } else {
      const [t, items] = MENU[g];
      panel.innerHTML = `<div class="gnav-head"><b>${t}</b><button type="button" class="gnav-x" aria-label="닫기">×</button></div>
        <div class="gnav-list">${items.map(item).join('')}</div>
        <a class="gnav-all" href="${['/budget/', '/collection/'][g] || '/calculators/'}">${['가계부 열기', '내 배지와 돈나무 보기'][g] || '모든 계산기 보기'} ›</a>`;
    }
    panel.querySelector('.gnav-x').addEventListener('click', () => show(null));
  }
  function show(g) {
    clearTimeout(timer);
    if (g !== null && String(g) === String(open)) return;
    open = g;
    document.querySelectorAll('[data-g]').forEach(b => { const on = g !== null && b.dataset.g === String(g); b.classList.toggle('open', on); b.setAttribute('aria-expanded', String(on)); });
    if (g === null) { wrap.classList.remove('show', 'kb'); wrap.style.top = wrap.style.height = wrap.style.bottom = ''; document.documentElement.classList.remove('gnav-open'); return; }
    draw(g);
    wrap.classList.add('show');
    document.documentElement.classList.add('gnav-open');
    fitKb();
  }
  // 휴대폰에서 검색창에 자판이 올라오면: 창을 '자판 위 보이는 부분'에 딱 맞추고, 검색창은 위에 · 결과는 그 아래에서 스크롤돼요
  // (예전엔 창이 자판 쪽으로 밀려 내려가서 결과가 안 보이고, 창 아래로 뒤 화면이 비쳤어요)
  const vv = window.visualViewport, phone = matchMedia('(max-width: 640px)');
  function fitKb() {
    if (!vv || !phone.matches || open === null) return;
    const kb = vv.height < document.documentElement.clientHeight - 120;
    wrap.style.top = vv.offsetTop + 'px'; wrap.style.height = vv.height + 'px'; wrap.style.bottom = 'auto';
    wrap.classList.toggle('kb', kb);
  }
  if (vv) { vv.addEventListener('resize', fitKb); vv.addEventListener('scroll', fitKb); }
  const toggle = g => show(String(open) === String(g) ? null : g);
  top.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) toggle(b.dataset.g === 'search' ? 'search' : +b.dataset.g); });
  wrap.querySelector('.gnav-dim').addEventListener('click', () => show(null));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && open !== null) { const g = open; show(null); const b = gnav.querySelector(`[data-g="${g}"]`) || sBtn; b.focus(); }
    if (e.key === '/' && open === null && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); show('search'); }
  });

  // 컴퓨터(마우스): 분류 위에 올리면 펼치고, 메뉴 밖으로 나가면 닫아요
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    gnav.addEventListener('mouseover', e => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      clearTimeout(timer);
      timer = setTimeout(() => show(+b.dataset.g), open === null ? 120 : 0);
    });
    const leave = () => { clearTimeout(timer); if (open !== 'search') timer = setTimeout(() => show(null), 250); };
    const stay = () => clearTimeout(timer);
    gnav.addEventListener('mouseleave', leave);
    wrap.querySelector('.gnav-panel').addEventListener('mouseenter', stay);
    wrap.querySelector('.gnav-panel').addEventListener('mouseleave', leave);
  }
  window.addEventListener('pageshow', () => show(null)); // 뒤로 가기로 돌아왔을 때 열린 채로 남지 않게
})();

// ── 홈: 분류마다 4개만 먼저 보여 주고, '전체 보기'를 누르면 나머지를 펼쳐요 ──
(() => {
  if (!document.body.classList.contains('home')) return;
  document.querySelectorAll('.group:not(.popular):not(.bundles):not(.fav-group):not(.recent) > .tiles').forEach(tiles => {
    const extra = [...tiles.children].slice(4);
    if (extra.length <= 2) return; // 1~2개만 더 있으면 버튼 없이 다 보여 줘요 (굳이 누를 필요 없게)
    extra.forEach(t => t.classList.add('tile-more'));
    tiles.classList.add('folded');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'more-btn'; b.setAttribute('aria-expanded', 'false');
    const label = () => { const open = !tiles.classList.contains('folded'); b.textContent = open ? '접기 ‹' : `전체 보기 (${extra.length}개 더) ›`; b.setAttribute('aria-expanded', String(open)); };
    b.addEventListener('click', () => {
      tiles.classList.toggle('folded');
      label();
      if (tiles.classList.contains('folded')) tiles.closest('.group').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    label();
    tiles.after(b);
  });
})();

// ── 엑셀로 저장: 입력한 값과 결과를 .xlsx 파일 하나로 만들어 줘요 (서버로 보내지 않고 이 기기에서 만들어요) ──
function calcSheet(name, url) {
  const card = document.querySelector('.card'), result = card.querySelector('.result');
  const clean = el => { const c = el.cloneNode(true); c.querySelectorAll('button, .krw').forEach(b => b.remove()); return c.textContent.replace(/\s+/g, ' ').replace(/\s*·\s*/g, '·').replace(/\s*\(.*\)$/, '').trim(); }; // '물타기 계산기 (평균 단가)' → '물타기 계산기'
  const shown = el => el.getClientRects().length > 0;
  const labelOf = el => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    for (let n = el; n && n !== card; n = n.parentElement) // 가장 가까운 칸 이름부터 찾아요 (모드별 묶음 안쪽 먼저)
      for (let p = n.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === 'LABEL') return clean(p);
    return '';
  };
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const out = [[{ v: `돈셈 · ${name}`, s: 'title' }], ['계산한 날', today], ['다시 보기 링크', url], [], [{ v: '입력한 값', s: 'head' }]];
  card.querySelectorAll('input[data-k], .seg[data-k]').forEach(el => {
    if (!shown(el)) return;
    if (el.classList.contains('seg')) { const on = el.querySelector('.on'); if (on) out.push([labelOf(el), on.textContent.trim()]); return; }
    const unit = el.parentElement.querySelector('span:not(.krw)');
    out.push([labelOf(el), el.value + (unit && el.value ? (unit.textContent.trim() === '원' ? '원' : ' ' + unit.textContent.trim()) : '')]);
  });
  out.push([], [{ v: '결과', s: 'head' }]);
  const head = result.querySelector(':scope > div:not(.big):not(.rows)'), big = result.querySelector('.big');
  if (big) out.push([head ? clean(head) : '결과', clean(big)]);
  else if (clean(result)) out.push([clean(result)]);
  result.querySelectorAll('.rows > div').forEach(r => { const a = r.querySelector('span'), b = r.querySelector('b'); if (a && b) out.push([clean(a), clean(b)]); });
  result.querySelectorAll('.insight').forEach(p => out.push([], [{ v: '한 줄 정리', s: 'head' }], [clean(p).replace(/^한 줄 정리\s*/, '')]));
  result.querySelectorAll('table').forEach(t => {
    const sum = t.closest('details') && t.closest('details').querySelector('summary');
    out.push([], [{ v: sum ? clean(sum).replace(/\s*보기$/, '') : '표', s: 'head' }]);
    t.querySelectorAll('tr').forEach(tr => out.push([...tr.children].map(c => tr.querySelector('th') ? { v: clean(c), s: 'bold' } : clean(c))));
  });
  out.push([], ['계산 결과는 참고용이에요. 실제 금액은 상품 조건과 세금에 따라 달라질 수 있어요.'], ['출처', 'doncalculator.com']);
  return out;
}
function xlsxBlob(rows, sheetName) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const col = i => String.fromCharCode(65 + i);
  const STY = { title: 1, head: 2, bold: 2 }; // 1 큰 굵은 글씨, 2 굵은 글씨, 3 숫자+원, 4 숫자
  const cell = (c, r, i) => {
    const o = c && typeof c === 'object' ? c : { v: c };
    if (o.v === undefined || o.v === '') return '';
    const ref = col(i) + r, v = String(o.v).trim(), m = !o.s && v.match(/^(-?[\d,]+(?:\.\d+)?)(원)?$/);
    if (m && /\d/.test(m[1])) return `<c r="${ref}" s="${m[2] ? 3 : 4}"><v>${m[1].replace(/,/g, '')}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${o.s ? ` s="${STY[o.s]}"` : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  const wide = Math.max(...rows.map(r => r.length), 2);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="${wide}" width="20" customWidth="1"/></cols><sheetData>` +
    rows.map((r, i) => `<row r="${i + 1}">${r.map((c, j) => cell(c, i + 1, j)).join('')}</row>`).join('') + '</sheetData></worksheet>';
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0&quot;원&quot;"/></numFmts><fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="14"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf/><xf fontId="1" applyFont="1"/><xf fontId="2" applyFont="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="4" applyNumberFormat="1"/></cellXfs></styleSheet>',
  };
  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
// 압축 없이 묶는 zip (xlsx 파일은 사실 zip이에요)
function zipStore(files) {
  const enc = new TextEncoder(), crcT = zipStore.t || (zipStore.t = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; }));
  const crc = b => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const parts = [], dir = [];
  let off = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = enc.encode(path), data = enc.encode(text), c = crc(data);
    const h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [12, 33, 2], [14, c, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2]].forEach(([o, v, n]) => n === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    const d = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [14, 33, 2], [16, c, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [42, off, 4]].forEach(([o, v, n]) => n === 4 ? d.setUint32(o, v, true) : d.setUint16(o, v, true));
    parts.push(h, name, data); dir.push(d, name);
    off += 30 + name.length + data.length;
  }
  const size = dir.reduce((a, x) => a + x.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, dir.length / 2, 2], [10, dir.length / 2, 2], [12, size, 4], [16, off, 4]].forEach(([o, v, n]) => n === 4 ? e.setUint32(o, v, true) : e.setUint16(o, v, true));
  return new Blob([...parts, ...dir, e]);
}
async function saveXlsx(name, url) {
  document.querySelectorAll('.odo').forEach(x => x.remove()); document.querySelectorAll('.odo-on').forEach(x => x.classList.remove('odo-on')); // 굴러가는 숫자 띠가 엑셀에 섞이지 않게
  const d = new Date(), stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const fileName = `돈셈_${name.replace(/\s*계산기$/, '').replace(/[\\/:*?"<>|]/g, '')}_${stamp}.xlsx`;
  const blob = xlsxBlob(calcSheet(name, url), name.replace(/\s*계산기$/, ''));
  const file = new File([blob], fileName, { type: blob.type });
  // 휴대폰: 공유 창으로 넘겨서 '파일에 저장'·카톡 보내기를 고를 수 있게 해요
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: fileName }); return; } catch (err) { if (err.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('엑셀 파일로 저장했어요. 다운로드 폴더를 확인해 보세요.');
}

// ── 첫 화면: 오늘의 돈 퀴즈 카드 (O/X를 누르면 퀴즈 페이지에서 바로 정답을 보여 줘요) ──
(() => {
  if (!document.body.classList.contains('home') || typeof QUIZ === 'undefined') return;
  if (document.getElementById('daily')) return; // 새 첫 화면은 '오늘의 돈셈' 카드 안에서 퀴즈를 바로 풀어요
  const s = quizLoad(), id = quizTodayFor(s), done = s.days[quizDate()], streak = quizStreak(s);
  const tree = treeOf(s), f = done ? fortuneToday(s) : null;
  const sec = document.createElement('section');
  sec.className = 'quiz-home';
  sec.innerHTML = `<div class="qh-head"><b>${iconOf('/quiz/')}오늘의 돈 퀴즈</b><a class="qh-tree" href="/quiz/#tree"><img src="${tree.img}" alt="" width="28" height="28">${tree.name}${streak ? ` · 🔥${streak}` : ''}</a></div>
    <p class="qz-q">${QUIZ[id][0]}</p>
    ${done ? `<a class="qh-done" href="/quiz/"><span>${done.ok ? '✓ 맞혔어요' : '✓ 오늘 문제를 풀었어요'}</span><span>오늘의 금전운 ${'💰'.repeat(f.coins)} ${f.level} ›</span></a>`
      : `<div class="qz-btns"><a class="qz-btn" href="/quiz/?a=o"><span class="qz-o" aria-hidden="true"></span>맞아요</a><a class="qz-btn" href="/quiz/?a=x"><span class="qz-x" aria-hidden="true"></span>아니에요</a></div>
      <p class="qh-hint">풀면 오늘의 금전운이 열리고 돈나무가 자라요 🌱</p>`}`;
  const daily = document.getElementById('daily'), first = document.querySelector('.wrap > .group');
  if (daily) daily.append(sec); else if (first) first.before(sec);
  if (document.querySelector('.showcase')) return; // 첫 화면 큰 칸에 돈BTI가 있으면 배너는 생략
  // 돈BTI 테스트 배너 (해 본 사람은 내 결과 캐릭터를 보여 줘요)
  let my = null;
  try { my = localStorage.getItem('donsem:money-type'); } catch (e) { my = null; }
  const animals = { spam: 'chipmunk', spaw: 'ant', sprm: 'owl', sprw: 'honeybee', sfam: 'turtle', sfaw: 'bear', sfrm: 'fox', sfrw: 'dolphin', upam: 'cat', upaw: 'dog', uprm: 'lion', uprw: 'penguin', ufam: 'hamster', ufaw: 'panda', ufrm: 'rabbit', ufrw: 'koala' };
  const ban = document.createElement('a');
  ban.className = 'mt-banner';
  ban.href = animals[my] ? `/money-type/?t=${my}` : '/money-type/';
  ban.innerHTML = `<div class="mt-imgs">${(animals[my] ? [animals[my]] : ['chipmunk', 'hamster', 'rabbit']).map(a => `<img src="/icons/dbti/${a}.webp" alt="" width="44" height="44">`).join('')}</div>
    <div><b>돈BTI 테스트</b><span>${animals[my] ? '내 결과 다시 보기 · 친구랑 비교해 보세요 ›' : '12문제로 알아보는 나의 돈 성격 ›'}</span></div>`;
  sec.after(ban);
})();

// ── 인스타 스토리 이미지(1080×1920) 공통: 무지출 챌린지·연봉 순위·월말 결산에서 같이 써요 ──
// o: { kicker, title, big, sub, img, color, boxes: [[이름, 값]×3], draw(c, y): 추가로 그릴 것(높이 반환), link, foot }
async function storyCard(o) {
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), FONT = '"Pretendard Variable", Pretendard, -apple-system, sans-serif';
  try { await Promise.all([document.fonts.load(`800 96px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]); } catch (e) { /* 기본 글씨체로 그려요 */ }
  const pic = o.img ? await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = o.img; }) : null;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.color || '#4ea8ff'); g.addColorStop(0.6, '#ffffff'); g.addColorStop(1, '#f5f5f7');
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(0, 0, W, H);
  const text = (s, x, y, size, weight, col, align = 'center') => { c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); };
  const fit = (s, max, size, weight) => { c.font = `${weight} ${size}px ${FONT}`; while (c.measureText(s).width > max && size > 40) { size -= 4; c.font = `${weight} ${size}px ${FONT}`; } return size; };
  const round = (x, y, w, h, r, fill) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); };
  let y = 200;
  text(o.kicker || '돈셈', W / 2, y, 40, 600, '#1d1d1f'); y += 70;
  if (o.title) { text(o.title, W / 2, y, 46, 600, '#3a3a3c'); y += 40; }
  if (pic) { // 차트·달력이 있으면 그림을 조금 작게 그려 자리를 내줘요
    const R = o.draw ? 140 : 190, S = R * 1.58;
    c.beginPath(); c.arc(W / 2, y + R, R, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill(); c.drawImage(pic, W / 2 - S / 2, y + R - S / 2, S, S); y += R * 2 + 40;
  }
  else y += 60;
  const bs = fit(o.big, 960, 120, 800); text(o.big, W / 2, y + 100, bs, 800, '#1d1d1f'); y += 150;
  if (o.sub) { const ss = fit(o.sub, 940, 46, 600); text(o.sub, W / 2, y + 40, ss, 600, '#3a3a3c'); y += 90; }
  if (o.draw) y += o.draw(c, y + 20, { text, round, W, FONT }) + 40;
  if (o.boxes) {
    o.boxes.slice(0, 3).forEach(([k, v], i) => {
      const x = 90 + i * 310; round(x, y + 20, 280, 190, 32, '#ffffff');
      text(k, x + 140, y + 88, 30, 500, '#6e6e73'); const vs = fit(String(v), 250, 46, 700); text(String(v), x + 140, y + 160, vs, 700, '#1d1d1f');
    });
  }
  text(o.foot || '너는 어때? 👀', W / 2, 1680, 50, 700, '#1d1d1f');
  text(o.link.replace(/^https?:\/\//, ''), W / 2, 1770, 40, 700, '#7040A1');
  text('돈셈 · 무료 · 가입 없이 바로', W / 2, 1830, 30, 500, '#6e6e73');
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
// 버튼: 누르면 링크를 복사하고, (휴대폰) 공유 창 / (컴퓨터) 이미지 저장. make()는 미리 불러 둔 그림 약속을 돌려줘요
function storyButton(label, make, fileName, link) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ft-story';
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>' + label;
  b.addEventListener('click', async () => {
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {}); // 스토리 링크 스티커에 붙여 넣을 주소
    b.disabled = true;
    try {
      const blob = await make(), file = new File([blob], fileName, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); toast('주소를 복사해 뒀어요. 스토리에서 링크 스티커에 붙여 넣으세요!'); }
        catch (e) { if (e.name !== 'AbortError') toast('공유 창을 열지 못했어요. 한 번 더 눌러 주세요.'); }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = fileName;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('이미지를 저장했어요. 휴대폰에서 누르면 인스타 스토리에 바로 올릴 수 있어요.');
      }
    } finally { b.disabled = false; }
  });
  return b;
}

// ── 연봉 상위 %: 내 순위를 스토리 이미지로 ──
(() => {
  const out = document.getElementById('sr_out');
  if (!out) return;
  let cache = null, timer = 0;
  const make = () => {
    const year = (seg('sr_mode') === 'month' ? val('sr_amt') * 12 : val('sr_amt')) / 10000, t = salaryTop(year);
    return storyCard({ kicker: '돈셈 · 연봉 상위 % 계산기', title: '내 연봉은 우리나라 직장인 중', img: '/icons/salary-rank.webp', color: '#ffd85a',
      big: `상위 ${topText(t)}`, sub: '2024년 근로소득자 2,108만 명 기준',
      draw: (c, top, { text, round, W }) => { // 하위 ↔ 상위 막대에 내 위치
        const x0 = 140, w = W - 280, x = x0 + w * Math.min(0.99, Math.max(0.01, (100 - t) / 100)), y = top + 120;
        round(90, top, W - 180, 260, 36, 'rgba(255,255,255,.85)');
        const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#e8e8ed'); g.addColorStop(1, '#7040A1');
        c.beginPath(); if (c.roundRect) c.roundRect(x0, y - 14, w, 28, 14); else c.rect(x0, y - 14, w, 28); c.fillStyle = g; c.fill();
        c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
        c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fillStyle = '#7040A1'; c.fill();
        text('나', x, y - 50, 36, 800, '#7040A1');
        text('하위', x0, y + 80, 30, 500, '#6e6e73', 'left'); text('상위', x0 + w, y + 80, 30, 500, '#6e6e73', 'right');
        text(`100명 중 ${Math.max(1, Math.round(100 - t))}명보다 많이 벌어요`, W / 2, y + 80, 32, 600, '#1d1d1f');
        return 260;
      },
      boxes: [['평균 연봉', '4,475만'], ['가운데 연봉', '3,388만'], ['상위 10%', '8,944만']], foot: '너의 연봉 순위는? 👀', link: `${location.origin}/salary-rank/` });
  };
  const btn = storyButton('내 순위 인스타 스토리에 올리기', () => cache || (cache = make()), '돈셈_연봉순위.png', `${location.origin}/salary-rank/`);
  btn.classList.add('sr-story');
  (document.querySelector('.card .share') || out).after(btn);
  const refresh = () => { cache = null; clearTimeout(timer); timer = setTimeout(() => { cache = make(); }, 700); }; // 숫자를 바꾸면 그림도 미리 다시 그려 둬요
  document.addEventListener('input', refresh);
  document.querySelectorAll('.seg').forEach(g => g.addEventListener('click', refresh));
  refresh();
})();

// ── 오늘의 돈셈: ① 돈 퀴즈 ② 오늘 쓴 돈 정리(가계부 기록 또는 무지출 도장) ③ 계산기 하나 — 셋 다 하면 돈나무에 💧 하나 더 ──
function dailyStatus() {
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const q = read('donsem:quiz') || {}, b = read('donsem:budget'), ns = read('donsem:nospend');
  const entries = b && Array.isArray(b.entries) ? b.entries.filter(e => e.date === today && !String(e.id).startsWith('fx-')) : [];
  const spent = entries.some(e => e.type === 'out'), stamped = !!(ns && Array.isArray(ns.days) && ns.days.includes(today)) && !spent;
  let calc = false;
  try { calc = localStorage.getItem('donsem:daily-calc') === today; } catch (e) { calc = false; }
  return { today, quiz: !!(q.days && q.days[today]), money: entries.length > 0 || stamped, stamped, spent, calc, full: !!(q.full && q.full[today]) };
}
function markDailyFull() {
  const st = dailyStatus();
  if (!st.quiz || !st.money || !st.calc || st.full) return false;
  let q = null;
  try { q = JSON.parse(localStorage.getItem('donsem:quiz')); } catch (e) { q = null; }
  if (!q || !q.days) return false;
  q.full = Object.assign({}, q.full, { [st.today]: 1 });
  try { localStorage.setItem('donsem:quiz', JSON.stringify(q)); } catch (e) { return false; }
  setTimeout(() => toast('🎉 오늘의 돈셈 완료! 돈나무에 물을 한 번 더 줬어요 💧'), 900);
  return true;
}
(() => {
  if (!document.body.classList.contains('home') || typeof QUIZ === 'undefined') return;
  const PICKS = [['/salary-rank/', '연봉 상위 % 계산기'], ['/savings/', '적금 이자 계산기'], ['/salary/', '연봉 실수령액 계산기'], ['/loan/', '대출 이자 계산기'], ['/discount/', '할인율 계산기'],
    ['/compound/', '복리 계산기'], ['/unit-price/', '단가 비교 계산기'], ['/severance/', '퇴직금 계산기'], ['/year-end-tax/', '연말정산 환급 계산기'], ['/inflation/', '물가상승률 계산기']];
  const sec = document.createElement('section');
  sec.className = 'today-card';
  const host = document.getElementById('daily'), quizCard = document.querySelector('.quiz-home') || document.querySelector('.wrap > .group');
  if (host) host.append(sec); else if (quizCard) quizCard.before(sec); else return;
  const openAdd = () => {
    const bar = document.querySelector('.tabbar');
    if (typeof window.openQuickAdd === 'function' && bar && getComputedStyle(bar).display !== 'none') window.openQuickAdd(); // 휴대폰: 아래에서 기록 창
    else location.href = '/budget/';
  };
  function draw() {
    const st = dailyStatus(), pick = PICKS[quizToday() % PICKS.length], n = [st.quiz, st.money, st.calc].filter(Boolean).length;
    const tree = treeOf(quizLoad()), f = st.quiz ? fortuneToday(quizLoad()) : null;
    let k = 0;
    const row = (done, title, sub, right) => `<div class="tc-row r${k++}${done ? ' done' : ''}"><span class="tc-check" aria-hidden="true">${done ? '✓' : ''}</span><div class="tc-text"><b>${title}</b><span>${sub}</span></div>${right}</div>`;
    // 애플워치 링처럼: 바깥 = 퀴즈, 가운데 = 돈 정리, 안쪽 = 계산기
    const rings = [[st.quiz, 28], [st.money, 19.5], [st.calc, 11]].map(([, r], i) => `<circle class="rg-track rg${i}" cx="32" cy="32" r="${r}"/><circle class="rg-fill rg${i}" cx="32" cy="32" r="${r}" pathLength="100"/>`).join('');
    sec.innerHTML = `<div class="tc-head"><div class="tc-rings" role="img" aria-label="오늘의 돈셈 ${n}개 중 3개 완료"><svg viewBox="0 0 64 64">${rings}</svg><i class="tc-spark" aria-hidden="true"></i></div>
        <div class="tc-title"><b>오늘의 돈셈</b><span>${n === 3 ? '링을 다 닫았어요! 🎉' : '링 3개를 채우면 물 💧 하나 더'}</span></div>
        <a class="tc-tree" href="/quiz/#tree" aria-label="내 돈나무 보기"><img src="${tree.img}" alt="" width="40" height="40"><em>${n} / 3</em></a></div>
      ${row(st.quiz, '돈 퀴즈 풀기', st.quiz ? `오늘의 금전운 ${'💰'.repeat(f.coins)} ${f.level}` : '풀면 오늘의 금전운이 열려요', st.quiz ? '<a class="tc-go" href="/quiz/">보기 ›</a>' : '')}
      ${st.quiz ? '' : `<div class="tc-quiz"><p>${QUIZ[quizTodayFor(quizLoad())][0]}</p><div class="qz-btns"><a class="qz-btn" href="/quiz/?a=o"><span class="qz-o" aria-hidden="true"></span>맞아요</a><a class="qz-btn" href="/quiz/?a=x"><span class="qz-x" aria-hidden="true"></span>아니에요</a></div></div>`}
      ${row(st.money, '오늘 쓴 돈 정리', st.stamped ? '무지출 도장 쾅! 🐷' : st.money ? '가계부에 기록했어요' : '썼으면 기록, 안 썼으면 무지출 도장', st.money ? `<a class="tc-go" href="${st.stamped ? '/no-spend/' : '/budget/'}">보기 ›</a>` : `<div class="tc-btns"><button type="button" class="tc-add">기록</button><button type="button" class="tc-ns">안 썼어요 🐷</button></div>`)}
      ${row(st.calc, '계산기로 하나 따져 보기', st.calc ? '오늘 계산 완료' : `오늘의 추천: ${pick[1]}`, `<a class="tc-go" href="${pick[0]}">${st.calc ? '더 보기' : '해 보기'} ›</a>`)}`;
    sec.querySelector('.tc-add')?.addEventListener('click', openAdd);
    sec.querySelector('.tc-ns')?.addEventListener('click', () => { // 첫 화면에서 바로 무지출 도장
      let ns = null;
      try { ns = JSON.parse(localStorage.getItem('donsem:nospend')); } catch (e) { ns = null; }
      if (!ns || !Array.isArray(ns.days)) ns = { days: [], goal: 10 };
      if (!ns.days.includes(st.today)) ns.days = [...ns.days, st.today].sort();
      try { localStorage.setItem('donsem:nospend', JSON.stringify(ns)); } catch (e) { return toast('이 브라우저에서는 저장할 수 없어요.'); }
      toast('🐷 무지출 도장 쾅! 오늘은 돈을 안 썼어요.');
      countOnce(`ns:${st.today}`, 'y');
      markDailyFull();
      draw();
    });
    // 링 채우기: 방금 그린 링은 지난번 상태에서 시작해서, 지금 상태까지 스르륵 채워져요
    const now = [st.quiz, st.money, st.calc], before = drawn || [false, false, false], fills = sec.querySelectorAll('.rg-fill');
    fills.forEach((c, i) => { c.style.strokeDashoffset = before[i] ? 0 : 100; c.style.opacity = before[i] || now[i] ? 1 : 0; }); // 빈 링은 둥근 끝이 점처럼 보여서 숨겨요
    setTimeout(() => fills.forEach((c, i) => { c.style.strokeDashoffset = now[i] ? 0 : 100; }), 60);
    const closedNow = n === 3 && (!drawn || drawn.some(x => !x));
    drawn = now;
    let seen = '';
    try { seen = localStorage.getItem('donsem:rings-closed'); } catch (e) { seen = ''; }
    if (closedNow && seen !== st.today) { // 링이 다 닫힌 순간(하루 한 번): 링이 통 튀고 반짝여요
      try { localStorage.setItem('donsem:rings-closed', st.today); } catch (e) { /* 저장이 막힌 브라우저 */ }
      setTimeout(() => sec.querySelector('.tc-rings')?.classList.add('closing'), 1100);
    }
  }
  let drawn = null;
  window.drawToday = draw; // ＋기록 창에서 저장하면 다시 그려요
  draw();
  if (markDailyFull()) draw();
})();

// ── 같이 하는 숫자: 퀴즈 O/X 비율, 오늘 무지출한 사람 수, 돈BTI 유형 비율 ──
// Cloudflare 워커(돈계산기/counter/worker.js)에 이름 없이 숫자만 보내고 받아요. 주소가 비어 있으면 아무것도 안 해요.
const COUNTER_URL = 'https://donsem-counter.hjjung330.workers.dev';
function counter(k, v) {
  if (!COUNTER_URL) return Promise.resolve(null);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4000);
  const opt = v ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k, v }), signal: ctl.signal } : { signal: ctl.signal };
  return fetch(`${COUNTER_URL}/?k=${encodeURIComponent(k)}`, opt).then(r => (r.ok ? r.json() : null)).catch(() => null).finally(() => clearTimeout(timer));
}
// 한 기기에서는 같은 것을 한 번만 세요 (두 번째부터는 숫자만 받아 와요)
function countOnce(k, v) {
  let done = {};
  try { done = JSON.parse(localStorage.getItem('donsem:counted')) || {}; } catch (e) { done = {}; }
  if (done[k] || !COUNTER_URL) return counter(k);
  done[k] = 1;
  const keys = Object.keys(done);
  if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(x => delete done[x]); // 오래된 날짜 기록은 정리해요
  try { localStorage.setItem('donsem:counted', JSON.stringify(done)); } catch (e) { /* 저장이 막힌 브라우저 */ }
  return counter(k, v);
}

// ── 첫 화면: 숫자들이 화면에 들어오면 토스처럼 0에서 좌라락 굴러 올라가요 (휴대폰 실수령액, 말풍선, 연봉 상위 %) ──
(() => {
  const els = [...document.querySelectorAll('.phone .ph-result strong, .hero .bubble b, .sc-rank-num b')];
  if (!els.length || !('IntersectionObserver' in window) || calmMotion) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = el.textContent;
    setTimeout(() => rollText(el, to.replace(/\d/g, '0')), 120);
  }), { threshold: 0.6 });
  els.forEach(el => io.observe(el));
})();

// ── 첫 화면: 계산기 분류 5칸을 탭 하나로 (누른 분류만 보여 줘요, 고른 분류는 기억해요) ──
(() => {
  if (!document.body.classList.contains('home')) return;
  const groups = [...document.querySelectorAll('.wrap > section.group')].filter(g => !g.matches('.recent, .bundles, .fav-group, .popular') && g.querySelector('h2'));
  if (groups.length < 2) return;
  const KEY = 'donsem:home-tab', names = groups.map(g => g.querySelector('h2').textContent.trim());
  let pick = 1; // 기본: 두 번째 분류(저축·투자). 돈 관리는 위쪽 큰 카드에도 있어서요
  try { const v = localStorage.getItem(KEY); if (names.includes(v)) pick = names.indexOf(v); } catch (e) { /* 기억 못 해도 괜찮아요 */ }
  const box = document.createElement('section');
  box.className = 'cat-tabs';
  box.innerHTML = `<div class="ct-head"><h2>계산기 둘러보기</h2><a href="/calculators/">전체 보기 ›</a></div>
    <div class="ct-chips" role="tablist" aria-label="계산기 분류">${names.map((n, i) => `<button type="button" role="tab" data-i="${i}">${n.replace(/\s*·\s*/g, '·')}</button>`).join('')}</div>`;
  groups[0].before(box);
  groups.forEach(g => g.classList.add('tabbed'));
  const show = i => {
    pick = i;
    groups.forEach((g, k) => { g.hidden = k !== i; });
    box.querySelectorAll('[data-i]').forEach(b => { const on = +b.dataset.i === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  };
  box.querySelector('.ct-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    show(+b.dataset.i);
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    try { localStorage.setItem(KEY, names[pick]); } catch (err) { /* 저장이 막힌 브라우저 */ }
  });
  show(pick);
})();

// ── 모든 계산기 · 첫 화면 '계산기 둘러보기' (휴대폰): 분류마다 2칸×3줄씩 한 장, 나머지는 옆으로 넘겨 봐요. 컴퓨터에서는 그대로 보여요 ──
(() => {
  const all = !!document.getElementById('calc-list'), home = document.body.classList.contains('home');
  if (!all && !home) return;
  const q = document.getElementById('calc-q');
  document.querySelectorAll(all ? 'section.group' : 'section.group.tabbed').forEach(g => {
    const tiles = g.querySelector(':scope > .tiles'), cards = tiles ? [...tiles.querySelectorAll(':scope > .tile')] : [];
    if (!cards.length) return;
    const pages = [];
    for (let i = 0; i < cards.length; i += 6) {
      const page = document.createElement('div');
      page.className = 'cp-page';
      cards.slice(i, i + 6).forEach(c => page.append(c));
      pages.push(page);
    }
    tiles.append(...pages);
    tiles.classList.add('paged');
    const h2 = g.querySelector('h2');
    if (all) h2.insertAdjacentHTML('beforeend', `<span class="cp-count">${cards.length}개</span>`); // 첫 화면은 분류 이름이 위 탭에 있어요
    if (pages.length < 2) return;
    if (all) h2.insertAdjacentHTML('beforeend', '<span class="cp-hint">옆으로 넘겨 보기 ›</span>');
    const dots = document.createElement('div');
    dots.className = 'cp-dots'; dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = pages.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('');
    tiles.after(dots);
    let t = 0;
    tiles.addEventListener('scroll', () => { // 지금 보고 있는 장을 점으로 표시해요
      clearTimeout(t);
      t = setTimeout(() => { const i = Math.round(tiles.scrollLeft / tiles.clientWidth); dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); }, 60);
    }, { passive: true });
  });
  // 검색할 때는 장을 풀어서 찾은 계산기를 한곳에 모아 보여 줘요
  if (q) q.addEventListener('input', () => document.body.classList.toggle('calc-searching', !!q.value.trim()));
})();

// ── 아이폰 같은 손맛 ②: 아래에서 올라온 창(＋기록, 휴대폰 메뉴)을 손가락으로 끌어내리면 닫혀요 ──
(() => {
  let panel = null, startY = 0, dy = 0, t0 = 0;
  const closeBtn = p => p.querySelector('.qa-x, .gnav-x');
  document.addEventListener('touchstart', e => {
    const p = e.target.closest('.qa-panel, .gnav-panel');
    if (!p || !matchMedia('(max-width: 640px)').matches || p.scrollTop > 0 || e.target.closest('input, textarea, select, .qa-cats, .chips')) return;
    panel = p; startY = e.touches[0].clientY; dy = 0; t0 = performance.now();
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!panel) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    if (panel.scrollTop > 0) { dy = 0; return; }
    panel.style.transition = 'none';
    panel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!panel) return;
    const p = panel, fast = dy / Math.max(1, performance.now() - t0) > 0.6; // 빠르게 튕기듯 내려도 닫혀요
    panel = null;
    p.style.transition = '';
    if (dy > 110 || (fast && dy > 40)) {
      p.style.transform = 'translateY(100%)';
      setTimeout(() => { const b = closeBtn(p); if (b) b.click(); p.style.transform = ''; }, 240);
    } else p.style.transform = '';
  });
})();

// ── 아이폰 같은 손맛 ④: 선택 버튼(연봉/월급 같은)의 파란 배경이 옆으로 미끄러져 움직여요 ──
(() => {
  const place = seg => {
    const pill = seg.querySelector(':scope > .seg-pill'), on = seg.querySelector(':scope > button.on');
    if (!pill) return;
    if (!on || !on.offsetWidth) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    pill.style.width = on.offsetWidth + 'px'; pill.style.height = on.offsetHeight + 'px';
    pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
  };
  const setup = seg => {
    if (seg.dataset.pill || !seg.querySelector(':scope > button')) return;
    seg.dataset.pill = '1';
    const pill = document.createElement('span');
    pill.className = 'seg-pill'; pill.setAttribute('aria-hidden', 'true');
    seg.prepend(pill);
    seg.classList.add('has-pill');
    pill.style.transition = 'none'; place(seg); pill.offsetWidth; pill.style.transition = ''; // 처음엔 그 자리에 바로
    new MutationObserver(() => place(seg)).observe(seg, { attributes: true, subtree: true, attributeFilter: ['class'] });
  };
  const scan = root => root.querySelectorAll && root.querySelectorAll('.seg').forEach(setup);
  scan(document);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches('.seg')) setup(n); scan(n); } }))).observe(document.body, { childList: true, subtree: true });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => document.querySelectorAll('.seg.has-pill').forEach(place), 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('.seg.has-pill').forEach(place)); // 글씨체가 늦게 오면 폭이 바뀌어요
})();

// ── 아이폰 같은 손맛 ⑤: 아래 탭에서 지금 화면의 탭을 한 번 더 누르거나, 홈에서 맨 위 Donsam 로고를 누르면 맨 위로 스르륵 올라가요 ──
// (예전엔 로고가 홈을 처음부터 다시 열어서 뚝 끊기며 올라갔어요)
document.addEventListener('click', e => {
  const a = e.target.closest('.tabbar a.on, a.brand');
  if (!a || e.metaKey || e.ctrlKey || a.pathname !== location.pathname) return; // 계산기 화면 안에서 '계산기' 탭을 누르면 목록으로 가요 (아이폰처럼)
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

// ── 아이폰 같은 손맛 ⑥: 큰 제목이 화면 위로 지나가면, 위 메뉴바 가운데에 작은 제목으로 쏙 들어가요 (휴대폰) ──
// 가계부처럼 칸이 여러 개인 화면은 지금 보고 있는 칸 제목(기록하기, 내역 …)으로 바뀌어요
(() => {
  return; // 2026-11-06: 위 메뉴바는 어느 화면에서든 로고와 아이콘 그대로 두기로 했어요 (제목이 겹쳐서 없앴어요)
  const h1 = document.querySelector('.wrap > .card h1'), bar = document.querySelector('.topbar'), inner = bar && bar.querySelector('.topbar-in');
  if (!h1 || !inner || document.body.classList.contains('home')) return;
  const t = document.createElement('button');
  t.type = 'button'; t.className = 'top-title'; t.tabIndex = -1; t.setAttribute('aria-hidden', 'true');
  t.addEventListener('click', () => window.scrollTo({ top: 0, behavior: calmMotion ? 'auto' : 'smooth' })); // 작은 제목을 누르면 맨 위로
  inner.append(t);
  // 제목 안에 붙은 '10개', '옆으로 넘겨 보기', 배지 같은 덧붙임은 빼고 이름만 보여 줘요
  const titleOf = el => { const c = el.cloneNode(true); c.querySelectorAll('span, small, a, button, img, i').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').replace(/\s*·\s*/g, '·').replace(/\s*\(.*\)$/, '').trim(); }; // '물타기 계산기 (평균 단가)' → '물타기 계산기'
  let raf = 0;
  const check = () => {
    raf = 0;
    const h = bar.offsetHeight; // 휴대폰 메뉴바는 분류 줄까지 있어서 높이를 그때그때 재요
    const passed = [h1, ...document.querySelectorAll('.wrap .card > h2, .wrap > section > h2, .col-badge-head > h2')].filter(el => el.offsetParent && el.getBoundingClientRect().bottom < h);
    const now = passed.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).pop(); // 위로 지나간 제목 중 가장 아래 것
    bar.classList.toggle('titled', !!now);
    const text = now ? titleOf(now) : '';
    if (!text || text === t.textContent) return;
    if (t.textContent && !calmMotion) { t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); } // 바뀔 때 살짝 올라오며 바뀌어요
    t.textContent = text;
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
  check();
})();

// ── 아이폰 같은 손맛 ⑦: 계산기 카드를 꾹 누르면, 들어가지 않고도 미리보기가 떠요 (휴대폰) ──
(() => {
  if (!('ontouchstart' in window)) return;
  let timer = 0, sx = 0, sy = 0, fired = false, layer = null;
  const recentOf = href => { try { const x = (JSON.parse(localStorage.getItem('donsem:recent')) || []).find(r => r.p === href); return x && x.big; } catch (e) { return ''; } };
  function close() {
    if (!layer) return;
    const l = layer; layer = null;
    l.classList.remove('show');
    setTimeout(() => l.remove(), 260);
  }
  function open(tile) {
    const href = tile.getAttribute('href'), h3 = tile.querySelector('h3'), p = tile.querySelector('p'), key = tile.querySelector('.key'), star = tile.querySelector('button.fav');
    if (!h3) return;
    const last = recentOf(href);
    layer = document.createElement('div');
    layer.className = 'peek';
    layer.innerHTML = `<div class="peek-dim"></div><div class="peek-card" role="dialog" aria-label="${h3.textContent.trim()} 미리보기">
      <div class="peek-top">${iconOf(href).replace('class="ico"', 'class="peek-ico"')}<h3></h3></div><p class="peek-desc"></p>
      ${key ? `<p class="peek-key">${key.innerHTML}</p>` : ''}${last ? `<p class="peek-last">최근 결과 <b></b></p>` : ''}
      <div class="peek-acts"><a class="btn fill" href="${href}">열기</a>${star ? `<button type="button" class="btn line peek-fav">${star.classList.contains('on') ? '★ 즐겨찾기 빼기' : '☆ 즐겨찾기'}</button>` : ''}</div></div>`;
    layer.querySelector('h3').textContent = h3.textContent.trim();
    layer.querySelector('.peek-desc').textContent = p ? p.textContent.trim() : '';
    if (last) layer.querySelector('.peek-last b').textContent = last;
    layer.querySelector('.peek-dim').addEventListener('click', close);
    const fav = layer.querySelector('.peek-fav');
    if (fav) fav.addEventListener('click', () => { star.click(); close(); });
    document.body.append(layer);
    requestAnimationFrame(() => layer && layer.classList.add('show'));
  }
  document.addEventListener('touchstart', e => {
    const tile = e.target.closest('a.tile');
    fired = false;
    if (!tile || e.target.closest('button') || e.touches.length > 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    tile.classList.add('pressing');
    timer = setTimeout(() => { fired = true; tile.classList.remove('pressing'); open(tile); }, 480);
  }, { passive: true });
  const cancel = () => { clearTimeout(timer); document.querySelectorAll('.tile.pressing').forEach(t => t.classList.remove('pressing')); };
  document.addEventListener('touchmove', e => { if (Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 8) cancel(); }, { passive: true }); // 스크롤하면 취소
  document.addEventListener('touchend', cancel);
  document.addEventListener('touchcancel', cancel);
  document.addEventListener('click', e => { if (fired && e.target.closest('a.tile')) { e.preventDefault(); fired = false; } }, true); // 꾹 누른 뒤 손을 떼도 들어가지 않게
  document.addEventListener('contextmenu', e => { if (e.target.closest('a.tile')) e.preventDefault(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

// ── 돈 관리 탭: 누른 순간 파란 알약이 그 탭으로 쫀득하게 미끄러지고, 내용은 그 방향으로 넘어가요 ──
(() => {
  const tabs = document.querySelector('.mm-tabs'), on = tabs && tabs.querySelector('a.on');
  if (!tabs || !on) return;
  const links = [...tabs.querySelectorAll('a')], KEY = 'donsem:mm-from';
  const pill = document.createElement('span');
  pill.className = 'mm-pill'; pill.setAttribute('aria-hidden', 'true');
  tabs.prepend(pill); tabs.classList.add('has-pill');
  const place = a => { pill.style.width = a.offsetWidth + 'px'; pill.style.height = a.offsetHeight + 'px'; pill.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`; };
  try { sessionStorage.removeItem(KEY); } catch (e) { /* 기억 못 해도 괜찮아요 */ }
  pill.style.transition = 'none'; place(on); pill.offsetWidth; pill.style.transition = ''; // 알약은 누른 화면에서 이미 도착해 있어요
  const root = document.documentElement, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = 0;
  tabs.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || a === on || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    try { sessionStorage.setItem(KEY, String(links.indexOf(on))); } catch (err) { /* 기억 못 해도 괜찮아요 */ }
    if (calm) return; // 움직임 줄이기를 켠 사람은 바로 넘어가요
    e.preventDefault();
    place(a); // 누른 순간 알약이 바로 그쪽으로 미끄러지고, 글자색도 바로 바뀌어요
    links.forEach(x => x.classList.toggle('on', x === a));
    root.classList.remove('mm-in-next', 'mm-in-prev', 'mm-go-next', 'mm-go-prev');
    root.classList.add('mm-leaving', links.indexOf(a) > links.indexOf(on) ? 'mm-go-next' : 'mm-go-prev');
    clearTimeout(leaving);
    leaving = setTimeout(() => { location.href = a.href; }, 200); // 알약이 거의 도착하고 지금 화면이 사라질 즈음 넘어가요
  });
  window.addEventListener('resize', () => place(on));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(on));
  window.addEventListener('pageshow', e => { // 뒤로 가기로 돌아오면 사라졌던 내용과 알약을 제자리로
    if (!e.persisted) return;
    clearTimeout(leaving);
    root.classList.remove('mm-leaving', 'mm-go-next', 'mm-go-prev', 'mm-in-next', 'mm-in-prev');
    links.forEach(x => x.classList.toggle('on', x === on));
    pill.style.transition = 'none'; place(on); pill.offsetWidth; pill.style.transition = '';
  });
})();

// ── 아래 탭바: 돈 관리 탭(가계부 → 고정지출)과 똑같은 감도로 움직여요.
//    누른 순간 알약이 그 탭으로 미끄러지고 → 지금 내용이 살짝 밀리며 사라지고 → 0.2초 뒤 넘어가서 → 새 내용이 누른 쪽에서 들어와요 ──
(() => {
  const bar = document.querySelector('.tabbar'), on = bar && bar.querySelector('a.on'), KEY = 'donsem:tb-nav';
  try { sessionStorage.removeItem(KEY); sessionStorage.removeItem('donsem:tb-pill'); } catch (e) { /* 기억 못 해도 괜찮아요 */ }
  if (!bar || !on) return;
  const links = [...bar.querySelectorAll('a')], root = document.documentElement;
  const pill = document.createElement('span');
  pill.className = 'tb-pill'; pill.setAttribute('aria-hidden', 'true');
  bar.prepend(pill); bar.classList.add('has-pill');
  const place = a => { pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`; }; // 높이는 CSS가 탭바에 맞춰요 (탭바가 작아질 때 같이 줄어요)
  const snap = () => { pill.style.transition = 'none'; place(bar.querySelector('a.on') || on); pill.offsetWidth; pill.style.transition = ''; };
  snap(); // 알약은 누른 화면에서 이미 도착해 있어요
  let leaving = 0;
  bar.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // 같은 탭 다시 누르기(맨 위로)는 위에서 처리해요
    if (a === on && a.pathname === location.pathname) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const dir = links.indexOf(a) >= links.indexOf(on) ? 'next' : 'prev';
    place(a); // 누른 순간 알약이 바로 그쪽으로 미끄러지고, 글자색도 바로 바뀌어요
    links.forEach(x => x.classList.toggle('on', x === a));
    try { sessionStorage.setItem(KEY, dir); } catch (err) { /* 기억 못 해도 괜찮아요 */ }
    root.classList.remove('tb-in-next', 'tb-in-prev', 'tb-go-next', 'tb-go-prev');
    root.classList.add('tb-leaving', 'tb-go-' + dir);
    clearTimeout(leaving);
    leaving = setTimeout(() => { location.href = a.href; }, 200); // 알약이 거의 도착하고 지금 화면이 사라질 즈음 넘어가요
  });
  window.addEventListener('resize', snap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
  window.addEventListener('pageshow', e => { // 뒤로 가기로 돌아오면 사라졌던 내용과 알약을 제자리로
    if (!e.persisted) return;
    clearTimeout(leaving);
    root.classList.remove('tb-leaving', 'tb-go-next', 'tb-go-prev', 'tb-in-next', 'tb-in-prev');
    links.forEach(x => x.classList.toggle('on', x === on));
    snap();
  });
})();

// ── 끊김 없이 넘어가기: 탭을 손가락으로 누르는 순간(떼기 전) 다음 화면을 미리 받아 둬요 ──
(() => {
  const done = new Set([location.pathname]);
  const warm = e => {
    const a = e.target.closest && e.target.closest('.tabbar a, .mm-tabs a, a.tile, .gnav-in a');
    if (!a || a.origin !== location.origin || done.has(a.pathname)) return;
    done.add(a.pathname);
    fetch(a.pathname, { credentials: 'same-origin' }).catch(() => {}); // 보관함에 넣어 두면 넘어갈 때 바로 떠요
  };
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('mousedown', warm);
})();
// 새 화면이 다 들어오면 '들어오는 중' 표시를 떼서, 그래픽 칩에 맡겼던 내용을 돌려놔요
setTimeout(() => document.documentElement.classList.remove('mm-in-next', 'mm-in-prev', 'tb-in-next', 'tb-in-prev'), 600);

// ── 인스타그램처럼: 내리면 위 메뉴바는 위로 스르륵 사라지고 아래 탭바는 작아져서 화면이 넓어져요. 올리면 둘 다 돌아와요 (휴대폰) ──
(() => {
  const root = document.documentElement, phone = matchMedia('(max-width: 640px)');
  let lastY = window.scrollY, min = false, raf = 0;
  const set = on => { if (on !== min) { min = on; root.classList.toggle('bars-min', on); } };
  const check = () => {
    raf = 0;
    const y = Math.max(0, window.scrollY), dy = y - lastY;
    if (!phone.matches || root.classList.contains('qa-open') || root.classList.contains('gnav-open') || root.classList.contains('ai-open')) { set(false); lastY = y; return; }
    if (y < 80) set(false);                       // 맨 위 근처에서는 항상 보여요
    else if (dy > 6) set(true);                   // 내리는 중 → 숨기기
    else if (dy < -6) set(false);                 // 올리는 중 → 다시 보이기
    if (Math.abs(dy) > 6 || y < 80) lastY = y;    // 손가락이 살짝 떨리는 정도로는 바뀌지 않게
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
  window.addEventListener('pageshow', () => { set(false); lastY = window.scrollY; });
})();

// ── 돈셈 도우미: 오른쪽 위 알록달록한 버튼 → 궁금한 걸 물으면, 돈셈에 이미 정리된 설명(kb.json)에서 찾아 답해요 ──
// 진짜 AI가 아니라 '찾아 주는' 도우미라 돈이 들지 않고, 확인된 내용만 보여 줘서 틀린 답을 지어내지 않아요
(() => {
  const right = document.querySelector('.topbar .top-right');
  if (!right) return;
  let uid = 0;
  const spark = size => { const id = 'aig' + (++uid); return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}" x1="6" y1="5" x2="17" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#34d399"/><stop offset=".5" stop-color="#38bdf8"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path fill="url(#${id})" d="M11 3c.5 4.6 3.4 7.5 8 8-4.6.5-7.5 3.4-8 8-.5-4.6-3.4-7.5-8-8 4.6-.5 7.5-3.4 8-8z"/><path fill="url(#${id})" d="M19 1.5c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" opacity=".85"/></svg>`; };
  const btn = document.createElement('button');
  const semi = (size, cls = '', face = 'default') => `<img class="semi ${cls}" src="/icons/semi-${face}.svg" width="${size}" height="${size}" alt="" aria-hidden="true">`;
  btn.type = 'button'; btn.className = 'ai-btn'; btn.setAttribute('aria-label', '셈이에게 물어보기'); btn.innerHTML = semi(32);
  right.prepend(btn);
  // 마우스를 올리면 찡긋 (장난)
  btn.addEventListener('pointerenter', () => { btn.firstChild.src = '/icons/semi-wink.svg'; });
  btn.addEventListener('pointerleave', () => { btn.firstChild.src = '/icons/semi-default.svg'; });

  const SUGGEST = ['이번 달 얼마 썼어?', '내 순자산은?', '다음 결제는 언제야?', '연말정산 월세 공제 조건', 'ISA랑 연금저축 차이', '주휴수당 받는 조건', '실업급여 자진퇴사', '백업은 어떻게 해?', '적금 이자가 생각보다 적은 이유'];
  let box = null, kb = null, kbWait = null;
  const loadKb = () => kbWait || (kbWait = fetch('/kb.json').then(r => r.json()).then(d => (kb = d)).catch(() => { kbWait = null; return (kb = []); }));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // 한국어 검색: 조사·말끝을 떼고, 두 글자씩 겹쳐 비교해서 '월세공제'와 '월세 세액공제'도 맞춰요
  const ENDS = ['으로는', '에서는', '이라는', '하려면', '인가요', '할까요', '이에요', '에서', '으로', '까지', '부터', '하나요', '나요', '가요', '어요', '에요', '예요', '이란', '란', '은', '는', '이', '가', '을', '를', '에', '의', '로', '도', '만', '요', '랑', '와', '과', '해'];
  const STOP = new Set(['뭐', '뭔', '뭐야', '뭐예요', '어떻게', '알려', '알려줘', '줘', '좀', '궁금', '궁금해', '방법', '무엇', '어떤', '돈셈', '하는', '되나', '건가', '있나', '되', '하', '수', '것']);
  const words = t => t.toLowerCase().replace(/[^0-9a-z가-힣%\s]/g, ' ').split(/\s+/).map(w => { for (const e of ENDS) if (w.length > e.length + 1 && w.endsWith(e)) return w.slice(0, -e.length); return w; }).filter(w => w && !STOP.has(w));
  const grams = t => { const c = t.replace(/\s+/g, ''), g = new Set(); for (let i = 0; i < c.length - 1; i++) g.add(c.slice(i, i + 2)); return g; };
  // 같은 뜻 다른 말: 질문에 이런 말이 있으면 설명 속 말로도 찾아봐요
  const SYN = { '자진퇴사': ['그만두', '스스로'], '자발적': ['그만두', '스스로'], '퇴사': ['그만두'], '홈화면': ['홈 화면'], '차이': ['다른', '다르'], '공제': ['돌려받'], '월세공제': ['월세', '돌려받'], '연말정산': ['환급'], '알바': ['아르바이트'] };
  function search(q) {
    let ws = words(q).filter(w => w.length > 1 || /[가-힣]/.test(w)); if (!ws.length) return [];
    ws = ws.concat(ws.filter(w => w.length >= 4 && /[가-힣]$/.test(w)).map(w => w.slice(0, -1))); // '건강보험료' → '건강보험'도
    const qg = grams(ws.join(''));
    ws = ws.concat(...ws.map(w => SYN[w] || []));
    return kb.map(k => {
      const Q = (k.q + ' ' + (k.k || '')).toLowerCase(), Qn = Q.replace(/\s+/g, ''), A = k.a.toLowerCase(), T = k.t.toLowerCase(); let sc = 0;
      ws.forEach(w => {
        // 두 글자 말은 낱말 맨 앞에서만 맞춰요 ('환율'이 '전환율'에 걸리지 않게)
        const inQ = w.length <= 2 ? new RegExp('(^|[^가-힣])' + w).test(Q) : Q.includes(w) || Qn.includes(w);
        if (inQ) sc += 3 + w.length; else if (T.includes(w)) sc += 2 + w.length / 2; if (A.includes(w)) sc += 1 + w.length / 3;
      });
      const kg = grams(Q); let hit = 0; qg.forEach(g => { if (kg.has(g)) hit++; }); sc += qg.size ? 6 * hit / qg.size : 0;
      if (k.t === '돈 상식') sc *= .6; // 퀴즈 문제보다 '어떻게 하나요' 설명을 먼저 보여 줘요
      return [sc, k];
    }).filter(([sc]) => sc >= 4).sort((a, b) => b[0] - a[0]).slice(0, 4).map(([, k]) => k);
  }
  // 인사·잡담: 돈 이야기가 아니어도 셈이답게 대답해요
  function smallTalk(q) {
    const t = q.replace(/\s+/g, ''), go = (h, l) => `<a class="ai-go" href="${h}">${l} ›</a>`;
    if (/^(안녕|하이|hi|hello|헬로|반가|ㅎㅇ)/i.test(t)) return '<b>안녕하세요! 셈이예요 🌱</b><p>계산 방법, 세금·금융 상식, 돈셈 쓰는 법을 찾아 드려요. "연봉 4천 실수령액", "이번 달 얼마 썼어?"처럼 물어보세요.</p>';
    if (/(고마워|고맙|감사|땡큐|thank)/i.test(t)) return '<b>천만에요! 😊</b><p>또 궁금한 게 생기면 언제든 불러 주세요.</p>';
    if (/(누구|이름이뭐|너뭐야|넌뭐|정체)/.test(t)) return '<b>저는 돈셈 도우미 셈이예요</b><p>연보라 새싹 털뭉치예요. 돈셈에 정리된 설명과 내 기록(이 기기에 저장된 가계부)을 찾아서 알려 드려요.</p>';
    if (/(뭐먹|메뉴|점심|저녁|배고|맛집)/.test(t)) return '<b>메뉴는 못 골라 드려요 🍚</b><p>대신 식비 아끼는 건 도와드릴 수 있어요. 오늘 쓴 밥값을 캘린더에 적어 두면, 이번 달 식비가 얼마인지 알려 드려요.</p>' + go('/budget/', '캘린더에 적기');
    if (/(심심|놀아|재밌는거)/.test(t)) return '<b>그럼 돈 퀴즈 한 판 어때요? 🎯</b><p>하루 한 문제 풀면 돈나무가 자라요.</p>' + go('/quiz/', '오늘의 돈 퀴즈');
    return null;
  }
  // 내 기록으로 답하기 (카카오뱅크 AI '내 금융정보 조회'처럼): 이 기기에 적어 둔 가계부·고정지출·내 자산만 봐요
  function mine(q) {
    const t = q.replace(/\s+/g, ''), rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const b = rd('donsem:budget'), es = withFixed(b && Array.isArray(b.entries) ? b.entries : []);
    const n = new Date(), ym = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`, pm = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const pym = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`, outs = k => es.filter(e => e.type === 'out' && e.date.startsWith(k));
    const go = (h, l) => `<a class="ai-go" href="${h}">${l} ›</a>`, none = w => `<p>아직 ${w}에 적은 게 없어요. 적어 두면 여기서 바로 알려 드려요.</p>`;
    if (/순자산|재산|자산.*(얼마|순위)|내자산/.test(t)) {
      const a = rd('donsem:assets'), it = a && Array.isArray(a.items) ? a.items : [];
      if (!it.length) return none('내 자산') + go('/budget/#assets', '내 자산 적기');
      const as = it.filter(x => x.kind !== 'debt').reduce((s, x) => s + (+x.amt || 0), 0), de = it.filter(x => x.kind === 'debt').reduce((s, x) => s + (+x.amt || 0), 0);
      return `<b>순자산은 ${won(as - de)}이에요</b><p>자산 ${won(as)}, 부채 ${won(de)}예요.${typeof assetTop === 'function' && as - de >= 0 ? ` 우리나라 가구 중 상위 ${topText(assetTop(as - de))}예요.` : ''}</p>` + go('/budget/#assets', '내 자산 보기');
    }
    if (/결제|고정지출|구독|빠져나가/.test(t)) {
      const f = rd('donsem:fixed'), it = f && Array.isArray(f.items) ? f.items.filter(x => +x.amt > 0 && +x.day > 0) : [];
      if (!it.length) return none('고정지출') + go('/budget/#fixed', '고정지출 적기');
      const d0 = n.getDate(), next = it.map(x => ({ x, d: +x.day >= d0 ? +x.day - d0 : +x.day + new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - d0 })).sort((a, c) => a.d - c.d);
      const month = it.reduce((s, x) => s + (x.cycle === 'year' ? x.amt / 12 : +x.amt), 0);
      return `<b>다음 결제는 ${next[0].d ? `${next[0].d}일 뒤` : '오늘'} ${esc(next[0].x.name || next[0].x.cat)} ${won(+next[0].x.amt)}이에요</b><p>고정지출은 한 달에 약 ${won(Math.round(month))}이에요.${next[1] ? ` 그다음은 ${esc(next[1].x.name || next[1].x.cat)} (${next[1].d}일 뒤)예요.` : ''}</p>` + go('/budget/#fixed', '고정지출 보기');
    }
    if (/월급날|월급.*언제|월급까지/.test(t)) {
      const pi = typeof paydayInfo === 'function' ? paydayInfo(b) : null;
      if (!pi) return '<p>아직 월급날을 정하지 않았어요.</p>' + go('/budget/', '월급날 정하기');
      return `<b>${pi.days ? `월급날까지 ${pi.days}일 남았어요` : '오늘이 월급날이에요!'}</b><p>${pi.next.getMonth() + 1}월 ${pi.next.getDate()}일이에요.</p>` + go('/budget/', '캘린더 보기');
    }
    if (/예산/.test(t)) {
      if (!b || !(b.budget > 0)) return '<p>아직 이번 달 예산을 정하지 않았어요.</p>' + go('/budget/', '예산 정하기');
      const used = outs(ym).reduce((s, e) => s + e.amt, 0);
      return `<b>${used <= b.budget ? `예산이 ${won(b.budget - used)} 남았어요` : `예산을 ${won(used - b.budget)} 넘었어요`}</b><p>이번 달 예산 ${won(b.budget)} 중 ${won(used)}(${Math.round(used / b.budget * 100)}%)를 썼어요.</p>` + go('/budget/', '캘린더 보기');
    }
    if (/어디에.*(많이|제일)|뭐에.*(많이|제일)|많이쓴/.test(t)) {
      const by = {}; outs(ym).forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; });
      const top = Object.entries(by).sort((a, c) => c[1] - a[1]);
      if (!top.length) return none('이번 달 가계부') + go('/budget/', '가계부 적기');
      return `<b>이번 달은 ${esc(top[0][0])}에 가장 많이 썼어요 (${won(top[0][1])})</b><p>${top.slice(1, 3).map(([c, v]) => `${esc(c)} ${won(v)}`).join(', ')}${top.length > 1 ? ' 순이에요.' : ''}</p>` + go('/budget/', '어디에 썼나요 보기');
    }
    if (/(이번달|이달|오늘|지난달).*(얼마|지출|썼|씀)|지출.*얼마|얼마.*썼/.test(t)) {
      if (!es.length) return none('가계부') + go('/budget/', '가계부 적기');
      if (/오늘/.test(t)) { const td = ym + '-' + String(n.getDate()).padStart(2, '0'), v = es.filter(e => e.type === 'out' && e.date === td).reduce((s, e) => s + e.amt, 0); return `<b>오늘은 ${won(v)}을 썼어요</b>` + go('/budget/', '캘린더 보기'); }
      if (/지난달/.test(t)) return `<b>지난달은 ${won(outs(pym).reduce((s, e) => s + e.amt, 0))}을 썼어요</b>` + go('/budget/', '캘린더 보기');
      const now = outs(ym).reduce((s, e) => s + e.amt, 0), prev = outs(pym).filter(e => +e.date.slice(8) <= n.getDate()).reduce((s, e) => s + e.amt, 0);
      return `<b>이번 달은 ${won(now)}을 썼어요</b><p>${prev ? `지난달 같은 기간(${won(prev)})보다 ${won(Math.abs(now - prev))} ${now <= prev ? '덜' : '더'} 썼어요.` : '지난달 같은 기간 기록이 없어서 비교는 못 했어요.'}</p>` + go('/budget/', '캘린더 보기');
    }
    if (/무지출/.test(t)) {
      const ns = rd('donsem:nospend'), d = ns && Array.isArray(ns.days) ? ns.days.filter(x => x.startsWith(ym)).length : 0;
      return `<b>이번 달 무지출은 ${d}일이에요</b>` + go('/no-spend/', '무지출 챌린지 보기');
    }
    return '';
  }
  // 맞는 계산기 버튼 (메뉴 이름·찾기 단어에서)
  function calcFor(q) {
    if (typeof MENU === 'undefined') return null;
    const ws = words(q); let best = null, bs = 0;
    MENU.forEach(([, items]) => items.forEach(([href, name, kw]) => { const t = (name + ' ' + (kw || '')).toLowerCase(); const sc = ws.filter(w => w.length > 1 && t.includes(w)).length; if (sc > bs) { bs = sc; best = [href, name]; } }));
    return best;
  }

  // 셈이 둘러보기 (피클 '둘러보기'처럼): 분류를 고르면 셈이가 '해 드릴 수 있는 일'을 보여 주고, 누르면 그 계산기로 가요
  const EXPLORE = [
    ['⭐', '추천', [['🔍', '아직 안 받은 숨은 돈을 찾아 드릴게요.', '월세·의료비 환급, 근로장려금처럼 신청만 하면 받는 돈이 있는지 하나씩 확인해요.', '/hidden-money/'],
      ['🧮', '올해 연말정산 환급액을 미리 계산해 드릴게요.', '카드 쓴 돈과 월세만 넣으면 13월의 월급이 얼마일지 미리 볼 수 있어요.', '/year-end-tax/'],
      ['💸', '연봉 실수령액을 바로 계산해 드릴게요.', '4대 보험·세금을 빼고 통장에 실제로 들어오는 돈을 알려 드려요.', '/salary/']]],
    ['🎁', '혜택·환급', [['🏛️', '받을 수 있는 정부 지원금이 있는지 찾아 드릴게요.', '근로·자녀장려금, 청년 지원처럼 놓치기 쉬운 돈을 모아 봤어요.', '/hidden-money/'],
      ['🏠', '월세 세액공제로 얼마 돌려받는지 계산해 드릴게요.', '1년 월세의 최대 17%를 연말정산에서 돌려받을 수 있어요.', '/year-end-tax/'],
      ['📅', '놓치면 손해인 돈 일정을 챙겨 드릴게요.', '신고·신청 마감일을 달력으로 보고 알림도 받을 수 있어요.', '/money-calendar/']]],
    ['💼', '직장·월급', [['🧑‍💼', '실업급여를 얼마나, 몇 달 받는지 알려 드릴게요.', '나이와 일한 기간, 월급만 넣으면 예상 금액이 나와요.', '/unemployment/'],
      ['🎒', '퇴직금이 얼마인지 계산해 드릴게요.', '입사일·퇴사일과 최근 3달 월급으로 법대로 계산해요.', '/severance/'],
      ['⏰', '알바 주휴수당을 받을 수 있는지 확인해 드릴게요.', '주 15시간 이상이면 받을 수 있어요. 얼마인지 바로 계산해요.', '/holiday-pay/'],
      ['📊', '내 연봉이 상위 몇 %인지 알려 드릴게요.', '국세청 자료로 우리나라 직장인 중 몇 번째쯤인지 보여 드려요.', '/salary-rank/']]],
    ['🏡', '집', [['🗺️', '관심 아파트 실거래가를 지도에서 찾아 드릴게요.', '구를 고르면 최근 거래와 단지별 순위, 재건축 구역까지 보여요.', '/real-estate/'],
      ['🧾', '집 살 때 내는 취득세를 계산해 드릴게요.', '집값과 주택 수만 넣으면 취득세·지방교육세까지 나와요.', '/acquisition-tax/'],
      ['🛡️', '전세 사기 위험이 있는지 확인해 드릴게요.', '전세가율과 꼭 볼 서류를 하나씩 체크해요.', '/jeonse-check/'],
      ['🎯', '청약 가점이 몇 점인지 계산해 드릴게요.', '무주택 기간·부양가족·통장 기간으로 내 점수를 알려 드려요.', '/subscription-score/']]],
    ['💰', '저축·투자', [['🐷', '적금 만기에 실제로 받는 이자를 알려 드릴게요.', '이자 세금 15.4%를 빼고 손에 쥐는 돈으로 보여 드려요.', '/savings/'],
      ['🌱', 'ISA로 세금을 얼마나 아끼는지 계산해 드릴게요.', '일반 계좌와 비교해서 절세 금액을 보여 드려요.', '/isa/'],
      ['👵', '노후에 필요한 돈을 계산해 드릴게요.', '지금 나이와 생활비로 은퇴 전에 모아야 할 돈을 알려 드려요.', '/retirement/']]],
    ['🧺', '생활', [['📒', '이번 달 쓴 돈을 정리해 드릴게요.', '캘린더 가계부에 적으면 예산이 얼마 남았는지 셈이가 알려 드려요.', '/budget/'],
      ['🙅', '무지출 챌린지를 같이 해 드릴게요.', '돈 안 쓴 날에 도장을 찍고 이번 달 기록을 모아요.', '/no-spend/'],
      ['🍕', '더치페이를 깔끔하게 나눠 드릴게요.', '사람 수와 금액만 넣으면 1인당 얼마인지 바로 나와요.', '/dutch-pay/'],
      ['🔮', '오늘의 돈 퀴즈와 금전운을 봐 드릴게요.', '하루 한 문제 풀면 돈나무가 자라요.', '/quiz/']]],
  ];
  const exploreHtml = i => `<div class="ai-ex-tabs" role="tablist">${EXPLORE.map(([ico, n], k) => `<button type="button" role="tab" data-ex="${k}" class="${k === i ? 'on' : ''}" aria-selected="${k === i}"><span aria-hidden="true">${ico}</span>${n}</button>`).join('')}</div>
    <ul class="ai-ex-list">${EXPLORE[i][2].map(([ico, t, d, u]) => `<li><a href="${u}"><span class="ai-ex-ico" aria-hidden="true">${ico}</span><div><b>${t}</b><p>${d}</p></div><em class="ai-ex-go">해 보기</em></a></li>`).join('')}</ul>`;
  const stamp = () => { const d = new Date(), h = d.getHours(); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
  // 피클처럼: 위에 셈이 프로필, 아래로 말풍선이 쌓이는 친구 DM 화면
  const helloHtml = () => `<p class="ai-time">${stamp()}</p>
      <div class="ai-a">안녕하세요! 저는 계산만 해 주는 도우미가 아니라, 돈 관리를 같이 챙겨 주는 셈이예요.</div>
      <div class="ai-a">저에 대해 몇 가지 알려 드릴게요:<ul><li>세금·금융 상식, 계산 방법, 돈셈 쓰는 법을 바로 찾아 드려요.</li><li>"이번 달 얼마 썼어?"처럼 물어보면 내 가계부 기록을 보고 알려 드려요.</li><li>놓치면 손해인 환급·지원금 일정도 챙겨 드려요.</li></ul></div>
      <div class="ai-a">바로 해 볼 수 있는 걸 아래에 골라 뒀어요! 아니면 궁금한 점을 채팅으로 말씀해 주셔도 돼요.</div>
      <div class="ai-a ai-ex"><div class="ai-ex-h"><b><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/></svg>셈이 둘러보기</b><a href="/calculators/">더보기 ›</a></div><div class="ai-ex-in">${exploreHtml(0)}</div></div>`;
  function build() {
    box = document.createElement('div');
    box.className = 'ai'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '셈이와 대화');
    box.innerHTML = `<div class="ai-head"><button type="button" class="ai-x" aria-label="닫기"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="ai-prof"><span class="ai-ava">${semi(58, 'semi-bob', 'happy')}</span><b>셈이</b></div><button type="button" class="ai-new">새 대화</button></div>
      <div class="ai-body"><div class="ai-log" aria-live="polite">${helloHtml()}</div></div>
      <div class="ai-foot"><div class="ai-chips">${SUGGEST.map(t => `<button type="button">${t}</button>`).join('')}</div>
        <form class="ai-form"><button type="button" class="ai-plus" aria-label="바로 기록하기"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><input type="text" placeholder="메시지 보내기" aria-label="셈이에게 메시지" enterkeyhint="send" autocomplete="off"><button type="submit" class="ai-send" aria-label="보내기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button></form>
        <p class="ai-note">돈셈에 정리된 내용으로 답해요. 세금·투자 결정 전에는 국세청 등 공식 안내도 확인하세요.</p></div>`;
    document.body.append(box);
    const log = box.querySelector('.ai-log'), input = box.querySelector('input'), body = box.querySelector('.ai-body');
    const ask = async q => {
      q = q.trim(); if (!q) return;
      box.classList.add('chatting');
      log.insertAdjacentHTML('beforeend', `<div class="ai-q">${esc(q)}</div>`);
      // 셈이가 생각하는 표정으로 잠깐 찾아보는 척해요 (바로 답이 튀어나오면 기계 같아서)
      log.insertAdjacentHTML('beforeend', `<div class="ai-a ai-thinking" aria-label="셈이가 찾아보고 있어요"><i></i><i></i><i></i></div>`);
      const thinking = log.lastElementChild; requestAnimationFrame(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }));
      await Promise.all([!kb || !kb.length ? loadKb() : 0, new Promise(r => setTimeout(r, 650))]);
      thinking.remove();
      const talk = smallTalk(q), hits = talk ? [] : search(q), calc = talk ? null : calcFor(q), my = talk ? null : mine(q);
      let html = '';
      if (talk) html = `<div class="ai-a">${talk}</div>`;
      else if (my) html = `<div class="ai-a"><span class="ai-src">내 기록</span>${my}</div>`;
      else if (hits.length) {
        const k = hits[0];
        html = `<div class="ai-a"><span class="ai-src">${esc(k.t)}</span><b>${esc(k.q)}</b><p>${esc(k.a)}</p>`;
        const link = k.u || (calc && calc[0]), label = k.u ? (k.n || `${k.t} 열기`) : calc && `${calc[1]} 계산기 열기`;
        if (link && link !== location.pathname) html += `<a class="ai-go" href="${link}">${esc(label)} ›</a>`;
        if (hits.length > 1) html += `<div class="ai-more"><span>이것도 볼까요?</span>${hits.slice(1).map(h => `<button type="button" data-q="${esc(h.q)}">${esc(h.q)}</button>`).join('')}</div>`;
        html += '</div>';
      } else {
        html = `<div class="ai-a"><p>음… 그건 아직 잘 모르겠어요. 다른 말로 물어봐 주세요.${calc ? '' : ' 계산이 필요하면 모든 계산기에서 찾아볼 수 있어요.'}</p>${calc ? `<a class="ai-go" href="${calc[0]}">${esc(calc[1])} 계산기 열기 ›</a>` : '<a class="ai-go" href="/calculators/">모든 계산기 보기 ›</a>'}</div>`;
      }
      const face = talk ? 'wink' : my ? 'default' : hits.length ? 'happy' : 'worry'; // 답을 찾으면 웃고, 못 찾으면 고민해요
      log.insertAdjacentHTML('beforeend', html); { const ava = box.querySelector('.ai-ava img'); if (ava) ava.src = `/icons/semi-${face}.svg`; } // 프로필 얼굴이 답에 맞춰 바뀌어요
      requestAnimationFrame(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }));
    };
    box.__ask = ask;
    box.querySelector('.ai-form').addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });
    box.addEventListener('click', e => {
      const b = e.target.closest('.ai-chips button, .ai-more button'); if (b) ask(b.dataset.q || b.textContent);
      const ex = e.target.closest('[data-ex]'); if (ex) box.querySelector('.ai-ex-in').innerHTML = exploreHtml(+ex.dataset.ex);
      if (e.target.closest('.ai-x')) close();
      if (e.target.closest('.ai-new')) { log.innerHTML = helloHtml(); box.classList.remove('chatting'); body.scrollTo({ top: 0 }); const ava = box.querySelector('.ai-ava img'); if (ava) ava.src = '/icons/semi-happy.svg'; }
      if (e.target.closest('.ai-plus')) { close(); if (window.openQuickAdd) setTimeout(() => window.openQuickAdd(), 250); }
    });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    // 휴대폰 자판이 열려 있을 때: 자판 위 ∧∨✓ 막대에 가리지 않게 입력칸을 살짝 올리고, 아래 안내 문구는 잠깐 숨겨요
    const touch = matchMedia('(pointer: coarse)');
    input.addEventListener('focus', () => { if (touch.matches) box.classList.add('kb'); });
    input.addEventListener('blur', () => box.classList.remove('kb'));
    // 자판이 열린 채로 추천 질문·보내기를 누르면, 자판이 먼저 닫히며 버튼이 손가락 밑에서 미끄러져 눌리지 않았어요 → 누르는 순간 입력칸을 붙잡아 둬요
    box.addEventListener('pointerdown', e => { if (document.activeElement === input && e.target.closest('.ai-chips button, .ai-more button, .ai-form button')) e.preventDefault(); });
    box.offsetHeight; // 처음 열 때도 아래에서 부드럽게 올라오게
  }
  function open() {
    if (!box) build();
    box.classList.add('show'); document.documentElement.classList.add('ai-open');
    loadKb(); fit();
  }
  function close() { if (!box) return; box.classList.remove('show'); document.documentElement.classList.remove('ai-open'); box.style.top = box.style.height = ''; btn.focus({ preventScroll: true }); }
  btn.addEventListener('click', open);
  // 다른 곳(홈 '셈이가 챙겨 줄게요' 카드)에서도 셈이를 불러요. q가 있으면 바로 물어봐요
  window.donsemAsk = q => { open(); if (q) setTimeout(() => box.__ask(q), 350); };
  // 아이폰에서 자판이 올라오면 화면이 위로 밀리면서 아래가 비어 보였어요 → 도우미 창을 '자판 위 보이는 부분'에 딱 맞춰요
  const vv = window.visualViewport, desk = matchMedia('(min-width: 641px)');
  function fit() {
    if (!vv || !box || !box.classList.contains('show') || desk.matches) return;
    box.style.top = vv.offsetTop + 'px'; box.style.height = vv.height + 'px';
  }
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
})();

// ── 돈 달력: 놓치면 손해 보는 돈 일정 (해마다 새 일정으로 바꿔요. 마지막 확인 2026-10-23) ──
// d: 마감일(D-day 기준), from: 시작일, when: 날짜 대신 보여 줄 말(날짜 미발표), tag: 분류, go: 관련 계산기
const MONEY_CAL = [
  { d: '2026-11-30', when: '11월 중', t: '연말정산 미리보기 열림', tag: '연말정산', imp: 2, soft: true, who: '홈택스에서 1~9월 카드 사용액으로 올해 환급액을 미리 볼 수 있어요. 정확한 날짜는 국세청이 발표해요.', go: ['/year-end-tax/', '환급액 미리 계산'] },
  { d: '2026-11-30', t: '종합소득세 중간예납 납부', tag: '세금', imp: 3, who: '5월에 종합소득세를 낸 개인사업자·프리랜서는 올해 세금의 절반쯤을 미리 내요. 고지서를 확인하세요.', go: ['/income-tax/', '종합소득세 계산기'] },
  { d: '2026-11-11', t: '11.11 쇼핑 할인 (광군제)', tag: '쇼핑', imp: 1, who: '중국 광군제에 맞춰 해외 직구와 국내 쇼핑몰 할인이 몰리는 날이에요. 할인 전 가격을 먼저 확인하고, 할인율 계산기로 진짜 싼지 따져 보세요.', go: ['/discount/', '할인율 계산기'] },
  { d: '2026-11-27', t: '블랙프라이데이', tag: '쇼핑', imp: 2, who: '미국 추수감사절 다음 날로, 해외 직구 할인이 가장 큰 날이에요. 직구는 150달러(미국은 200달러)를 넘으면 관세·부가세가 붙으니 금액을 나눠 사세요.', go: ['/discount/', '할인율 계산기'] },
  { d: '2026-11-30', t: '사이버먼데이', tag: '쇼핑', imp: 1, who: '블랙프라이데이 다음 월요일에 온라인 할인이 한 번 더 열려요. 놓친 물건이 있다면 이날 다시 확인해 보세요.', go: ['/unit-price/', '단가 비교 계산기'] },
  { d: '2026-12-26', t: '박싱데이', tag: '쇼핑', imp: 1, who: '크리스마스 다음 날 해외 쇼핑몰의 연말 재고 할인이 시작돼요. 할인 기간은 쇼핑몰마다 달라요.', go: ['/discount/', '할인율 계산기'] },
  { d: '2026-11-26', t: '한국은행 기준금리 결정', tag: '금리', imp: 3, who: '예금·적금 이자와 대출 이자가 이 결정을 따라 움직여요. 오른다면 예금은 유리하고, 변동금리 대출은 이자가 늘어요.', go: ['/loan/', '대출 이자 계산기'] },
  { d: '2026-12-10', when: '12월 10일 새벽 4시', t: '미국 FOMC 금리 결정', tag: '금리', imp: 2, who: '미국 금리가 바뀌면 환율과 주식시장이 크게 움직여요. 해외 주식이나 달러를 가지고 있다면 확인해 보세요.', go: ['/overseas-stock-tax/', '해외주식 양도세 계산기'] },
  { d: '2027-01-14', t: '한국은행 기준금리 결정 (2027년 첫 회의)', tag: '금리', imp: 3, who: '새해 첫 금리 결정이에요. 예금 만기나 대출 갈아타기를 앞두고 있다면 결과를 보고 정하세요.', go: ['/refinance/', '대출 갈아타기 계산기'] },
  { d: '2027-01-28', when: '1월 28일 새벽 4시', t: '미국 FOMC 금리 결정', tag: '금리', imp: 2, who: '2027년 첫 미국 금리 결정이에요. 날짜는 미국 연준 발표 일정 기준이고 바뀔 수 있어요.', go: ['/overseas-stock-tax/', '해외주식 양도세 계산기'] },
  { d: '2026-12-15', from: '2026-12-01', t: '종합부동산세 납부', tag: '세금', imp: 3, who: '공시가격 합계가 기준을 넘는 집·땅을 가진 사람이 내요. 대상이면 11월 말에 고지서가 와요.' },
  { d: '2026-12-31', t: '연금저축·IRP 납입 마감', tag: '연말정산', imp: 3, who: '12월 31일까지 넣은 돈만 올해 연말정산에서 돌려받아요. 은행·증권사 마감 시간은 더 이를 수 있어요.', go: ['/pension/', '연금저축·IRP 계산기'] },
  { d: '2027-01-01', t: '최저임금 시급 10,700원 적용', tag: '월급', imp: 2, who: '2026년보다 380원(3.7%) 올라요. 주 40시간이면 주휴수당 포함 월 2,236,300원이에요.', go: ['/wage/', '시급·월급 계산기'] },
  { d: '2027-01-15', when: '1월 15일 무렵', t: '연말정산 간소화 자료 공개', tag: '연말정산', imp: 3, who: '홈택스에서 카드·의료비·보험료 자료를 내려받아 회사에 내요. 매년 1월 15일 무렵 열려요.', go: ['/year-end-tax/', '환급액 미리 계산'] },
  { d: '2027-01-25', from: '2027-01-01', t: '부가세 2기 확정신고·납부', tag: '세금', imp: 3, who: '개인 일반과세자는 7~12월분 부가가치세를 신고하고 내요.', go: ['/vat/', '부가세 계산기'] },
  { d: '2027-01-31', from: '2027-01-16', t: '자동차세 연납 신청·납부', tag: '세금', imp: 2, who: '1년치 자동차세를 1월에 한 번에 내면 깎아 줘요. 위택스에서 신청해요. 마감일이 주말이면 다음 평일까지예요.' },
  { d: '2027-03-15', from: '2027-03-01', t: '근로장려금 반기 신청', tag: '지원금', imp: 2, who: '2026년 하반기 근로소득이 있는 사람이 신청해요. 소득·재산 기준은 홈택스에서 확인하세요.' },
  { d: '2027-03-31', t: '법인세 신고·납부', tag: '세금', imp: 3, who: '12월 결산 법인은 2026년 법인세를 신고하고 내요.', go: ['/corporate-tax/', '법인세 계산기'] },
  { d: '2027-05-31', from: '2027-05-01', t: '종합소득세 신고·납부', tag: '세금', imp: 3, who: '프리랜서·사업자·부업 소득이 있는 사람은 2026년 소득을 신고해요. 3.3% 뗀 사람은 환급받을 수도 있어요.', go: ['/income-tax/', '종합소득세 계산기'] },
  { d: '2027-05-31', from: '2027-05-01', t: '근로·자녀장려금 정기 신청', tag: '지원금', imp: 3, who: '2026년 소득·재산 기준을 맞춘 가구가 신청해요. 대상이면 안내문이 와요.' },
];
const MONEY_CHANGES = [
  { t: '최저임금 인상', a: '시급 10,320원', b: '10,700원', note: '380원(3.7%) 올라요. 알바 월급·주휴수당이 같이 올라요.', src: '최저임금위원회 2026.7.14 의결', go: ['/wage/', '시급·월급 계산기'] },
  { t: '국민연금 보험료율 인상', a: '9.5%', b: '10%', note: '직장인은 회사와 반씩 내서 월급의 4.75% → 5%가 빠져요.', src: '국민연금법 개정 (2025.4.2 공포, 해마다 0.5%p씩 13%까지)', go: ['/salary/', '연봉 실수령액 계산기'] },
  { t: '건강보험료율 동결', a: '7.19%', b: '7.19%', note: '직장인 부담은 그대로 3.595%예요.', src: '보건복지부 건강보험정책심의위원회 2026.9.8 결정', go: ['/salary/', '연봉 실수령액 계산기'] },
];
// 오늘 기준 D-day (날짜만 비교해요)
// 일정 알림 받기 (위버스 '오픈 알림 받기'처럼): 고른 일정은 D-3부터 🔔에 떠요 (이 기기에 저장, donsem:mc-sub)
const mcSubKey = e => `${e.d}|${e.t}`;
const mcSubs = () => { try { const v = JSON.parse(localStorage.getItem('donsem:mc-sub')); return new Set(Array.isArray(v) ? v : []); } catch (err) { return new Set(); } };
function mcSubToggle(e) {
  const s2 = mcSubs(), k = mcSubKey(e), on = !s2.has(k);
  if (on) s2.add(k); else s2.delete(k);
  try { localStorage.setItem('donsem:mc-sub', JSON.stringify([...s2])); } catch (err) { /* 저장이 막힌 브라우저 */ }
  toast(on ? `'${e.t}' 알림을 받아요. D-3부터 위쪽 🔔에 알려 드려요.` : `'${e.t}' 알림을 껐어요.`);
  return on;
}
const mcDays = d => { const t = new Date(), a = new Date(t.getFullYear(), t.getMonth(), t.getDate()), [y, m, dd] = d.split('-').map(Number); return Math.round((new Date(y, m - 1, dd) - a) / 864e5); };
const mcUpcoming = () => MONEY_CAL.filter(e => mcDays(e.d) >= 0).sort((a, b) => a.d.localeCompare(b.d));
const esc2h = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
// 알림함 문구: 토스 알림처럼 한눈에 눈길이 가게 (일정마다 맞춤, 없으면 분류별 기본 문구)
function mcHook(e, n) {
  const D = n ? `D-${n}` : '오늘', H = {
    '11.11 쇼핑 할인 (광군제)': n ? `광군제 ${D} 🛒 장바구니 미리 담아 두면 더 싸게 사요` : '🛒 오늘 자정에 끝나요! 광군제 할인, 진짜 싼지 10초 만에 확인',
    '블랙프라이데이': `블프 ${D} 🔥 1년 중 가장 싼 날, 직구 관세 함정만 피하세요`,
    '사이버먼데이': n ? `블프 놓쳤다면? ${D} 사이버먼데이에 한 번 더 기회가 와요` : '🔥 오늘이 사이버먼데이! 블프 때 놓친 물건 다시 확인하세요',
    '박싱데이': `연말 재고 떨이 🎁 박싱데이 ${D}, 해외 쇼핑몰이 크게 할인해요`,
    '한국은행 기준금리 결정': `${D} 기준금리 발표 📉 내 대출 이자, 오를까 내릴까?`,
    '한국은행 기준금리 결정 (2027년 첫 회의)': `${D} 새해 첫 금리 발표 📉 예금 만기·대출 갈아타기 전에 꼭 보세요`,
    '미국 FOMC 금리 결정': `${D} 미국 금리 발표 🇺🇸 환율·주식이 크게 흔들릴 수 있어요`,
    '종합소득세 중간예납 납부': `${D} 세금 고지서 💣 안 내면 가산세가 붙어요`,
    '종합부동산세 납부': `종부세 ${D} 🏠 고지서 확인 안 하면 가산세 폭탄`,
    '연금저축·IRP 납입 마감': `${D} 마감! 💰 지금 넣으면 최대 148만 원 돌려받아요`,
    '연말정산 미리보기 열림': '13월의 월급 미리보기 열려요 💰 올해 얼마 돌려받을까?',
    '최저임금 시급 10,700원 적용': '내년 시급 10,700원 ⬆️ 내 월급, 제대로 받고 있을까?',
    '연말정산 간소화 자료 공개': `${D} 연말정산 시작 📄 놓친 공제 하나로 수십만 원이 갈려요`,
    '부가세 2기 확정신고·납부': `사장님 ${D}! 🧾 부가세 신고 안 하면 가산세`,
    '자동차세 연납 신청·납부': `🚗 1월에 한 번에 내면 자동차세 할인! ${D}`,
    '근로장려금 반기 신청': `신청만 하면 받는 돈 💸 근로장려금 ${D}`,
    '법인세 신고·납부': `🏢 법인세 신고 ${D}, 늦으면 가산세가 붙어요`,
    '종합소득세 신고·납부': `프리랜서 주목! 3.3% 떼였다면 환급받을 수도 💸 ${D}`,
    '근로·자녀장려금 정기 신청': `최대 330만 원 💰 신청 안 하면 0원! 장려금 ${D}`,
  };
  if (H[e.t]) return H[e.t];
  return { 세금: `${D} ${e.t} 💣 놓치면 가산세가 붙어요`, 쇼핑: `${D} ${e.t} 🛍️ 진짜 싼지 먼저 확인하세요`, 금리: `${D} ${e.t} 📈 내 이자가 바뀔 수 있어요`, 연말정산: `${D} ${e.t} 💰 돌려받을 돈이 달라져요`, 지원금: `${D} ${e.t} 🎁 신청 안 하면 0원이에요`, 월급: `${e.t} 💵 내 월급 확인해 보세요` }[e.tag] || `${D} ${e.t}`;
}
const mcBadge = e => { const n = mcDays(e.d); return e.soft ? '예정' : n === 0 ? 'D-DAY' : `D-${n}`; }; // 날짜가 아직 발표 전이면 '예정' (날짜 칸에 '11월 중'이 따로 보여요)
// 내 달력에 넣기(.ics): 마감일 하루짜리 일정 + 하루 전 오전 9시 알림
// ── 이번 달 지출은 어디서나 같은 기준: 가계부 기록 + 날짜가 이미 지난 고정지출 (캘린더와 똑같이) ──
// 고정지출을 가계부에 따로 기록했다면(id fx-…) 두 번 세지 않아요. 지난달·이번 달만 만들어요
function withFixed(entries) {
  let items = []; try { const f = JSON.parse(localStorage.getItem('donsem:fixed')); items = f && Array.isArray(f.items) ? f.items : []; } catch (e) { items = []; }
  if (!items.length) return entries;
  const have = new Set(entries.map(e => e.id)), n = new Date(), out = [];
  [-1, 0].forEach(k => {
    const d0 = new Date(n.getFullYear(), n.getMonth() + k, 1), y = d0.getFullYear(), m = d0.getMonth() + 1, ym = `${y}-${String(m).padStart(2, '0')}`, last = new Date(y, m, 0).getDate(), upTo = k ? last : n.getDate();
    items.forEach(x => {
      if (!(Number(x.amt) > 0 && Number(x.day) > 0) || (x.cycle === 'year' && Number(x.month) !== m) || have.has(`fx-${x.id}-${ym}`)) return;
      const dd = Math.min(Number(x.day), last); if (dd > upTo) return;
      out.push({ id: `fx-${x.id}-${ym}`, type: 'out', amt: Number(x.amt), cat: x.cat || '고정지출', memo: x.name || '', date: `${ym}-${String(dd).padStart(2, '0')}`, fx: true });
    });
  });
  return out.length ? entries.concat(out) : entries;
}
// ── 내 일정 (캘린더) 반복·알림: 가계부 달력과 알림(종)에서 같이 써요 ──
const plK = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
// k 날짜에 걸치는 이번 회차 {s, e}를 찾아요 (안 걸치면 null). rep: none·day·week·month·year
function planOcc(p, k) {
  const e0k = p.e || p.s;
  if (!p.rep || p.rep === 'none') return p.s <= k && k <= e0k ? { s: p.s, e: e0k } : null;
  if (k < p.s) return null;
  const s0 = plD(p.s), dur = Math.round((plD(e0k) - s0) / 864e5), kd = plD(k);
  for (let off = 0; off <= dur; off++) {
    const c = new Date(kd); c.setDate(c.getDate() - off); if (c < s0) break;
    const diff = Math.round((c - s0) / 864e5);
    const ok = p.rep === 'day' || (p.rep === 'week' && diff % 7 === 0) || (p.rep === 'month' && c.getDate() === s0.getDate()) || (p.rep === 'year' && c.getDate() === s0.getDate() && c.getMonth() === s0.getMonth());
    if (ok) { const e = new Date(c); e.setDate(e.getDate() + dur); return { s: plK(c), e: plK(e) }; }
  }
  return null;
}
const PL_ALARM = { none: '없음', '0d9': '당일 오전 9시', '1d9': '1일 전 오전 9시', '1d12': '1일 전 정오', '1h': '1시간 전', '10m': '10분 전' };
// 이번 회차 알림 시각 (밀리초)
function planAlarmAt(p, occS) {
  const d = plD(occS), [h, mi] = (p.allDay === false && p.st ? p.st : '09:00').split(':').map(Number);
  const at = { '0d9': [0, 9, 0], '1d9': [-1, 9, 0], '1d12': [-1, 12, 0] }[p.alarm];
  if (at) { d.setDate(d.getDate() + at[0]); d.setHours(at[1], at[2], 0, 0); return d.getTime(); }
  d.setHours(h, mi, 0, 0);
  return d.getTime() - (p.alarm === '1h' ? 36e5 : p.alarm === '10m' ? 6e5 : 0);
}
// 지금 울려야 할 일정 알림들 (오늘부터 3일 안에 시작하는 회차, 알림 시각이 지났고 일정이 아직 안 끝난 것)
function planAlarmsDue() {
  let ps = []; try { const d = JSON.parse(localStorage.getItem('donsem:plans')); ps = d && Array.isArray(d.items) ? d.items : []; } catch (e) { ps = []; }
  const now = Date.now(), out = [];
  ps.filter(p => p.alarm && p.alarm !== 'none' && !p.done).forEach(p => {
    for (let i = 0; i <= 3; i++) {
      const day = new Date(); day.setDate(day.getDate() + i); const k = plK(day), o = planOcc(p, k);
      if (!o || o.s !== k) continue;
      const at = planAlarmAt(p, o.s), end = plD(o.e).getTime() + 864e5;
      if (now >= at && now < end) out.push({ p, occ: o.s, id: `pl-${p.id}-${o.s}`, when: i === 0 ? '오늘' : i === 1 ? '내일' : `${i}일 뒤` });
    }
  });
  return out;
}
// 돈셈을 켜 둔 동안 1분마다 확인해서, 처음 울리는 알림은 토스트(허락했으면 휴대폰 알림도)로 알려요
(() => {
  const check = () => {
    let fired = []; try { fired = JSON.parse(localStorage.getItem('donsem:pl-fired')) || []; } catch (e) { fired = []; }
    const due = planAlarmsDue().filter(a => !fired.includes(a.id));
    if (!due.length) return;
    due.forEach(a => {
      const msg = `📅 ${a.when} ${a.p.t}${a.p.allDay === false && a.p.st ? ` (${a.p.st})` : ''}${a.p.place ? ` · ${a.p.place}` : ''}`;
      if (typeof toast === 'function') toast(msg);
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('돈셈 일정 알림', { body: msg.replace('📅 ', ''), icon: '/icon-192.png', tag: a.id }); } catch (e) { /* 휴대폰 알림이 안 되는 기기 */ }
    });
    try { localStorage.setItem('donsem:pl-fired', JSON.stringify(fired.concat(due.map(a => a.id)).slice(-200))); } catch (e) { /* 괜찮아요 */ }
  };
  setTimeout(check, 1500); setInterval(check, 60000);
})();
// 내 일정 → 휴대폰 달력 파일 (.ics)
function planIcs(p) {
  const esc2 = t => String(t || '').replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n'), ymd = d => d.replace(/-/g, '');
  const nx = d => { const x = plD(d); x.setDate(x.getDate() + 1); return ymd(plK(x)); };
  const timed = p.allDay === false && p.st, t2 = (d, t) => `${ymd(d)}T${t.replace(':', '')}00`;
  const rr = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }[p.rep];
  const ev = ['BEGIN:VEVENT', `UID:${p.id}@doncalculator.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    timed ? `DTSTART:${t2(p.s, p.st)}` : `DTSTART;VALUE=DATE:${ymd(p.s)}`, timed ? `DTEND:${t2(p.e || p.s, p.et || p.st)}` : `DTEND;VALUE=DATE:${nx(p.e || p.s)}`,
    ...(rr ? [`RRULE:FREQ=${rr}`] : []), `SUMMARY:${esc2(p.t)}`, ...(p.place ? [`LOCATION:${esc2(p.place)}`] : []), ...(p.memo ? [`DESCRIPTION:${esc2(p.memo)}`] : []), 'END:VEVENT'];
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//doncalculator.com//donsem//KO', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); a.download = `돈셈-${p.t}.ics`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  if (typeof toast === 'function') toast('달력 파일을 저장했어요. 파일을 열면 휴대폰 달력에 들어가요.');
}
function mcIcs(list, name) {
  const esc2 = t => String(t).replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n'), ymd = d => d.replace(/-/g, '');
  const next = d => { const [y, m, dd] = d.split('-').map(Number), x = new Date(y, m - 1, dd + 1); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`; };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ev = list.map(e => ['BEGIN:VEVENT', `UID:${ymd(e.d)}-${encodeURIComponent(e.t).slice(0, 40)}@doncalculator.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(e.d)}`, `DTEND;VALUE=DATE:${next(e.d)}`,
    `SUMMARY:${esc2((e.from ? '[마감] ' : '') + e.t)}`, `DESCRIPTION:${esc2(e.who + (e.when ? `\n(날짜: ${e.when})` : ''))}`, `URL:https://doncalculator.com${e.go ? e.go[0] : '/money-calendar/'}`, 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc2(`내일 ${e.t}`)}`, 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT'].join('\r\n')).join('\r\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//doncalculator.com//donsem money calendar//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:돈셈 돈 달력', ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('캘린더 파일을 저장했어요. 파일을 열면 달력에 들어가요.');
}
// 첫 화면: 다가오는 돈 일정 3개
(() => {
  if (!document.body.classList.contains('home')) return;
  const list = mcUpcoming().slice(0, 3), anchor = document.querySelector('.duo');
  if (!list.length || !anchor) return;
  const sec = document.createElement('section');
  sec.className = 'group mc-home';
  sec.innerHTML = `<div class="mc-home-in"><h2><img src="/icons/money-calendar.webp" alt="" width="28" height="28">다가오는 돈 일정</h2>${list.map(e => {
    const n = mcDays(e.d), [, m, dd] = e.d.split('-').map(Number);
    return `<a class="mc-row" href="/money-calendar/"><em class="${e.soft ? 'soft' : n <= 7 ? 'near' : ''}">${mcBadge(e)}</em><span>${e.t}</span><small>${e.soft ? esc2h(e.when || '') : `${m}/${dd}`}</small></a>`;
  }).join('')}<a class="mc-more" href="/money-calendar/">돈 달력 전체 보기 ›</a></div>`;
  anchor.after(sec);
})();

// ── 스크롤하면 카드가 아래에서 살짝 떠오르며 나타나요 (애플·토스처럼). 처음 화면에 보이는 건 그대로 두고, 아래쪽 것만 ──
(() => {
  if (calmMotion || !('IntersectionObserver' in window)) return;
  const items = [...document.querySelectorAll('.wrap > section.showcase > *, .wrap > section.duo > *, .wrap > section.group, .wrap > section.mc-home, .wrap > .card.sub-card, .wrap > article.guide, .wrap > section.card:not(:first-of-type)')]
    .filter(el => el.getBoundingClientRect().top > window.innerHeight);
  if (!items.length) return;
  items.forEach(el => el.classList.add('rise'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.classList.add('in');
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => io.observe(el));
})();

// ── 월급날 D-day: donsem:budget.payday = { day: 1~31 (32는 말일), early: 주말이면 금요일로 앞당겨요 } ──
function paydayInfo(b) {
  const p = b && b.payday;
  if (!p || !(p.day >= 1 && p.day <= 32)) return null;
  const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const dateFor = (y, m) => {
    const last = new Date(y, m + 1, 0).getDate(), d = new Date(y, m, p.day === 32 ? last : Math.min(p.day, last));
    if (p.early !== false) while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  };
  let next = dateFor(t0.getFullYear(), t0.getMonth());
  if (next < t0) next = dateFor(t0.getFullYear(), t0.getMonth() + 1);
  const prev = dateFor(next.getFullYear(), next.getMonth() - 1);
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const from = ymd(prev), days = Math.round((next - t0) / 864e5), es = Array.isArray(b.entries) ? b.entries : [];
  const inc = es.filter(e => e.type === 'in' && e.date >= from).reduce((a, e) => a + e.amt, 0);
  const out = es.filter(e => e.type === 'out' && e.date >= from).reduce((a, e) => a + e.amt, 0);
  // 지난 월급날부터 들어온 수입이 있으면 그 돈으로, 없으면 한 달 예산으로 계산해요
  const how = inc > 0 ? 'income' : b.budget ? 'budget' : '', left = how === 'income' ? inc - out : how === 'budget' ? b.budget - out : null;
  return { next, prev, days, inc, out, how, left, perDay: left != null && days > 0 ? Math.floor(Math.max(0, left) / days) : null };
}
const paydayLabel = d => `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
// 첫 화면: 월급날을 정해 두면 '오늘의 돈셈' 위에 한 줄로 보여 줘요
(() => {
  const daily = document.getElementById('daily');
  if (!daily) return;
  let b; try { b = JSON.parse(localStorage.getItem('donsem:budget')); } catch (e) { b = null; }
  const pi = paydayInfo(b);
  if (!pi) return;
  const a = document.createElement('a');
  a.className = 'pd-home'; a.href = '/budget/';
  a.innerHTML = `<span class="pd-home-ico" aria-hidden="true">💰</span><span class="pd-home-t">${pi.days ? `월급날까지 <b>D-${pi.days}</b>` : '<b>오늘 월급날</b>이에요 🎉'}<small>${paydayLabel(pi.next)}</small></span>${pi.perDay != null ? `<span class="pd-home-r"><small>하루 쓸 수 있는 돈</small><b>${won(pi.perDay)}</b></span>` : '<span class="pd-home-r"><small>가계부에서 보기</small><b>›</b></span>'}`;
  daily.before(a);
})();

// ── 쿠팡 파트너스: 계산 결과와 바로 이어지는 자리에만 작은 카드 1개 ──
// 쿠팡 파트너스에서 만든 링크를 url에 넣으면 그 페이지에 카드가 나타나요. url이 비어 있으면 아무것도 안 보여요.
const COUPANG = {
  '/unit-price/': { t: '대용량이 더 싸다면', d: '생필품 대용량 묶음 보기', url: 'https://link.coupang.com/a/ibZUXhAifQ' },
  '/fuel/': { t: '기름값을 아끼려면', d: '차량용품 보기', url: 'https://link.coupang.com/a/ibZVUjXwzt' },
  '/no-spend/': { t: '무지출을 도와줄 살림템', d: '도시락통 보기', url: 'https://link.coupang.com/a/ibZWgy4db2' },
  '/budget/': { t: '손으로도 적고 싶다면', d: '가계부 노트 보기', url: 'https://link.coupang.com/a/ibZWCyJErc' },
};
(() => {
  const c = COUPANG[location.pathname];
  if (!c || !/^https:\/\/(link\.coupang\.com|coupa\.ng)\//.test(c.url)) return; // 쿠팡 파트너스 링크만 써요
  const box = document.createElement('aside');
  box.className = 'cpn';
  box.innerHTML = `<a href="${c.url}" target="_blank" rel="sponsored noopener"><span class="cpn-t">${c.t}</span><b>${c.d} ›</b><span class="cpn-tag">쿠팡</span></a>
    <p class="cpn-note">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 구매하시는 가격은 똑같아요.</p>`;
  const after = document.querySelector('.card .next') || document.querySelector('.card .share') || document.getElementById('b-wrap-card') || document.getElementById('no-spend');
  if (after) after.after(box);
})();

// 계산기 아래에 관련 「돈 가이드」 글을 이어 줘요
const GUIDE_FOR = {
  '/salary/': [['salary-take-home', '연봉별 실수령액 표'], ['youth-tax-cut', '중소기업 청년 소득세 감면 90%'], ['salary-rank', '내 연봉은 상위 몇 %']],
  '/salary-rank/': [['salary-rank', '내 연봉은 상위 몇 %'], ['salary-take-home', '연봉별 실수령액 표']],
  '/severance/': [['severance-pay', '퇴직금 계산법 총정리'], ['unemployment', '실업급여 조건과 금액']],
  '/asset-rank/': [['asset-rank', '순자산 순위표와 나이대별 평균']],
  '/savings/': [['savings-interest', '적금 이자 진짜 계산법'], ['deposit-protection', '예금자보호 1억 원']],
  '/deposit/': [['deposit-protection', '예금자보호 1억 원'], ['savings-interest', '적금 이자 진짜 계산법']],
  '/unemployment/': [['unemployment', '실업급여 조건과 금액'], ['severance-pay', '퇴직금 계산법 총정리']],
  '/year-end-tax/': [['year-end-preview', '연말정산 미리 계산하기'], ['card-deduction', '신용카드·체크카드 비율'], ['missed-deductions', '놓치기 쉬운 공제 4가지']],
  '/pension/': [['irp-transfer', 'IRP 계좌 이전 6단계'], ['irp-pension', 'IRP·연금저축 세액공제'], ['year-end-basics', '연말정산 환급 기본']],
};
(() => {
  const g = GUIDE_FOR[location.pathname], foot = document.querySelector('.wrap > footer');
  if (!g || !foot) return;
  const box = document.createElement('section');
  box.className = 'card sub-card gd-more';
  box.innerHTML = `<h2>함께 읽으면 좋은 돈 가이드</h2><ul>${g.map(([s, t]) => `<li><a href="/guide/${s}/">${t}</a></li>`).join('')}</ul>`;
  foot.before(box);
})();

// ── 첫 화면 '내 돈 한눈에' (뱅크샐러드 홈처럼): 순자산·이번 달 지출·다가오는 돈 일정을 한 카드에 ──
// 가계부·고정지출·내 자산 중 하나라도 적어 둔 사람에게만 보여요
(() => {
  const anchor = document.getElementById('daily');
  if (!anchor || !document.body.classList.contains('home')) return;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const b = read('donsem:budget'), a = read('donsem:assets'), f = read('donsem:fixed');
  const entries0 = b && Array.isArray(b.entries) ? b.entries : [], items = a && Array.isArray(a.items) ? a.items : [], fixed = f && Array.isArray(f.items) ? f.items : [];
  if (!entries0.length && !items.length && !fixed.length) return;
  const entries = withFixed(entries0); // 캘린더와 같은 이번 달 지출 (지난 고정지출 포함)
  const n = new Date(), ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, today = ymd(n), ym = today.slice(0, 7);
  const sgn = v => (v < 0 ? '-' : '') + won(Math.abs(v)), man = v => (Math.abs(v) >= 1e4 ? `${Math.round(Math.abs(v) / 1e4).toLocaleString('ko-KR')}만 원` : won(Math.abs(v)));
  let html = '';
  // ① 순자산과 지난 방문 때보다 얼마나 변했는지
  if (items.length) {
    const sum = k => items.filter(x => x.kind === k).reduce((s, x) => s + (Number(x.amt) || 0), 0), as = sum('asset'), de = sum('debt'), net = as - de;
    const last = read('donsem:last-net');
    const diff = last && last.day !== today ? net - last.net : last ? last.diff || 0 : 0;
    if (!last || last.day !== today) try { localStorage.setItem('donsem:last-net', JSON.stringify({ net, day: today, diff })); } catch (e) { /* 괜찮아요 */ }
    const rank = typeof assetTop === 'function' ? assetTop(net) : null;
    html += `<a class="mh-row mh-net" href="/asset-rank/"><span>순자산${rank !== null ? ` · <strong class="mh-rank">상위 ${topText(rank)}</strong>` : ''}</span><b>${sgn(net)} ›</b>${diff ? `<small class="${diff > 0 ? 'up' : 'down'}">지난 방문보다 ${man(diff)} ${diff > 0 ? '늘었어요' : '줄었어요'}</small>` : ''}
      <span class="mh-mini"><i>자산 ${man(as)}</i><i>부채 ${man(de)}</i></span></a>`;
  }
  // ② 이번 달 지출과 지난달 같은 기간 비교
  const prevYm = ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)).slice(0, 7), day = n.getDate();
  const out = entries.filter(e => e.type === 'out' && e.date.startsWith(ym)).reduce((s, e) => s + e.amt, 0);
  const prev = entries.filter(e => e.type === 'out' && e.date.startsWith(prevYm) && Number(e.date.slice(8)) <= day).reduce((s, e) => s + e.amt, 0);
  // 토스 '많이 쓴 카테고리'처럼: 이번 달 가장 많이 쓴 분류와 지난달 같은 기간 비교
  const byCat = (m, upto) => entries.filter(e => e.type === 'out' && e.date.startsWith(m) && (!upto || Number(e.date.slice(8)) <= upto)).reduce((o, e) => { o[e.cat || '기타'] = (o[e.cat || '기타'] || 0) + e.amt; return o; }, {});
  const cNow = byCat(ym), cPrev = byCat(prevYm, day), top = Object.entries(cNow).sort((p, q) => q[1] - p[1])[0];
  const topTxt = top && out ? `<small class="mh-top">가장 많이 쓴 곳 <strong>${esc2h(top[0])} ${man(top[1])}</strong>${cPrev[top[0]] ? ` · 지난달보다 ${man(top[1] - cPrev[top[0]])} ${top[1] >= cPrev[top[0]] ? '더' : '덜'}` : ''}</small>` : '';
  if (entries.length) html += `<a class="mh-row" href="/budget/"><span>이번 달 지출</span><b>${out ? '-' : ''}${won(out)} ›</b>${prev ? `<small>지난달 같은 기간보다 ${man(prev - out)} ${out <= prev ? '덜' : '더'} 썼어요</small>` : ''}${topTxt}</a>`;
  // ③ 다가오는 돈 일정: 월급날, 가장 가까운 고정지출
  const up = [];
  const pi = typeof paydayInfo === 'function' ? paydayInfo(b) : null;
  if (pi) up.push([pi.days, '💰', '월급', pi.days ? `D-${pi.days}` : '오늘']);
  fixed.filter(x => Number(x.amt) > 0 && Number(x.day) > 0 && (x.cycle !== 'year' || Number(x.month) - 1 === n.getMonth() || Number(x.month) - 1 === (n.getMonth() + 1) % 12)).forEach(x => {
    const at = (y, m) => new Date(y, m, Math.min(Number(x.day), new Date(y, m + 1, 0).getDate()));
    let d = at(n.getFullYear(), n.getMonth()); if (ymd(d) < today) d = at(n.getFullYear(), n.getMonth() + 1);
    if (x.cycle === 'year' && d.getMonth() !== Number(x.month) - 1) return;
    const dd = Math.round((d - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
    up.push([dd, '↻', `${x.name || x.cat} ${won(Number(x.amt))}`, dd ? `${dd}일 뒤` : '오늘']);
  });
  up.sort((p, q) => p[0] - q[0]);
  if (up.length) html += `<a class="mh-row" href="/budget/"><span>다가오는 돈 일정</span>${up.slice(0, 2).map(([, i, t, w]) => `<em><i>${i}</i>${esc2h(t)}<u>${w}</u></em>`).join('')}</a>`;
  if (!html) return;
  const sec = document.createElement('section');
  sec.className = 'card my-home';
  sec.setAttribute('aria-label', '내 돈 한눈에');
  sec.innerHTML = `<div class="mh-h"><h2>내 돈 한눈에</h2><button type="button" class="mh-eye" aria-pressed="false">금액 숨기기</button><a href="/budget/">캘린더 ›</a></div><div class="mh-body">${html}</div>`;
  (document.querySelector('.wrap > .hero') || anchor).before(sec); // 다시 온 사람에겐 내 돈이 맨 먼저 보여요
  // 금액 숨기기 (카카오페이처럼): 지하철·회사에서 첫 화면을 열어도 금액이 흐리게 보여요. 이 기기에 기억해요
  const eye = sec.querySelector('.mh-eye'), hideOn = on => { sec.classList.toggle('amt-hide', on); eye.textContent = on ? '금액 보기' : '금액 숨기기'; eye.setAttribute('aria-pressed', String(on)); };
  hideOn(store.get('donsem:hide-amt') === '1');
  eye.addEventListener('click', () => { const on = !sec.classList.contains('amt-hide'); store.set('donsem:hide-amt', on ? '1' : '0'); hideOn(on); });
})();

// ── 순자산 상위 % 페이지: 내 자산에 적어 둔 게 있으면 그 순자산으로 바로 보여 줘요 ──
(() => {
  if (location.pathname !== '/asset-rank/' || new URLSearchParams(location.search).has('ar_net')) return;
  let a = null;
  try { a = JSON.parse(localStorage.getItem('donsem:assets')); } catch (e) { a = null; }
  if (!a || !Array.isArray(a.items) || !a.items.length) return;
  const net = a.items.reduce((s, x) => s + (x.kind === 'debt' ? -1 : 1) * (Number(x.amt) || 0), 0);
  const inp = document.querySelector('input[data-k="ar_net"]'), note = document.getElementById('ar-from');
  if (!inp) return;
  inp.value = Math.max(0, net).toLocaleString('ko-KR'); // 부채가 더 많으면 0원으로 넣어요 (우리나라 가구의 약 3%예요)
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  if (note) { note.hidden = false; note.innerHTML = net < 0 ? '내 자산에서 부채가 자산보다 많아서 0원으로 넣었어요. 부채가 더 많은 가구는 약 3%예요.' : '캘린더 <a href="/budget/#assets">내 자산</a>에 적은 순자산을 넣었어요.'; }
})();


// ── 알림함 (뱅크샐러드 알림처럼): 내 기록으로 만든 알림 — 주간 지출, 결제 예정, 월급날, 예산, 연속 기록, 놓치면 손해 ──
// 서버 없이 이 기기 기록만 보고 열 때마다 새로 만들어요. 읽은 알림은 donsem:noti-seen에 기억해요
(() => {
  const right = document.querySelector('.topbar .top-right');
  if (!right) return;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const md = d => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  function build() {
    const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()), today = ymd(t0), out = [];
    const b = read('donsem:budget'), entries = b && Array.isArray(b.entries) ? b.entries : [];
    // ① 지난주 지출 (월~일)
    const mon = new Date(t0); mon.setDate(t0.getDate() - ((t0.getDay() + 6) % 7) - 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const wk = entries.filter(e => e.type === 'out' && e.date >= ymd(mon) && e.date <= ymd(sun));
    if (wk.length) { const byc = {}; wk.forEach(e => { byc[e.cat] = (byc[e.cat] || 0) + e.amt; }); const top = Object.entries(byc).sort((a, c) => c[1] - a[1])[0];
      out.push({ id: 'wk-' + ymd(mon), ico: '📊', bg: '#E8F1FF', t: '주간 리포트', m: `지난주 ${won(wk.reduce((s, e) => s + e.amt, 0))} 썼어요. 1위는 ${top[0]} 👀 진짜 필요했던 걸까요?`, sub: `${md(mon)}~${md(sun)} · ${wk.length}건`, go: '/budget/', r: '이번 주', u: 2 }); }
    // ② 월급날
    const pi = typeof paydayInfo === 'function' ? paydayInfo(b) : null;
    if (pi && pi.days <= 3) out.push({ id: 'pay-' + ymd(pi.next), ico: '💰', bg: '#E7F8EC', t: '월급날', m: pi.days ? `월급까지 D-${pi.days} ⏳ 지금 남은 돈으로 버틸 수 있을까요?` : '💸 월급 들어왔어요! 카드값이 털어 가기 전에 저축부터 떼 두세요', go: '/budget/', r: pi.days ? `D-${pi.days}` : '오늘', u: pi.days });
    // ③ 고정지출 결제 예정 (3일 안)
    const f = read('donsem:fixed');
    (f && Array.isArray(f.items) ? f.items : []).forEach(x => {
      if (!(Number(x.amt) > 0 && Number(x.day) > 0)) return;
      for (let k = 0; k <= 3; k++) {
        const d = new Date(t0); d.setDate(t0.getDate() + k);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (Math.min(Number(x.day), last) !== d.getDate() || (x.cycle === 'year' && Number(x.month) !== d.getMonth() + 1)) continue;
        out.push({ id: `fx-${x.id}-${ymd(d)}`, ico: '💳', bg: '#FFF1E6', t: '결제 예정', m: `${k === 0 ? '오늘' : k === 1 ? '내일' : `${k}일 뒤`} ${x.name || x.cat} ${won(Number(x.amt))}이 빠져나가요 💸 안 쓰는 구독이면 지금 끊으세요`, go: '/budget/#fixed', r: k === 0 ? '오늘' : `D-${k}`, u: k });
        break;
      }
    });
    // ④ 이번 달 예산
    if (b && b.budget > 0) {
      const used = withFixed(entries).filter(e => e.type === 'out' && e.date.startsWith(today.slice(0, 7))).reduce((s, e) => s + e.amt, 0), r = used / b.budget;
      const leftDays = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - n.getDate() + 1;
      if (r >= 0.8) out.push({ id: `bud-${today.slice(0, 7)}-${r >= 1 ? 100 : 80}`, ico: r >= 1 ? '🚨' : '⚠️', bg: '#FFE9E9', t: '이번 달 예산', r: '지금', u: 0, m: r >= 1 ? `🚨 예산 ${won(used - b.budget)} 초과! 이대로면 다음 달 카드값 폭탄이에요` : `⚠️ 예산 ${Math.floor(r * 100)}% 소진! 남은 ${won(b.budget - used)}으로 ${leftDays}일을 버텨야 해요`, go: '/budget/' });
    }
    // ⑤ 연속 기록
    if (typeof budgetStreak === 'function' && entries.length) {
      const s = budgetStreak(entries);
      if (s.current && !s.recordedToday) out.push({ id: 'streak-' + today, ico: '🔥', bg: '#FFF0E0', t: '연속 기록', m: s.current === 1 ? '🔥 어제 시작한 기록, 오늘 안 적으면 처음부터예요! 딱 1개만 적으면 2일 연속' : `🔥 ${s.current}일 연속 기록, 오늘 자정에 끊겨요! 딱 1개만 적으면 ${s.current + 1}일째`, sub: '돈을 안 썼다면 무지출 도장도 괜찮아요', go: '/budget/', r: '오늘', u: 0 });
    }
    // ⑥ 놓치면 손해: 이번 달 남은 돈 일정 전부 + 알림 받기로 한 일정 (토스 알림처럼 눈에 띄는 말로)
    if (typeof MONEY_CAL !== 'undefined' && typeof mcDays === 'function') {
      const subs = mcSubs(), ym = today.slice(0, 7);
      MONEY_CAL.filter(e => mcDays(e.d) >= 0 && (e.d.startsWith(ym) || (subs.has(mcSubKey(e)) && mcDays(e.d) <= 14))).sort((a, c) => a.d.localeCompare(c.d)).forEach(e => {
        const dn = mcDays(e.d), sub = subs.has(mcSubKey(e)), tagIco = { 세금: '🧾', 쇼핑: '🛍️', 금리: '📈', 연말정산: '💰', 월급: '💵', 지원금: '🎁' }[e.tag] || '⏰';
        out.push({ id: 'mc-' + e.d + e.t, ico: sub ? '🔔' : tagIco, bg: dn === 0 ? '#FFE3E3' : { 세금: '#FFF4D6', 쇼핑: '#FFE6F0', 금리: '#E3F2FD', 연말정산: '#EEE6FA', 지원금: '#E7F8EC' }[e.tag] || 'var(--field)',
          t: `놓치면 손해 · ${e.tag}${sub ? ' · 알림 받는 중' : ''}`, m: mcHook(e, dn), sub: e.t, go: e.go ? e.go[0] : '/budget/', r: e.soft ? '예정' : dn ? `D-${dn}` : 'D-DAY', hot: dn === 0 || (sub && dn <= 3), u: dn + 0.5 });
      });
    }
    // ⑦ 내 일정 알림
    if (typeof planAlarmsDue === 'function') planAlarmsDue().forEach(a => out.push({ id: a.id, ico: '📅', bg: '#EEE6FA', t: '내 일정', m: `⏰ ${a.when}${a.p.allDay === false && a.p.st ? ` ${a.p.st}` : ''} 「${a.p.t}」 잊지 마세요!`, sub: a.p.place ? `📍 ${a.p.place}` : '', go: '/budget/', r: a.when, hot: a.when === '오늘', u: a.when === '오늘' ? 0 : 1 }));
    if (!out.length) out.push({ id: 'hello', ico: '👋', t: '돈셈 알림', m: entries.length ? '지금은 새 알림이 없어요. 결제 예정, 월급날, 예산을 넘을 때 여기서 알려 드려요.' : '가계부에 첫 기록을 남겨 보세요. 주간 지출과 결제 예정 알림을 여기서 보여 드려요.', go: '/budget/' });
    return out.map((x, i) => [x, i]).sort((a, c) => (a[0].u ?? 5) - (c[0].u ?? 5) || a[1] - c[1]).map(a => a[0]); // 급한 것부터
  }
  const seen = () => new Set(read('donsem:noti-seen') || []);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'noti-btn'; btn.setAttribute('aria-label', '알림');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.5 6.5 2 7H4c.5-.5 2-2.5 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><i hidden></i>';
  const theme = right.querySelector('.theme-btn');
  theme ? right.insertBefore(btn, theme) : right.append(btn);
  const dot = btn.querySelector('i');
  const refresh = () => { const s = seen(), n = build().filter(x => !s.has(x.id) && x.id !== 'hello').length; dot.hidden = !n; dot.textContent = n > 9 ? '9+' : n || ''; };
  refresh();
  let panel = null;
  function close() { if (panel) { panel.remove(); panel = null; btn.setAttribute('aria-expanded', 'false'); } }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (panel) return close();
    const list = build(), s = seen();
    panel = document.createElement('div');
    panel.className = 'noti-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '알림');
    panel.innerHTML = `<div class="noti-h"><b>알림</b><small>내 기록으로 만든 알림이에요</small></div>` + list.map(x => `<a class="noti-it${s.has(x.id) ? '' : ' new'}${x.hot ? ' hot' : ''}" href="${x.go}"><span class="noti-ico"${x.bg ? ` style="background:${x.bg}"` : ''}>${x.ico}</span><span class="noti-tx"><b>${x.t}</b><em>${esc2h(x.m)}</em>${x.sub ? `<small>${esc2h(x.sub)}</small>` : ''}${x.more ? `<u>${x.more}</u>` : ''}</span>${x.r ? `<span class="noti-r">${esc2h(x.r)}</span>` : ''}</a>`).join('');
    document.body.append(panel);
    btn.setAttribute('aria-expanded', 'true');
    try { localStorage.setItem('donsem:noti-seen', JSON.stringify([...new Set([...s, ...list.map(x => x.id)])].slice(-200))); } catch (err) { /* 괜찮아요 */ }
    dot.hidden = true;
  });
  document.addEventListener('click', e => { if (panel && !panel.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('donsem:data', refresh); window.addEventListener('donsem:budget', refresh);
})();

// ── 홈: 다음 돈 마감까지 남은 시간 (무신사 '종료까지 8일 08:04:05'처럼 초 단위로 줄어들어요) ──
(() => {
  if (!document.body.classList.contains('home') || typeof MONEY_CAL === 'undefined') return;
  const hero = document.querySelector('.wrap > .hero'); if (!hero) return;
  const isDue = x => /마감|신청|납부|신고|제출|접수/.test(x.t) || ['세금', '연말정산'].includes(x.tag); // 그날 안에 해야 하는 일
  const subs = mcSubs(), near = MONEY_CAL.filter(x => mcDays(x.d) >= 0 && mcDays(x.d) <= 60 && (subs.has(mcSubKey(x)) || ((x.imp || 2) >= 2 && !x.soft))).sort((a, b) => a.d.localeCompare(b.d));
  const e = near.find(x => subs.has(mcSubKey(x))) || near.find(isDue) || near[0]; // 알림 받기로 한 일정 → 놓치면 손해인 마감 순서로
  if (!e) return;
  const due = isDue(e), [y, m, d] = e.d.split('-').map(Number), end = due ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d); // 마감은 그날 끝까지, 발표·행사는 그날 시작까지
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sec = document.createElement('a');
  sec.className = 'cd-home'; sec.href = '/budget/';
  sec.innerHTML = `<span class="cd-tag">${esc(e.tag || '마감')}</span><b class="cd-t">${esc(e.t)}</b><span class="cd-left">${due ? '마감까지' : '그날까지'} <time class="cd-clock" datetime="${e.d}"></time></span><span class="cd-date">${m}월 ${d}일${due ? '까지' : ''} · 캘린더에서 보기 ›</span>`;
  hero.before(sec);
  const bell = document.createElement('button'); bell.type = 'button'; bell.className = 'cd-bell';
  const bellDraw = () => { const on = mcSubs().has(mcSubKey(e)); bell.textContent = on ? '🔔 알림 받는 중' : '🔕 알림 받기'; bell.setAttribute('aria-pressed', String(on)); };
  bell.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); mcSubToggle(e); bellDraw(); });
  bellDraw(); sec.append(bell);
  const clock = sec.querySelector('.cd-clock'), p2 = n => String(n).padStart(2, '0');
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    clock.textContent = `${Math.floor(s / 86400) ? `${Math.floor(s / 86400)}일 ` : ''}${p2(Math.floor(s % 86400 / 3600))}:${p2(Math.floor(s % 3600 / 60))}:${p2(s % 60)}`;
  };
  tick(); setInterval(tick, 1000);
})();

// ── 홈: 셈이가 챙겨 줄게요 (피클 '둘러보기'처럼, 내 기록과 날짜를 보고 해 드릴 만한 일을 먼저 제안해요) ──
(() => {
  const daily = document.getElementById('daily');
  if (!document.body.classList.contains('home') || !daily) return;
  const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const n = new Date(), m = n.getMonth() + 1, ym = `${n.getFullYear()}-${String(m).padStart(2, '0')}`;
  const b = rd('donsem:budget'), es = withFixed(b && Array.isArray(b.entries) ? b.entries : []);
  const used = es.filter(e => e.type === 'out' && e.date.startsWith(ym)).reduce((a, e) => a + e.amt, 0);
  const out = []; // [이모지, 굵은 제목, 설명, 누르면: 질문(q) 또는 주소(href)]
  if (b && b.budget > 0) out.push(['📊', used <= b.budget ? `이번 달 예산이 ${won(b.budget - used)} 남았어요.` : `이번 달 예산을 ${won(used - b.budget)} 넘었어요.`, `예산 ${won(b.budget)} 중 ${Math.round(used / b.budget * 100)}%를 썼어요. 어디에 많이 썼는지 알려 드릴까요?`, { q: '이번 달 어디에 많이 썼어?' }]);
  else if (es.length) out.push(['🧾', `이번 달은 ${won(used)}을 썼어요.`, '지난달 같은 기간과 비교해 드릴까요?', { q: '이번 달 얼마 썼어?' }]);
  const pi = typeof paydayInfo === 'function' ? paydayInfo(b) : null;
  if (pi) out.push(['💸', pi.days ? `월급날까지 ${pi.days}일 남았어요.` : '오늘은 월급날이에요!', `${pi.next.getMonth() + 1}월 ${pi.next.getDate()}일이에요. 들어오면 실수령액이 맞는지 확인해 드릴게요.`, { href: '/salary/' }]);
  const f = rd('donsem:fixed'), fx = f && Array.isArray(f.items) ? f.items.filter(x => +x.amt > 0 && +x.day > 0) : [];
  const soon = fx.map(x => [x, +x.day - n.getDate()]).filter(([, d]) => d >= 0 && d <= 3).sort((a, c) => a[1] - c[1])[0];
  if (soon) out.push(['🔔', `${soon[1] ? `${soon[1]}일 뒤` : '오늘'} ${esc(soon[0].name || soon[0].cat)} ${won(+soon[0].amt)}이 빠져나가요.`, '통장에 돈이 있는지 미리 확인해 두세요.', { href: '/budget/#fixed' }]);
  if (m >= 10 || m <= 1) out.push(['🧮', '연말정산 환급액을 미리 계산해 드릴 수 있어요.', '올해 카드 쓴 돈과 월세만 넣으면, 13월의 월급이 얼마일지 미리 볼 수 있어요.', { href: '/year-end-tax/' }]);
  if (!es.length) out.push(['📒', '이번 달 쓴 돈을 챙겨 드릴 수 있어요.', '캘린더에 한 번만 적어 두면, 예산이 얼마 남았는지 셈이가 먼저 알려 드려요.', { href: '/budget/' }]);
  out.push(['🔍', '아직 안 받은 숨은 돈을 찾아 드릴 수 있어요.', '월세·의료비 환급, 근로장려금처럼 신청만 하면 받는 돈이 있는지 확인해 보세요.', { href: '/hidden-money/' }]);
  const sec = document.createElement('section');
  sec.className = 'semi-card'; sec.setAttribute('aria-label', '셈이가 챙겨 줄게요');
  sec.innerHTML = `<div class="semi-head"><button type="button" class="semi-poke" aria-label="셈이 쓰다듬기"><img class="semi semi-bob" src="/icons/semi-wink.svg" width="58" height="58" alt=""></button><div><b>셈이가 챙겨 줄게요</b><span>내 기록과 오늘 날짜를 보고 골랐어요</span></div></div>
    <ul>${out.slice(0, 3).map(([ico, t, d, go]) => `<li><${go.href ? `a href="${go.href}"` : `button type="button" data-q="${esc(go.q)}"`} class="semi-row"><span class="semi-ico" aria-hidden="true">${ico}</span><span><b>${t}</b><small>${esc(d)}</small></span></${go.href ? 'a' : 'button'}></li>`).join('')}</ul>
    <button type="button" class="semi-ask">셈이에게 물어보기</button>`;
  // 출석체크·미션 줄 바로 아래 (그 줄은 뒤에서 만들어져서 한 박자 늦게 자리를 잡아요)
  daily.before(sec);
  setTimeout(() => { const my = document.querySelector('.home-my'); if (my) my.after(sec); });
  sec.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (q && window.donsemAsk) window.donsemAsk(q.dataset.q);
    if (e.target.closest('.semi-ask') && window.donsemAsk) window.donsemAsk();
    const pk = e.target.closest('.semi-poke'); // 누르면 행복한 표정으로 통 튀어요
    if (pk) { const im = pk.firstChild; im.src = '/icons/semi-happy.svg'; pk.classList.remove('hop'); void pk.offsetWidth; pk.classList.add('hop'); clearTimeout(pk._t); pk._t = setTimeout(() => { im.src = '/icons/semi-wink.svg'; }, 1400); }
  });
})();

// ── 모든 계산기 (휴대폰): 무신사 카테고리처럼 왼쪽에 분류, 오른쪽에 아이콘 격자. 왼쪽을 누르면 그 분류로 내려가요 ──
(() => {
  const list = document.getElementById('calc-list'), q = document.getElementById('calc-q');
  if (!list || !q || typeof MENU === 'undefined') return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let favs = []; try { favs = JSON.parse(localStorage.getItem('donsem:favs')) || []; } catch (e) { favs = []; }
  const nameOf = {}; MENU.forEach(([, items]) => items.forEach(([p, n]) => { nameOf[p] = nameOf[p] || n; }));
  const groups = [...(favs.some(p => nameOf[p]) ? [['즐겨찾기', favs.filter(p => nameOf[p]).map(p => [p, nameOf[p]])]] : []), ...MENU];
  let seen = []; try { seen = (JSON.parse(localStorage.getItem('donsem:recent')) || []).map(r => r.p).slice(0, 6); } catch (e) { seen = []; }
  const item = ([p, n]) => { const ic = iconOf(p); return `<a href="${p}">${ic ? ic.replace('class="ico"', 'class="cb-ico"') : `<span class="cb-ico cb-txt" aria-hidden="true">${esc(n.slice(0, 1))}</span>`}<span>${esc(n)}</span>${seen.includes(p) ? '<em class="cb-seen">최근 본</em>' : ''}</a>`; }; // 네이버 쇼핑 카테고리처럼
  const cb = document.createElement('section');
  cb.className = 'cb'; cb.setAttribute('aria-label', '분류별 계산기');
  cb.innerHTML = `<div class="cb-side" role="tablist">${groups.map(([g], i) => `<button type="button" role="tab" data-i="${i}" class="${i ? '' : 'on'}">${esc(g.replace(/\s*·\s*/g, '·'))}</button>`).join('')}</div>
    <div class="cb-main">${groups.map(([g, items], i) => `<div class="cb-sec" id="cb-${i}"><h2>${esc(g)}</h2><div class="cb-grid">${items.map(item).join('')}</div></div>`).join('')}</div>`;
  list.after(cb);
  document.body.classList.add('cb-on');
  const side = cb.querySelector('.cb-side'), secs = [...cb.querySelectorAll('.cb-sec')];
  const topGap = () => (document.querySelector('.topbar') || { offsetHeight: 0 }).offsetHeight + 8;
  const setTop = () => cb.style.setProperty('--cb-top', topGap() + 'px'); setTop(); addEventListener('resize', setTop);
  const mark = i => side.querySelectorAll('button').forEach(b => { const on = +b.dataset.i === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); if (on) b.scrollIntoView({ block: 'nearest' }); });
  let lock = 0;
  side.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.i; mark(i); lock = Date.now();
    scrollTo({ top: secs[i].getBoundingClientRect().top + scrollY - topGap(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  addEventListener('scroll', () => { // 내리면서 보이는 분류에 왼쪽 불이 따라와요 (누른 직후 미끄러지는 동안은 그대로)
    if (Date.now() - lock < 800 || !cb.offsetParent) return;
    const y = topGap() + 40; let cur = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= y) cur = i; });
    mark(cur);
  }, { passive: true });
  q.addEventListener('input', () => document.body.classList.toggle('cb-search', !!q.value.trim())); // 검색할 때는 원래 목록으로 결과를 보여 줘요
})();

// ── 사업자 정보 (전자상거래법에 따른 표시): 모든 페이지 맨 아래에 붙여요 ──
(() => {
  const ft = document.querySelector('footer');
  if (!ft || ft.querySelector('.biz')) return;
  const d = document.createElement('div');
  d.className = 'biz';
  d.innerHTML = `<p class="biz-links"><a href="/shop/">돈셈 스토어</a> · <a href="/terms/">이용약관</a> · <a href="/refund/">환불정책</a> · <a href="/privacy/"><b>개인정보처리방침</b></a></p>
    <p>상호 돈셈 · 대표 정현진 · 사업자등록번호 589-37-01513 · 통신판매업 신고 제2026-전북순창-54호<br>전북 순창군 순창읍 장류로 422 광명메이루즈 102동 602호<br>대표전화 <a href="tel:010-2277-8530">010-2277-8530</a> · <a href="mailto:hjjung330@gmail.com">hjjung330@gmail.com</a></p>`;
  ft.append(d);
})();


// ── 토스 '전체' 탭처럼 ①: 최근 서비스 — 계산기든 가계부든 열어 본 곳을 기억해 두고, 모든 계산기 맨 위에 아이콘으로 보여 줘요 ──
(() => {
  if (typeof MENU === 'undefined') return;
  const K = 'donsem:svc', here = location.pathname, names = {};
  MENU.forEach(([, items]) => items.forEach(([p, n]) => { const k = String(p).split('#')[0]; names[k] = names[k] || n; }));
  let list = []; try { list = JSON.parse(localStorage.getItem(K)) || []; } catch (e) { list = []; }
  if (names[here] && here !== '/calculators/') { list = [here, ...list.filter(p => p !== here)].slice(0, 8); try { localStorage.setItem(K, JSON.stringify(list)); } catch (e) { /* 괜찮아요 */ } }
  const anchor = document.getElementById('calc-list');
  if (!anchor || here !== '/calculators/') return;
  list = list.filter(p => names[p]);
  if (!list.length) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sec = document.createElement('section');
  sec.className = 'card svc-recent'; sec.setAttribute('aria-label', '최근 서비스');
  sec.innerHTML = `<div class="svc-h"><h2>최근 서비스</h2><button type="button" class="svc-clear">지우기</button></div><div class="svc-grid">${list.map(p => { const ic = typeof iconOf === 'function' ? iconOf(p) : ''; return `<a href="${p}">${ic ? ic.replace('class="ico"', 'class="svc-ico"') : `<span class="svc-ico svc-txt" aria-hidden="true">${esc(names[p].slice(0, 1))}</span>`}<span>${esc(names[p])}</span></a>`; }).join('')}</div>`;
  (anchor.closest('.card') || anchor).after(sec);
  sec.querySelector('.svc-clear').addEventListener('click', () => { try { localStorage.removeItem(K); } catch (e) { /* 괜찮아요 */ } sec.remove(); });
})();

// ── 토스 '가격 오류 제보'처럼: 계산 결과가 이상하면 바로 알려 주기 (입력값과 결과를 메일에 담아요) ──
(() => {
  if (typeof result === 'undefined' || !result || !document.querySelector('.card h1')) return;
  const p = document.createElement('p'); p.className = 'calc-report';
  p.innerHTML = '<button type="button">계산이 이상한가요? 알려 주세요</button>';
  result.after(p);
  p.querySelector('button').addEventListener('click', () => {
    const title = document.querySelector('.card h1').textContent.trim();
    let inputs = ''; try { inputs = decodeURIComponent(readState().toString()).replace(/&/g, '\n'); } catch (e) { inputs = ''; }
    const big = result.querySelector('.big'), body = `계산기: ${title}\n주소: ${location.href.split('?')[0]}\n\n[넣은 값]\n${inputs}\n\n[돈셈 결과]\n${big ? big.textContent.trim() : ''}\n\n[이상한 점 / 맞다고 생각하는 값]\n`;
    location.href = `mailto:hjjung330@gmail.com?subject=${encodeURIComponent(`[돈셈 계산 제보] ${title}`)}&body=${encodeURIComponent(body)}`;
    if (typeof toast === 'function') toast('메일 앱이 열려요. 이상한 점만 적어서 보내 주세요. 확인하고 고칠게요.');
  });
})();

// ── 마이는 오른쪽 위 사람 아이콘으로 (샤넬·토스 쇼핑처럼). 컴퓨터 위쪽 메뉴에는 쇼핑 링크를 더해요 ──
(() => {
  const right = document.querySelector('.topbar .top-right'); if (!right) return;
  const a = document.createElement('a'); a.className = 'my-btn' + (location.pathname === '/my/' ? ' on' : ''); a.href = '/my/'; a.setAttribute('aria-label', '마이');
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  const theme = right.querySelector('.theme-btn'); theme ? theme.before(a) : right.append(a);
  if (location.pathname.startsWith('/shop/')) document.querySelectorAll('.gnav .here, .gnav-chips .here').forEach(b => b.classList.remove('here')); /* 쇼핑 안에서는 '돈 관리'가 켜지지 않게 */
  const g = document.querySelector('.gnav');
})();

// ── 홈: 마이가 위로 올라가도 출석체크·미션은 잘 보이게 ──
(() => {
  const hero = document.querySelector('.home .wrap > .hero'); if (!hero) return;
  const d = document.createElement('div'); d.className = 'home-my';
  d.innerHTML = '<a href="/my/#my-attend"><span aria-hidden="true">✅</span><b>오늘 출석체크</b><i>›</i></a><a href="/my/#my-mission"><span aria-hidden="true">🎯</span><b>이달의 돈 미션</b><i>›</i></a>';
  hero.before(d);
})();

// ── 연말정산 시즌: 모아보기 페이지, 홈 배너, 관련 페이지 연결 ──
(() => {
  const n = new Date(), mon = n.getMonth(), path = location.pathname, $ = id => document.getElementById(id);
  const endY = mon === 0 || mon === 1 ? n.getFullYear() - 1 : n.getFullYear(), end = new Date(endY, 11, 31, 23, 59, 59), days = Math.ceil((end - n) / 864e5);
  const ddayText = days > 0 ? `D-${days}` : days === 0 ? 'D-DAY' : '마감';
  if ($('ye-dday')) {
    $('ye-dday').textContent = ddayText;
    const pay = $('ye-pay'), out = $('ye-out'), go = $('ye-go');
    pay.addEventListener('input', () => {
      const v = Number(pay.value.replace(/[^0-9]/g, '')); pay.value = v ? v.toLocaleString('ko-KR') : '';
      if (!v) { out.textContent = '총급여의 25%를 넘게 쓴 돈부터 공제돼요.'; go.href = '/year-end-tax/'; return; }
      out.innerHTML = `카드를 <b>${Math.round(v * 0.25).toLocaleString('ko-KR')}원</b> 넘게 쓴 돈부터 공제돼요. 넘은 뒤에는 체크카드·현금영수증이 유리해요.`;
      go.href = '/year-end-tax/?ys_pay=' + v;
    });
    let seen = {}; try { seen = JSON.parse(localStorage.getItem('donsem:ye-check')) || {}; } catch (e) { seen = {}; }
    const boxes = [...document.querySelectorAll('[data-ye]')], draw = () => { $('ye-count').textContent = `${boxes.filter(b => b.checked).length} / ${boxes.length}`; };
    boxes.forEach(b => { b.checked = !!seen[b.dataset.ye]; b.addEventListener('change', () => { seen[b.dataset.ye] = b.checked; try { localStorage.setItem('donsem:ye-check', JSON.stringify(seen)); } catch (e) { /* 괜찮아요 */ } draw(); }); });
    draw();
  }
  const inSeason = mon >= 9 || mon <= 1; // 10월~2월에만 보여요
  const home = document.querySelector('.home .wrap > .hero');
  if (home && inSeason) { const a = document.createElement('a'); a.className = 'ye-home'; a.href = '/year-end/'; a.innerHTML = `<span><em aria-hidden="true">YEAR-END 2026</em><b>연말정산, 올해 안에 끝내요</b></span><strong>${ddayText} ›</strong>`; (document.querySelector('.home-my') || home).before(a); }
  if (['/year-end-tax/', '/guide/year-end-basics/', '/guide/year-end-preview/', '/guide/card-deduction/', '/guide/missed-deductions/', '/guide/irp-pension/', '/guide/irp-transfer/', '/pension/'].includes(path)) {
    const f = document.querySelector('.wrap > footer'); if (f) { const a = document.createElement('a'); a.className = 'ye-home'; a.href = '/year-end/'; a.innerHTML = '<span><em aria-hidden="true">YEAR-END 2026</em><b>연말정산 모아보기 · 체크리스트와 일정</b></span><strong>›</strong>'; f.before(a); }
  }
})();

// ── 사용방법: 홈 위쪽 버튼을 누르면 처음 온 사람에게 돈셈 쓰는 법을 한 장씩 보여 줘요 (?how=1 로도 열려요) ──
(() => {
  if (!document.body.classList.contains('home')) return;
  const bar = document.querySelector('.topbar-in'); if (!bar) return;
  const KEY = 'donsem:how-seen', app = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const S = [
    ['궁금한 계산을 골라 주세요', '계산기 메뉴에서 연봉, 대출, 세금 계산기를 찾을 수 있어요.', '/how/1.jpg'],
    ['숫자만 넣으면 바로 계산돼요', '가입도 설치도 필요 없어요. 금액을 바꾸면 결과도 함께 바뀌어요.', '/how/2.jpg'],
    ['캘린더에 쓴 돈을 적어 보세요', '가계부 기록은 이 기기에만 저장되고, 서버로 보내지 않아요.', '/how/3.jpg'],
    ['부동산 정보도 한곳에서 보세요', '부동산 메뉴에서 아파트 실거래가와 서울 재건축·재개발 구역을 볼 수 있어요.', '/how/4.jpg'],
    ['DONSAM 로고를 누르면 홈으로 가요', '어느 화면에 있어도 왼쪽 위 로고만 누르면 홈으로 돌아와요.', '/how/5.jpg', 1],
    ['궁금하면 셈이에게 물어보세요', '오른쪽 위 보라색 셈이를 누르면 세금·금융 상식과 이번 달 쓴 돈까지 찾아 알려 드려요.', '/how/6.jpg'],
  ];
  S.push([app ? '다른 폰에도 이렇게 넣을 수 있어요' : '홈 화면에 넣으면 앱처럼 쓸 수 있어요', '', 'install']); // 앱으로 연 사람에게도 보여 줘요 (가족·친구 폰에 넣어 줄 때)
  const ua = navigator.userAgent; let os = /android/i.test(ua) ? 'and' : /CriOS/.test(ua) ? 'iosc' : 'ios'; // 아이폰·안드로이드에 맞는 방법을 먼저 보여 줘요 (컴퓨터는 아이폰부터)
  const INS = {
    ios: ['Safari 아래쪽 공유 버튼을 누르고 「홈 화면에 추가」 → 오른쪽 위 「추가」를 누르면 끝이에요. 공유 버튼이 안 보이면 주소창 옆 ⋯ 안에 있어요.',
      `<div class="hi-page"><b>DONSAM</b><i></i><i></i><i class="s"></i></div>
      <div class="hi-sheet"><p class="hi-cap"><em>2</em>「홈 화면에 추가」 누르기</p><ul><li>복사</li><li>즐겨찾기 추가</li><li class="on">홈 화면에 추가<span>＋</span></li><li>읽기 목록에 추가</li></ul><p class="hi-cap"><em>3</em>오른쪽 위 「추가」 누르면 끝</p></div>
      <div class="hi-bar"><span>‹</span><span>›</span><span class="on" aria-label="공유"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg><em>1</em></span><span>▢</span><span>⧉</span></div>`],
    iosc: ['주소창 오른쪽 공유 버튼을 누르고 「홈 화면에 추가」 → 오른쪽 위 「추가」를 누르면 끝이에요.',
      `<div class="hi-top"><span class="url">doncalculator.com</span><span class="on" aria-label="공유"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg><em>1</em></span></div>
      <div class="hi-page low"><b>DONSAM</b><i></i><i class="s"></i></div>
      <div class="hi-sheet low"><p class="hi-cap"><em>2</em>「홈 화면에 추가」 누르기</p><ul><li>링크 복사</li><li>읽기 목록에 추가</li><li class="on">홈 화면에 추가<span>＋</span></li></ul><p class="hi-cap"><em>3</em>오른쪽 위 「추가」 누르면 끝</p></div>`],
    and: ['크롬 오른쪽 위 ⋮ 메뉴를 누르고 「홈 화면에 추가」(또는 「앱 설치」)를 누른 뒤 「설치」를 누르면 끝이에요.',
      `<div class="hi-top"><span class="url">doncalculator.com</span><span class="on">⋮<em>1</em></span></div>
      <div class="hi-menu"><ul><li>새 탭</li><li>방문 기록</li><li>북마크</li><li class="on">홈 화면에 추가<em>2</em></li><li>설정</li></ul></div>
      <div class="hi-page low"><b>DONSAM</b><i></i><i></i><i class="s"></i></div><p class="hi-cap bottom"><em>3</em>「설치」 누르면 끝</p>`],
  };
  let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) { /* 괜찮아요 */ }
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'how-pill' + (seen ? '' : ' fresh'); pill.innerHTML = '사용방법 <i aria-hidden="true">›</i>';
  const place = () => { const row = document.querySelector('.home-my'), small = innerWidth < 375 && row; pill.classList.toggle('row', !!small); if (small) row.before(pill); else bar.querySelector('.brand').after(pill); }; // 좁은 폰은 위쪽 아이콘이 잘리지 않게 아래 줄로
  place(); addEventListener('resize', place);
  let box = null, at = 0, x0 = null;
  const draw = () => {
    const [h, p, img, ring] = S[at], last = at === S.length - 1;
    box.querySelector('.how-dots').innerHTML = S.map((_, i) => `<i class="${i <= at ? 'on' : ''}"></i>`).join('');
    box.querySelector('.how-dots').setAttribute('aria-label', `${S.length}장 중 ${at + 1}번째`);
    box.querySelector('h2').textContent = h; box.querySelector('.how-p').textContent = img === 'install' ? (app ? '지금은 이미 홈 화면 앱으로 쓰고 있어요. 가족이나 친구 폰에는 이렇게 넣어 주세요. ' : '') + INS[os][0] : p;
    const osb = box.querySelector('.how-os'); osb.hidden = img !== 'install'; osb.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.os === os));
    box.querySelector('.how-phone').innerHTML = img === 'install' ? `<div class="how-ins ${os}">${INS[os][1]}</div>` : img ? `<img src="${img}" alt="${h} 화면 예시">${ring ? '<i class="how-ring" aria-hidden="true"></i>' : ''}` : '<div class="how-home"><img src="/icon-192.png" alt=""><span>돈셈</span></div>';
    const prev = box.querySelector('[data-how="prev"]'); prev.hidden = !at;
    box.querySelector('[data-how="next"]').textContent = last ? '시작하기' : '다음';
  };
  const go = d => { const n = at + d; if (n < 0) return; if (n >= S.length) return close(); at = n; draw(); };
  const open = push => {
    if (!box) {
      box = document.createElement('div'); box.className = 'how-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '돈셈 사용방법');
      box.innerHTML = '<div class="how-panel"><header><button type="button" data-how="x" aria-label="닫기">×</button><b>돈셈 사용방법</b></header><div class="how-dots"></div><h2></h2><p class="how-p"></p><div class="how-os" hidden><button type="button" data-os="ios">아이폰 Safari</button><button type="button" data-os="iosc">아이폰 크롬</button><button type="button" data-os="and">안드로이드</button></div><div class="how-phone"></div><div class="how-nav"><button type="button" class="btn line" data-how="prev">이전</button><button type="button" class="btn fill" data-how="next">다음</button></div></div>';
      document.body.append(box);
      box.addEventListener('click', e => { if (e.target === box) return close(); const o = e.target.closest('[data-os]'); if (o) { os = o.dataset.os; return draw(); } const b = e.target.closest('[data-how]'); if (!b) return; const k = b.dataset.how; if (k === 'x') close(); else go(k === 'next' ? 1 : -1); });
      box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', e => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 60) { if (d < 0 && at < S.length - 1) go(1); else if (d > 0) go(-1); } }, { passive: true });
    }
    at = 0; draw(); box.hidden = false; document.documentElement.classList.add('how-open'); box.querySelector('[data-how="next"]').focus({ preventScroll: true });
    pill.classList.remove('fresh'); try { localStorage.setItem(KEY, '1'); } catch (e) { /* 괜찮아요 */ }
    if (push) try { history.pushState({ how: 1 }, ''); } catch (e) { /* 괜찮아요 */ }
  };
  function close(fromPop) {
    if (!box || box.hidden) return;
    box.hidden = true; document.documentElement.classList.remove('how-open'); pill.focus({ preventScroll: true });
    if (fromPop !== true) try { if (history.state && history.state.how) history.back(); } catch (e) { /* 괜찮아요 */ }
  }
  pill.addEventListener('click', () => open(true));
  addEventListener('popstate', () => close(true));
  addEventListener('keydown', e => { if (!box || box.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && at < S.length - 1) go(1); if (e.key === 'ArrowLeft') go(-1); });
  if (new URLSearchParams(location.search).has('how')) open(false);
})();

// ── 업데이트 소식 (머니차곡처럼): 새로 바뀐 점을 처음 한 번, 한 장씩 넘겨 보여 줘요. 주소 끝에 ?news 를 붙이면 다시 볼 수 있어요 ──
(() => {
  const V = '2026-11-13', KEY = 'donsem:news', LABEL = '11월 업데이트';
  const badge = (bg, ch, fg = '#fff') => `<span class="nw-logo" style="background:${bg};color:${fg}">${ch}</span>`;
  const S = [
    { h: '대충 써도 알아서 정리해요', p: '「애플뮤직 8900」처럼만 쓰면<br>앱 아이콘과 「지출 · 구독」이 저절로 붙어요.', cap: '애플뮤직 8900', rows: [[`<img class="nw-logo pic" src="/icons/brand/applemusic.jpg" alt="">애플뮤직`, '8,900원'], ['분류', '지출 · 구독'], ['알아듣는 브랜드', '<em>162곳</em>']], go: () => window.openQuickAdd && window.openQuickAdd() },
    { h: '날짜도 카테고리도 바로 골라요', p: '오늘 · 어제 · 그저께를 한 번에 누르고,<br>큰 아이콘으로 카테고리를 골라요. 고른 건 기억해요.', cap: '기록 창', rows: [['날짜', '오늘 · 어제 · 그저께'], ['카테고리', '큰 아이콘 11개'], ['한 번 고르면', '<em>다음부터 기억</em>']], go: () => window.openQuickAdd && window.openQuickAdd() },
    { h: '여러 건도, 더치페이도 한 줄로', p: '줄을 바꿔 쓰면 한 번에 여러 건,<br>「더치 4」 「12개월 할부」도 알아서 나눠요.', cap: '7/1 점심 12000 · 커피 4500', rows: [['점심 (7월 1일)', '12,000원'], ['회식 100000 더치 4', '25,000원'], ['노트북 12개월 할부', '<em>매달 나눠 기록</em>']], go: () => window.openQuickAdd && window.openQuickAdd() },
    { h: '지도에서 백화점·공원을 눌러 보세요', p: '부동산 지도에서 큰 장소를 누르면 카드가 떠요.<br>전화 · 길찾기 · 공유, 사진과 후기는 카카오맵으로.', cap: '부동산 지도', rows: [['서울숲', '공원'], ['갤러리아백화점', '백화점'], ['사진 · 후기 · 영업시간', '<em>카카오맵 보기</em>']], go: () => { location.href = '/real-estate/'; } },
  ];
  let box = null, at = 0;
  const seen = () => { try { return localStorage.getItem(KEY) === V; } catch (e) { return true; } };
  const mark = () => { try { localStorage.setItem(KEY, V); } catch (e) { /* 괜찮아요 */ } };
  function draw() {
    const s = S[at], last = at === S.length - 1;
    box.querySelector('.nw-top b').textContent = `${LABEL} · ${at + 1}/${S.length}`;
    box.querySelector('.nw-body').innerHTML = `<div class="nw-demo"><p>${s.cap}</p>${s.rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div><h3>${s.h}</h3><p class="nw-p">${s.p}</p>`;
    box.querySelector('.nw-dots').innerHTML = S.map((x, i) => `<i class="${i === at ? 'on' : ''}"></i>`).join('');
    box.querySelector('.nw-next').textContent = last ? '확인' : '다음';
  }
  function close() { if (!box) return; mark(); box.classList.remove('show'); document.documentElement.classList.remove('nw-open'); setTimeout(() => { box.hidden = true; }, 300); }
  function open() {
    if (!box) {
      box = document.createElement('div');
      box.className = 'nw'; box.hidden = true;
      box.innerHTML = `<div class="nw-dim" data-x="1"></div><div class="nw-panel" role="dialog" aria-modal="true" aria-label="업데이트 소식"><div class="nw-grip"></div>
        <div class="nw-top"><b></b><button type="button" data-x="1">건너뛰기</button></div><div class="nw-body"></div><div class="nw-dots"></div>
        <div class="nw-btns"><button type="button" class="nw-try">써보기</button><button type="button" class="nw-next">다음</button></div></div>`;
      document.body.append(box);
      box.addEventListener('click', e => {
        const t = e.target.closest('[data-x], .nw-try, .nw-next'); if (!t) return;
        if (t.dataset.x) return close();
        if (t.classList.contains('nw-try')) { const go = S[at].go; close(); setTimeout(go, 320); return; }
        if (at < S.length - 1) { at++; draw(); } else close();
      });
      let sx = 0; // 옆으로 밀어서 넘기기
      box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) < 50) return; if (dx < 0 && at < S.length - 1) at++; else if (dx > 0 && at > 0) at--; else return; draw(); });
      addEventListener('keydown', e => { if (!box || box.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && at < S.length - 1) { at++; draw(); } if (e.key === 'ArrowLeft' && at > 0) { at--; draw(); } });
    }
    at = 0; draw(); box.hidden = false; box.offsetHeight; box.classList.add('show'); document.documentElement.classList.add('nw-open');
  }
  window.openNews = open;
  if (new URLSearchParams(location.search).has('news')) { setTimeout(open, 300); return; }
  if (seen() || /^\/(shop\/pay|how|terms|refund|privacy)\//.test(location.pathname) || new URLSearchParams(location.search).has('how')) return;
  // 처음 온 사람에게는 '업데이트'가 어색해서 보여 주지 않고, 본 걸로 적어 둬요
  let old = false; try { old = Object.keys(localStorage).some(k => k.startsWith('donsem:') && k !== KEY && k !== 'donsem:theme'); } catch (e) { /* 괜찮아요 */ }
  if (!old) { mark(); return; }
  setTimeout(() => { const r = document.documentElement.classList; if (r.contains('qa-open') || r.contains('gnav-open') || r.contains('ai-open') || document.querySelector('.how-modal:not([hidden]), dialog[open]')) return; open(); }, 1200);
})();

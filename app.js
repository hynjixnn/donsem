const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
const val = k => num(document.querySelector(`input[data-k="${k}"]`).value);
const seg = k => document.querySelector(`.seg[data-k="${k}"] .on`).dataset.v;
const rows = list => '<div class="rows">' + list.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + '</div>';

function savings() {
  const P = val('s_amt'), n = Math.floor(val('s_n')), r = val('s_r') / 100, tax = num(seg('s_tax')) / 100;
  const principal = P * n;
  let interest;
  if (seg('s_type') === 'simple') interest = P * (r / 12) * n * (n + 1) / 2;
  else { interest = 0; for (let k = 1; k <= n; k++) interest += P * (Math.pow(1 + r / 12, k) - 1); }
  const t = Math.floor(interest * tax / 10) * 10;
  document.getElementById('s_out').innerHTML =
    `<div>만기 수령액 (세후)</div><div class="big">${won(principal + interest - t)}</div>` +
    rows([['원금 합계', won(principal)], ['세전 이자', won(interest)], ['이자 과세', '-' + won(t)], ['세후 이자', won(interest - t)]]);
}

function deposit() {
  const A = val('d_amt'), n = Math.floor(val('d_n')), r = val('d_r') / 100, tax = num(seg('d_tax')) / 100;
  const interest = seg('d_type') === 'simple' ? A * r * n / 12 : A * (Math.pow(1 + r / 12, n) - 1);
  const t = Math.floor(interest * tax / 10) * 10;
  document.getElementById('d_out').innerHTML =
    `<div>만기 수령액 (세후)</div><div class="big">${won(A + interest - t)}</div>` +
    rows([['원금', won(A)], ['세전 이자', won(interest)], ['이자 과세', '-' + won(t)], ['세후 이자', won(interest - t)]]);
}

function loan() {
  const L = val('l_amt'), n = Math.max(1, Math.floor(val('l_n'))), i = val('l_r') / 100 / 12, type = seg('l_type');
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
  const init = val('c_init'), add = val('c_add'), r = val('c_r') / 100, y = Math.floor(val('c_y'));
  const mr = Math.pow(1 + r, 1 / 12) - 1;
  let v = init, paid = init, tr = '';
  for (let yr = 1; yr <= y; yr++) {
    for (let m = 0; m < 12; m++) { v = v * (1 + mr) + add; paid += add; }
    tr += `<tr><td>${yr}년</td><td>${won(paid)}</td><td>${won(v - paid)}</td><td>${won(v)}</td></tr>`;
  }
  document.getElementById('c_out').innerHTML =
    `<div>${y}년 후 예상 자산</div><div class="big">${won(v)}</div>` +
    rows([['내가 넣은 돈', won(paid)], ['불어난 수익', won(v - paid)], ['수익률', paid ? ((v / paid - 1) * 100).toFixed(1) + '%' : '-']]) +
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
  const A = val('i_amt'), i = val('i_rate') / 100, y = Math.floor(val('i_y'));
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
function takeHome(month, free, fam, kids) {
  const pay = Math.max(0, month - free); // 세금·보험료는 비과세를 뺀 돈에만 붙어요
  const pension = pay > 0 ? floor10(Math.min(Math.max(Math.floor(pay / 1000) * 1000, INS_2026.penMin), INS_2026.penMax) * INS_2026.pension) : 0;
  const health = floor10(pay * INS_2026.health), care = floor10(health * INS_2026.care), job = floor10(pay * INS_2026.job);
  const kidCut = kids <= 0 ? 0 : kids === 1 ? 20830 : 45830 + (kids - 2) * 33330;
  const tax = Math.max(0, floor10(tableTax(pay, fam) - kidCut)), local = floor10(tax * 0.1);
  const cut = pension + health + care + job + tax + local;
  return { pension, health, care, job, tax, local, cut, net: month - cut };
}
// 입력값을 한 번에 읽어요 (계산, 한 줄 정리, 다음 추천이 같이 써요)
function salaryInput() {
  const A = val('m_amt'), byYear = seg('m_mode') === 'year', sev = byYear && seg('m_sev') === 'in';
  const month = Math.floor(byYear ? A / (sev ? 13 : 12) : A);
  const kids = Math.max(0, Math.round(val('m_kids'))), famIn = Math.max(1, Math.round(val('m_fam')));
  return { month, sev, kids, famIn, fam: Math.max(famIn, kids + 1), free: Math.min(val('m_free'), month) };
}
function salary() {
  const out = document.getElementById('m_out'), s = salaryInput();
  if (!s.month) { out.innerHTML = '금액을 넣어 주세요.'; return; }
  const r = takeHome(s.month, s.free, s.fam, s.kids), note = [];
  if (s.sev) note.push('퇴직금 포함 연봉이라 13으로 나눠 한 달 월급을 계산했어요.');
  if (s.fam > s.famIn) note.push(`자녀도 부양가족에 들어가서 부양가족을 ${s.fam}명으로 계산했어요.`);
  out.innerHTML = `<div>한 달 실수령액</div><div class="big">${won(r.net)}</div>` +
    rows([['세전 월급', won(s.month)], ['국민연금 (4.75%)', '-' + won(r.pension)], ['건강보험 (3.595%)', '-' + won(r.health)], ['장기요양보험', '-' + won(r.care)],
      ['고용보험 (0.9%)', '-' + won(r.job)], ['근로소득세', '-' + won(r.tax)], ['지방소득세', '-' + won(r.local)], ['빠지는 돈 합계', '-' + won(r.cut)], ['1년 실수령액', won(r.net * 12)]]) +
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
const calc = { s_out: savings, d_out: deposit, l_out: loan, c_out: compound, v_out: severance, r_out: rent, x_out: vat, h_out: holidayPay, p_out: prepayment, i_out: inflation, o_out: discount, w_out: wage, g_out: goal, y_out: pyeong, q_out: percent, a_out: avgPrice, b_out: dividend, t_out: retirement, k_out: carLoan, f_out: refinance, u_out: unitPrice, e_out: fuel, n_out: dutchPay, z_out: dateCalc, m_out: salary, j_out: unemployment, ys_out: yearEnd };
// ── 한 줄 정리: 결과 숫자가 "나한테 무슨 뜻인지" 알려 주는 문장 ──
const pct = (n, d = 1) => n.toLocaleString('ko-KR', { maximumFractionDigits: d }) + '%';
const MIN_WAGE_2026 = 10320; // 2026년 최저시급
const insights = {
  s_out() {
    const P = val('s_amt'), n = Math.floor(val('s_n')), r = val('s_r'), tax = num(seg('s_tax')) / 100;
    if (!P || !n || !r) return '';
    const net = P * (r / 1200) * n * (n + 1) / 2 * (1 - tax);
    return `연 ${pct(r, 2)} 적금이지만, 넣은 돈 대비 실제로 받는 이자는 ${pct(net / (P * n) * 100, 2)}예요. 매달 나눠 넣어서 늦게 넣은 돈은 이자를 덜 받기 때문이에요.`;
  },
  d_out() {
    const A = val('d_amt'), n = Math.floor(val('d_n')), r = val('d_r') / 100, tax = num(seg('d_tax')) / 100;
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
    const r = takeHome(s.month, s.free, s.fam, s.kids), raise = takeHome(s.month + Math.round(10000000 / (s.sev ? 13 : 12)), s.free, s.fam, s.kids);
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
  if (e.target.tagName !== 'BUTTON') return;
  g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
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
function budgetStreak(entries) {
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const days = new Set((entries || []).map(e => e.date)), d = new Date();
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

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}
async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); }
  catch (e) { const a = document.createElement('textarea'); a.value = url; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  toast('링크를 복사했어요. 카톡이나 문자에 붙여 넣으세요.');
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

// ── 토스처럼 편하게 ⑤: 결과 숫자가 부드럽게 바뀌기 ──
const calmMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastBig = null, bigAnim = 0;
function animateBig() {
  const big = document.querySelector('.card .result .big');
  if (!big) { lastBig = null; return; }
  const node = big.firstChild;
  const m = node && node.nodeType === 3 && node.textContent.match(/[\d,]+(\.\d+)?/);
  if (!m) { lastBig = null; return; }
  big.dataset.final = node.textContent; // 숫자가 움직이는 동안에도 저장·추천은 최종 숫자를 읽게
  const to = Number(m[0].replace(/,/g, '')), dec = m[1] ? m[1].length - 1 : 0, from = lastBig;
  lastBig = to;
  cancelAnimationFrame(bigAnim);
  if (calmMotion || from === null || from === to || !ready) return;
  const start = performance.now(), before = node.textContent.slice(0, m.index), after = node.textContent.slice(m.index + m[0].length);
  const step = now => {
    const k = Math.min(1, (now - start) / 350), ease = 1 - Math.pow(1 - k, 3), v = from + (to - from) * ease;
    if (!node.isConnected) return;
    node.textContent = before + v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + after;
    if (k < 1) bigAnim = requestAnimationFrame(step);
  };
  bigAnim = requestAnimationFrame(step);
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
  bar.innerHTML = '<button type="button" class="btn fill" data-act="share">결과 공유하기</button><button type="button" class="btn line" data-act="copy">링크 복사</button>';
  result.after(bar);
  bar.addEventListener('click', async e => {
    const act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    const url = `${location.origin}${location.pathname}?${readState()}`;
    const head = result.querySelector('div') ? result.querySelector('div').textContent.trim() : '';
    const big = result.querySelector('.big') ? result.querySelector('.big').textContent.trim() : '';
    const name = document.querySelector('.card h1').textContent.trim();
    if (act === 'share' && navigator.share) {
      try { await navigator.share({ title: `${name} - 돈셈`, text: `[돈셈 ${name}] ${head} ${big}`, url }); } catch (err) { /* 공유 창을 닫은 경우 */ }
    } else copyLink(url);
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
    document.querySelector('.hero').after(sec);
  }
}

// ── 앱처럼 쓰기: 홈 화면에 추가하면 주소창 없이 열리고, 인터넷이 끊겨도 열려요 ──
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* 지원하지 않는 환경 */ }));
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
if (isIOS && !standalone) installCard('<div class="install-text"><b>돈셈을 앱처럼 쓰세요</b><span><b>공유 버튼</b>(네모에 화살표)을 누르고 <b>홈 화면에 추가</b>를 고르세요. 공유 버튼이 안 보이면 주소창의 <b>≡</b> 또는 <b>⋯</b> 메뉴 안에 있어요.</span></div>');
window.addEventListener('appinstalled', () => { const el = document.querySelector('.install'); if (el) el.remove(); });


// ── 화면 모드 버튼: 라이트 → 다크 → 기기 설정 따라가기 ──
const THEME_KEY = 'donsem:theme';
const THEME_ICON = {
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>',
};
const THEME_NAME = { light: '라이트', dark: '다크', auto: '기기 설정 따라가기' };
function applyTheme(t, announce) {
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#000000' : '#ffffff';
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

// ── 휴대폰 하단 탭: 홈 · 계산기 · ＋기록 · 돈 관리 · 마이 ──
(() => {
  const path = location.pathname;
  const MONEY = ['/budget/', '/fixed/', '/assets/', '/goals/'], MY = ['/my/', '/about/', '/privacy/'];
  const active = path === '/' ? 'home' : MONEY.includes(path) ? 'money' : MY.includes(path) ? 'my' : 'calc';
  const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const tabs = [
    ['home', '/', '홈', ic('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')],
    ['calc', '/calculators/', '계산기', ic('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>')],
    ['add', '', '기록', ic('<path d="M12 6v12M6 12h12"/>')],
    ['money', '/budget/', '돈 관리', ic('<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 12h.01M4 9h16"/>')],
    ['my', '/my/', '마이', ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')],
  ];
  const bar = document.createElement('div'); // <nav>는 계산기 메뉴용 스타일이 붙어 있어서 div로
  bar.className = 'tabbar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', '아래 메뉴');
  bar.innerHTML = tabs.map(([id, href, label, svg]) => id === 'add'
    ? `<button type="button" class="tab-add" aria-label="지출이나 수입 바로 기록하기"><span>${svg}</span>${label}</button>`
    : `<a href="${href}" class="${id === active ? 'on' : ''}"${id === active ? ' aria-current="page"' : ''}>${svg}${label}</a>`).join('');
  document.body.append(bar);
  document.body.classList.add('has-tabbar');

  // ── ＋기록: 어느 페이지에서든 가계부에 바로 적기 ──
  const CATS = { out: ['식비', '카페·간식', '교통', '쇼핑', '생활', '주거·통신', '의료', '문화·여가', '경조사', '기타'], in: ['월급', '용돈', '부수입', '이자·배당', '기타'] };
  let type = 'out', cat = CATS.out[0], sheet = null;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function drawCats() {
    sheet.querySelector('.qa-cats').innerHTML = CATS[type].map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('');
  }
  function open() {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'qa';
      sheet.innerHTML = `<div class="qa-dim" data-close="1"></div>
        <div class="qa-panel" role="dialog" aria-modal="true" aria-labelledby="qa-title">
          <div class="qa-grip"></div>
          <div class="qa-head"><b id="qa-title">바로 기록하기</b><button type="button" class="qa-x" data-close="1" aria-label="닫기">×</button></div>
          <div class="seg qa-type"><button type="button" data-v="out" class="on">지출</button><button type="button" data-v="in">수입</button></div>
          <div class="field qa-amt"><input inputmode="numeric" placeholder="0" aria-label="금액" autocomplete="off"><span>원</span></div>
          <p class="qa-kr"></p>
          <div class="chips qa-cats"></div>
          <div class="field memo"><input class="qa-memo" type="text" maxlength="40" placeholder="메모 (선택)" aria-label="메모" autocomplete="off"></div>
          <p class="err qa-err" role="alert"></p>
          <button type="button" class="btn fill wide qa-save">지출 기록하기</button>
          <a class="qa-link" href="/budget/">가계부에서 전체 보기 ›</a>
        </div>`;
      document.body.append(sheet);
      const amt = sheet.querySelector('.qa-amt input');
      amt.addEventListener('input', () => {
        const d = amt.value.replace(/[^0-9]/g, '');
        amt.value = d ? Number(d).toLocaleString('ko-KR') : '';
        sheet.querySelector('.qa-kr').textContent = korean(num(amt.value));
        sheet.querySelector('.qa-err').textContent = '';
      });
      sheet.addEventListener('click', e => {
        const t = e.target;
        if (t.dataset.close) close();
        else if (t.dataset.v) { type = t.dataset.v; cat = CATS[type][0]; drawCats(); sheet.querySelector('.qa-save').textContent = type === 'out' ? '지출 기록하기' : '수입 기록하기'; }
        else if (t.dataset.cat) { cat = t.dataset.cat; drawCats(); }
      });
      sheet.querySelector('.qa-save').addEventListener('click', save);
      sheet.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } });
      drawCats();
    }
    sheet.classList.add('show');
    document.documentElement.classList.add('qa-open');
    setTimeout(() => sheet.querySelector('.qa-amt input').focus(), 60);
  }
  function close() {
    if (!sheet) return;
    sheet.classList.remove('show');
    document.documentElement.classList.remove('qa-open');
  }
  function save() {
    const amtEl = sheet.querySelector('.qa-amt input'), amt = num(amtEl.value);
    if (!amt) { sheet.querySelector('.qa-err').textContent = '금액을 넣어 주세요.'; amtEl.focus(); return; }
    let b;
    try { b = JSON.parse(localStorage.getItem('donsem:budget')); } catch (e) { b = null; }
    if (!b || !Array.isArray(b.entries)) b = { entries: [], budget: (b && b.budget) || 0 };
    const before = budgetStreak(b.entries);
    b.entries.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, amt, cat, date: today(), memo: sheet.querySelector('.qa-memo').value.trim().slice(0, 40) });
    try { localStorage.setItem('donsem:budget', JSON.stringify(b)); }
    catch (e) { sheet.querySelector('.qa-err').textContent = '이 브라우저에서는 저장할 수 없어요.'; return; }
    amtEl.value = ''; sheet.querySelector('.qa-memo').value = ''; sheet.querySelector('.qa-kr').textContent = '';
    close();
    toast(streakCheer(before, b.entries) || `${cat} ${won(amt)}을 가계부에 기록했어요.`);
    if (path === '/budget/') setTimeout(() => location.reload(), 1200); // 가계부를 보고 있었다면 바로 반영
  }
  bar.querySelector('.tab-add').addEventListener('click', open);
})();

// ── 홈 대시보드: 가계부·고정지출·내 자산·목표 기록이 있는 사람에게 첫 화면 맨 위에서 한눈에 ──
(() => {
  if (!document.body.classList.contains('home')) return;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const budget = read('donsem:budget'), fixed = read('donsem:fixed'), assets = read('donsem:assets'), goals = read('donsem:goals');
  const has = {
    budget: !!(budget && ((budget.entries || []).length || budget.budget)),
    fixed: !!(fixed && (fixed.items || []).length),
    assets: !!(assets && (assets.items || []).length),
    goals: !!(goals && (goals.goals || []).length),
  };
  if (!Object.values(has).some(Boolean)) return; // 처음 온 사람에게는 원래 첫 화면 그대로

  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const month = iso(today).slice(0, 7), W = '일월화수목금토';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bar = (ratio, over) => `<div class="bar${over ? ' over' : ''}"><i style="width:${Math.max(0, Math.min(100, ratio * 100))}%"></i></div>`;
  const cards = [];

  if (has.budget) {
    const list = (budget.entries || []).filter(e => String(e.date).startsWith(month));
    const out = list.filter(e => e.type === 'out').reduce((s, e) => s + Number(e.amt || 0), 0);
    const todayOut = list.filter(e => e.type === 'out' && e.date === iso(today)).reduce((s, e) => s + Number(e.amt || 0), 0);
    let extra = `<p class="dash-sub">오늘 쓴 돈 ${won(todayOut)}</p>`;
    if (budget.budget) {
      const left = budget.budget - out, daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
      extra = bar(out / budget.budget, left < 0) + `<p class="dash-sub">${left < 0 ? `예산을 ${won(-left)} 넘었어요` : `예산 ${Math.round(out / budget.budget * 100)}% 사용 · 하루 ${won(left / daysLeft)}씩 쓸 수 있어요`}</p>`;
    }
    const st = budgetStreak(budget.entries);
    if (st.current) extra += `<p class="dash-sub streak-line">🔥 ${st.current}일 연속 기록 중${st.recordedToday ? '' : ' · 오늘도 기록해 주세요'}</p>`;
    cards.push(`<a class="dash-card" href="/budget/"><span class="dash-label">이번 달 지출</span><b class="dash-big">${won(out)}</b>${extra}</a>`);
  }

  if (has.fixed) {
    const dayIn = (y, m, d) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()));
    const next = x => {
      if (x.cycle === 'year') { let d = dayIn(today.getFullYear(), x.month - 1, x.day); if (d < today) d = dayIn(today.getFullYear() + 1, x.month - 1, x.day); return d; }
      let d = dayIn(today.getFullYear(), today.getMonth(), x.day); if (d < today) d = dayIn(today.getFullYear(), today.getMonth() + 1, x.day); return d;
    };
    const up = fixed.items.map(x => ({ x, d: next(x) })).sort((a, b) => a.d - b.d)[0];
    const n = Math.round((up.d - today) / 86400000);
    const leftThisMonth = fixed.items.filter(x => x.cycle !== 'year' || x.month - 1 === today.getMonth())
      .filter(x => dayIn(today.getFullYear(), today.getMonth(), x.day) >= today).reduce((s, x) => s + x.amt, 0);
    cards.push(`<a class="dash-card" href="/fixed/"><span class="dash-label">다음 결제</span><b class="dash-big"><span class="dday${n <= 3 ? ' soon' : ''}">${n === 0 ? '오늘' : 'D-' + n}</span> ${esc(up.x.name)}</b>
      <p class="dash-sub">${up.d.getMonth() + 1}월 ${up.d.getDate()}일 (${W[up.d.getDay()]}) · ${won(up.x.amt)}</p><p class="dash-sub">이번 달 남은 고정지출 ${won(leftThisMonth)}</p></a>`);
  }

  if (has.assets) {
    const a = assets.items.filter(x => x.kind === 'asset').reduce((s, x) => s + x.amt, 0), d = assets.items.filter(x => x.kind === 'debt').reduce((s, x) => s + x.amt, 0);
    const prevKey = Object.keys(assets.history || {}).filter(m => m < month).sort().pop();
    let sub = '<p class="dash-sub">매달 잔액을 고치면 변화가 쌓여요</p>';
    if (prevKey) { const p = assets.history[prevKey], diff = (a - d) - (p.a - p.d); sub = `<p class="dash-sub ${diff >= 0 ? 'up' : 'down'}">${Number(prevKey.slice(5))}월보다 ${diff >= 0 ? '▲' : '▼'} ${won(Math.abs(diff))}</p>`; }
    cards.push(`<a class="dash-card" href="/assets/"><span class="dash-label">순자산</span><b class="dash-big${a - d < 0 ? ' minus' : ''}">${a - d < 0 ? '-' : ''}${won(Math.abs(a - d))}</b>${sub}</a>`);
  }

  if (has.goals) {
    const assetAmt = id => { const it = assets && (assets.items || []).find(x => x.id === id); return it ? it.amt : 0; };
    const rows = goals.goals.slice(0, 2).map(g => {
      const saved = g.mode === 'assets' ? (g.assetIds || []).reduce((s, id) => s + assetAmt(id), 0) : (g.saved || 0), r = saved / g.target;
      return `<div class="dash-goal"><div class="cat-top"><span>${esc(g.name)}</span><span>${Math.min(100, Math.floor(r * 100))}%</span></div>${bar(r)}</div>`;
    }).join('');
    cards.push(`<a class="dash-card" href="/goals/"><span class="dash-label">목표${goals.goals.length > 2 ? ` · ${goals.goals.length}개 중 2개` : ''}</span>${rows}</a>`);
  }

  const missing = [['budget', '/budget/', '가계부'], ['fixed', '/fixed/', '고정지출'], ['assets', '/assets/', '내 자산'], ['goals', '/goals/', '목표 저축']].filter(([k]) => !has[k]);
  const sec = document.createElement('section');
  sec.className = 'dash';
  sec.innerHTML = `<div class="dash-head"><div><span class="dash-date">${today.getMonth() + 1}월 ${today.getDate()}일 (${W[today.getDay()]})</span><h1>오늘도 돈셈 해요</h1></div>
      <button type="button" class="btn fill dash-add">＋ 기록하기</button></div>
    <div class="dash-grid">${cards.join('')}</div>
    ${missing.length ? `<p class="dash-more">이것도 써 보세요 · ${missing.map(([, h, t]) => `<a href="${h}">${t}</a>`).join(' · ')}</p>` : ''}`;
  const hero = document.querySelector('.hero');
  hero.before(sec);
  document.body.classList.add('has-dash');
  sec.querySelector('.dash-add').addEventListener('click', () => {
    const add = document.querySelector('.tabbar .tab-add');
    if (add && getComputedStyle(document.querySelector('.tabbar')).display !== 'none') add.click(); // 휴대폰: 아래에서 기록 창
    else location.href = '/budget/'; // 컴퓨터: 가계부로
  });
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
      ['wage', '시급으로 치면 얼마일까?', '시급·월급·연봉 계산기', { w_mode: 'month', w_amt: R(rowNum('세전 월급')), w_hours: 40 }],
      ['savings', '실수령액의 20%를 적금에 넣으면?', '적금 이자 계산기', { s_amt: Math.max(10000, Math.round(bigNum() * 0.2 / 10000) * 10000), s_n: 12 }],
      ['severance', '이 월급이면 퇴직금은?', '퇴직금 계산기', { v_pay: R(rowNum('세전 월급')) }],
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
    fixed: ['donsem:fixed', 'items', '/fixed/', '고정지출', { items: [] }],
    assets: ['donsem:assets', 'items', '/assets/', '내 자산', { items: [], history: {} }],
    goals: ['donsem:goals', 'goals', '/goals/', '목표', { goals: [] }],
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
    savings: () => [['goals', `만기 ${won(bigNum())}을 목표로 만들기`, { name: '적금 만기', target: R(bigNum()), date: after(val('s_n')), mode: 'manual', saved: 0 }]],
    deposit: () => [['assets', `예금 ${won(val('d_amt'))}을 내 자산에 추가`, { kind: 'asset', cat: '예금·적금', name: '정기예금', amt: R(val('d_amt')) }]],
    goal: () => [['goals', `${won(val('g_goal'))} 모으기를 목표로 만들기`, { name: `${korean(val('g_goal')).replace(/ 원$|원$/, '')} 모으기`, target: R(val('g_goal')), date: after(val('g_y') * 12), mode: 'manual', saved: R(val('g_now')) }]],
    retirement: () => [['goals', `노후자금 ${won(bigNum())}을 목표로 만들기`, { name: '노후자금', target: R(bigNum()), date: after(val('t_until') * 12), mode: 'manual', saved: 0 }]],
    dividend: () => seg('b_mode') === 'need' ? [['goals', `배당 투자금 ${won(bigNum())}을 목표로 만들기`, { name: `월 배당 ${korean(val('b_want')).replace(/ 원$|원$/, '')}`, target: R(bigNum()), date: '', mode: 'manual', saved: 0 }]] : [],
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
const ICONS = ['savings', 'deposit', 'loan', 'compound', 'severance', 'rent', 'vat', 'holiday-pay', 'prepayment', 'inflation', 'discount', 'wage', 'goal', 'pyeong', 'percent', 'avg-price', 'dividend', 'retirement', 'car-loan', 'refinance', 'unit-price', 'fuel', 'dutch-pay', 'date', 'salary', 'unemployment', 'year-end-tax', 'budget', 'fixed', 'assets', 'goals'];
const iconOf = path => { const slug = String(path).replace(/\//g, ''); return ICONS.includes(slug) ? `<img class="ico" src="/icons/${slug}.webp" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''; };
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
    '/prepayment/': '대출받고 <b>3년</b> 지나면 수수료 0원',
    '/pyeong/': '1평은 <b>3.3058㎡</b>',
    '/vat/': '부가세는 <b>10%</b>',
    '/discount/': '20% 할인에 10% 쿠폰이면 <b>28%</b> 할인',
    '/dividend/': '배당소득세 <b>15.4%</b>를 떼고 받아요',
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
  const anchor = document.querySelector('.popular') || (location.pathname === '/calculators/' && document.querySelector('.group'));
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

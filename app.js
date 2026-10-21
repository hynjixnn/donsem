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
  const paid = (ps + irp) * y, mr = r / 12, m = n * 12;
  const monthly = bal ? (mr ? bal * mr / (1 - Math.pow(1 + mr, -m)) : bal / m) : 0; // 받는 동안에도 같은 수익률로 굴린다고 봐요
  const freeShare = bal ? Math.min(1, (ps + irp - base) * y / bal) : 0; // 세액공제를 안 받은 원금은 받을 때 세금이 없어요
  const tax = monthly * (1 - freeShare) * 0.055; // 연금소득세: 55~69세 5.5% (70대 4.4%, 80세 이상 3.3%)
  return { pay, ps, irp, y, n, base, rate, refund, bal, paid, monthly, net: monthly - tax, over: monthly * 12 * (1 - freeShare) > 15000000, room: Math.max(0, 9000000 - base), psOver: ps > 6000000 };
}
function pension() {
  const o = pensionCalc(), out = document.getElementById('pn_out');
  if (!o.ps && !o.irp) { out.innerHTML = '연금저축이나 IRP에 1년에 넣을 돈을 넣어 주세요.'; return; }
  const note = t => `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">${t}</p>`;
  out.innerHTML = `<div>연말정산에서 매년 돌려받는 돈</div><div class="big">${won(o.refund)} <small>/ 년</small></div>` +
    rows([['세액공제 받는 금액', won(o.base)], ['공제율', o.rate === 0.165 ? '16.5% (총급여 5,500만 원 이하)' : '13.2% (총급여 5,500만 원 초과)'], [`${o.y}년 동안 돌려받는 돈`, won(o.refund * o.y)],
      ['넣은 돈 (원금)', won(o.paid)], [`${o.y}년 뒤 모인 돈 (세전)`, won(o.bal)], [`${o.n}년 동안 매달 받는 연금 (세전)`, won(o.monthly)], ['연금소득세 뺀 금액 (55~69세 기준)', won(o.net)]]) +
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

const calc = { s_out: savings, d_out: deposit, l_out: loan, c_out: compound, v_out: severance, r_out: rent, x_out: vat, h_out: holidayPay, p_out: prepayment, i_out: inflation, o_out: discount, w_out: wage, g_out: goal, y_out: pyeong, q_out: percent, a_out: avgPrice, b_out: dividend, t_out: retirement, k_out: carLoan, f_out: refinance, u_out: unitPrice, e_out: fuel, n_out: dutchPay, z_out: dateCalc, m_out: salary, j_out: unemployment, ys_out: yearEnd, sr_out: salaryRank, is_out: isa, pn_out: pension, ct_out: corporateTax, it_out: incomeTax };
// ── 한 줄 정리: 결과 숫자가 "나한테 무슨 뜻인지" 알려 주는 문장 ──
const pct = (n, d = 1) => n.toLocaleString('ko-KR', { maximumFractionDigits: d }) + '%';
const MIN_WAGE_2026 = 10320; // 2026년 최저시급
const insights = {
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
function animateBig() {
  const big = document.querySelector('.card .result .big');
  if (!big) { lastBig = null; return; }
  const node = big.firstChild;
  const m = node && node.nodeType === 3 && node.textContent.match(/[\d,]+(\.\d+)?/);
  if (!m) { lastBig = null; return; }
  big.dataset.final = node.textContent;
  const to = m[0], from = lastBig;
  lastBig = to;
  if (calmMotion || from === null || from === to || !ready) return;
  const up = Number(to.replace(/,/g, '')) > Number(from.replace(/,/g, '')), frag = document.createDocumentFragment();
  frag.append(node.textContent.slice(0, m.index));
  [...to].forEach((ch, i) => {
    const old = from[from.length - to.length + i]; // 오른쪽 끝(일의 자리)부터 자리를 맞춰 비교해요
    if (!/\d/.test(ch) || ch === old) { frag.append(ch); return; }
    const box = document.createElement('span'), d = document.createElement('span');
    box.className = 'roll'; d.className = up ? 'up' : 'down'; d.textContent = ch;
    d.dataset.o = /\d/.test(old || '') ? old : '';
    d.style.animationDelay = Math.min(i, 8) * 18 + 'ms';
    box.append(d); frag.append(box);
  });
  frag.append(node.textContent.slice(m.index + to.length));
  node.replaceWith(frag);
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
    sheet.querySelector('.qa-cats').innerHTML = CATS[type].map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${c}">${catIcon(c)}${c}</button>`).join('');
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
    markDailyFull();
    if (typeof window.drawToday === 'function') window.drawToday();
    if (path === '/budget/') setTimeout(() => location.reload(), 1200); // 가계부를 보고 있었다면 바로 반영
  }
  bar.querySelector('.tab-add').addEventListener('click', open);
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
const ICONS = ['savings', 'deposit', 'loan', 'compound', 'severance', 'rent', 'vat', 'holiday-pay', 'prepayment', 'inflation', 'discount', 'wage', 'goal', 'pyeong', 'percent', 'avg-price', 'dividend', 'retirement', 'car-loan', 'refinance', 'unit-price', 'fuel', 'dutch-pay', 'date', 'salary', 'unemployment', 'year-end-tax', 'budget', 'fixed', 'assets', 'goals', 'quiz', 'money-type', 'salary-rank', 'no-spend', 'collection', 'isa', 'pension', 'corporate-tax', 'income-tax'];
const iconOf = path => { const slug = String(path).replace(/\//g, ''); return ICONS.includes(slug) ? `<img class="ico" src="/icons/${slug}.webp" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''; };
// 가계부 카테고리 아이콘 (가계부 화면, + 빠른 기록에서 같이 써요)
const CAT_ICONS = { '식비': 'rice', '카페·간식': 'coffee', '교통': 'bus', '쇼핑': 'shopping', '생활': 'basket', '주거·통신': 'house', '의료': 'pill', '문화·여가': 'popcorn', '경조사': 'envelope', '기타': 'package', '월급': 'banknote', '용돈': 'moneybag', '부수입': 'coin', '이자·배당': 'chart' };
const catIcon = (cat, size = 20) => CAT_ICONS[cat] ? `<img class="cat-ico" src="/icons/cat/${CAT_ICONS[cat]}.webp" alt="" width="${size}" height="${size}">` : '';
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
  ['돈 관리', [['/budget/', '가계부', '지출 수입 예산'], ['/fixed/', '고정지출', '구독 월세 보험'], ['/assets/', '내 자산', '순자산 부채'], ['/goals/', '목표', '저축 목표']]],
  ['챌린지 · 테스트', [['/quiz/', '오늘의 돈 퀴즈', '상식 OX 문제 금전운 돈나무'], ['/no-spend/', '무지출 챌린지', '절약 무지출 달력 도장'], ['/money-type/', '돈BTI 테스트', '소비 성향 성격 테스트 mbti'],
    ['/collection/', '내 컬렉션', '돈나무 배지 기록 모음']]],
  ['저축 · 투자', [['/savings/', '적금 이자', '만기'], ['/deposit/', '예금 이자', '정기예금 만기'], ['/compound/', '복리 투자', '투자 수익'], ['/isa/', 'ISA 절세', '세금 비과세 계좌 주식'], ['/pension/', '연금저축·IRP', '세액공제 연말정산 노후'], ['/goal/', '목표 저축', '1억 모으기'],
    ['/dividend/', '배당금', '주식 배당 세금'], ['/avg-price/', '물타기', '평균 단가 주식'], ['/retirement/', '노후자금', '은퇴 연금'], ['/inflation/', '물가상승률', '화폐 가치']]],
  ['대출 · 집', [['/loan/', '대출 이자', '원리금 균등 상환'], ['/refinance/', '대출 갈아타기', '대환'], ['/prepayment/', '중도상환수수료', '조기 상환'],
    ['/car-loan/', '자동차 할부', '차 할부'], ['/rent/', '전월세 전환', '전세 월세'], ['/pyeong/', '평수', '제곱미터 평당']]],
  ['월급 · 일', [['/salary/', '연봉 실수령액', '월급 세금 4대보험'], ['/salary-rank/', '연봉 상위 %', '연봉 순위 백분위 퍼센트'], ['/wage/', '시급·월급·연봉', '알바 최저시급'], ['/holiday-pay/', '주휴수당', '알바'],
    ['/severance/', '퇴직금', '퇴사'], ['/unemployment/', '실업급여', '퇴사 구직급여'], ['/year-end-tax/', '연말정산 환급', '13월의 월급 세금']]],
  ['생활 · 사업', [['/vat/', '부가세', '공급가액 세금'], ['/income-tax/', '종합소득세', '프리랜서 3.3% 환급 개인사업자 5월'], ['/corporate-tax/', '법인세', '법인 사업자 세율'], ['/discount/', '할인율', '세일 가격'], ['/percent/', '퍼센트', '비율 증가율'], ['/unit-price/', '단가 비교', '100g당 가격'],
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
  gnav.className = 'gnav'; gnav.setAttribute('role', 'navigation'); gnav.setAttribute('aria-label', '계산기 분류');
  gnav.innerHTML = MENU.map(([t], i) => btn(t, i)).join('');
  inner.querySelector('.brand').after(gnav);
  const chips = document.createElement('div');
  chips.className = 'gnav-chips'; chips.setAttribute('role', 'navigation'); chips.setAttribute('aria-label', '계산기 분류');
  chips.innerHTML = MENU.map(([t], i) => btn(t, i)).join('');
  inner.after(chips);
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

  function draw(g) {
    if (g === 'search') {
      panel.innerHTML = `<div class="gnav-head"><b>계산기 검색</b><button type="button" class="gnav-x" aria-label="닫기">×</button></div>
        <div class="field gnav-q"><input type="search" placeholder="예: 주휴, 대출, 퇴직금" autocomplete="off" aria-label="계산기 검색"></div><div class="gnav-list" aria-live="polite"></div>`;
      const q = panel.querySelector('input'), list = panel.querySelector('.gnav-list');
      const all = MENU.flatMap(([t, items]) => items.map(it => [...it, t]));
      const find = () => {
        const s = q.value.replace(/\s/g, '').toLowerCase();
        const hits = s ? all.filter(([, name, kw, t]) => (name + kw + t).replace(/[\s·]/g, '').toLowerCase().includes(s)) : all.filter(([href]) => ['/salary/', '/loan/', '/year-end-tax/', '/unemployment/', '/severance/', '/budget/'].includes(href));
        list.innerHTML = (s ? '' : '<p class="gnav-cap">많이 찾는 것</p>') + (hits.length ? hits.map(item).join('') : '<p class="gnav-none">찾는 계산기가 없어요. 다른 말로 찾아보세요.</p>');
      };
      q.addEventListener('input', e => { e.stopPropagation(); find(); });
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = list.querySelector('a'); if (a) location.href = a.href; } });
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
    if (g === null) { wrap.classList.remove('show'); document.documentElement.classList.remove('gnav-open'); return; }
    draw(g);
    wrap.classList.add('show');
    document.documentElement.classList.add('gnav-open');
  }
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
    if (!extra.length) return;
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
  text(o.link.replace(/^https?:\/\//, ''), W / 2, 1770, 40, 700, '#0071e3');
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
        const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#e8e8ed'); g.addColorStop(1, '#0071e3');
        c.beginPath(); if (c.roundRect) c.roundRect(x0, y - 14, w, 28, 14); else c.rect(x0, y - 14, w, 28); c.fillStyle = g; c.fill();
        c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
        c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fillStyle = '#0071e3'; c.fill();
        text('나', x, y - 50, 36, 800, '#0071e3');
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
    const add = document.querySelector('.tabbar .tab-add');
    if (add && getComputedStyle(document.querySelector('.tabbar')).display !== 'none') add.click(); // 휴대폰: 아래에서 기록 창
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

// ── 첫 화면 휴대폰: 화면에 보이면 실수령액 숫자가 올라가요 ──
(() => {
  const n = document.querySelector('.phone .ph-result strong');
  if (!n || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = Number(n.dataset.to), io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    const t0 = performance.now(), step = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); n.textContent = won(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, { threshold: 0.6 });
  io.observe(n);
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

// ── 아이폰 같은 손맛 ⑤: 아래 탭에서 지금 화면의 탭을 한 번 더 누르면 맨 위로 스르륵 올라가요 ──
document.addEventListener('click', e => {
  const a = e.target.closest('.tabbar a.on');
  if (!a || e.metaKey || e.ctrlKey || a.pathname !== location.pathname) return; // 계산기 화면 안에서 '계산기' 탭을 누르면 목록으로 가요 (아이폰처럼)
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

// ── 아이폰 같은 손맛 ⑥: 큰 제목이 화면 위로 지나가면, 위 메뉴바 가운데에 작은 제목으로 쏙 들어가요 (휴대폰) ──
// 가계부처럼 칸이 여러 개인 화면은 지금 보고 있는 칸 제목(기록하기, 내역 …)으로 바뀌어요
(() => {
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

// ── 돈 관리 탭: 파란 알약이 지난 탭 자리에서 지금 탭으로 쫀득하게 미끄러져 와요 ──
(() => {
  const tabs = document.querySelector('.mm-tabs'), on = tabs && tabs.querySelector('a.on');
  if (!tabs || !on) return;
  const links = [...tabs.querySelectorAll('a')], KEY = 'donsem:mm-from';
  const pill = document.createElement('span');
  pill.className = 'mm-pill'; pill.setAttribute('aria-hidden', 'true');
  tabs.prepend(pill); tabs.classList.add('has-pill');
  const place = a => { pill.style.width = a.offsetWidth + 'px'; pill.style.height = a.offsetHeight + 'px'; pill.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`; };
  let from = -1;
  try { from = Number(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (e) { from = -1; }
  const start = links[from] && links[from] !== on ? links[from] : on;
  pill.style.transition = 'none'; place(start); pill.offsetWidth; pill.style.transition = '';
  if (start !== on) setTimeout(() => place(on), 30); // 지난 탭 자리에서 출발
  tabs.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || a === on) return;
    try { sessionStorage.setItem(KEY, String(links.indexOf(on))); } catch (err) { /* 기억 못 해도 괜찮아요 */ }
    place(a); // 누른 쪽으로 먼저 움직이기 시작해요
  });
  window.addEventListener('resize', () => place(on));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(on));
  window.addEventListener('pageshow', e => { if (e.persisted) { pill.style.transition = 'none'; place(on); pill.offsetWidth; pill.style.transition = ''; } }); // 뒤로 가기로 돌아오면 제자리
})();

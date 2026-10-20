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
const calc = { s_out: savings, d_out: deposit, l_out: loan, c_out: compound, v_out: severance, r_out: rent, x_out: vat, h_out: holidayPay, p_out: prepayment, i_out: inflation, o_out: discount, w_out: wage, g_out: goal, y_out: pyeong, q_out: percent, a_out: avgPrice, b_out: dividend, t_out: retirement, k_out: carLoan, f_out: refinance, u_out: unitPrice, e_out: fuel, n_out: dutchPay, z_out: dateCalc };
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
    b.entries.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, amt, cat, date: today(), memo: sheet.querySelector('.qa-memo').value.trim().slice(0, 40) });
    try { localStorage.setItem('donsem:budget', JSON.stringify(b)); }
    catch (e) { sheet.querySelector('.qa-err').textContent = '이 브라우저에서는 저장할 수 없어요.'; return; }
    amtEl.value = ''; sheet.querySelector('.qa-memo').value = ''; sheet.querySelector('.qa-kr').textContent = '';
    close();
    toast(`${cat} ${won(amt)}을 가계부에 기록했어요.`);
    if (path === '/budget/') setTimeout(() => location.reload(), 600); // 가계부를 보고 있었다면 바로 반영
  }
  bar.querySelector('.tab-add').addEventListener('click', open);
})();

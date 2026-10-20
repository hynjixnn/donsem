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

// 페이지마다 계산기가 하나씩 있어서, 그 페이지에 있는 계산기만 계산해요
const calc = { s_out: savings, d_out: deposit, l_out: loan, c_out: compound, v_out: severance, r_out: rent, x_out: vat, h_out: holidayPay, p_out: prepayment, i_out: inflation, o_out: discount, w_out: wage, g_out: goal, y_out: pyeong, q_out: percent, a_out: avgPrice, b_out: dividend, t_out: retirement, k_out: carLoan, f_out: refinance };
function runAll() { for (const id in calc) if (document.getElementById(id)) calc[id](); }

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
document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === location.pathname));
// 휴대폰에서 메뉴가 옆으로 길 때, 지금 메뉴가 보이도록 밀어 두기
const onNav = document.querySelector('nav a.on');
if (onNav) onNav.parentElement.scrollLeft = onNav.offsetLeft - onNav.parentElement.offsetLeft - 16;
runAll();

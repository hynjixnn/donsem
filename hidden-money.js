// 돈셈 숨은 돈 찾기: 4단계로 답하면 올해 놓치고 있을 수 있는 환급·공제·지원금을 어림해서 보여 줘요 (삼쩜삼 '올해 받을 수 있는 환급액' 같은 흐름)
// 저장하지 않고 이 화면에서만 계산해요. 금액은 2026년 세법 기준 어림값이에요.
(() => {
  const box = document.getElementById('hm-box');
  if (!box) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const man = n => n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만 원` : won(n);
  const WORK = [['job', '회사에서 월급 받아요'], ['free', '프리랜서·알바 (3.3% 떼요)'], ['both', '둘 다 해요'], ['none', '지금은 일 안 해요']];
  const HAVE = [['rent', '🏠 월세 살아요 (집 없음)'], ['youth', '🧑‍💼 중소기업 다니는 34세 이하'], ['med', '🏥 올해 병원비가 많았어요'], ['parent', '👵 소득 없는 60세 넘은 부모님'], ['irp', '💰 연금저축·IRP를 덜 넣었어요'], ['single', '🙋 혼자 살고 재산이 적어요']];
  const st = { step: 1, work: '', pay: 35000000, have: [], rent: 500000, med: 3000000, irpIn: 0 };

  // ── 어림 계산 ──
  const rateTop = p => (p <= 14000000 ? 0.066 : p <= 50000000 ? 0.165 : p <= 88000000 ? 0.264 : 0.385); // 총급여로 어림한 한계세율(지방소득세 포함)
  const youthYear = p => { // 연봉 실수령액 계산기의 청년 90% 감면 결과로 이은 값 (소득세+지방소득세, 1년)
    const P = [[20000000, 0], [30000000, 28860], [40000000, 83770], [50000000, 183330]];
    if (p >= 50000000) return 2200000;
    for (let i = 1; i < P.length; i++) if (p <= P[i][0]) return Math.round((P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (p - P[i - 1][0]) / (P[i][0] - P[i - 1][0])) * 12);
    return 0;
  };
  function results() {
    const p = st.pay, out = [], salaried = st.work === 'job' || st.work === 'both';
    if (st.work === 'free' || st.work === 'both')
      out.push({ ico: '🧾', t: '3.3% 뗀 소득 종합소득세 환급', v: 0, note: `3.3%를 뗀 소득이 있으면 5월 종합소득세 신고 때 낸 세금 일부를 돌려받는 경우가 많아요. 소득이 적고 경비가 많을수록 유리해요.`, go: ['/income-tax/', '종합소득세 계산기'] });
    if (st.have.includes('rent') && salaried) {
      const r = p <= 55000000 ? 0.17 : p <= 80000000 ? 0.15 : 0;
      out.push(r ? { ico: '🏠', t: '월세 세액공제', v: Math.round(Math.min(st.rent * 12, 10000000) * r), note: `1년 월세 ${man(st.rent * 12)}의 ${r * 100}%예요. 무주택 세대주(세대원도 일부 가능)이고 전입신고가 돼 있어야 해요. 1년 1,000만 원까지 공제돼요.`, go: ['/year-end-tax/', '연말정산 환급 계산기'] }
        : { ico: '🏠', t: '월세 세액공제', v: 0, note: '총급여 8,000만 원이 넘으면 월세 세액공제를 받을 수 없어요.' });
    }
    if (st.have.includes('youth') && salaried) out.push({ ico: '🧑‍💼', t: '중소기업 청년 소득세 감면', v: youthYear(p), note: '5년 동안 소득세 90% 감면이에요(1년 200만 원 한도). 회사에 신청서만 내면 되고, 지난 몫은 5년 안에 돌려받을 수 있어요.', go: ['/guide/youth-tax-cut/', '청년 감면 가이드'] });
    if (st.have.includes('med') && salaried) {
      const base = Math.max(0, Math.min(st.med - p * 0.03, 7000000));
      out.push({ ico: '🏥', t: '의료비 세액공제', v: Math.round(base * 0.15), note: base ? `총급여의 3%(${man(p * 0.03)})를 넘게 쓴 병원비의 15%를 돌려받아요. 실손보험으로 돌려받은 돈은 빼야 해요.` : `병원비가 총급여의 3%(${man(p * 0.03)})를 넘어야 공제가 시작돼요. 가족 병원비를 한 사람에게 모으면 넘길 수 있어요.`, go: ['/year-end-tax/', '연말정산 환급 계산기'] });
    }
    if (st.have.includes('parent') && salaried) out.push({ ico: '👵', t: '부모님 부양가족 공제', v: Math.round(1500000 * rateTop(p)), note: '소득이 연 100만 원 이하인 60세 이상 부모님 1명당 150만 원을 소득에서 빼 줘요. 따로 살아도 돼요. 형제와 중복은 안 돼요.', go: ['/year-end-tax/', '연말정산 환급 계산기'] });
    if (st.have.includes('irp') && st.work !== 'none') {
      const room = Math.max(0, 9000000 - st.irpIn), r = p <= 55000000 ? 0.165 : 0.132;
      out.push({ ico: '💰', t: '연금저축·IRP 세액공제', v: Math.round(room * r), note: `12월 31일까지 ${man(room)}을 더 넣으면 ${r * 100}%를 돌려받아요. 55세 전에 깨면 다시 토해 내니 여유 돈만 넣으세요.`, go: ['/pension/', '연금저축·IRP 계산기'] });
    }
    if (st.have.includes('single') && p < 22000000 && st.work !== 'none') out.push({ ico: '🙋', t: '근로장려금 (단독가구)', v: 0, note: '혼자 사는 가구는 연 소득 2,200만 원 미만, 재산 2억 4천만 원 미만이면 최대 165만 원을 받을 수 있어요. 소득이 적을수록 금액이 달라져요. 5월(정기)·3월·9월(반기)에 신청해요.', go: ['/guide/unemployment/', '돈 가이드 보기'] });
    return out;
  }

  // ── 화면 ──
  const bar = () => `<div class="hm-steps"><b>${st.step} / 4 단계</b><i><u style="width:${st.step * 25}%"></u></i></div>`;
  const nav = (next, label = '다음') => `<div class="hm-nav">${st.step > 1 ? '<button type="button" class="btn line" data-back>이전</button>' : ''}<button type="button" class="btn fill" data-next="${next}">${label}</button></div>`;
  const moneyField = (id, v, label) => `<label for="${id}">${label}</label><div class="field"><input id="${id}" inputmode="numeric" value="${v ? v.toLocaleString('ko-KR') : ''}" placeholder="0"><span>원</span></div>`;
  function draw() {
    let h = bar();
    if (st.step === 1) h += `<h2 class="hm-q">어떻게 일하고 있나요?</h2><div class="hm-opts">${WORK.map(([k, n]) => `<button type="button" class="${st.work === k ? 'on' : ''}" data-work="${k}">${n}</button>`).join('')}</div>`;
    if (st.step === 2) h += `<h2 class="hm-q">1년에 버는 돈은 얼마쯤인가요?</h2><p class="hm-sub">세금 떼기 전 연봉(총급여)이나 1년 소득을 넣어 주세요. 대충이어도 괜찮아요.</p>${moneyField('hm-pay', st.pay, '1년 소득 (세전)')}${nav(3)}`;
    if (st.step === 3) h += `<h2 class="hm-q">나에게 해당되는 걸 모두 골라 주세요</h2><div class="hm-opts multi">${HAVE.map(([k, n]) => `<button type="button" class="${st.have.includes(k) ? 'on' : ''}" data-have="${k}">${n}</button>`).join('')}</div>${nav(4, st.have.length ? '다음' : '해당 없어요')}`;
    if (st.step === 4) {
      const f = [];
      if (st.have.includes('rent')) f.push(moneyField('hm-rent', st.rent, '한 달 월세'));
      if (st.have.includes('med')) f.push(moneyField('hm-med', st.med, '올해 병원비 (본인·가족 합계, 실손 받은 돈 빼고)'));
      if (st.have.includes('irp')) f.push(moneyField('hm-irp', st.irpIn, '올해 연금저축·IRP에 이미 넣은 돈'));
      h += f.length ? `<h2 class="hm-q">금액만 조금 더 알려 주세요</h2>${f.join('')}${nav(5, '내 숨은 돈 보기')}` : (st.step = 5, '');
    }
    if (st.step === 5) {
      const list = results(), sum = list.reduce((a, x) => a + x.v, 0);
      h = `<div class="hm-result"><p>올해 챙길 수 있는 숨은 돈</p><div class="big">${sum ? `약 ${won(Math.round(sum / 1000) * 1000)}` : list.length ? '확인해 볼 게 있어요' : '지금은 없어요'}</div>
        ${list.length ? `<ul class="hm-list">${list.map(x => `<li><span class="hm-ico">${x.ico}</span><div><b>${esc(x.t)}</b><em>${x.v ? `약 ${won(Math.round(x.v / 1000) * 1000)}` : '확인 필요'}</em><p>${esc(x.note)}</p>${x.go ? `<a href="${x.go[0]}">${esc(x.go[1])} ›</a>` : ''}</div></li>`).join('')}</ul>`
          : '<p class="hm-sub">고른 항목으로는 찾은 게 없어요. 연말정산 환급 계산기로 전체를 한 번 확인해 보세요.</p>'}
        <p class="hm-foot">1년 기준 어림값이에요. 실제로 돌려받는 돈은 이미 낸 세금보다 많을 수 없고, 다른 공제와 함께 계산하면 달라질 수 있어요.</p>
        <div class="hm-nav"><button type="button" class="btn line" data-restart>처음부터 다시</button><a class="btn fill" href="/year-end-tax/">연말정산 환급 계산하기</a></div></div>`;
    }
    box.innerHTML = h;
  }
  const readMoney = id => { const el = document.getElementById(id); return el ? num(el.value) : 0; };
  box.addEventListener('input', e => { if (e.target.matches('input[inputmode="numeric"]')) { const d = e.target.value.replace(/[^0-9]/g, '').slice(0, 12); e.target.value = d ? Number(d).toLocaleString('ko-KR') : ''; } });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.work) { st.work = b.dataset.work; st.step = 2; return draw(); }
    if (b.dataset.have) { const k = b.dataset.have; st.have = st.have.includes(k) ? st.have.filter(x => x !== k) : st.have.concat(k); return draw(); }
    if (b.hasAttribute('data-back')) { st.step = Math.max(1, st.step - 1); return draw(); }
    if (b.hasAttribute('data-restart')) { Object.assign(st, { step: 1, work: '', have: [] }); return draw(); }
    if (b.dataset.next) {
      if (st.step === 2) { st.pay = readMoney('hm-pay'); if (!st.pay && st.work !== 'none') return toast('1년 소득을 넣어 주세요.'); }
      if (st.step === 4) { st.rent = readMoney('hm-rent') || st.rent; st.med = readMoney('hm-med'); st.irpIn = Math.min(9000000, readMoney('hm-irp')); }
      st.step = Number(b.dataset.next);
      draw();
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { const n = box.querySelector('[data-next]'); if (n) n.click(); } });
  draw();
})();

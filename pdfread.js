/* 돈셈 간소화 PDF 읽기: 홈택스 「연말정산 간소화」 PDF를 이 기기 안에서만 읽어서 공제 금액을 찾아요.
   PDF는 어디에도 보내지 않아요. 연말정산 계산기(/year-end-tax/)와 Pro 연말정산 탭이 같이 써요. */
(() => {
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const num = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;
  const load = () => (window.pdfjsLib ? Promise.resolve() : new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = PDFJS + 'pdf.min.js';
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(); };
    sc.onerror = rej; document.head.append(sc);
  }));
  async function text(buf, password) {
    await load();
    const doc = await window.pdfjsLib.getDocument({ data: buf, password }).promise;
    let out = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent(), lines = {};
      tc.items.forEach(it => { const y = Math.round(it.transform[5] / 3); (lines[y] = lines[y] || []).push({ x: it.transform[4], s: it.str }); });
      out += Object.keys(lines).sort((a, b) => b - a).map(y => lines[y].sort((a, b) => a.x - b.x).map(t => t.s).join(' ')).join('\n') + '\n';
    }
    return out;
  }
  // 간소화 PDF는 「…증명서류 : 기본내역[의료비]」처럼 칸 이름이 [ ] 안에 있고, 사람마다 「인별합계금액」이 있어요
  function parse(t) {
    t = String(t).replace(/ /g, ' ');
    const found = {}, hit = {};
    const keyOf = n => { n = n.replace(/\s/g, '');
      if (/실손/.test(n)) return 'claim'; if (/의료비/.test(n)) return 'med'; if (/교육비/.test(n)) return 'edu'; if (/기부금/.test(n)) return 'don'; if (/월세/.test(n)) return 'rent';
      if (/직불|체크/.test(n)) return 'debit'; if (/현금영수증/.test(n)) return 'cash'; if (/신용카드/.test(n)) return 'credit';
      if (/연금저축|퇴직연금/.test(n)) return 'pension'; if (/보험료/.test(n) && !/건강|국민|고용|장기요양/.test(n)) return 'ins'; return null; };
    const marks = [...t.matchAll(/\[\s*([^\]\n]{2,24}?)\s*\]/g)];
    marks.forEach((m, i) => {
      const k = keyOf(m[1]); if (!k) return;
      const body = t.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : t.length);
      const per = [...body.matchAll(/인별\s*합계\s*금액[^\d\n]{0,12}([\d,]{1,15})/g)].map(x => num(x[1]));
      let v = per.reduce((a, b) => a + b, 0);
      if (!per.length) { const tot = [...body.matchAll(/합\s*계[^\d\n]{0,12}([\d,]{3,15})/g)].map(x => num(x[1])); v = tot.length ? tot[tot.length - 1] : 0; }
      if (per.length || v) { found[k] = (found[k] || 0) + v; hit[k] = true; }
    });
    return { found, n: Object.keys(hit).length };
  }
  window.donsemPdf = { load, text, parse };

  // ── 연말정산 계산기: 「간소화 PDF로 자동 채우기」 (무료) ──
  const box = document.getElementById('ys-pdf'); if (!box) return;
  const $ = id => document.getElementById(id);
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const W = n => Math.round(n).toLocaleString('ko-KR') + '원';
  let buf = null, busy = false;
  const msg = (h) => { $('ys-pdf-msg').innerHTML = h; };
  const setVal = (k, v) => { const el = document.querySelector(`input[data-k="${k}"]`); if (!el) return; el.value = v ? Math.round(v).toLocaleString('ko-KR') : '0'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  async function run(pw) {
    if (busy || !buf) return; busy = true; msg('PDF를 읽고 있어요… (이 기기 안에서만)');
    try {
      const r = parse(await text(buf.slice(0), pw)); busy = false;
      if (!r.n) { msg('간소화 자료에서 공제 항목을 찾지 못했어요. 홈택스 「연말정산 간소화」에서 받은 PDF가 맞는지 확인해 주세요.'); return; }
      const v = r.found;
      setVal('ys_credit', v.credit || 0); setVal('ys_debit', (v.debit || 0) + (v.cash || 0)); setVal('ys_pension', v.pension || 0);
      setVal('ys_rent', v.rent || 0); setVal('ys_med', Math.max(0, (v.med || 0) - (v.claim || 0))); setVal('ys_ins', v.ins || 0);
      if (typeof yearEnd === 'function') yearEnd();
      // Pro 연말정산 탭에서도 바로 이어서 보도록 숫자만 이 기기에 저장해요
      try { const P = JSON.parse(localStorage.getItem('donsem:pro')) || {}; P.yePdf = { v, n: r.n, t: Date.now() }; const pay = num((document.querySelector('input[data-k="ys_pay"]') || {}).value); if (pay) P.ye = Object.assign({}, P.ye, { pay }); localStorage.setItem('donsem:pro', JSON.stringify(P)); } catch (e) { /* 괜찮아요 */ }
      const more = (v.edu || 0) + (v.don || 0);
      msg(`✓ PDF에서 ${r.n}가지 금액을 찾아 아래 칸을 채웠어요. 결과는 맨 아래에 있어요.${more ? `<br>교육비·기부금 ${W(more)}은 이 계산기에 없어서 빠졌어요.` : ''}<a class="ys-pro" href="/budget/?pro=ye#pro"><b>Pro에서 이어서 보기</b><small>교육비·기부금까지 넣은 환급액 · 간소화에 안 나오는 공제 찾기 · 회사에 낼 서류 정리</small><i>›</i></a>`);
      say(`간소화 PDF로 ${r.n}가지를 채웠어요 📄`);
      try { fetch('https://donsem-counter.hjjung330.workers.dev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k: 'pro:use', v: 'ypdf' }) }).catch(() => {}); } catch (e) { /* 괜찮아요 */ }
    } catch (e) {
      busy = false;
      if (e && e.name === 'PasswordException') { $('ys-pdf-pw').hidden = false; msg(e.code === 2 ? '비밀번호가 맞지 않아요. 다시 넣어 주세요.' : '비밀번호가 걸린 PDF예요. 내려받을 때 정한 비밀번호를 넣어 주세요.'); $('ys-pdf-pwin').focus(); return; }
      msg('PDF를 열지 못했어요. 인터넷 연결을 확인하거나 다른 PDF로 해 주세요.');
    }
  }
  $('ys-pdf-file').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > 20e6) return msg('PDF가 너무 커요 (20MB까지).'); buf = new Uint8Array(await f.arrayBuffer()); $('ys-pdf-pw').hidden = true; run(); });
  $('ys-pdf-go').addEventListener('click', () => run($('ys-pdf-pwin').value));
  $('ys-pdf-pwin').addEventListener('keydown', e => { if (e.key === 'Enter') run($('ys-pdf-pwin').value); });
})();

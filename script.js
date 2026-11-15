const cards = document.querySelectorAll('.card');
const summaryItems = document.querySelectorAll('.summary-item');
const seats = document.querySelectorAll('.seat');

const updateSummary = () => {
  const totals = {};
  cards.forEach(card => {
    const rank = card.dataset.name;
    const currentCount = Number(card.querySelector('.count').textContent) || 0;
    totals[rank] = (totals[rank] || 0) + currentCount;
  });

  summaryItems.forEach(item => {
    const rank = item.dataset.rank;
    const total = totals[rank] || 0;
    const target = ['鹰', '大王', '小王', '3'].includes(rank) ? 6 - total : 24 - total;
    item.querySelector('strong').textContent = target;
  });
};

const updateSeatScores = () => {
  seats.forEach(seat => {
    const seatTotal = Array.from(seat.querySelectorAll('.card .count')).reduce((sum, el) => sum + Number(el.textContent || 0), 0);
    const scoreEl = seat.querySelector('.seat-score strong');
    if (scoreEl) {
      scoreEl.textContent = 52 - seatTotal;
    }
  });
};

const touchQuery = window.matchMedia('(hover: none), (pointer: coarse)');
const isTouch = () => touchQuery.matches;

// 모바일 숫자 패널
const pad = document.createElement('div');
pad.className = 'num-pad-backdrop';
pad.hidden = true;
pad.innerHTML = `
  <div class="num-pad" role="dialog" aria-modal="true" aria-label="숫자 입력">
    <div class="num-pad-title"><span class="num-pad-seat"></span> · <strong class="num-pad-label"></strong> <span class="num-pad-count"></span></div>
    <div class="num-pad-grid">
      ${Array.from({ length: 12 }, (_, i) => `<button type="button" data-add="${i + 1}">${i + 1}</button>`).join('')}
    </div>
    <div class="num-pad-actions">
      <button type="button" data-act="undo">되돌리기</button>
      <button type="button" data-act="mark">표시</button>
      <button type="button" data-act="zero">0으로</button>
      <button type="button" data-act="close">닫기</button>
    </div>
  </div>`;
document.body.appendChild(pad);

let padCard = null;
const refreshPad = () => {
  if (!padCard) return;
  pad.querySelector('.num-pad-seat').textContent = padCard.closest('.seat')?.querySelector('.seat-header span')?.textContent || '';
  pad.querySelector('.num-pad-label').textContent = padCard.dataset.name;
  pad.querySelector('.num-pad-count').textContent = `(${padCard.querySelector('.count').textContent})`;
  pad.querySelector('[data-act="mark"]').classList.toggle('on', padCard.classList.contains('marked'));
};
const openPad = card => {
  padCard = card;
  refreshPad();
  pad.hidden = false;
};
const closePad = () => {
  pad.hidden = true;
  padCard = null;
};

pad.addEventListener('click', event => {
  if (event.target === pad) return closePad();
  const btn = event.target.closest('button');
  if (!btn || !padCard) return;
  if (btn.dataset.add) {
    padCard._addCount(Number(btn.dataset.add));
    return closePad();
  }
  switch (btn.dataset.act) {
    case 'undo': undo(); refreshPad(); break;
    case 'mark': padCard.classList.toggle('marked'); refreshPad(); break;
    case 'zero': padCard._setCount(0); closePad(); break;
    case 'close': closePad(); break;
  }
});

let hoveredCard = null;
const history = []; // 되돌리기용: { card, prev }

cards.forEach(card => {
  let count = 0;
  const countEl = card.querySelector('.count');

  const render = () => {
    countEl.textContent = count;
    card.classList.toggle('nonzero', count !== 0);
    updateSummary();
    updateSeatScores();
    card.classList.add('active');
    window.clearTimeout(card._timeoutId);
    card._timeoutId = window.setTimeout(() => {
      card.classList.remove('active');
    }, 250);
  };

  // 값 변경 (record=true 이면 되돌리기 기록에 남김)
  card._setCount = (value, record = true) => {
    const next = Math.max(0, value);
    if (next === count) return;
    if (record) history.push({ card, prev: count });
    count = next;
    render();
  };

  card._addCount = amount => card._setCount(count + amount);

  card.addEventListener('mouseenter', () => { hoveredCard = card; });
  card.addEventListener('mouseleave', () => {
    if (hoveredCard === card) hoveredCard = null;
  });

  // 스크롤: 위 +1, 아래 -1
  card.addEventListener('wheel', event => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    if (delta !== 0) card._addCount(delta < 0 ? 1 : -1);
  }, { passive: false });

  // 왼쪽 클릭: +1 (모바일: 숫자 패널 열기)
  card.addEventListener('click', () => {
    if (isTouch()) openPad(card);
    else card._addCount(1);
  });

  // 오른쪽 클릭: 초록 배경 토글
  card.addEventListener('contextmenu', event => {
    event.preventDefault();
    card.classList.toggle('marked');
  });
});

const undo = () => {
  const last = history.pop();
  if (last) last.card._setCount(last.prev, false);
};

// 마우스 "뒤로" 버튼(button 3): 되돌리기
document.addEventListener('mouseup', event => {
  if (event.button === 3) {
    event.preventDefault();
    undo();
  }
});
// 브라우저가 뒤로가기로 처리하지 않도록 막기
window.addEventListener('mousedown', event => {
  if (event.button === 3 || event.button === 4) event.preventDefault();
});

document.getElementById('reset-btn').addEventListener('click', event => {
  cards.forEach(card => {
    card._setCount(0, false);
    card.classList.remove('marked');
  });
  history.length = 0;
  event.currentTarget.blur();
});

document.addEventListener('keydown', event => {
  if (!hoveredCard) return;
  const match = /^Numpad([0-9])$/.exec(event.code);
  if (!match) return;

  event.preventDefault();
  hoveredCard._addCount(Number(match[1]));
});

updateSummary();
updateSeatScores();

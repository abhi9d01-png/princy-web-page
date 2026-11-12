/* Change PAGE_COUNT = 5, TURN_MS, or WHEEL_THRESHOLD to tune the book. */
const PAGE_COUNT = 5;
const TURN_MS = 900;
const WHEEL_THRESHOLD = 40;
const EASING = 'cubic-bezier(0.645, 0.045, 0.355, 1)';

const notebook = document.querySelector('.notebook');
const leftStack = document.querySelector('.left-stack');
const rightStack = document.querySelector('.right-stack');
const activeLayer = document.querySelector('.active-layer');
const turnShadow = document.querySelector('.turn-shadow');
const pageStatus = document.querySelector('.page-status');
const nextPage = document.querySelector('.next-page');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pages = [
  { eyebrow: 'Page 01 · Hero', title: 'Hello, I’m Abhir.', body: 'I turn ideas into clear, useful, and memorable digital experiences.' },
  { eyebrow: 'Page 02 · What I do', title: 'I make things work.', body: 'Web design · Front-end development · Motion · Creative direction' },
  { eyebrow: 'Page 03 · About me', title: 'A curious maker.', body: 'I like simple ideas, thoughtful details, and work that feels human.' },
  { eyebrow: 'Page 04 · Get in touch', title: 'Let’s make something.', body: 'hello@yourname.com · Instagram · LinkedIn' },
  { eyebrow: 'Page 05 · Thank you', title: 'Thanks for stopping by.', body: 'Keep scrolling, keep making, and come back soon.' },
];

let sheets = [];
let currentPage = 0;
let locked = false;
let wheelAmount = 0;
let touchStartY = null;

function makeSheet(page) {
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  const content = `<div class="page-copy"><p class="page-eyebrow">${page.eyebrow}</p><h1>${page.title}</h1><p class="page-body">${page.body}</p></div>`;
  sheet.innerHTML = `<div class="sheet-face sheet-face--front">${content}</div><div class="sheet-face sheet-face--back">${content}</div>`;
  return sheet;
}

function mountSheets() {
  sheets = pages.map((page) => makeSheet(page));
  sheets.forEach((sheet, index) => {
    sheet.dataset.index = index;
    if (index === 0) sheet.classList.add('sheet--right');
    rightStack.append(sheet);
  });
}

function placeSheets() {
  sheets.forEach((sheet, index) => {
    sheet.classList.remove('sheet--left', 'sheet--right');
    sheet.style.setProperty('--depth', `${Math.min(8, Math.abs(index - currentPage))}px`);
    const parent = index < currentPage ? leftStack : rightStack;
    if (sheet.parentElement !== parent) parent.append(sheet);
    if (index === currentPage) sheet.classList.add('sheet--right');
    else if (index < currentPage) sheet.classList.add('sheet--left');
    else sheet.classList.add('sheet--right');
    sheet.style.zIndex = String(index < currentPage ? index + 1 : PAGE_COUNT - index);
  });
  pageStatus.textContent = `Page ${currentPage + 1} of ${PAGE_COUNT}`;
  nextPage.textContent = currentPage === PAGE_COUNT - 1 ? 'Back to top ↑' : 'Next page ↓';
  notebook.setAttribute('aria-label', `Page ${currentPage + 1} of ${PAGE_COUNT}`);
}

function showResistance() {
  notebook.classList.remove('resistance');
  void notebook.offsetWidth;
  notebook.classList.add('resistance');
}

function ease(progress) {
  return progress < .5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
}

function resetActiveSheet(sheet) {
  sheet.style.transform = '';
  sheet.style.opacity = '';
  sheet.style.willChange = 'auto';
  sheet.classList.remove('show-back', 'reverse');
  turnShadow.style.opacity = '0';
  sheet.style.removeProperty('--turn-light');
}

function finishTurn(direction, movingSheet) {
  currentPage += direction;
  placeSheets();
  resetActiveSheet(movingSheet);
  locked = false;
}

function turn(direction) {
  if (locked || (direction > 0 && currentPage >= PAGE_COUNT - 1) || (direction < 0 && currentPage <= 0)) {
    showResistance();
    return;
  }

  locked = true; // Keep every other wheel, swipe, and key event out until this turn lands.
  const movingSheet = direction > 0 ? sheets[currentPage] : sheets[currentPage - 1];
  const startAngle = direction > 0 ? 0 : -180;
  const endAngle = direction > 0 ? -180 : 0;
  const start = performance.now();

  // Move exactly one existing sheet into the active layer; no duplicate sheet is rendered.
  activeLayer.append(movingSheet);
  movingSheet.classList.remove('sheet--left', 'sheet--right');
  movingSheet.classList.toggle('reverse', direction < 0);
  movingSheet.style.willChange = 'transform, opacity';
  movingSheet.style.transitionTimingFunction = EASING;
  movingSheet.style.transform = `translateZ(0) rotateX(${startAngle}deg)`;

  if (reducedMotion.matches) {
    movingSheet.style.opacity = '0';
    window.setTimeout(() => finishTurn(direction, movingSheet), 200);
    return;
  }

  function frame(now) {
    const raw = Math.min(1, (now - start) / TURN_MS);
    const progress = ease(raw);
    let angle = startAngle + (endAngle - startAngle) * progress;
    if (raw > .84) {
      const settle = Math.sin(((raw - .84) / .16) * Math.PI);
      angle += direction > 0 ? -2.5 * settle : 2.5 * settle;
    }
    const flex = (raw < .3 ? raw / .3 : raw > .7 ? (1 - raw) / .3 : 0) * (direction > 0 ? 2 : -2);
    const lift = Math.sin(Math.PI * progress) * 12;
    const shadow = Math.sin(Math.PI * progress) * .38;
    movingSheet.style.transform = `translateZ(${lift}px) skewX(${flex}deg) rotateX(${angle}deg)`;
    movingSheet.style.opacity = String(1 - progress * .05);
    turnShadow.style.opacity = String(shadow);
    movingSheet.style.setProperty('--turn-light', shadow);

    // CSS backface-visibility hides the front and reveals the back after 90 degrees.
    movingSheet.classList.toggle('show-back', Math.abs(angle) > 90);

    if (raw < 1) requestAnimationFrame(frame);
    else {
      movingSheet.style.transform = `rotateX(${endAngle}deg)`;
      finishTurn(direction, movingSheet);
    }
  }

  requestAnimationFrame(frame);
}

function handleWheel(event) {
  event.preventDefault();
  if (locked) return;
  wheelAmount += event.deltaY;
  if (Math.abs(wheelAmount) < WHEEL_THRESHOLD) return;
  const direction = wheelAmount > 0 ? 1 : -1;
  wheelAmount = 0;
  turn(direction);
}

function handleKey(event) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  turn(event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1);
}

function handleTouchStart(event) {
  touchStartY = event.changedTouches[0].clientY;
}

function handleTouchEnd(event) {
  if (touchStartY === null || locked) return;
  const distance = touchStartY - event.changedTouches[0].clientY;
  touchStartY = null;
  if (Math.abs(distance) >= WHEEL_THRESHOLD) turn(distance > 0 ? 1 : -1);
}

mountSheets();
placeSheets();
notebook.addEventListener('wheel', handleWheel, { passive: false });
notebook.addEventListener('keydown', handleKey);
notebook.addEventListener('touchstart', handleTouchStart, { passive: true });
notebook.addEventListener('touchend', handleTouchEnd, { passive: true });
nextPage.addEventListener('click', () => {
  if (currentPage === PAGE_COUNT - 1) {
    currentPage = 0;
    placeSheets();
    return;
  }
  turn(1);
});

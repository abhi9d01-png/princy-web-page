const paper = document.querySelector('.paper');
const chapters = [...document.querySelectorAll('.chapter')];
const eyebrow = document.querySelector('#eyebrow');
const title = document.querySelector('#title');
const body = document.querySelector('#body');
const pageNumber = document.querySelector('#page-number');
let current = 0;

function showChapter(index) {
  const chapter = chapters[index];
  if (!chapter || index === current && paper.dataset.ready) return;

  const update = () => {
    eyebrow.textContent = chapter.dataset.eyebrow;
    title.innerHTML = chapter.dataset.title.replace('|', '<br />');
    body.textContent = chapter.dataset.body;
    pageNumber.textContent = chapter.dataset.page;
    paper.classList.remove('is-turning');
    paper.dataset.ready = 'true';
  };

  if (paper.dataset.ready && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paper.classList.add('is-turning');
    window.setTimeout(update, 360);
  } else {
    update();
  }
  current = index;
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries.find((entry) => entry.isIntersecting);
  if (visible) showChapter(chapters.indexOf(visible.target));
}, { threshold: 0.55 });

chapters.forEach((chapter) => observer.observe(chapter));
showChapter(0);

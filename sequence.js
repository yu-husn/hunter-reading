const scenes = [
  {
    title: '請求參與成年禮',
    summary: '「我」在外地求學、工作多年，希望補上未能親身參與傳統禮儀的遺憾，便請雅爸轉達心願。',
    clue: '出發以前，「我」先找人轉達心願，交代了這趟試煉的起因。'
  },
  {
    title: '跟隨老獵人上山',
    summary: '抵達山中營地後，「我」依照諾基斯的吩咐生火，聽他談狩獵的意義與成年禮的禁忌。',
    clue: '有了篝火與入夜的談話，才接得上隔天清晨的考驗。'
  },
  {
    title: '獨自走進山林',
    summary: '天快亮時，老獵人讓「我」獨自深入山林。「我」少了長輩陪伴，一時不知往哪裡找山豬。',
    clue: '老獵人離開身邊後，「我」才得靠自己尋找蹤跡。'
  },
  {
    title: '在溪邊發現蹄印',
    summary: '「我」來到山谷，在溪邊的濕泥上發現蹄印，循著蹤跡尋找山豬。',
    clue: '先發現蹤跡，才有線索選擇在哪裡等候。'
  },
  {
    title: '躲在岩石後等候',
    summary: '「我」回到山谷，在芒草遮住的巨岩後伏下，等山豬黃昏到溪邊喝水。',
    clue: '這時山豬還沒有現身。等候是下一段交鋒的前提。'
  },
  {
    title: '初次交鋒落空',
    summary: '山豬現身後，「我」出手，卻被山豬撞開。回過神來，眼前只剩空寂的樹林。',
    clue: '這是第一次交鋒。後來再聽見草叢的動靜，「我」才看見母豬帶著幼豬。'
  },
  {
    title: '看見母豬帶著幼豬',
    summary: '山豬再次出現，身後跟著三隻小山豬。「我」於心不忍，最後空手回營地。',
    clue: '看見小山豬，才能理解「我」回營後為何說自己一時心軟。'
  },
  {
    title: '聽老獵人開導',
    summary: '「我」為錯失機會而懊惱。老獵人談起勇敢、智慧與愛，也提醒「我」要替下一代留下山林裡的生命。',
    clue: '回營後的談話回應了先前的選擇，也讓「我」重新思考好獵人的特質。'
  }
];

const sequence = document.querySelector('#sequence');
const cards = sequence.querySelector('.sequence-cards');
const status = sequence.querySelector('.sequence-status');
const solution = sequence.querySelector('.sequence-solution');
const initialOrder = [4, 1, 6, 3, 7, 0, 5, 2];
let order = [...initialOrder];
let sequenceTouched = false;
let sequenceLocked = true;

function renderCards() {
  cards.replaceChildren();
  order.forEach((sceneIndex, position) => {
    const { title, summary } = scenes[sceneIndex];
    const card = document.createElement('li');
    card.className = 'scene-card';
    const art = document.createElement('span');
    art.className = 'scene-art';
    art.style.backgroundPosition = (sceneIndex % 4) / 3 * 100 + '% ' + (sceneIndex < 4 ? 0 : 100) + '%';
    art.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = (position + 1) + '．' + title;
    const description = document.createElement('p');
    description.textContent = summary;
    copy.append(heading, description);
    if (sequenceLocked && !solution.hidden) {
      const points = sequenceTouched && sceneIndex === position ? 2.5 : 0;
      const score = document.createElement('p');
      score.className = 'item-score';
      score.textContent = points + '／2.5 分';
      copy.append(score);
    }
    const controls = document.createElement('div');
    controls.className = 'scene-controls';
    for (const step of [-1, 1]) {
      const button = document.createElement('button');
      const label = step === -1 ? '上移' : '下移';
      const destination = position + step;
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = (step === -1 ? '↑ ' : '↓ ') + label;
      button.setAttribute('aria-label', label + '：' + title);
      button.disabled = sequenceLocked || destination < 0 || destination >= order.length;
      button.addEventListener('click', () => {
        if (!assessmentIsActive()) return;
        sequenceTouched = true;
        [order[position], order[destination]] = [order[destination], order[position]];
        renderCards();
        status.textContent = '「' + title + '」已移到第 ' + (destination + 1) + ' 位。';
        const moved = cards.children[destination];
        const sameDirection = moved.querySelectorAll('button')[step === -1 ? 0 : 1];
        (sameDirection.disabled ? moved.querySelector('button:not(:disabled)') : sameDirection).focus();
      });
      controls.append(button);
    }
    card.append(art, copy, controls);
    cards.append(card);
  });
}

const shuffleButton = sequence.querySelector('.sequence-reset');
shuffleButton.addEventListener('click', () => {
  if (!assessmentIsActive()) return;
  const previous = order.join();
  do {
    order = scenes.map((_, index) => index);
    for (let index = order.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
  } while (order.join() === previous || order.every((sceneIndex, position) => sceneIndex === position));
  solution.open = false;
  sequenceTouched = false;
  renderCards();
  status.textContent = '卡片已打亂，可以重新作答。';
});

function setSequenceState(state) {
  sequenceLocked = state !== 'active';
  shuffleButton.disabled = sequenceLocked;
  solution.hidden = state !== 'submitted';
  solution.open = false;
  if (state !== 'submitted') {
    order = [...initialOrder];
    sequenceTouched = false;
    status.textContent = '';
  }
  renderCards();
}

function gradeSequence() {
  const correct = sequenceTouched ? order.filter((sceneIndex, position) => sceneIndex === position).length : 0;
  status.textContent = sequenceTouched ? '排對 ' + correct + '／8 張' : '段落排序未作答';
  return correct * 2.5;
}

const explanations = solution.querySelector('ol');
scenes.forEach(({ title, clue }) => {
  const item = document.createElement('li');
  const heading = document.createElement('strong');
  heading.textContent = title;
  item.append(heading, '。' + clue);
  explanations.append(item);
});
setSequenceState('ready');

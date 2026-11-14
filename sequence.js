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
    clue: '「我」先在溪邊發現蹄印，再循著蹤跡找山豬。'
  },
  {
    title: '躲在岩石後等候',
    summary: '初次交鋒落空後，「我」回到山谷，在芒草遮住的巨岩後伏下，等山豬再到溪邊喝水。',
    clue: '這是第一次交鋒失手後的等候。接著，「我」才看見母豬帶著幼豬。'
  },
  {
    title: '初次交鋒落空',
    summary: '山豬現身後，「我」出手，卻被山豬撞開。回過神來，眼前只剩空寂的樹林。',
    clue: '第一次交鋒失手後，「我」才回到山谷，躲在岩石後等候。'
  },
  {
    title: '看見母豬帶著幼豬',
    summary: '山豬再次出現，身後跟著三隻小山豬。「我」於心不忍，最後空手回營地。',
    clue: '看見小山豬，才能理解「我」回營後為何說自己一時心軟。'
  },
  {
    title: '聽老獵人最後的開導',
    summary: '「我」為錯失機會而懊惱。老獵人談起勇敢、智慧與愛，也提醒「我」要替下一代留下山林裡的生命。',
    clue: '回營後的談話回應了先前的選擇，也讓「我」重新思考好獵人的特質。'
  }
];

const sequence = document.querySelector('#sequence');
const slots = sequence.querySelector('.sequence-slots');
const cards = sequence.querySelector('.sequence-cards');
const tray = sequence.querySelector('.sequence-tray');
const status = sequence.querySelector('.sequence-status');
const solution = sequence.querySelector('.sequence-solution');
const shuffleButton = sequence.querySelector('.sequence-reset');
const returnButton = sequence.querySelector('.sequence-return');
const initialOrder = [4, 1, 6, 3, 7, 0, 5, 2];
const sequenceAnswerOrder = [0, 1, 2, 3, 5, 4, 6, 7];
let trayOrder = [...initialOrder];
let placements = Array(scenes.length).fill(null);
let selectedScene = null;
let draggingScene = null;
let sequenceLocked = true;

function makeSceneArt(sceneIndex) {
  const art = document.createElement('span');
  art.className = 'scene-art';
  art.style.backgroundPosition = (sceneIndex % 4) / 3 * 100 + '% ' +
    (sceneIndex < 4 ? 0 : 100) + '%';
  art.setAttribute('aria-hidden', 'true');
  return art;
}

function selectScene(sceneIndex) {
  selectedScene = selectedScene === sceneIndex ? null : sceneIndex;
  sequence.querySelectorAll('[data-scene]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.scene) === selectedScene));
  });
  returnButton.hidden = selectedScene === null || !placements.includes(selectedScene);
  status.textContent = selectedScene === null ? '已取消選取。' :
    '已選「' + scenes[selectedScene].title + '」，請選上方的格子。';
  if (selectedScene !== null) {
    const firstSlot = slots.querySelector('button');
    firstSlot.focus({ preventScroll: true });
    const bar = document.querySelector('.assessment-bar');
    if (firstSlot.getBoundingClientRect().top < bar.getBoundingClientRect().bottom) {
      firstSlot.scrollIntoView({ block: 'start' });
    }
  }
}

function moveScene(sceneIndex, destination) {
  if (!assessmentIsActive()) return;
  const previous = placements.indexOf(sceneIndex);
  if (destination === null) {
    if (previous === -1) return;
    placements[previous] = null;
  } else if (previous !== destination) {
    if (previous !== -1) placements[previous] = placements[destination];
    placements[destination] = sceneIndex;
  }
  selectedScene = null;
  renderCards();
  const placed = placements.filter(index => index !== null).length;
  status.textContent = '「' + scenes[sceneIndex].title + '」已' +
    (destination === null ? '放回下方' : '放入第 ' + (destination + 1) + ' 格') +
    '。已放置 ' + placed + '／8 張。';
  const target = destination === null
    ? cards.querySelector('[data-scene="' + sceneIndex + '"]')
    : slots.children[destination].querySelector('button');
  target.focus({ preventScroll: true });
}

function addDrag(button, sceneIndex) {
  button.draggable = !sequenceLocked;
  button.addEventListener('dragstart', event => {
    if (!assessmentIsActive()) {
      event.preventDefault();
      return;
    }
    draggingScene = sceneIndex;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', scenes[sceneIndex].title);
  });
  button.addEventListener('dragend', () => {
    draggingScene = null;
    sequence.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
  });
}

function addDrop(target, destination) {
  function acceptDrag(event) {
    if (draggingScene === null || sequenceLocked) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    target.classList.add('is-drop-target');
  }
  target.addEventListener('dragenter', acceptDrag);
  target.addEventListener('dragover', acceptDrag);
  target.addEventListener('dragleave', event => {
    if (!target.contains(event.relatedTarget)) target.classList.remove('is-drop-target');
  });
  target.addEventListener('drop', event => {
    if (draggingScene === null) return;
    event.preventDefault();
    target.classList.remove('is-drop-target');
    const sceneIndex = draggingScene;
    draggingScene = null;
    moveScene(sceneIndex, destination);
  });
}

function makeTile(sceneIndex, position) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sequence-tile';
  button.disabled = sequenceLocked;
  const inSlot = position !== undefined;
  if (inSlot) {
    const number = document.createElement('span');
    number.className = 'sequence-number';
    number.textContent = position + 1;
    button.append(number);
  }
  if (sceneIndex === null) {
    button.append('空格');
  } else {
    const { title, summary } = scenes[sceneIndex];
    button.dataset.scene = sceneIndex;
    button.title = summary;
    button.setAttribute('aria-pressed', String(selectedScene === sceneIndex));
    const heading = document.createElement('span');
    heading.className = 'sequence-title';
    heading.textContent = title;
    button.append(makeSceneArt(sceneIndex), heading);
    addDrag(button, sceneIndex);
  }
  button.addEventListener('click', () => {
    if (!assessmentIsActive()) return;
    if (inSlot && selectedScene !== null && selectedScene !== sceneIndex) {
      moveScene(selectedScene, position);
    } else if (sceneIndex !== null) {
      selectScene(sceneIndex);
    }
  });
  return button;
}

function renderCards() {
  slots.replaceChildren();
  cards.replaceChildren();
  returnButton.hidden = selectedScene === null || !placements.includes(selectedScene);
  placements.forEach((sceneIndex, position) => {
    const slot = document.createElement('li');
    slot.append(makeTile(sceneIndex, position));
    addDrop(slot, position);
    if (!solution.hidden) {
      const score = document.createElement('span');
      score.className = 'item-score';
      score.textContent = (sceneIndex === sequenceAnswerOrder[position] ? '2.5' : '0') + '／2.5 分';
      slot.append(score);
    }
    slots.append(slot);
  });
  trayOrder.filter(sceneIndex => !placements.includes(sceneIndex)).forEach(sceneIndex => {
    const item = document.createElement('li');
    item.append(makeTile(sceneIndex));
    cards.append(item);
  });
}

addDrop(tray, null);
returnButton.addEventListener('click', () => moveScene(selectedScene, null));
shuffleButton.addEventListener('click', () => {
  if (!assessmentIsActive()) return;
  const previous = trayOrder.join();
  do {
    for (let index = trayOrder.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [trayOrder[index], trayOrder[other]] = [trayOrder[other], trayOrder[index]];
    }
  } while (trayOrder.join() === previous || trayOrder.every((sceneIndex, position) => sceneIndex === sequenceAnswerOrder[position]));
  placements.fill(null);
  selectedScene = null;
  renderCards();
  status.textContent = '圖卡已打亂。已放置 0／8 張。';
});

function setSequenceState(state) {
  sequenceLocked = state !== 'active';
  shuffleButton.disabled = sequenceLocked;
  solution.hidden = state !== 'submitted';
  solution.open = false;
  selectedScene = null;
  draggingScene = null;
  if (state !== 'submitted') {
    trayOrder = [...initialOrder];
    placements.fill(null);
    status.textContent = '已放置 0／8 張。';
  }
  renderCards();
}

function gradeSequence() {
  const correct = placements.filter((sceneIndex, position) => sceneIndex === sequenceAnswerOrder[position]).length;
  status.textContent = placements.some(sceneIndex => sceneIndex !== null)
    ? '排對 ' + correct + '／8 張。' : '段落排序未作答。';
  return correct * 2.5;
}

const explanations = solution.querySelector('ol');
sequenceAnswerOrder.forEach(sceneIndex => {
  const { title, clue } = scenes[sceneIndex];
  const item = document.createElement('li');
  const heading = document.createElement('strong');
  heading.textContent = title;
  item.append(heading, '。' + clue);
  explanations.append(item);
});
setSequenceState('ready');

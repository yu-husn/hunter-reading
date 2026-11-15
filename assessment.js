const duration = 25 * 60;
const passingScore = 60;
const assessmentBar = document.querySelector('.assessment-bar');
const clock = document.querySelector('#countdown');
const clockProgress = document.querySelector('#countdown-progress');
const clockWarning = document.querySelector('#countdown-warning');
const message = document.querySelector('#assessment-message');
const startButton = document.querySelector('#start-assessment');
const introStart = document.querySelector('#intro-start');
const openingHunter = document.querySelector('.story-hunter');
const openingCopy = document.querySelector('.story-copy');
const replayWalk = document.querySelector('#replay-walk');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function loadOpeningImage(path) {
  const image = new Image();
  image.src = path;
  return image.decode().catch(() => {});
}

const openingBackgroundReady = loadOpeningImage('opening-forest.webp');
const openingSpriteReady = loadOpeningImage('opening-walk.webp');
let openingPlayback = 0;

async function playOpening() {
  const playback = ++openingPlayback;
  openingCopy.inert = true;
  openingHunter.toggleAttribute('data-waiting', true);
  openingHunter.classList.remove('is-walking');

  if (!reducedMotion.matches) {
    await openingBackgroundReady;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await openingSpriteReady;
  }
  if (playback !== openingPlayback) return;

  openingHunter.removeAttribute('data-waiting');
  openingHunter.classList.toggle('is-walking', !reducedMotion.matches);
  openingCopy.inert = false;
}

replayWalk.onclick = playOpening;
playOpening();
const roleForm = document.querySelector('#role-form');
const roleOptions = roleForm.querySelector('fieldset');
const currentRole = document.querySelector('#current-role');
const roles = {
  elder: { label: '雅隆．諾基斯', cues: [
    '想想你要怎麼引導這位想參加成年禮的年輕人。',
    '回想你在何時放手讓他嘗試，再看他如何寫出林中的挫折。',
    '如果你要在火邊開導他，哪些經歷值得拿來談？他又會怎麼把這段故事傳下去？'
  ] },
  author: { label: '瓦歷斯．諾幹', cues: [
    '回想你為什麼想入山，以及你原本期待怎樣回家。',
    '想想你怎麼從林中目光找線索，又怎麼用景物寫出失手後的心情。',
    '回想放過母豬的那一刻。諾基斯的話，如何改變你對試煉和這片山林的理解？'
  ] }
};
let playerRole = null;
const submissionHint = document.querySelector('#submission-hint');
const passResult = document.querySelector('#pass-result');
const hunterEnding = document.querySelector('#hunter-ending');
const endingFrames = [...hunterEnding.querySelectorAll('.ending-scene > img:not(.ending-mouth)')];
const replayEnding = document.querySelector('#replay-ending');
const corrections = document.querySelector('#corrections');
const correctionsForm = document.querySelector('#corrections-form');
const correctionsItems = document.querySelector('#corrections-items');
const correctionsSummary = document.querySelector('#corrections-summary');
const correctionsResults = document.querySelector('#corrections-results');
const totalScore = document.querySelector('#total-score');
const scoreLabel = totalScore.closest('.score-label');
const scoreHome = scoreLabel.parentElement;
const assessmentResult = document.querySelector('#assessment-result');
let originalScore = 0;
let recoveredPoints = 0;
let correctionItems = [];
try {
  localStorage.removeItem('hunter-reading-attempt-v1');
} catch {
  // Some browsers block access to storage.
}
window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
let endingPlayback = 0;

async function playHunterEnding() {
  const playback = ++endingPlayback;
  hunterEnding.classList.remove('ending-playing');
  hunterEnding.querySelectorAll('img').forEach(frame => { frame.loading = 'eager'; });
  try {
    await Promise.all(endingFrames.map(frame => frame.decode()));
  } catch {
    return;
  }
  if (playback !== endingPlayback || hunterEnding.hidden) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (playback === endingPlayback && !hunterEnding.hidden) {
      hunterEnding.classList.add('ending-playing');
    }
  }));
}
replayEnding.onclick = playHunterEnding;
const restartButton = document.querySelector('#restart-assessment');
const readingProgress = document.querySelector('#reading-progress');
let state = 'ready';
let deadline = 0;
let timer;
let confirmingSubmission = false;

const stationLinks = [...document.querySelectorAll('.assessment-nav a')];
const stations = stationLinks.map(link => document.querySelector(link.hash));
const previousStation = document.querySelector('#previous-station');
const nextStation = document.querySelector('#next-station');
const stationProgress = document.querySelector('#station-progress');
const unfinishedLinks = document.querySelector('#unfinished-links');
let currentStation = 0;

function incompleteActivities() {
  const activities = [
    ['作家介紹', authorQuiz.choices(), '題'],
    ['段落大意排序', placements, '格'],
    ['修辭', pairs.map((_, index) => assignments.get(index) ?? null), '題'],
    ['閱讀測驗', readingQuiz.choices(), '題']
  ];
  return activities.map(([label, answers, unit], station) => ({
    label, station, unit, first: answers.indexOf(null), count: answers.filter(answer => answer === null).length
  })).filter(activity => activity.count > 0);
}

function goToUnfinished({ station, first }) {
  goToStation(station);
  let target;
  if (station === 0) target = document.querySelectorAll('#author-questions fieldset')[first];
  if (station === 1) target = slots.children[first].querySelector('button');
  if (station === 2) target = imagery.querySelector('[data-pair-slot="' + first + '"] button');
  if (station === 3) {
    showReadingGroup(readingGroups.findIndex(([, indexes]) => indexes.includes(first)));
    target = readingFields[first];
  }
  target.scrollIntoView({ block: 'start' });
  target.focus({ preventScroll: true });
}

function onFinalReadingPage() {
  return currentStation === stations.length - 1 && currentGroup === readingGroups.length - 1;
}

function rhetoricIncomplete() {
  return state === 'active' && stations[currentStation].id === 'imagery' && assignments.size < pairs.length;
}

function updateSubmissionControls() {
  const lastStation = currentStation === stations.length - 1;
  const finalPage = state === 'active' && onFinalReadingPage();
  const blockedByPairs = rhetoricIncomplete();
  const incomplete = finalPage || blockedByPairs ? incompleteActivities() : [];
  const canSubmit = finalPage && incomplete.length === 0;
  if (!canSubmit && confirmingSubmission) {
    confirmingSubmission = false;
    if (state === 'active') message.textContent = '作答中。';
  }
  nextStation.textContent = lastStation ? (confirmingSubmission ? '確認交卷' : '交卷') : '下一站';
  nextStation.hidden = lastStation && !canSubmit;
  nextStation.disabled = blockedByPairs;
  let hint = '';
  if (nextStation.disabled) {
    hint = '第三關已配對 ' + assignments.size + '／' + pairs.length + ' 題。完成轉化與譬喻後即可前往下一站。';
  } else if (incomplete.length) {
    hint = '完成下列題目後即可交卷。';
  }
  submissionHint.hidden = !hint;
  if (submissionHint.textContent !== hint) submissionHint.textContent = hint;
  const links = blockedByPairs ? incomplete.filter(item => item.station === 2) : incomplete;
  unfinishedLinks.hidden = links.length === 0;
  const linkButtons = links.map(activity => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '前往' + activity.label + '（還差 ' + activity.count + ' ' + activity.unit + '）';
    button.onclick = () => goToUnfinished(activity);
    return button;
  });
  unfinishedLinks.replaceChildren(...linkButtons);
}

function showStation(index, moveFocus = false) {
  currentStation = index;
  stations.forEach((station, stationIndex) => {
    station.hidden = stationIndex !== index;
    if (stationIndex === index) stationLinks[stationIndex].setAttribute('aria-current', 'step');
    else stationLinks[stationIndex].removeAttribute('aria-current');
  });
  previousStation.disabled = index === 0;
  updateSubmissionControls();
  stationProgress.textContent = '第 ' + (index + 1) + ' 站／共 ' + stations.length + ' 站';
  if (moveFocus) {
    stations[index].scrollIntoView();
    stations[index].focus({ preventScroll: true });
  }
}

function goToStation(index) {
  if (index > currentStation && rhetoricIncomplete()) {
    submissionHint.focus();
    return;
  }
  const hash = stationLinks[index].hash;
  if (location.hash !== hash) history.pushState(null, '', hash);
  showStation(index, true);
}

function showStationFromAddress() {
  const index = stationLinks.findIndex(link => link.hash === location.hash);
  showStation(Math.max(0, index), index >= 0);
}

stationLinks.forEach((link, index) => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  goToStation(index);
}));
previousStation.onclick = () => goToStation(currentStation - 1);
nextStation.onclick = () => {
  if (currentStation === stations.length - 1) requestSubmission();
  else goToStation(currentStation + 1);
};
window.addEventListener('hashchange', showStationFromAddress);

function assessmentIsActive() {
  if (state === 'active' && Date.now() >= deadline) finishAssessment(true);
  return state === 'active';
}

function formatChoice(text, index) {
  return 'ABCD'[index] + '. ' + text.trimEnd().replace(/。$/u, '');
}

function makeQuestions(containerId, questions, points, scoreId) {
  const container = document.querySelector('#' + containerId);
  const fields = questions.map(([skill, prompt, options, answer, explanation], index) => {
    const field = document.createElement('fieldset');
    field.tabIndex = -1;
    const legend = document.createElement('legend');
    legend.textContent = (index + 1) + '．' + prompt;
    const caption = document.createElement('small');
    caption.textContent = skill + '・' + points + ' 分';
    field.append(legend, caption);
    const choices = options.map(formatChoice);
    choices.forEach((option, optionIndex) => {
      const label = document.createElement('label');
      label.className = 'option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = containerId + '-' + index;
      input.value = optionIndex;
      label.append(input, option);
      field.append(label);
    });
    const feedback = document.createElement('p');
    feedback.className = 'feedback';
    feedback.hidden = true;
    field.append(feedback);
    container.append(field);
    return { field, options: choices, answer, explanation, feedback };
  });
  return {
    choices() {
      return fields.map(({ field }) => {
        const choice = field.querySelector('input:checked');
        return choice ? Number(choice.value) : null;
      });
    },
    mistakes() {
      return fields.flatMap(({ field, options, answer, explanation }, index) => {
        const choice = field.querySelector('input:checked');
        const previous = choice ? Number(choice.value) : null;
        return previous === answer ? [] : [{ prompt: questions[index][1], number: index + 1, options, answer, previous, explanation }];
      });
    },
    reset(active) {
      fields.forEach(({ field, feedback }) => {
        field.disabled = !active;
        field.querySelectorAll('input').forEach(input => { input.checked = false; });
        feedback.hidden = true;
      });
    },
    grade() {
      const score = fields.reduce((sum, { field, options, answer, explanation, feedback }) => {
        const choice = field.querySelector('input:checked');
        const earned = choice && Number(choice.value) === answer ? points : 0;
        field.disabled = true;
        feedback.textContent = earned + '／' + points + ' 分' + (choice ? '。' : '（未作答）。') +
          '正確答案是「' + options[answer] + '」。' + explanation;
        feedback.hidden = earned === 0;
        return sum + earned;
      }, 0);
      document.querySelector('#' + scoreId).textContent += '｜得分 ' + score + ' 分';
      return score;
    },
    reveal(number) {
      fields[number - 1].feedback.hidden = false;
    }
  };
}

const authorQuiz = makeQuestions('author-questions', authorQuestions, 2.5, 'author-score');
const readingGroups = [
  ['理解「我」的動機與選擇', [0, 1, 2, 3, 4], 0, '從第 3、4 段讀出「我」為何上山，再追蹤他獨自入山後的心情，以及兩次遇見山豬時的反應。'],
  ['走進林中｜找線索，讀寫法', [5, 6, 7, 8, 9], 3, '把林中的目光和回營後的問話接起來，推論老獵人的帶領方式。再看看作者怎麼補述往事、留下空白，運用技巧讓文章更優美。'],
  ['回到火邊｜讀懂試煉的意義', [10, 11, 12, 13, 14], 7, '空手回營的「我」還在懊惱。聽完諾基斯的話，再回看一路留下的伏筆和首尾的山林描寫，想想這場試煉留下了什麼。']
];
const readingQuiz = makeQuestions('reading-questions',
  readingGroups.flatMap(([, indexes]) => indexes.map(index => readingQuestions[index])),
  2.5, 'quiz-score');
const readingFields = [...document.querySelectorAll('#reading-questions fieldset')];
const groupButtons = [...document.querySelectorAll('#reading-groups button')];
const groupTitle = document.querySelector('#reading-group-title');
const readingSceneArt = document.querySelector('#reading-scene-art');
const readingSceneIntro = document.querySelector('#reading-scene-intro');
const readingRoleCue = document.querySelector('#reading-role-cue');
const evidenceChallenge = document.querySelector('#evidence-challenge');
const evidenceSteps = [
  { index: 5, label: '第一步・判斷帶領方式' },
  { index: 6, label: '第二步・找出課文證據' }
];
for (const { index, label } of evidenceSteps) {
  const field = readingFields[index];
  field.classList.add('evidence-step');
  const heading = document.createElement('span');
  heading.textContent = label;
  field.querySelector('legend').prepend(heading);
}
let currentGroup = 0;

function showReadingGroup(index, focus = false) {
  currentGroup = index;
  const [title, , scene, intro] = readingGroups[index];
  groupTitle.textContent = title;
  readingSceneArt.style.backgroundPosition = makeSceneArt(scene).style.backgroundPosition;
  readingSceneIntro.textContent = intro;
  readingRoleCue.hidden = playerRole === null;
  readingRoleCue.textContent = playerRole?.cues[index] ?? '';
  const visibleQuestions = readingGroups[index][1];
  evidenceChallenge.hidden = !evidenceSteps.some(step => visibleQuestions.includes(step.index));
  readingFields.forEach((field, question) => {
    field.hidden = !visibleQuestions.includes(question);
  });
  groupButtons.forEach((button, group) => {
    const questions = readingGroups[group][1];
    const answered = questions.filter(question => readingFields[question].querySelector('input:checked')).length;
    button.textContent = '第 ' + (questions[0] + 1) + '–' + (questions.at(-1) + 1) +
      ' 題 · ' + answered + '／' + questions.length;
    button.setAttribute('aria-pressed', String(group === index));
  });
  document.querySelector('#previous-group').disabled = index === 0;
  document.querySelector('#next-group').hidden = index === readingGroups.length - 1;
  updateSubmissionControls();
  if (focus) {
    groupTitle.closest('.reading-scene').scrollIntoView({ block: 'start' });
    groupTitle.focus({ preventScroll: true });
  }
}

groupButtons.forEach((button, index) => {
  button.onclick = () => showReadingGroup(index, true);
});
document.querySelector('#previous-group').onclick = () => showReadingGroup(currentGroup - 1, true);
document.querySelector('#next-group').onclick = () => showReadingGroup(currentGroup + 1, true);
showReadingGroup(0);
const scoreLabels = [...document.querySelectorAll('.section-score')].map(node => [node, node.textContent]);

const imagery = document.querySelector('#imagery');
const pairFeedback = document.querySelector('#pairFeedback');
const pairResults = document.querySelector('#pair-results');
const pairReset = document.querySelector('#pairReset');
const pairJumpButtons = [...imagery.querySelectorAll('.pair-jump')];
pairJumpButtons.forEach(button => {
  const heading = document.getElementById(button.dataset.pairHeading);
  button.onclick = () => {
    heading.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
  };
});
const pairOrders = [[2, 4, 0, 3, 1], [8, 13, 5, 10, 7, 14, 6, 12, 9, 11]];
const pairGroups = [...imagery.querySelectorAll('.pair-group')].map((group, index) => ({
  order: pairOrders[index],
  slots: group.querySelector('.sequence-slots'),
  cards: group.querySelector('.sequence-cards'),
  tray: group.querySelector('.sequence-tray'),
  progress: pairJumpButtons[index].querySelector('.pair-progress'),
  returnButton: group.querySelector('.pair-return')
}));
const assignments = new Map();
let selectedImage = null;
let draggedImage = null;

const rhetoricMotions = {
  0: { duration: 760, keyframes: [
    { transform: 'translateY(8%) scale(.97)' },
    { transform: 'translateY(-3%) scale(1.07)', offset: .7 },
    { transform: 'none' }
  ] },
  1: { duration: 850, keyframes: [
    { transform: 'scale(.94)', filter: 'brightness(1.05)' },
    { transform: 'scale(1.12)', filter: 'brightness(.76)', offset: .75 },
    { transform: 'none', filter: 'none' }
  ] },
  2: { duration: 920, keyframes: [
    { filter: 'brightness(.8)' },
    { filter: 'brightness(1.18)', offset: .38 },
    { filter: 'brightness(.95)', offset: .65 },
    { filter: 'none' }
  ] },
  3: { duration: 980, keyframes: [
    { transform: 'translateY(12%)', filter: 'brightness(.75)' },
    { transform: 'none', filter: 'none' }
  ] },
  4: { duration: 720, keyframes: [
    { transform: 'none' },
    { transform: 'rotate(-5deg) translateX(-3%)' },
    { transform: 'rotate(5deg) translateX(3%)' },
    { transform: 'rotate(-3deg)' },
    { transform: 'none' }
  ] },
  5: { duration: 660, keyframes: [
    { transform: 'translate(-12%, -20%) scale(.85)' },
    { transform: 'translate(4%, 9%) scale(1.1)', offset: .72 },
    { transform: 'none' }
  ] },
  6: { duration: 520, keyframes: [
    { transform: 'translate(27%, -22%)', opacity: .55 },
    { transform: 'translate(-8%, 7%)', opacity: 1, offset: .65 },
    { transform: 'none' }
  ] },
  7: { duration: 740, keyframes: [
    { transform: 'translate(-12%, 8%) rotate(-8deg)' },
    { transform: 'translate(9%, -9%) rotate(5deg)', offset: .72 },
    { transform: 'none' }
  ] },
  8: { duration: 850, keyframes: [
    { transform: 'none' },
    { transform: 'scale(1.18)', offset: .55 },
    { transform: 'none' }
  ] },
  9: { duration: 950, keyframes: [
    { transform: 'none' },
    { transform: 'translateY(3%) rotate(-6deg)' },
    { transform: 'translateY(-3%) rotate(6deg)' },
    { transform: 'none' }
  ] },
  10: { duration: 860, keyframes: [
    { opacity: .5, transform: 'scale(.92)' },
    { opacity: 1, transform: 'none' }
  ] },
  11: { duration: 480, keyframes: [
    { transform: 'translateX(-18%)' },
    { transform: 'translateX(8%)', offset: .7 },
    { transform: 'none' }
  ] },
  12: { duration: 720, keyframes: [
    { transform: 'none' },
    { transform: 'translate(15%, -4%) rotate(13deg)', offset: .65 },
    { transform: 'none' }
  ] },
  13: { duration: 640, keyframes: [
    { transform: 'none' },
    { transform: 'scale(1.12)' },
    { transform: 'none' }
  ] },
  14: { duration: 980, keyframes: [
    { filter: 'brightness(.82)' },
    { filter: 'brightness(1.15)' },
    { filter: 'none' }
  ] }
};

function animateRhetoricCard(button, index) {
  const motion = rhetoricMotions[index];
  if (!motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const art = button.querySelector('.pair-art');
  art.getAnimations().forEach(animation => animation.cancel());
  return art.animate(motion.keyframes, { duration: motion.duration, easing: 'ease-in-out' });
}

function showPairSelection() {
  imagery.querySelectorAll('[data-image]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.image) === selectedImage));
  });
  const placed = [...assignments.values()].includes(selectedImage);
  pairGroups.forEach(({ order, returnButton }) => {
    returnButton.hidden = !placed || !order.includes(selectedImage);
  });
}

function selectPairImage(index, button) {
  selectedImage = selectedImage === index ? null : index;
  showPairSelection();
  pairFeedback.textContent = selectedImage === null ? '已取消選取。' :
    '已選「' + pairs[index][1] + '」，請選上方的課文句子。';
  if (selectedImage !== null) {
    const firstSlot = button.closest('.pair-group').querySelector('.sequence-slots button');
    firstSlot.focus({ preventScroll: true });
    const revealSlots = () => {
      if (selectedImage === index && document.activeElement === firstSlot &&
          firstSlot.getBoundingClientRect().top < assessmentBar.getBoundingClientRect().bottom) {
        firstSlot.scrollIntoView({ block: 'start' });
      }
    };
    const animation = animateRhetoricCard(button, index);
    if (animation) animation.onfinish = revealSlots;
    else revealSlots();
  }
}

function movePairImage(index, destination) {
  if (!assessmentIsActive()) return;
  const group = pairGroups.find(({ order }) => order.includes(index));
  if (!group || (destination !== null && !group.order.includes(destination))) return;
  const previous = [...assignments].find(([, image]) => image === index)?.[0];
  if (previous !== undefined) {
    if (assignments.has(destination)) assignments.set(previous, assignments.get(destination));
    else assignments.delete(previous);
  }
  if (destination !== null) assignments.set(destination, index);
  selectedImage = null;
  renderPairs();
  pairFeedback.textContent = '已配對 ' + assignments.size + '／' + pairs.length + ' 題。交卷前可修改。';
  const target = destination === null
    ? group.cards.querySelector('[data-image="' + index + '"]')
    : group.slots.querySelector('[data-pair-slot="' + destination + '"] button');
  target.focus({ preventScroll: true });
  if (destination !== null) animateRhetoricCard(target, index);
}

function makePairTile(imageIndex, destination = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sequence-tile';
  button.disabled = state !== 'active';
  if (destination !== null) {
    const number = document.createElement('span');
    number.className = 'sequence-number';
    number.textContent = destination + 1;
    const phrase = document.createElement('span');
    phrase.className = 'sequence-title';
    phrase.textContent = pairs[destination][0];
    button.append(number, phrase);
  }
  if (imageIndex === undefined) {
    const placeholder = document.createElement('span');
    placeholder.className = 'pair-placeholder';
    placeholder.textContent = '空格';
    button.append(placeholder);
  } else {
    const frame = document.createElement('span');
    frame.className = 'pair-art-frame';
    frame.setAttribute('aria-hidden', 'true');
    const art = document.createElement('span');
    art.className = 'pair-art';
    art.style.backgroundPosition = pairs[imageIndex][3];
    if (imageIndex < 5) art.classList.add('pair-art-personification');
    if (imageIndex === 2) art.classList.add('pair-art-campfire');
    if (imageIndex >= 9 && imageIndex !== 12) art.classList.add('pair-art-extra');
    if (imageIndex === 12) art.classList.add('pair-art-leaf');
    frame.append(art);
    button.dataset.image = imageIndex;
    button.draggable = !button.disabled;
    const effect = document.createElement('span');
    effect.className = 'sequence-title rhetoric-effect';
    effect.textContent = pairs[imageIndex][1];
    const clue = document.createElement('span');
    clue.className = 'rhetoric-clue';
    clue.textContent = (imageIndex < 5 ? '轉化線索｜' : '相似點｜') + pairs[imageIndex][4];
    button.append(frame, effect, clue);
  }
  button.onclick = () => {
    if (!assessmentIsActive()) return;
    const selectionMatchesGroup = pairGroups.some(({ order }) => order.includes(destination) && order.includes(selectedImage));
    if (selectionMatchesGroup && selectedImage !== imageIndex) {
      movePairImage(selectedImage, destination);
    } else if (imageIndex !== undefined) {
      selectPairImage(imageIndex, button);
    } else {
      pairFeedback.textContent = '請選這一組的意象圖卡。';
    }
  };
  return button;
}

function addPairDrop(target, destination, order) {
  function acceptDrag(event) {
    if (state !== 'active' || !order.includes(draggedImage)) return;
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
    if (!order.includes(draggedImage)) return;
    event.preventDefault();
    target.classList.remove('is-drop-target');
    const index = draggedImage;
    draggedImage = null;
    movePairImage(index, destination);
  });
}

imagery.addEventListener('dragstart', event => {
  const tile = event.target.closest('[data-image]');
  if (!tile || !assessmentIsActive()) {
    event.preventDefault();
    return;
  }
  draggedImage = Number(tile.dataset.image);
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', pairs[draggedImage][1]);
});
imagery.addEventListener('dragend', () => {
  draggedImage = null;
  imagery.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
});
pairGroups.forEach(({ tray, order, returnButton }) => {
  addPairDrop(tray, null, order);
  returnButton.onclick = () => movePairImage(selectedImage, null);
});

function renderPairs() {
  const used = [...assignments.values()];
  pairGroups.forEach(({ order, slots, cards, tray, progress }) => {
    slots.replaceChildren();
    cards.replaceChildren();
    [...order].sort((a, b) => a - b).forEach(index => {
      const slot = document.createElement('li');
      slot.dataset.pairSlot = index;
      slot.append(makePairTile(assignments.get(index), index));
      addPairDrop(slot, index, order);
      slots.append(slot);
    });
    order.filter(index => !used.includes(index)).forEach(index => {
      const item = document.createElement('li');
      item.append(makePairTile(index));
      cards.append(item);
    });
    tray.classList.remove('is-drop-target');
    const filled = order.filter(slot => assignments.has(slot)).length;
    progress.textContent = filled + '／' + order.length;
  });
  pairReset.disabled = state !== 'active';
  showPairSelection();
  updateSubmissionControls();
}

function resetPairs() {
  assignments.clear();
  selectedImage = null;
  draggedImage = null;
  renderPairs();
  pairFeedback.textContent = '已配對 0／' + pairs.length + ' 題';
}

pairReset.onclick = () => {
  if (!assessmentIsActive()) return;
  resetPairs();
};

function gradePairs() {
  let score = 0;
  pairs.forEach(([sentence, effect, explanation], index) => {
    const points = assignments.get(index) === index ? 2.5 : 0;
    score += points;
    const item = document.createElement('li');
    item.hidden = points === 0;
    const choice = assignments.has(index) ? pairs[assignments.get(index)][1] : '未作答';
    const heading = document.createElement('strong');
    heading.textContent = (index < 5 ? '轉化' : '譬喻') + '｜' + sentence;
    const result = document.createElement('p');
    result.textContent = points + '／2.5 分。你的配對：' + choice + '。正確配對：' + effect + '。';
    const analysis = document.createElement('p');
    analysis.textContent = explanation;
    item.append(heading, result, analysis);
    pairResults.append(item);
  });
  pairResults.hidden = false;
  return score;
}

function showTime(seconds) {
  const display = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
    String(seconds % 60).padStart(2, '0');
  if (clock.textContent !== display) clock.textContent = display;
  clockProgress.value = seconds;
  const urgent = state === 'active' && seconds > 0 && seconds <= 60;
  assessmentBar.toggleAttribute('data-urgent', urgent);
  const warning = urgent ? '最後 1 分鐘' : '';
  if (clockWarning.textContent !== warning) clockWarning.textContent = warning;
}

function updateTime() {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  showTime(remaining);
  if (remaining === 0) finishAssessment(true);
}

function updateResult(total) {
  totalScore.textContent = total + '／100';
  const passed = total >= passingScore;
  const firstPass = passed && hunterEnding.hidden;
  passResult.textContent = passed ? '闖關通過' : '尚未通過';
  passResult.dataset.passed = String(passed);
  passResult.hidden = false;
  hunterEnding.hidden = !passed;
  if (firstPass) {
    assessmentResult.scrollIntoView({ block: 'start', behavior: 'instant' });
    totalScore.focus({ preventScroll: true });
    playHunterEnding();
  }
  return firstPass;
}

function prepareCorrections() {
  const sceneOptions = scenes.map(scene => scene.title);
  const pairOptions = pairs.map(([, effect]) => effect);
  const readingHints = [
    '回讀第 4 段，留意「我」多年在外後仍惦記什麼。',
    '比較兩次遇見山豬時，「我」各做了什麼。',
    '把睡前對篝火的叮嚀，和「我」夜裡的感受一起讀。',
    '想想家人迎接的畫面對「我」有什麼意義。',
    '連著讀第 3、4 段，看看老獵人的話回應了「我」哪個心願。',
    '比較老獵人出發前做的安排，和回營後說的話。',
    '找一組能把林中的情況和回營後的對話連起來的細節。',
    '分辨事件真正發生的時間，以及作者安排它出現的位置。',
    '想想讀者看到刪節號時，還有哪些事需要從後文推知。',
    '把「訕笑」放回失手的情境，想想作者當時的感受。',
    '比較保留和刪去林中目光時，讀者怎麼理解回營後的談話。',
    '對照首尾兩次寫山脈時，敘事者的處境和感受。',
    '注意「我」看見幼豬前後，對眼前生命的態度有何變化。',
    '分別找出「我」和諾基斯用什麼標準看待這場試煉。',
    '留意結尾如何從一個人的試煉，寫到後來的年輕人。'
  ];
  const sequenceHints = [
    '想想這趟試煉的起因。', '找出出發之後、獨自入林之前發生的事。',
    '留意諾基斯何時讓「我」自己行動。', '找出第一次交鋒前，溪邊提供了什麼線索。',
    '回到第 9 段，看看發現蹤跡之後發生了什麼。', '留意第 10 段的「重新回到」，想想它接在哪個事件後。',
    '比較山豬兩次出現時，牠身邊有什麼不同。', '找出回營後，誰幫「我」重新理解這場試煉。'
  ];
  const sortingMistakes = sequenceAnswerOrder.flatMap((answer, index) => {
    const previous = placements[index];
    return previous === answer ? [] : [{
      number: index + 1, prompt: '哪個情節應放在這一格？', options: sceneOptions, answer, previous,
      optionOrder: initialOrder, hint: sequenceHints[index], explanation: scenes[answer].clue
    }];
  });
  const pairingMistakes = pairs.flatMap(([prompt, , explanation], index) => assignments.get(index) === index ? [] : [{
    number: index + 1, prompt, options: pairOptions, answer: index, previous: assignments.get(index) ?? null,
    optionOrder: pairOrders[index < 5 ? 0 : 1], explanation,
    hint: index < 5 ? '找出句子中像人一樣的動作或特徵，再想它在描寫什麼。' : '先辨認句中哪兩樣事物被放在一起，再比較它們的共同點。'
  }]);
  correctionItems = [
    ['作家介紹', authorQuiz.mistakes()],
    ['段落大意排序', sortingMistakes],
    ['轉化與譬喻', pairingMistakes],
    ['閱讀測驗', readingQuiz.mistakes().map(item => ({ ...item, hint: readingHints[item.number - 1] }))]
  ].flatMap(([station, items], stationIndex) => items.map(item => ({
    ...item, station, stationIndex, key: stationIndex + '-' + item.number
  })));
  solution.hidden = correctionItems.some(item => item.stationIndex === 1);
}

function showCorrectionResult(item, choice) {
  const correct = choice === item.answer;
  if (correct) recoveredPoints += 2.5;
  const result = document.createElement('li');
  result.textContent = item.station + '第 ' + item.number + ' 題。' +
    (correct ? '訂正答對，加 2.5 分。' : '訂正未答對。') +
    '正確答案是「' + item.options[item.answer] + '」。' + item.explanation;
  correctionsResults.append(result);
  if (item.stationIndex === 0) authorQuiz.reveal(item.number);
  if (item.stationIndex === 2) pairResults.children[item.number - 1].hidden = false;
  if (item.stationIndex === 3) readingQuiz.reveal(item.number);
}

function renderCorrections(lastResult = '') {
  correctionsItems.replaceChildren();
  correctionsForm.hidden = correctionItems.length === 0;
  correctionsSummary.textContent = '原始分數 ' + originalScore + '／100。訂正後分數 ' +
    (originalScore + recoveredPoints) + '／100。' + lastResult +
    (correctionItems.length ? '還有 ' + correctionItems.length + ' 題可訂正。' : '已無待訂正題目。');
  correctionItems.forEach(({ key, station, number, prompt, options, previous, hint, optionOrder = options.map((_, index) => index) }) => {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = station + '｜第 ' + number + ' 題　' + prompt;
    const response = document.createElement('p');
    response.textContent = previous === null ? '原先未作答' : '原先選擇：' + options[previous];
    const select = document.createElement('select');
    select.name = key;
    select.setAttribute('aria-label', station + '第 ' + number + ' 題的訂正答案');
    select.add(new Option('請重新選擇答案', ''));
    for (const option of optionOrder) {
      select.add(new Option(options[option], option));
    }
    const help = document.createElement('p');
    help.textContent = '提示｜' + (hint ?? '回到作家介紹，找出和題意最直接相關的一句。');
    field.append(legend, response, help, select);
    correctionsItems.append(field);
  });
}

correctionsForm.onsubmit = event => {
  event.preventDefault();
  if (state !== 'submitted') return;
  const answers = new FormData(correctionsForm);
  let attempted = 0;
  let corrected = 0;
  correctionItems = correctionItems.filter(item => {
    const choice = answers.get(item.key);
    if (!choice) return true;
    attempted++;
    if (Number(choice) === item.answer) corrected++;
    showCorrectionResult(item, Number(choice));
    return false;
  });
  solution.hidden = correctionItems.some(item => item.stationIndex === 1);
  renderCorrections(attempted ? '本次訂正答對 ' + corrected + ' 題。' : '請先選擇要訂正的答案。');
  const passedNow = updateResult(originalScore + recoveredPoints);
  if (passedNow) message.textContent = '訂正後已達 60 分，闖關通過。';
  else correctionsSummary.focus();
};

function startAssessment() {
  state = 'active';
  endingFrames.forEach(frame => { frame.loading = 'eager'; });
  scoreLabels.forEach(([node, label]) => { node.textContent = label; });
  authorQuiz.reset(true);
  readingQuiz.reset(true);
  showReadingGroup(0);
  setSequenceState(state);
  resetPairs();
  pairResults.replaceChildren();
  pairResults.hidden = true;
  totalScore.textContent = '—／100';
  scoreHome.append(scoreLabel);
  assessmentResult.hidden = true;
  passResult.hidden = true;
  corrections.hidden = true;
  correctionItems = [];
  recoveredPoints = 0;
  correctionsItems.replaceChildren();
  correctionsResults.replaceChildren();
  hunterEnding.hidden = true;
  hunterEnding.classList.remove('ending-playing');
  readingProgress.textContent = '已作答 0／' + readingQuestions.length + ' 題';
  startButton.hidden = true;
  introStart.textContent = '返回闖關';
  restartButton.hidden = true;
  confirmingSubmission = false;
  message.textContent = '作答中。完成四站後，在閱讀測驗最後一步交卷。';
  timer = setInterval(updateTime, 250);
  updateTime();
  goToStation(currentStation);
}

function finishAssessment(expired) {
  if (state !== 'active') return;
  state = 'submitted';
  clearInterval(timer);
  showTime(expired ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const sequenceScore = gradeSequence();
  document.querySelector('#sequence-score').textContent += '｜得分 ' + sequenceScore + ' 分';
  setSequenceState(state);
  const pairScore = gradePairs();
  document.querySelector('#imagery-score').textContent += '｜得分 ' + pairScore + ' 分';
  selectedImage = null;
  draggedImage = null;
  renderPairs();
  originalScore = authorQuiz.grade() + sequenceScore + pairScore + readingQuiz.grade();
  assessmentResult.append(scoreLabel);
  assessmentResult.hidden = false;
  prepareCorrections();
  corrections.hidden = false;
  renderCorrections();
  message.textContent = (expired ? '時間到，已自動交卷。' : '已交卷。') +
    (originalScore >= passingScore ? '已達 60 分，闖關通過。' : '尚未達到 60 分，可透過錯題訂正提高分數。');
  confirmingSubmission = false;
  updateSubmissionControls();
  restartButton.hidden = false;
  introStart.textContent = '查看作答結果';
  if (!updateResult(originalScore + recoveredPoints)) {
    assessmentResult.scrollIntoView({ block: 'start', behavior: 'instant' });
    totalScore.focus({ preventScroll: true });
  }
}

function selectRole(role) {
  playerRole = roles[role];
  currentRole.textContent = '角色｜' + playerRole.label;
  currentRole.hidden = false;
  roleOptions.disabled = true;
}

function beginTimedAttempt() {
  const role = new FormData(roleForm).get('hunter-role');
  if (!playerRole && !Object.hasOwn(roles, role)) {
    roleOptions.scrollIntoView({ block: 'center' });
    roleOptions.querySelector('input').focus({ preventScroll: true });
    roleForm.reportValidity();
    return;
  }
  if (state === 'ready') selectRole(role);
  deadline = Date.now() + duration * 1000;
  startAssessment();
}

startButton.onclick = beginTimedAttempt;
restartButton.onclick = beginTimedAttempt;
roleForm.onsubmit = event => {
  event.preventDefault();
  if (state === 'ready') {
    currentStation = 0;
    beginTimedAttempt();
  } else {
    goToStation(currentStation);
  }
};
function requestSubmission() {
  if (!assessmentIsActive() || !onFinalReadingPage() || incompleteActivities().length) return;
  if (confirmingSubmission) {
    finishAssessment(false);
  } else {
    confirmingSubmission = true;
    updateSubmissionControls();
    message.textContent = '再按一次「確認交卷」即可查看成績。';
  }
}
function updateReadingProgress() {
  const answered = readingQuiz.choices().filter(choice => choice !== null).length;
  readingProgress.textContent = '已作答 ' + answered + '／' + readingQuestions.length + ' 題';
}
document.querySelector('#reading-questions').addEventListener('change', () => {
  if (!assessmentIsActive()) return;
  updateReadingProgress();
  showReadingGroup(currentGroup);
});
document.querySelector('#total-score').tabIndex = -1;
document.querySelector('#author').tabIndex = -1;
authorQuiz.reset(false);
readingQuiz.reset(false);
renderPairs();

clockProgress.max = duration;
new ResizeObserver(([entry]) => {
  entry.target.parentElement.style.setProperty('--assessment-offset', `${entry.target.offsetHeight + 12}px`);
}).observe(assessmentBar);
showStationFromAddress();

const musicButtons = [...document.querySelectorAll('#music-toggle, #opening-music-toggle')];
// The MP3 is attenuated so the same mix also works on devices that use system volume.
const music = new Audio('tafi-maradi-soft.mp3');
music.loop = true;
music.preload = 'auto';
let musicEnabled = true;

async function playMusic() {
  try {
    await music.play();
  } catch (error) {
    if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
      musicEnabled = false;
    }
  }
  updateMusicButtons();
}

function updateMusicButtons() {
  musicButtons.forEach(button => {
    button.textContent = !music.paused ? '關閉配樂'
      : button.id === 'opening-music-toggle' && music.currentTime === 0 ? '播放開場配樂' : '開啟配樂';
  });
}

musicButtons.forEach(button => button.addEventListener('click', () => {
  musicEnabled = music.paused;
  if (musicEnabled) {
    playMusic();
  } else {
    music.pause();
    updateMusicButtons();
  }
}));
music.addEventListener('play', updateMusicButtons);
music.addEventListener('pause', updateMusicButtons);
document.addEventListener('click', event => {
  if (event.target.closest('#music-toggle, #opening-music-toggle')) return;
  if (musicEnabled && music.paused) playMusic();
});
playMusic();

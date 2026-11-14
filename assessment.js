const duration = 20 * 60;
const passingScore = 60;
const assessmentBar = document.querySelector('.assessment-bar');
const clock = document.querySelector('#countdown');
const clockProgress = document.querySelector('#countdown-progress');
const clockWarning = document.querySelector('#countdown-warning');
const message = document.querySelector('#assessment-message');
const startButton = document.querySelector('#start-assessment');
const introStart = document.querySelector('#intro-start');
const openingHunter = document.querySelector('.story-hunter');
document.querySelector('#replay-walk').onclick = () => {
  openingHunter.classList.remove('is-walking');
  requestAnimationFrame(() => requestAnimationFrame(() => openingHunter.classList.add('is-walking')));
};
const roleForm = document.querySelector('#role-form');
const roleOptions = roleForm.querySelector('fieldset');
const currentRole = document.querySelector('#current-role');
const roles = {
  elder: { label: '老獵人諾基斯', cues: [
    '想想你要怎麼引導這位想參加成年禮的年輕人。',
    '回想你在何時放手讓他嘗試，何時又留意他的處境。',
    '留意敘事者如何用譬喻寫出他初入山林的感受。',
    '如果你要在火邊開導他，哪些經歷值得拿來談？'
  ] },
  author: { label: '作者「我」', cues: [
    '回想你為什麼想入山，以及你原本期待怎樣回家。',
    '想想你在林中看到什麼、推想了什麼，又做了哪些決定。',
    '想想你眼中和耳中的山林，怎麼隨心情而改變。',
    '回想放過母豬的那一刻，看看諾基斯的話如何改變你對試煉的理解。'
  ] }
};
let playerRole = null;
const submissionHint = document.querySelector('#submission-hint');
const passResult = document.querySelector('#pass-result');
const hunterEnding = document.querySelector('#hunter-ending');
const endingReplyFrame = hunterEnding.querySelector('.ending-reply-frame');
const replayEnding = document.querySelector('#replay-ending');
let endingPlayback = 0;

async function playHunterEnding() {
  const playback = ++endingPlayback;
  hunterEnding.classList.remove('ending-playing');
  try {
    await endingReplyFrame.decode();
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
let currentStation = 0;

function incompleteActivities() {
  const activities = [
    ['作家介紹', authorQuestions.length, document.querySelectorAll('#author-questions input:checked').length, '題'],
    ['段落大意排序', scenes.length, placements.filter(index => index !== null).length, '格'],
    ['修辭', pairs.length, assignments.size, '題'],
    ['閱讀測驗', readingQuestions.length, document.querySelectorAll('#reading-questions input:checked').length, '題']
  ];
  return activities.filter(([, total, answered]) => answered < total)
    .map(([label, total, answered, unit]) => label + ' ' + (total - answered) + ' ' + unit);
}

function onFinalReadingPage() {
  return currentStation === stations.length - 1 && currentGroup === readingGroups.length - 1;
}

function updateSubmissionControls() {
  const lastStation = currentStation === stations.length - 1;
  const finalPage = state === 'active' && onFinalReadingPage();
  const incomplete = finalPage ? incompleteActivities() : [];
  const canSubmit = finalPage && incomplete.length === 0;
  if (!canSubmit && confirmingSubmission) {
    confirmingSubmission = false;
    if (state === 'active') message.textContent = '作答中。';
  }
  nextStation.textContent = lastStation ? (confirmingSubmission ? '確認交卷' : '交卷') : '下一站';
  nextStation.hidden = lastStation && !canSubmit;
  submissionHint.hidden = !incomplete.length;
  const hint = incomplete.length ? '請先完成 ' + incomplete.join('、') + '，即可交卷。' : '';
  if (submissionHint.textContent !== hint) submissionHint.textContent = hint;
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

function makeQuestions(containerId, questions, points, scoreId) {
  const container = document.querySelector('#' + containerId);
  const fields = questions.map(([skill, prompt, options, answer, explanation], index) => {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = (index + 1) + '．' + prompt;
    const caption = document.createElement('small');
    caption.textContent = skill + '・' + points + ' 分';
    field.append(legend, caption);
    options.forEach((option, optionIndex) => {
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
    return { field, options, answer, explanation, feedback };
  });
  return {
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
        feedback.hidden = false;
        return sum + earned;
      }, 0);
      document.querySelector('#' + scoreId).textContent += '｜得分 ' + score + ' 分';
      return score;
    }
  };
}

const authorQuiz = makeQuestions('author-questions', authorQuestions, 2.5, 'author-score');
const readingGroups = [
  ['循著心願出發', [0, 1, 2, 18, 17], 0, '從「我」請人轉達心願的那一刻出發。讀讀他準備了什麼、想像怎樣歸來，再沿著這份期待讀到他遇見母豬和幼豬時的抉擇。'],
  ['走進林中找線索', [19, 6, 3, 15, 16], 3, '諾基斯讓「我」獨自進山。把溪邊的蹄印、林中似乎有人注視的感覺，以及回營後的對話放在一起，想想這些線索各能支持什麼推論。'],
  ['讀懂山林的聲色', [7, 8, 13, 14, 5], 2, '跟著「我」再走一遍山路。留意扁舟、樹葉和鳥鳴，想想作者怎麼用意象、聲音與留白寫出一路上的心情。'],
  ['回到火邊聽故事', [4, 9, 10, 11, 12], 7, '空手回營的「我」還在懊惱。聽完諾基斯的話，再想想兩人怎麼看待同一場試煉，以及老獵人想把什麼留給下一代。']
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
  groupTitle.textContent = '第 ' + (index + 1) + ' 步／共 4 步｜' + title;
  readingSceneArt.style.backgroundPosition = makeSceneArt(scene).style.backgroundPosition;
  readingSceneIntro.textContent = intro;
  readingRoleCue.hidden = playerRole === null;
  readingRoleCue.textContent = playerRole?.cues[index] ?? '';
  evidenceChallenge.hidden = index !== 1;
  readingFields.forEach((field, question) => {
    field.hidden = Math.floor(question / 5) !== index;
  });
  groupButtons.forEach((button, group) => {
    const answered = readingFields.slice(group * 5, group * 5 + 5)
      .filter(field => field.querySelector('input:checked')).length;
    button.textContent = readingGroups[group][0] + ' ' + answered + '／5';
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
const phrases = document.querySelector('#phrases');
const pictures = document.querySelector('#pictures');
const pairTray = document.querySelector('#pair-tray');
const pairFeedback = document.querySelector('#pairFeedback');
const pairResults = document.querySelector('#pair-results');
const pairReset = document.querySelector('#pairReset');
const pairReturn = document.querySelector('#pair-return');
const pairGroupButtons = [...document.querySelectorAll('#pair-groups button')];
const pairGroups = [
  { label: '轉化', order: [2, 4, 0, 3, 1] },
  { label: '譬喻', order: [8, 5, 9, 6, 7] }
];
const assignments = new Map();
let selectedImage = null;
let draggedImage = null;
let pairGroup = 0;

function showPairSelection() {
  imagery.querySelectorAll('[data-image]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.image) === selectedImage));
  });
  pairReturn.hidden = ![...assignments.values()].includes(selectedImage);
}

function selectPairImage(index) {
  selectedImage = selectedImage === index ? null : index;
  showPairSelection();
  pairFeedback.textContent = selectedImage === null ? '已取消選取。' :
    '已選「' + pairs[index][1] + '」，請選上方的課文句子。';
  if (selectedImage !== null) {
    const firstSlot = phrases.querySelector('button');
    firstSlot.focus({ preventScroll: true });
    if (firstSlot.getBoundingClientRect().top < assessmentBar.getBoundingClientRect().bottom) {
      firstSlot.scrollIntoView({ block: 'start' });
    }
  }
}

function movePairImage(index, destination) {
  if (!assessmentIsActive()) return;
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
    ? pictures.querySelector('[data-image="' + index + '"]')
    : phrases.querySelector('[data-pair-slot="' + destination + '"] button');
  target.focus({ preventScroll: true });
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
    const art = document.createElement('span');
    art.className = 'pair-art';
    art.style.backgroundPosition = pairs[imageIndex][3];
    if (imageIndex < 5) art.classList.add('pair-art-personification');
    if (imageIndex === 9) art.classList.add('pair-art-extra');
    art.setAttribute('aria-hidden', 'true');
    button.dataset.image = imageIndex;
    button.draggable = !button.disabled;
    button.append(art, pairs[imageIndex][1]);
  }
  button.onclick = () => {
    if (!assessmentIsActive()) return;
    if (destination !== null && selectedImage !== null && selectedImage !== imageIndex) {
      movePairImage(selectedImage, destination);
    } else if (imageIndex !== undefined) {
      selectPairImage(imageIndex);
    } else {
      pairFeedback.textContent = '請先選下方的意象圖卡。';
    }
  };
  return button;
}

function addPairDrop(target, destination) {
  function acceptDrag(event) {
    if (draggedImage === null || state !== 'active') return;
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
    if (draggedImage === null) return;
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
addPairDrop(pairTray, null);

function renderPairs() {
  phrases.replaceChildren();
  pictures.replaceChildren();
  const group = pairGroups[pairGroup].order;
  [...group].sort((a, b) => a - b).forEach(index => {
    const slot = document.createElement('li');
    slot.dataset.pairSlot = index;
    slot.append(makePairTile(assignments.get(index), index));
    addPairDrop(slot, index);
    phrases.append(slot);
  });
  const used = [...assignments.values()];
  group.filter(index => !used.includes(index)).forEach(index => {
    const item = document.createElement('li');
    item.append(makePairTile(index));
    pictures.append(item);
  });
  pairReset.disabled = state !== 'active';
  pairGroupButtons.forEach((button, index) => {
    const { label, order } = pairGroups[index];
    const filled = order.filter(slot => assignments.has(slot)).length;
    button.textContent = label + ' ' + filled + '／' + order.length;
    button.setAttribute('aria-pressed', String(index === pairGroup));
  });
  showPairSelection();
}

pairReturn.onclick = () => movePairImage(selectedImage, null);
pairGroupButtons.forEach((button, index) => button.onclick = () => {
  pairGroup = index;
  selectedImage = null;
  draggedImage = null;
  renderPairs();
  pairFeedback.textContent = '已配對 ' + assignments.size + '／' + pairs.length + ' 題';
});
pairReset.onclick = () => {
  if (!assessmentIsActive()) return;
  assignments.clear();
  selectedImage = null;
  draggedImage = null;
  renderPairs();
  pairFeedback.textContent = '已配對 0／' + pairs.length + ' 題';
};

function gradePairs() {
  let score = 0;
  pairs.forEach(([sentence, effect, explanation], index) => {
    const points = assignments.get(index) === index ? 2.5 : 0;
    score += points;
    const item = document.createElement('li');
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

function startAssessment() {
  state = 'active';
  scoreLabels.forEach(([node, label]) => { node.textContent = label; });
  authorQuiz.reset(true);
  readingQuiz.reset(true);
  showReadingGroup(0);
  setSequenceState(state);
  pairGroup = 0;
  pairReset.onclick();
  pairResults.replaceChildren();
  pairResults.hidden = true;
  document.querySelector('#reading-focus').hidden = true;
  document.querySelector('#total-score').textContent = '—／100';
  passResult.hidden = true;
  hunterEnding.hidden = true;
  hunterEnding.classList.remove('ending-playing');
  readingProgress.textContent = '已作答 0／20 題';
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
  const total = authorQuiz.grade() + sequenceScore + pairScore + readingQuiz.grade();
  document.querySelector('#total-score').textContent = total + '／100';
  const passed = total >= passingScore;
  passResult.textContent = passed ? '闖關通過' : '尚未通過';
  passResult.dataset.passed = String(passed);
  passResult.hidden = false;
  hunterEnding.hidden = !passed;
  document.querySelector('#reading-focus').hidden = false;
  message.textContent = (expired ? '時間到，已自動交卷。' : '已交卷。') +
    (passed ? '已達 60 分，闖關通過。' : '尚未達到 60 分，可查看解析後重新作答。');
  confirmingSubmission = false;
  updateSubmissionControls();
  restartButton.hidden = false;
  introStart.textContent = '查看作答結果';
  if (passed) {
    playHunterEnding();
    hunterEnding.scrollIntoView();
    hunterEnding.querySelector('h2').focus({ preventScroll: true });
  } else {
    document.querySelector('#total-score').focus();
  }
}

function beginTimedAttempt() {
  const role = new FormData(roleForm).get('hunter-role');
  if (!playerRole && !Object.hasOwn(roles, role)) {
    roleOptions.scrollIntoView({ block: 'center' });
    roleOptions.querySelector('input').focus({ preventScroll: true });
    roleForm.reportValidity();
    return;
  }
  if (state === 'ready') {
    playerRole = roles[role];
    currentRole.textContent = '角色｜' + playerRole.label;
    currentRole.hidden = false;
    roleOptions.disabled = true;
  }
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
document.querySelector('#reading-questions').addEventListener('change', event => {
  if (!assessmentIsActive()) return;
  const answered = event.currentTarget.querySelectorAll('input:checked').length;
  readingProgress.textContent = '已作答 ' + answered + '／20 題';
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
const music = new Audio('ancient-rite.mp3');
music.loop = true;
music.preload = 'none';
music.volume = 0.3;
let musicEnabled = true;

async function playMusic() {
  try {
    await music.play();
  } catch (error) {
    if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
      musicEnabled = false;
      updateMusicButtons();
    }
  }
}

function updateMusicButtons() {
  musicButtons.forEach(button => {
    button.textContent = musicEnabled ? '關閉配樂' : '開啟配樂';
  });
}

musicButtons.forEach(button => button.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  updateMusicButtons();
  if (musicEnabled) playMusic();
  else music.pause();
}));
document.addEventListener('click', event => {
  if (event.target.closest('#music-toggle, #opening-music-toggle')) return;
  if (musicEnabled && music.paused) playMusic();
});
playMusic();

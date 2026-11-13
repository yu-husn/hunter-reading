const duration = 20 * 60;
const clock = document.querySelector('#countdown');
const message = document.querySelector('#assessment-message');
const startButton = document.querySelector('#start-assessment');
const submitButton = document.querySelector('#submit-assessment');
const restartButton = document.querySelector('#restart-assessment');
const readingProgress = document.querySelector('#reading-progress');
let state = 'ready';
let deadline = 0;
let timer;

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

const authorQuiz = makeQuestions('author-questions', authorQuestions, 5, 'author-score');
const readingGroups = [
  ['情節與動機', [0, 1, 2, 18, 17]],
  ['人物與證據', [3, 15, 19, 6, 16]],
  ['意象與寫法', [7, 8, 13, 14, 5]],
  ['文化與主旨', [4, 9, 10, 11, 12]]
];
const readingQuiz = makeQuestions('reading-questions',
  readingGroups.flatMap(([, indexes]) => indexes.map(index => readingQuestions[index])),
  3, 'quiz-score');
const readingFields = [...document.querySelectorAll('#reading-questions fieldset')];
const groupButtons = [...document.querySelectorAll('#reading-groups button')];
const groupTitle = document.querySelector('#reading-group-title');
let currentGroup = 0;

function showReadingGroup(index, focus = false) {
  currentGroup = index;
  groupTitle.textContent = readingGroups[index][0];
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
  document.querySelector('#next-group').disabled = index === readingGroups.length - 1;
  if (focus) groupTitle.focus();
}

groupButtons.forEach((button, index) => {
  button.onclick = () => showReadingGroup(index, true);
});
document.querySelector('#previous-group').onclick = () => showReadingGroup(currentGroup - 1, true);
document.querySelector('#next-group').onclick = () => showReadingGroup(currentGroup + 1, true);
showReadingGroup(0);
const scoreLabels = [...document.querySelectorAll('.section-score')].map(node => [node, node.textContent]);

const phrases = document.querySelector('#phrases');
const pictures = document.querySelector('#pictures');
const pairFeedback = document.querySelector('#pairFeedback');
const pairResults = document.querySelector('#pair-results');
const pairReset = document.querySelector('#pairReset');
const assignments = new Map();
let selectedPhrase = null;

function renderPairs() {
  const active = state === 'active';
  phrases.replaceChildren();
  pictures.replaceChildren();
  pairs.forEach(([phrase], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = !active;
    button.textContent = phrase + (assignments.has(index) ? ' → ' + pairs[assignments.get(index)][1] : '');
    button.setAttribute('aria-pressed', String(selectedPhrase === index));
    button.onclick = () => {
      if (!assessmentIsActive()) return;
      selectedPhrase = index;
      phrases.querySelectorAll('button').forEach((item, itemIndex) => {
        item.setAttribute('aria-pressed', String(index === itemIndex));
      });
      pairFeedback.textContent = '已選「' + phrase + '」，請選右欄的圖片。';
    };
    phrases.append(button);
  });
  [2, 4, 0, 3, 1].forEach(index => {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = !active;
    const art = document.createElement('span');
    art.className = 'pair-art';
    art.style.backgroundPosition = pairs[index][3];
    art.setAttribute('aria-hidden', 'true');
    const used = [...assignments.values()].includes(index);
    button.append(art, pairs[index][1] + (used ? '（已配對）' : ''));
    button.onclick = () => {
      if (!assessmentIsActive()) return;
      if (selectedPhrase === null) {
        pairFeedback.textContent = '請先選一句課文描寫。';
        return;
      }
      for (const [phrase, image] of assignments) {
        if (image === index) assignments.delete(phrase);
      }
      assignments.set(selectedPhrase, index);
      selectedPhrase = null;
      renderPairs();
      pairFeedback.textContent = '已配對 ' + assignments.size + '／5 組。交卷前可修改。';
      phrases.querySelector('button').focus();
    };
    pictures.append(button);
  });
  pairReset.disabled = !active;
}

pairReset.onclick = () => {
  if (!assessmentIsActive()) return;
  assignments.clear();
  selectedPhrase = null;
  renderPairs();
  pairFeedback.textContent = '已配對 0／5 組';
};

function gradePairs() {
  let score = 0;
  pairs.forEach(([phrase, image, explanation], index) => {
    const points = assignments.get(index) === index ? 2 : 0;
    score += points;
    const item = document.createElement('li');
    const choice = assignments.has(index) ? pairs[assignments.get(index)][1] : '未作答';
    item.textContent = phrase + '｜' + points + '／2 分。你的配對：' + choice +
      '。正確配對：' + image + '。' + explanation;
    pairResults.append(item);
  });
  pairResults.hidden = false;
  return score;
}

function showTime(seconds) {
  clock.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
    String(seconds % 60).padStart(2, '0');
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
  pairReset.onclick();
  pairResults.replaceChildren();
  pairResults.hidden = true;
  document.querySelector('#reading-focus').hidden = true;
  document.querySelector('#total-score').textContent = '—／100';
  readingProgress.textContent = '已作答 0／20 題';
  startButton.hidden = true;
  restartButton.hidden = true;
  submitButton.disabled = false;
  message.textContent = '作答中。未作答的項目以 0 分計。';
  timer = setInterval(updateTime, 250);
  updateTime();
  document.querySelector('#author').scrollIntoView();
  document.querySelector('#author').focus({ preventScroll: true });
}

function finishAssessment(expired) {
  if (state !== 'active') return;
  state = 'submitted';
  clearInterval(timer);
  if (expired) showTime(0);
  const sequenceScore = gradeSequence();
  document.querySelector('#sequence-score').textContent += '｜得分 ' + sequenceScore + ' 分';
  setSequenceState(state);
  const pairScore = gradePairs();
  document.querySelector('#imagery-score').textContent += '｜得分 ' + pairScore + ' 分';
  renderPairs();
  const total = authorQuiz.grade() + sequenceScore + pairScore + readingQuiz.grade();
  document.querySelector('#total-score').textContent = total + '／100';
  document.querySelector('#reading-focus').hidden = false;
  message.textContent = (expired ? '時間到，已自動交卷。' : '已交卷。') + '各欄已顯示逐題分數與解析。';
  submitButton.disabled = true;
  restartButton.hidden = false;
  document.querySelector('#total-score').focus();
}

function beginTimedAttempt() {
  deadline = Date.now() + duration * 1000;
  submitButton.textContent = '交卷';
  startAssessment();
}

startButton.onclick = beginTimedAttempt;
restartButton.onclick = beginTimedAttempt;
submitButton.onclick = () => {
  if (!assessmentIsActive()) return;
  if (submitButton.textContent === '確認交卷') {
    finishAssessment(false);
  } else {
    submitButton.textContent = '確認交卷';
    message.textContent = '再按一次「確認交卷」即可查看成績。';
  }
};
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

const musicButton = document.querySelector('#music-toggle');
const music = new Audio('forest-loop.wav');
music.loop = true;
music.preload = 'none';
music.volume = 0.45;
musicButton.onclick = async () => {
  musicButton.disabled = true;
  try {
    if (music.paused) await music.play();
    else music.pause();
  } catch {
    message.textContent = '配樂暫時無法播放，可以繼續作答。';
  } finally {
    musicButton.setAttribute('aria-pressed', String(!music.paused));
    musicButton.textContent = music.paused ? '開啟配樂' : '關閉配樂';
    musicButton.disabled = false;
  }
};

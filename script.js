'use strict';

/* ==========================
  全体共通
  ========================== */
const NICKNAME_STORAGE_KEY = 'nickname';
const ANSWER_START_TIME_KEY = 'answerStartTime';
const CURRENT_PROBLEM_KEY = 'currentProblemNumber';
const SELECTED_COLOR_KEY = 'selectedColor';
const QUESTION_IMAGE_NUMBER_KEY = 'questionImageNumber';
const QUESTION_LOG_STATE_KEY = 'questionLogState';
const LOG_ENDPOINT_URL =
  'https://script.google.com/macros/s/AKfycbxDt2w-mZuRg9R9OMfrvW8nQtMpjXgzTAWu64WTWoIwYb4F6pqUsn53wxBS19aLNJJ5CQ/exec';
let meaningCatalogForLogging = [];

// IDを取得する。
function getNickname() {
  return localStorage.getItem(NICKNAME_STORAGE_KEY) || '未入力';
}

// 問題ログの現在状態を取得する。
function getQuestionLogState() {
  const raw = sessionStorage.getItem(QUESTION_LOG_STATE_KEY);
  if (!raw) {
    return {
      nickname: getNickname(),
      problem_no: getCurrentProblemNumber(),
      selected_color: getSelectedColor(),
      candidate_colors: [],
      cancelled_colors: [],
      event_history: [],
      evaluation: ''
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      nickname: getNickname(),
      problem_no: getCurrentProblemNumber(),
      selected_color: getSelectedColor(),
      candidate_colors: [],
      cancelled_colors: [],
      event_history: [],
      evaluation: ''
    };
  }
}

// 問題ログを保存する。
function saveQuestionLogState(state) {
  sessionStorage.setItem(QUESTION_LOG_STATE_KEY, JSON.stringify(state));
}

// 問題ログを初期化する。
function resetQuestionLogState() {
  sessionStorage.removeItem(QUESTION_LOG_STATE_KEY);
}

// 問題イベントをログに追加する。
function addQuestionEvent(eventName, payload = {}) {
  const state = getQuestionLogState();
  state.nickname = getNickname();
  state.problem_no = getCurrentProblemNumber() || state.problem_no || '';
  state.selected_color = getSelectedColor() || state.selected_color || '';
  state.event_history.push({
    event: eventName,
    timestamp: toJstIsoString(),
    ...payload
  });

  saveQuestionLogState(state);
}

// 候補色を追加して現在選択中として保存する。
function addCandidateColor(color) {
  if (!color) return;
  const state = getQuestionLogState();
  if (!state.candidate_colors.includes(color)) {
    state.candidate_colors.push(color);
  }
  state.selected_color = color;
  state.nickname = getNickname();
  saveQuestionLogState(state);
}

// 選択を取り消した色を記録する。
function cancelColor(color) {
  if (!color) return;
  const state = getQuestionLogState();
  if (!state.cancelled_colors.includes(color)) {
    state.cancelled_colors.push(color);
  }
  state.selected_color = '';
  state.nickname = getNickname();
  saveQuestionLogState(state);
}

// 評価ラジオボタンの値を取得する。
function getSelectedRatingValue() {
  return document.querySelector('input[name="situation-rating"]:checked')?.value ?? '';
}

// カラーコードを意味カタログの番号に変換する。
function getMeaningNumberForColor(color, area) {
  if (!color || meaningCatalogForLogging.length === 0) return color;
  const normalizedColor = String(color).trim().replace(/^#/, '').toUpperCase();
  const matches = meaningCatalogForLogging.filter(
    (item) => item.color.replace(/^#/, '').toUpperCase() === normalizedColor && (!area || item.area === Number(area))
  );
  return matches.length === 1 ? matches[0].number : color;
}

// 日本時間の ISO 文字列を返す。
function toJstIsoString(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().replace('Z', '+09:00');
}

// 送信用のログオブジェクトを組み立てる。
function buildQuestionLogEntry(extra = {}) {
  const state = getQuestionLogState();
  const area = new URLSearchParams(window.location.search).get('area');
  const toMeaningNumber = (color) => getMeaningNumberForColor(color, area);
  const questionImageNumber =
    sessionStorage.getItem(QUESTION_IMAGE_NUMBER_KEY) || getCurrentProblemNumber() || state.problem_no || '';
  const finalSelectedColor = toMeaningNumber(getSelectedColor() || state.selected_color || '');
  const candidateColors = Array.isArray(state.candidate_colors) ? state.candidate_colors : [];
  const cancelledColors = Array.isArray(state.cancelled_colors) ? state.cancelled_colors : [];
  const evaluationValue = extra.evaluation ?? state.evaluation ?? getSelectedRatingValue();

  return {
    nickname: getNickname(),
    problem_no: questionImageNumber,
    area_no: questionImageNumber,
    selected_color: finalSelectedColor,
    candidate_colors: candidateColors.map(toMeaningNumber),
    cancelled_colors: cancelledColors.map(toMeaningNumber),
    answer_time_sec: getElapsedTimeSeconds(),
    event_history: (state.event_history || []).map((event) => ({
      ...event,
      ...(event.color ? { color: toMeaningNumber(event.color) } : {})
    })),
    timestamp: toJstIsoString(),
    evaluation: evaluationValue,
    evaluation1: extra.evaluation1 ?? state.evaluation1 ?? '',
    evaluation2: extra.evaluation2 ?? state.evaluation2 ?? ''
  };
}

// ログをサーバーに送信する。
async function appendLogEntry(entry) {
  try {
    await fetch(LOG_ENDPOINT_URL, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(entry)
    });
  } catch (error) {
    console.error('ログ送信に失敗しました:', error);
    throw error;
  }
}

// 今の回答ログをまとめて送信して状態をリセットする。
async function flushQuestionLog(extra = {}) {
  const entry = buildQuestionLogEntry(extra);
  await appendLogEntry(entry);
  resetQuestionLogState();
}

// 解答開始時刻を保存する。
function setAnswerStartTime(time) {
  sessionStorage.setItem(ANSWER_START_TIME_KEY, String(time));
}

// 解答開始時刻を取得する。
function getAnswerStartTime() {
  const storedValue = sessionStorage.getItem(ANSWER_START_TIME_KEY);
  if (!storedValue) return null;
  const parsedValue = Number(storedValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

// 解答開始時刻を削除する。
function clearAnswerStartTime() {
  sessionStorage.removeItem(ANSWER_START_TIME_KEY);
}

// 問題番号を保存する。
function setCurrentProblemNumber(value) {
  sessionStorage.setItem(CURRENT_PROBLEM_KEY, String(value));
}

// 問題番号を取得する。
function getCurrentProblemNumber() {
  return sessionStorage.getItem(CURRENT_PROBLEM_KEY) || '';
}

// 選択中の色を保存する。
function setSelectedColor(value) {
  sessionStorage.setItem(SELECTED_COLOR_KEY, String(value));
}

// 選択中の色を取得する。
function getSelectedColor() {
  return sessionStorage.getItem(SELECTED_COLOR_KEY) || '';
}

// 経過時間を秒数で返す。
function getElapsedTimeSeconds() {
  const startTime = getAnswerStartTime();
  if (!startTime) return '0.00';
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

/* ==========================
  index.html
  ========================== */
// スタート画面の初期化処理。
// 「はじめる」ボタンがあれば、クリックで ID入力画面へ遷移させる。
const QUESTION_PROGRESS_KEY = 'questionProgress';
const USED_QUESTION_IMAGES_KEY = 'usedQuestionImages';
const MAX_QUESTION_COUNT = 16;

// スタート画面のボタン処理を初期化する。
function initIndexPage() {
  const startBtn = document.querySelector('.start-btn');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      window.location.href = 'id.html';
    });
  }
}

// 今の問題進行数を取得する。
function getQuestionProgress() {
  const value = Number(sessionStorage.getItem(QUESTION_PROGRESS_KEY) || '0');
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

// 問題進行数を安全な範囲に丸めて保存する。
function setQuestionProgress(value) {
  const normalized = Math.min(Math.max(0, Number(value) || 0), MAX_QUESTION_COUNT);
  sessionStorage.setItem(QUESTION_PROGRESS_KEY, String(normalized));
  return normalized;
}

// 1問進めて進行数を返す。
function advanceQuestionProgress() {
  const current = getQuestionProgress();
  const next = Math.min(current + 1, MAX_QUESTION_COUNT);
  setQuestionProgress(next);
  return next;
}

/* ==========================
  id.html
  ========================== */
// ID入力画面の初期化処理。
// 名前が入力されているときだけ確認ボタンを有効化し、入力を保存して次ページへ進む。
// ID入力画面を初期化する。
function initIdPage() {
  if (!window.location.pathname.endsWith('id.html')) return;

  const nicknameInput = document.getElementById('nicknameInput');
  const confirmBtn = document.getElementById('confirmNickname');
  const status = document.getElementById('status');

  if (!nicknameInput || !confirmBtn || !status) return;

  const setStatus = (text) => {
    status.textContent = text;
  };

  const updateConfirmButton = () => {
    const value = nicknameInput.value.trim();
    const enabled = /^\d+$/.test(value);

    confirmBtn.disabled = !enabled;
    confirmBtn.style.opacity = enabled ? '1' : '0.5';
    confirmBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';

    if (!value) {
      setStatus('IDを入力すると、次へ進めます。');
    } else if (!enabled) {
      setStatus('IDは半角数字で入力してください。');
    }
  };

  nicknameInput.addEventListener('input', updateConfirmButton);

  confirmBtn.addEventListener('click', () => {
    const value = nicknameInput.value.trim();
    if (!/^\d+$/.test(value)) {
      setStatus('IDを半角数字で入力してください。');
      return;
    }

    localStorage.setItem('nickname', value);
    sessionStorage.setItem(QUESTION_PROGRESS_KEY, '0');
    sessionStorage.removeItem(USED_QUESTION_IMAGES_KEY);
    setStatus(`「${value}」で入力しました。次のページへ進みます...`);

    window.setTimeout(() => {
      window.location.href = 'play.html';
    }, 500);
  });

  updateConfirmButton();
}
/* ==========================
  play.html
  ========================== */
const movieVideo = document.getElementById('movieVideo');
const playMovieBtn = document.getElementById('playMovieBtn');
const isCorrectPage = window.location.pathname.endsWith('correct.html');

const isMoviePage = window.location.pathname.endsWith('ques.html');

const questionImage = document.getElementById('questionImage');
const answerImage = document.getElementById('answerImage');
const questionNumberLabel = document.getElementById('questionNumberLabel');
const areaSelectLink = document.getElementById('areaSelectLink');
const nextQuestionLink = document.getElementById('nextQuestionLink');

// 現在のエリア番号を取得する。
function getAreaGridNumber() {
  const areaGrid = document.querySelector('.area-image-grid');
  return areaGrid ? areaGrid.id.replace('area', '') : '1';
}

// 一度だけ動くボタン処理を登録する。
function bindOneShotButtonClick(button, onPlay, { resetOnError = false } = {}) {
  if (!button) return;

  button.addEventListener('click', () => {
    if (button.dataset.played === 'true') return;

    button.dataset.played = 'true';
    button.disabled = true;
    button.classList.add('is-played');

    try {
      onPlay();
    } catch (error) {
      console.error('ボタン処理に失敗しました:', error);
      button.classList.remove('is-played');
      if (resetOnError) {
        button.dataset.played = 'false';
        button.disabled = false;
      }
    }
  });
}

/* ==========================
  ques.html
  ========================== */
// 問題表示画面の初期化処理。
// 進捗状況から現在の問題番号を決め、1問ごとにランダムな問題画像を選んで表示する。
function initQuestionPage() {
  if (!isMoviePage) return;

  const currentProgress = getQuestionProgress();
  if (currentProgress >= MAX_QUESTION_COUNT) {
    window.location.replace('fin.html');
    return;
  }

  const questionNumber = advanceQuestionProgress();

  if (questionNumberLabel) {
    questionNumberLabel.textContent = String(questionNumber);
  }

  if (areaSelectLink) {
    areaSelectLink.href = 'AreaSelect.html';
    const btnText = areaSelectLink.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = '色選択へ';
    }
  }

  if (!questionImage || !playMovieBtn) return;

  const QUESTION_DIR = 'img/question';

  // 画像名の大文字小文字差を吸収する。
  function normalizeQuestionImageName(value) {
    return String(value).toLowerCase();
  }

  // 使用済み問題画像の一覧を取得する。
  function getUsedQuestionImages() {
    try {
      const raw = sessionStorage.getItem(USED_QUESTION_IMAGES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value) => typeof value === 'string').map(normalizeQuestionImageName)
        : [];
    } catch {
      return [];
    }
  }

  // 使用済み問題画像を保存する。
  function saveUsedQuestionImages(list) {
    sessionStorage.setItem(USED_QUESTION_IMAGES_KEY, JSON.stringify(list.map(normalizeQuestionImageName)));
  }

  const allQuestionFiles = [
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index).padStart(3, '0')}.jpg`),
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index + 100).padStart(3, '0')}.jpg`),
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index + 200).padStart(3, '0')}.jpg`),
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index + 300).padStart(3, '0')}.jpg`)
  ];

  let usedImages = getUsedQuestionImages();
  let availableImages = allQuestionFiles.filter(
    (filename) => !usedImages.includes(normalizeQuestionImageName(filename))
  );

  if (availableImages.length === 0) {
    usedImages = [];
    availableImages = allQuestionFiles;
    saveUsedQuestionImages([]);
  }

  const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
  const questionImageNumber = randomImage.match(/\d+/)?.[0];
  if (!questionImageNumber) {
    throw new Error('対応する問題画像が見つかりません');
  }

  usedImages = [...usedImages, randomImage];
  saveUsedQuestionImages(usedImages);

  sessionStorage.setItem(QUESTION_IMAGE_NUMBER_KEY, questionImageNumber);
  setCurrentProblemNumber(questionImageNumber);
  questionImage.src = `${QUESTION_DIR}/${randomImage}`;

  bindOneShotButtonClick(playMovieBtn, () => {
    setAnswerStartTime(Date.now());
    questionImage.classList.add('is-visible');
    window.setTimeout(() => {
      questionImage.classList.remove('is-visible');
    }, 10000);
  });
}

/* ==========================
  correct.html
  ========================== */
// 正解・解説画面の初期化処理。
// 今回の問題番号をもとに該当する意味画像・色・言葉を表示し、次の問題へ進むリンクを調整する。
// 正解画面を初期化する。
function initCorrectPage() {
  if (!isCorrectPage) return;

  const questionImageNumber = sessionStorage.getItem(QUESTION_IMAGE_NUMBER_KEY);
  if (!questionImageNumber) {
    throw new Error('問題画像の番号が保存されていません');
  }

  const emotionNumberLabel = document.getElementById('emotionNumberLabel');
  const emotionWord = document.getElementById('emotionWord');
  const emotionColorBarTop = document.getElementById('emotionColorBarTop');
  const emotionColorBarBottom = document.getElementById('emotionColorBarBottom');

  const imageNumber = String(questionImageNumber).padStart(3, '0');
  if (questionImage) {
    questionImage.src = `img/question/Q${imageNumber}.jpg`;
    questionImage.alt = `問題 ${questionImageNumber}`;
  }
  if (answerImage) {
    answerImage.src = `img/meaning/A${imageNumber}.jpg`;
    answerImage.alt = `意味 ${questionImageNumber}`;
  }

  const currentItem = meaningCatalogForLogging.find((item) => item.number === imageNumber);
  if (currentItem) {
    if (emotionNumberLabel) {
      emotionNumberLabel.textContent = '';
    }

    if (emotionWord) {
      emotionWord.textContent = currentItem.word;
      emotionWord.style.color = '#000';
    }

    if (emotionColorBarTop) {
      emotionColorBarTop.style.background = currentItem.color;
    }
    if (emotionColorBarBottom) {
      emotionColorBarBottom.style.background = currentItem.color;
    }

    const metaBox = document.querySelector('.correct-item-meta');
    if (metaBox) {
      metaBox.style.borderColor = currentItem.color;
    }
  }

  if (nextQuestionLink) {
    const currentProgress = getQuestionProgress();
    const isFinalQuestion = currentProgress >= MAX_QUESTION_COUNT;
    nextQuestionLink.href = isFinalQuestion ? 'fin.html' : 'ques.html';
    const btnText = nextQuestionLink.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = isFinalQuestion ? '終了' : '次の問題へ';
    }
    nextQuestionLink.setAttribute('aria-label', isFinalQuestion ? '終了' : '次の問題へ');
  }
}

// 動画再生ボタンの初期化処理。
// 問題表示画面や動画再生ボタンの連打防止、再生時間の開始、終了時の状態回復をまとめて扱う。
// 動画再生制御を初期化する。
function initVideoPlayback() {
  if (!movieVideo || !playMovieBtn) return;

  playMovieBtn.addEventListener('click', async () => {
    if (!isCorrectPage && playMovieBtn.dataset.played === 'true') return;

    if (!isCorrectPage) {
      playMovieBtn.dataset.played = 'true';
      playMovieBtn.disabled = true;
      setAnswerStartTime(Date.now());
    }

    try {
      playMovieBtn.classList.add('is-played');
      movieVideo.pause();
      movieVideo.currentTime = 0;
      await movieVideo.play();
    } catch (error) {
      console.error('画像の表示に失敗しました:', error);
      playMovieBtn.classList.remove('is-played');
      if (!isCorrectPage) {
        playMovieBtn.dataset.played = 'false';
        playMovieBtn.disabled = false;
      }
    }
  });

  movieVideo.addEventListener('ended', () => {
    playMovieBtn.classList.remove('is-played');
  });
}

/* ==========================
  AreaSelect.html
  ========================== */
// 色選択画面の初期化処理。
// 画像を押したら確認ポップアップを開き、OK/NGで次の結果画面へ進むか再選択の状態を管理する。
// 色選択画面を初期化する。
function initAreaSelectionPage() {
  const buttons = document.querySelectorAll('.area-image-button');
  const confirmPopup = document.getElementById('confirmPopup');
  const selectedColorCircle = document.getElementById('selectedColor');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');

  let selectedId = null;

  // 選択中の色をプレビュー表示する。
  function setSelectedPreview(value) {
    if (!selectedColorCircle) return;

    const isImagePath = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(value || '') || (value || '').startsWith('img/');

    if (isImagePath) {
      selectedColorCircle.style.background = 'transparent';
      selectedColorCircle.style.backgroundImage = `url("${value}")`;
      selectedColorCircle.style.backgroundSize = 'cover';
      selectedColorCircle.style.backgroundPosition = 'center';
      selectedColorCircle.style.borderRadius = '0';
      return;
    }

    selectedColorCircle.style.backgroundImage = 'none';
    selectedColorCircle.style.background = value || 'transparent';
    selectedColorCircle.style.borderRadius = '50%';
  }

  if (buttons.length === 0 || !confirmPopup || !selectedColorCircle || !yesBtn || !noBtn) {
    return;
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextColor = btn.id || btn.dataset.image || '';

      if (selectedId && selectedId !== nextColor && !getQuestionLogState().cancelled_colors.includes(selectedId)) {
        const currentState = getQuestionLogState();
        currentState.cancelled_colors = Array.from(new Set([...currentState.cancelled_colors, selectedId]));
        saveQuestionLogState(currentState);
      }

      selectedId = nextColor;
      setSelectedPreview(selectedId);
      confirmPopup.style.display = 'flex';

      const areaNum = getAreaGridNumber();
      if (!getCurrentProblemNumber()) {
        setCurrentProblemNumber(areaNum);
      }
      setSelectedColor(selectedId);
      addCandidateColor(selectedId);
      addQuestionEvent('color_select', { color: selectedId });
    });
  });

  yesBtn.addEventListener('click', () => {
    const areaNum = getAreaGridNumber();
    const confirmedColor = selectedId || '';
    setSelectedColor(confirmedColor);
    addQuestionEvent('click_yes', { color: confirmedColor });
    confirmPopup.style.display = 'none';
    selectedId = null;
    window.location.href = `result.html?area=${areaNum}&color=${encodeURIComponent(confirmedColor)}`;
  });

  noBtn.addEventListener('click', () => {
    const cancelledColor = selectedId || '';
    if (cancelledColor) {
      cancelColor(cancelledColor);
      addQuestionEvent('click_no', { color: cancelledColor });
    }
    confirmPopup.style.display = 'none';
    selectedId = null;
    if (selectedColorCircle) {
      selectedColorCircle.style.background = 'transparent';
      selectedColorCircle.style.backgroundImage = 'none';
      selectedColorCircle.style.borderRadius = '0';
    }
  });
}

/* ==========================
  result.html
  ========================== */
// 結果表示画面の初期化処理。
// URL の area と color を読み取り、対応する意味画像と説明文を画面に表示する。
// 結果画面を初期化する。
function initResultPage() {
  const isResultPage = window.location.pathname.endsWith('result.html');
  if (!isResultPage && !isCorrectPage) return;

  const reviewNextBtn = document.getElementById('reviewNextBtn');
  const ratingInputs = document.querySelectorAll('input[name="situation-rating"]');

  const updateReviewNextButton = () => {
    const hasSelection = Array.from(ratingInputs).some((input) => input.checked);
    if (!reviewNextBtn) return;

    reviewNextBtn.disabled = !hasSelection;
    reviewNextBtn.setAttribute('aria-disabled', String(!hasSelection));
    reviewNextBtn.style.opacity = hasSelection ? '1' : '0.55';
    reviewNextBtn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
  };

  if (reviewNextBtn) {
    updateReviewNextButton();
    ratingInputs.forEach((input) => {
      input.addEventListener('change', updateReviewNextButton);
    });

    reviewNextBtn.setAttribute('aria-label', '次へ');
    reviewNextBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      if (reviewNextBtn.disabled) return;

      const evaluation = getSelectedRatingValue();
      const evaluationField = isCorrectPage ? 'evaluation2' : 'evaluation1';
      addQuestionEvent('review_next', {
        color: getSelectedColor() || '',
        [evaluationField]: evaluation
      });

      if (!isCorrectPage) {
        const state = getQuestionLogState();
        state.evaluation1 = evaluation;
        saveQuestionLogState(state);
        window.location.href = 'correct.html';
        return;
      }

      reviewNextBtn.disabled = true;
      try {
        await flushQuestionLog({
          evaluation,
          evaluation1: getQuestionLogState().evaluation1 ?? '',
          evaluation2: evaluation
        });
      } catch (error) {
        console.error('ログ送信に失敗しました:', error);
        window.alert('ログを送信できませんでした。通信を確認して、もう一度お試しください。');
        updateReviewNextButton();
        return;
      }
      clearAnswerStartTime();
      window.location.href = nextQuestionLink.href;
    });
  }

  const meaningCatalog = [
    {
      area: 1,
      number: '000',
      color: '#F4BB31',
      word: '驚き（好意的）',
      questionImage: 'img/question/Q000.jpg',
      meaningImage: 'img/meaning/A000.jpg'
    },
    {
      area: 1,
      number: '001',
      color: '#E1B70E',
      word: '快活',
      questionImage: 'img/question/Q001.jpg',
      meaningImage: 'img/meaning/A001.jpg'
    },
    {
      area: 1,
      number: '002',
      color: '#E45D37',
      word: 'お祭り気分',
      questionImage: 'img/question/Q002.jpg',
      meaningImage: 'img/meaning/A002.jpg'
    },
    {
      area: 1,
      number: '003',
      color: '#D6BA00',
      word: '高揚感',
      questionImage: 'img/question/Q003.jpg',
      meaningImage: 'img/meaning/A003.jpg'
    },
    {
      area: 1,
      number: '004',
      color: '#F2BF00',
      word: '有頂天',
      questionImage: 'img/question/Q004.jpg',
      meaningImage: 'img/meaning/A004.jpg'
    },
    {
      area: 1,
      number: '005',
      color: '#D33941',
      word: '興奮過剰',
      questionImage: 'img/question/Q005.jpg',
      meaningImage: 'img/meaning/A005.jpg'
    },
    {
      area: 1,
      number: '006',
      color: '#F7A631',
      word: '陽気',
      questionImage: 'img/question/Q006.jpg',
      meaningImage: 'img/meaning/A006.jpg'
    },
    {
      area: 1,
      number: '007',
      color: '#DA425A',
      word: '意欲',
      questionImage: 'img/question/Q007.jpg',
      meaningImage: 'img/meaning/A007.jpg'
    },
    {
      area: 1,
      number: '008',
      color: '#F6CC37',
      word: 'ひらめき',
      questionImage: 'img/question/Q008.jpg',
      meaningImage: 'img/meaning/A008.jpg'
    },
    {
      area: 1,
      number: '009',
      color: '#F78E2E',
      word: '意気揚々',
      questionImage: 'img/question/Q009.jpg',
      meaningImage: 'img/meaning/A009.jpg'
    },
    {
      area: 1,
      number: '010',
      color: '#EF8011',
      word: '活力',
      questionImage: 'img/question/Q010.jpg',
      meaningImage: 'img/meaning/A010.jpg'
    },
    {
      area: 1,
      number: '011',
      color: '#EE7722',
      word: '活気',
      questionImage: 'img/question/Q011.jpg',
      meaningImage: 'img/meaning/A011.jpg'
    },
    {
      area: 1,
      number: '012',
      color: '#C92F45',
      word: '熱意',
      questionImage: 'img/question/Q012.jpg',
      meaningImage: 'img/meaning/A012.jpg'
    },
    {
      area: 1,
      number: '013',
      color: '#F0CB73',
      word: '楽観',
      questionImage: 'img/question/Q013.jpg',
      meaningImage: 'img/meaning/A013.jpg'
    },
    {
      area: 1,
      number: '014',
      color: '#C43F3D',
      word: '興奮',
      questionImage: 'img/question/Q014.jpg',
      meaningImage: 'img/meaning/A014.jpg'
    },
    {
      area: 1,
      number: '015',
      color: '#EB6976',
      word: '嬉しさ',
      questionImage: 'img/question/Q015.jpg',
      meaningImage: 'img/meaning/A015.jpg'
    },
    {
      area: 1,
      number: '016',
      color: '#EA8F98',
      word: '幸福',
      questionImage: 'img/question/Q016.jpg',
      meaningImage: 'img/meaning/A016.jpg'
    },
    {
      area: 1,
      number: '017',
      color: '#2F7DC5',
      word: '集中',
      questionImage: 'img/question/Q017.jpg',
      meaningImage: 'img/meaning/A017.jpg'
    },
    {
      area: 1,
      number: '018',
      color: '#FFD934',
      word: '誇り',
      questionImage: 'img/question/Q018.jpg',
      meaningImage: 'img/meaning/A018.jpg'
    },
    {
      area: 1,
      number: '019',
      color: '#B80535',
      word: 'スリル',
      questionImage: 'img/question/Q019.jpg',
      meaningImage: 'img/meaning/A019.jpg'
    },
    {
      area: 1,
      number: '020',
      color: '#EFCE1F',
      word: '愉快',
      questionImage: 'img/question/Q020.jpg',
      meaningImage: 'img/meaning/A020.jpg'
    },
    {
      area: 1,
      number: '021',
      color: '#FAC422',
      word: '歓喜',
      questionImage: 'img/question/Q021.jpg',
      meaningImage: 'img/meaning/A021.jpg'
    },
    {
      area: 1,
      number: '022',
      color: '#ECC945',
      word: '希望',
      questionImage: 'img/question/Q022.jpg',
      meaningImage: 'img/meaning/A022.jpg'
    },
    {
      area: 1,
      number: '023',
      color: '#F28436',
      word: '遊び心',
      questionImage: 'img/question/Q023.jpg',
      meaningImage: 'img/meaning/A023.jpg'
    },
    {
      area: 1,
      number: '024',
      color: '#F5D269',
      word: '至福',
      questionImage: 'img/question/Q024.jpg',
      meaningImage: 'img/meaning/A024.jpg'
    },
    {
      area: 2,
      number: '100',
      color: '#9F2942',
      word: '憤怒',
      questionImage: 'img/question/Q100.jpg',
      meaningImage: 'img/meaning/A100.jpg'
    },
    {
      area: 2,
      number: '101',
      color: '#DB2D48',
      word: 'パニック',
      questionImage: 'img/question/Q101.jpg',
      meaningImage: 'img/meaning/A101.jpg'
    },
    {
      area: 2,
      number: '102',
      color: '#A25854',
      word: 'ストレス',
      questionImage: 'img/question/Q102.jpg',
      meaningImage: 'img/meaning/A102.jpg'
    },
    {
      area: 2,
      number: '103',
      color: '#A9003B',
      word: '焦燥',
      questionImage: 'img/question/Q103.jpg',
      meaningImage: 'img/meaning/A103.jpg'
    },
    {
      area: 2,
      number: '104',
      color: '#C12149',
      word: '衝撃',
      questionImage: 'img/question/Q104.jpg',
      meaningImage: 'img/meaning/A104.jpg'
    },
    {
      area: 2,
      number: '105',
      color: '#AC2750',
      word: '激高',
      questionImage: 'img/question/Q105.jpg',
      meaningImage: 'img/meaning/A105.jpg'
    },
    {
      area: 2,
      number: '106',
      color: '#B02838',
      word: '激怒',
      questionImage: 'img/question/Q106.jpg',
      meaningImage: 'img/meaning/A106.jpg'
    },
    {
      area: 2,
      number: '107',
      color: '#B89BA6',
      word: 'もどかしさ',
      questionImage: 'img/question/Q107.jpg',
      meaningImage: 'img/meaning/A107.jpg'
    },
    {
      area: 2,
      number: '108',
      color: '#8B9BA7',
      word: '緊張',
      questionImage: 'img/question/Q108.jpg',
      meaningImage: 'img/meaning/A108.jpg'
    },
    {
      area: 2,
      number: '109',
      color: '#EBF3E7',
      word: '茫然',
      questionImage: 'img/question/Q109.jpg',
      meaningImage: 'img/meaning/A109.jpg'
    },
    {
      area: 2,
      number: '110',
      color: '#A12E39',
      word: '煮えくり返り',
      questionImage: 'img/question/Q110.jpg',
      meaningImage: 'img/meaning/A110.jpg'
    },
    {
      area: 2,
      number: '111',
      color: '#402D39',
      word: '恐怖',
      questionImage: 'img/question/Q111.jpg',
      meaningImage: 'img/meaning/A111.jpg'
    },
    {
      area: 2,
      number: '112',
      color: '#AD2341',
      word: '怒り',
      questionImage: 'img/question/Q112.jpg',
      meaningImage: 'img/meaning/A112.jpg'
    },
    {
      area: 2,
      number: '113',
      color: '#C73A56',
      word: 'ドキドキ感',
      questionImage: 'img/question/Q113.jpg',
      meaningImage: 'img/meaning/A113.jpg'
    },
    {
      area: 2,
      number: '114',
      color: '#BEAFBE',
      word: 'そわそわ感',
      questionImage: 'img/question/Q114.jpg',
      meaningImage: 'img/meaning/A114.jpg'
    },
    {
      area: 2,
      number: '115',
      color: '#22395B',
      word: '強度の不安',
      questionImage: 'img/question/Q115.jpg',
      meaningImage: 'img/meaning/A115.jpg'
    },
    {
      area: 2,
      number: '116',
      color: '#A25962',
      word: '危惧',
      questionImage: 'img/question/Q116.jpg',
      meaningImage: 'img/meaning/A116.jpg'
    },
    {
      area: 2,
      number: '117',
      color: '#486385',
      word: '心配',
      questionImage: 'img/question/Q117.jpg',
      meaningImage: 'img/meaning/A117.jpg'
    },
    {
      area: 2,
      number: '118',
      color: '#B73C4C',
      word: 'イライラ',
      questionImage: 'img/question/Q118.jpg',
      meaningImage: 'img/meaning/A118.jpg'
    },
    {
      area: 2,
      number: '119',
      color: '#C6404B',
      word: '苛立ち',
      questionImage: 'img/question/Q119.jpg',
      meaningImage: 'img/meaning/A119.jpg'
    },
    {
      area: 2,
      number: '120',
      color: '#5F3F69',
      word: '嫌悪',
      questionImage: 'img/question/Q120.jpg',
      meaningImage: 'img/meaning/A120.jpg'
    },
    {
      area: 2,
      number: '121',
      color: '#2A2E53',
      word: '苦悩',
      questionImage: 'img/question/Q121.jpg',
      meaningImage: 'img/meaning/A121.jpg'
    },
    {
      area: 2,
      number: '122',
      color: '#0D465B',
      word: '懸念',
      questionImage: 'img/question/Q122.jpg',
      meaningImage: 'img/meaning/A122.jpg'
    },
    {
      area: 2,
      number: '123',
      color: '#77655E',
      word: '胸騒ぎ',
      questionImage: 'img/question/Q123.jpg',
      meaningImage: 'img/meaning/A123.jpg'
    },
    {
      area: 2,
      number: '124',
      color: '#484454',
      word: '不機嫌',
      questionImage: 'img/question/Q124.jpg',
      meaningImage: 'img/meaning/A124.jpg'
    },
    {
      area: 3,
      number: '200',
      color: '#63516A',
      word: 'うんざり感',
      questionImage: 'img/question/Q200.jpg',
      meaningImage: 'img/meaning/A200.jpg'
    },
    {
      area: 3,
      number: '201',
      color: '#4A5365',
      word: '陰気',
      questionImage: 'img/question/Q201.jpg',
      meaningImage: 'img/meaning/A201.jpg'
    },
    {
      area: 3,
      number: '202',
      color: '#2E2A27',
      word: '失望',
      questionImage: 'img/question/Q202.jpg',
      meaningImage: 'img/meaning/A202.jpg'
    },
    {
      area: 3,
      number: '203',
      color: '#354C6C',
      word: '気分の落ち込み',
      questionImage: 'img/question/Q203.jpg',
      meaningImage: 'img/meaning/A203.jpg'
    },
    {
      area: 3,
      number: '204',
      color: '#E1E0DF',
      word: '無関心',
      questionImage: 'img/question/Q204.jpg',
      meaningImage: 'img/meaning/A204.jpg'
    },
    {
      area: 3,
      number: '205',
      color: '#355873',
      word: '悲観',
      questionImage: 'img/question/Q205.jpg',
      meaningImage: 'img/meaning/A205.jpg'
    },
    {
      area: 3,
      number: '206',
      color: '#322D42',
      word: '陰鬱',
      questionImage: 'img/question/Q206.jpg',
      meaningImage: 'img/meaning/A206.jpg'
    },
    {
      area: 3,
      number: '207',
      color: '#476678',
      word: '意気消沈',
      questionImage: 'img/question/Q207.jpg',
      meaningImage: 'img/meaning/A207.jpg'
    },
    {
      area: 3,
      number: '208',
      color: '#27557D',
      word: '悲しみ',
      questionImage: 'img/question/Q208.jpg',
      meaningImage: 'img/meaning/A208.jpg'
    },
    {
      area: 3,
      number: '209',
      color: '#5B565A',
      word: '退屈',
      questionImage: 'img/question/Q209.jpg',
      meaningImage: 'img/meaning/A209.jpg'
    },
    {
      area: 3,
      number: '210',
      color: '#A69BA8',
      word: '疎外感',
      questionImage: 'img/question/Q210.jpg',
      meaningImage: 'img/meaning/A210.jpg'
    },
    {
      area: 3,
      number: '211',
      color: '#3D5762',
      word: '惨めさ',
      questionImage: 'img/question/Q211.jpg',
      meaningImage: 'img/meaning/A211.jpg'
    },
    {
      area: 3,
      number: '212',
      color: '#5C6472',
      word: '孤独',
      questionImage: 'img/question/Q212.jpg',
      meaningImage: 'img/meaning/A212.jpg'
    },
    {
      area: 3,
      number: '213',
      color: '#31495D',
      word: '落胆',
      questionImage: 'img/question/Q213.jpg',
      meaningImage: 'img/meaning/A213.jpg'
    },
    {
      area: 3,
      number: '214',
      color: '#5F5768',
      word: '疲れ',
      questionImage: 'img/question/Q214.jpg',
      meaningImage: 'img/meaning/A214.jpg'
    },
    {
      area: 3,
      number: '215',
      color: '#25334A',
      word: '悲嘆',
      questionImage: 'img/question/Q215.jpg',
      meaningImage: 'img/meaning/A215.jpg'
    },
    {
      area: 3,
      number: '216',
      color: '#343D44',
      word: 'うつ状態',
      questionImage: 'img/question/Q216.jpg',
      meaningImage: 'img/meaning/A216.jpg'
    },
    {
      area: 3,
      number: '217',
      color: '#1E3338',
      word: 'ふさぎ込み',
      questionImage: 'img/question/Q217.jpg',
      meaningImage: 'img/meaning/A217.jpg'
    },
    {
      area: 3,
      number: '218',
      color: '#565A75',
      word: '疲れ果て',
      questionImage: 'img/question/Q218.jpg',
      meaningImage: 'img/meaning/A218.jpg'
    },
    {
      area: 3,
      number: '219',
      color: '#286075',
      word: '疲労',
      questionImage: 'img/question/Q219.jpg',
      meaningImage: 'img/meaning/A219.jpg'
    },
    {
      area: 3,
      number: '220',
      color: '#242228',
      word: '絶望',
      questionImage: 'img/question/Q220.jpg',
      meaningImage: 'img/meaning/A220.jpg'
    },
    {
      area: 3,
      number: '221',
      color: '#322F3B',
      word: '絶望的状態',
      questionImage: 'img/question/Q221.jpg',
      meaningImage: 'img/meaning/A221.jpg'
    },
    {
      area: 3,
      number: '222',
      color: '#002F49',
      word: '孤立感',
      questionImage: 'img/question/Q222.jpg',
      meaningImage: 'img/meaning/A222.jpg'
    },
    {
      area: 3,
      number: '223',
      color: '#EBF2F6',
      word: '虚脱',
      questionImage: 'img/question/Q223.jpg',
      meaningImage: 'img/meaning/A223.jpg'
    },
    {
      area: 3,
      number: '224',
      color: '#FAEFE7',
      word: 'エネルギー枯渇',
      questionImage: 'img/question/Q224.jpg',
      meaningImage: 'img/meaning/A224.jpg'
    },
    {
      area: 4,
      number: '300',
      color: '#E18E82',
      word: '安堵',
      questionImage: 'img/question/Q300.jpg',
      meaningImage: 'img/meaning/A300.jpg'
    },
    {
      area: 4,
      number: '301',
      color: '#FFDBBE',
      word: '大らかさ',
      questionImage: 'img/question/Q301.jpg',
      meaningImage: 'img/meaning/A301.jpg'
    },
    {
      area: 4,
      number: '302',
      color: '#E3CF68',
      word: '充足',
      questionImage: 'img/question/Q302.jpg',
      meaningImage: 'img/meaning/A302.jpg'
    },
    {
      area: 4,
      number: '303',
      color: '#E7757F',
      word: '愛おしさ',
      questionImage: 'img/question/Q303.jpg',
      meaningImage: 'img/meaning/A303.jpg'
    },
    {
      area: 4,
      number: '304',
      color: '#FFA024',
      word: '充実感',
      questionImage: 'img/question/Q304.jpg',
      meaningImage: 'img/meaning/A304.jpg'
    },
    {
      area: 4,
      number: '305',
      color: '#8FA9BE',
      word: '冷静',
      questionImage: 'img/question/Q305.jpg',
      meaningImage: 'img/meaning/A305.jpg'
    },
    {
      area: 4,
      number: '306',
      color: '#CDAFAF',
      word: '安心',
      questionImage: 'img/question/Q306.jpg',
      meaningImage: 'img/meaning/A306.jpg'
    },
    {
      area: 4,
      number: '307',
      color: '#F16D4C',
      word: '満足',
      questionImage: 'img/question/Q307.jpg',
      meaningImage: 'img/meaning/A307.jpg'
    },
    {
      area: 4,
      number: '308',
      color: '#DF6465',
      word: '感謝',
      questionImage: 'img/question/Q308.jpg',
      meaningImage: 'img/meaning/A308.jpg'
    },
    {
      area: 4,
      number: '309',
      color: '#EE9B99',
      word: '感銘',
      questionImage: 'img/question/Q309.jpg',
      meaningImage: 'img/meaning/A309.jpg'
    },
    {
      area: 4,
      number: '310',
      color: '#E5C0BE',
      word: 'リラックス',
      questionImage: 'img/question/Q310.jpg',
      meaningImage: 'img/meaning/A310.jpg'
    },
    {
      area: 4,
      number: '311',
      color: '#EADBB6',
      word: '平穏な寛ぎ',
      questionImage: 'img/question/Q311.jpg',
      meaningImage: 'img/meaning/A311.jpg'
    },
    {
      area: 4,
      number: '312',
      color: '#B3CAB8',
      word: '安らぎ',
      questionImage: 'img/question/Q312.jpg',
      meaningImage: 'img/meaning/A312.jpg'
    },
    {
      area: 4,
      number: '313',
      color: '#E65866',
      word: '恩恵感',
      questionImage: 'img/question/Q313.jpg',
      meaningImage: 'img/meaning/A313.jpg'
    },
    {
      area: 4,
      number: '314',
      color: '#AECBC7',
      word: '心身の調和',
      questionImage: 'img/question/Q314.jpg',
      meaningImage: 'img/meaning/A314.jpg'
    },
    {
      area: 4,
      number: '315',
      color: '#18A76B',
      word: '豊かさ',
      questionImage: 'img/question/Q315.jpg',
      meaningImage: 'img/meaning/A315.jpg'
    },
    {
      area: 4,
      number: '316',
      color: '#ADAFCD',
      word: '物思い',
      questionImage: 'img/question/Q316.jpg',
      meaningImage: 'img/meaning/A316.jpg'
    },
    {
      area: 4,
      number: '317',
      color: '#9FCABA',
      word: '平和',
      questionImage: 'img/question/Q317.jpg',
      meaningImage: 'img/meaning/A317.jpg'
    },
    {
      area: 4,
      number: '318',
      color: '#A7C6D0',
      word: '快適さ',
      questionImage: 'img/question/Q318.jpg',
      meaningImage: 'img/meaning/A318.jpg'
    },
    {
      area: 4,
      number: '319',
      color: '#E0CC74',
      word: '気楽さ',
      questionImage: 'img/question/Q319.jpg',
      meaningImage: 'img/meaning/A319.jpg'
    },
    {
      area: 4,
      number: '320',
      color: '#A5A8BA',
      word: '眠気',
      questionImage: 'img/question/Q320.jpg',
      meaningImage: 'img/meaning/A320.jpg'
    },
    {
      area: 4,
      number: '321',
      color: '#E7D0B7',
      word: 'のほほん状態',
      questionImage: 'img/question/Q321.jpg',
      meaningImage: 'img/meaning/A321.jpg'
    },
    {
      area: 4,
      number: '322',
      color: '#D0C7AC',
      word: '平穏',
      questionImage: 'img/question/Q322.jpg',
      meaningImage: 'img/meaning/A322.jpg'
    },
    {
      area: 4,
      number: '323',
      color: '#92C5A7',
      word: '居心地の良さ',
      questionImage: 'img/question/Q323.jpg',
      meaningImage: 'img/meaning/A323.jpg'
    },
    {
      area: 4,
      number: '324',
      color: '#A6BBD0',
      word: '静謐',
      questionImage: 'img/question/Q324.jpg',
      meaningImage: 'img/meaning/A324.jpg'
    }
  ];

  meaningCatalogForLogging = meaningCatalog;
  if (!isResultPage) return;

  const imageMap = meaningCatalog.reduce((map, item) => {
    const areaKey = String(item.area);
    map[areaKey] = map[areaKey] || {};
    map[areaKey][item.color] = [item.meaningImage];
    return map;
  }, {});

  const normalizeColorKey = (value) => (value || '').trim().replace(/^#/, '').toUpperCase();

  const meaningLookup = new Map(meaningCatalog.map((item) => [`${item.area}:${normalizeColorKey(item.color)}`, item]));
  // URLパラメータからエリアとカラーコードを取得

  const params = new URLSearchParams(window.location.search);
  const area = params.get('area');
  const color = params.get('color');
  const img = document.getElementById('main');
  const photo = document.getElementById('photo');
  const selectedWord = document.getElementById('selectedWord');

  const getMeaningMetadata = (targetArea, targetColor) => {
    if (!targetArea || !targetColor) return null;
    return meaningLookup.get(`${String(targetArea)}:${normalizeColorKey(targetColor)}`) || null;
  };

  if (color) {
    document.documentElement.style.setProperty('--selected-color', color);
    if (photo) {
      photo.style.borderColor = color;
      photo.style.background = color;
    }
  }

  // 選択した色に対応する意味語を返す。
  function loadSelectedWord() {
    if (!area || !color) return '';
    const metadata = getMeaningMetadata(area, color);
    return metadata ? metadata.word : '';
  }

  const resolveMeaningEntry = () => {
    if (!area || !color || !imageMap[area]) return null;
    const metadata = getMeaningMetadata(area, color);
    return metadata ? [metadata.meaningImage] : null;
  };

  const trySetImage = (candidates, index = 0) => {
    if (!img || !candidates || candidates.length === 0) {
      if (selectedWord) selectedWord.textContent = '';
      return;
    }

    const candidate = candidates[index];
    if (!candidate) {
      img.src = 'img/仮画像.png';
      if (selectedWord) selectedWord.textContent = '';
      return;
    }

    img.onerror = () => trySetImage(candidates, index + 1);
    img.src = candidate;
  };

  if (img && area && color) {
    const entry = resolveMeaningEntry();
    const candidates = Array.isArray(entry) ? entry : entry ? [entry] : [];

    if (candidates.length > 0) {
      img.onerror = () => {
        const fallback = candidates.slice(1);
        trySetImage(fallback, 0);
      };
      img.src = candidates[0];

      const word = loadSelectedWord();
      if (selectedWord) {
        selectedWord.textContent = word || '';
      }
    } else {
      img.src = 'img/仮画像.png';
      if (selectedWord) selectedWord.textContent = '';
    }
  } else if (img) {
    img.src = 'img/仮画像.png';
    if (selectedWord) selectedWord.textContent = '';
  }
}

initIndexPage();
initIdPage();
initQuestionPage();
initResultPage();
initCorrectPage();
initVideoPlayback();
initAreaSelectionPage();

/* ==========================
  fin.html
  ========================== */

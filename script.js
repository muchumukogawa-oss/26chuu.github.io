'use strict';

const NICKNAME_STORAGE_KEY = 'nickname';
const ANSWER_START_TIME_KEY = 'answerStartTime';
const CURRENT_PROBLEM_KEY = 'currentProblemNumber';
const SELECTED_COLOR_KEY = 'selectedColor';
const QUESTION_IMAGE_NUMBER_KEY = 'questionImageNumber';
const QUESTION_LOG_STATE_KEY = 'questionLogState';

function getNickname() {
  return localStorage.getItem(NICKNAME_STORAGE_KEY) || '未入力';
}

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

function saveQuestionLogState(state) {
  sessionStorage.setItem(QUESTION_LOG_STATE_KEY, JSON.stringify(state));
}

function resetQuestionLogState() {
  sessionStorage.removeItem(QUESTION_LOG_STATE_KEY);
}

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

function getSelectedRatingValue() {
  return document.querySelector('input[name="situation-rating"]:checked')?.value ?? '';
}

function toJstIsoString(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().replace('Z', '+09:00');
}

function buildQuestionLogEntry(extra = {}) {
  const state = getQuestionLogState();
  const finalSelectedColor = getSelectedColor() || state.selected_color || '';
  const candidateColors = Array.isArray(state.candidate_colors) ? state.candidate_colors : [];
  const cancelledColors = Array.isArray(state.cancelled_colors) ? state.cancelled_colors : [];
  const evaluationValue = extra.evaluation ?? state.evaluation ?? getSelectedRatingValue();

  return {
    nickname: getNickname(),
    problem_no: getCurrentProblemNumber() || state.problem_no || '',
    area_no: getCurrentProblemNumber() || state.problem_no || '',
    selected_color: finalSelectedColor,
    candidate_colors: candidateColors,
    cancelled_colors: cancelledColors,
    answer_time_sec: getElapsedTimeSeconds(),
    event_history: state.event_history || [],
    timestamp: toJstIsoString(),
    evaluation: evaluationValue
  };
}

async function appendLogEntry(entry) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  } catch (error) {
    console.error('ログ送信に失敗しました:', error);
  }
}

async function flushQuestionLog(extra = {}) {
  const entry = buildQuestionLogEntry(extra);
  await appendLogEntry(entry);
  resetQuestionLogState();
}

// 解答開始時間を保存する
function setAnswerStartTime(time) {
  sessionStorage.setItem(ANSWER_START_TIME_KEY, String(time));
}

// 解答開始時間を取得する
function getAnswerStartTime() {
  const storedValue = sessionStorage.getItem(ANSWER_START_TIME_KEY);
  if (!storedValue) return null;
  const parsedValue = Number(storedValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

// 解答開始時間をクリア
function clearAnswerStartTime() {
  sessionStorage.removeItem(ANSWER_START_TIME_KEY);
}

// 現在の問題番号を保存する
function setCurrentProblemNumber(value) {
  sessionStorage.setItem(CURRENT_PROBLEM_KEY, String(value));
}

// 現在の問題番号を取得する
function getCurrentProblemNumber() {
  return sessionStorage.getItem(CURRENT_PROBLEM_KEY) || '';
}

// 選択した色を保存する
function setSelectedColor(value) {
  sessionStorage.setItem(SELECTED_COLOR_KEY, String(value));
}

// 選択した色を取得する
function getSelectedColor() {
  return sessionStorage.getItem(SELECTED_COLOR_KEY) || '';
}

function getElapsedTimeSeconds() {
  const startTime = getAnswerStartTime();
  if (!startTime) return '0.00';
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

// index.html 用
const startBtn = document.querySelector('.start-btn');
// const popup = document.getElementById('popup');
// const closeBtn = document.querySelector('.close');
// const agreeBtn = document.getElementById('agreeBtn');

if (startBtn) {
  startBtn.addEventListener('click', () => {
    window.location.href = 'test.html';
  });

  // startBtn.addEventListener('click', (e) => {
  //   e.preventDefault();
  //   popup.style.display = 'flex';
  // });

  // closeBtn.addEventListener('click', () => (popup.style.display = 'none'));

  // agreeBtn.addEventListener('click', () => {
  //   window.location.href = 'test.html';
  // });
}

// ques.html / correct.html 用
const movieVideo = document.getElementById('movieVideo');
const playMovieBtn = document.getElementById('playMovieBtn');
const isCorrectPage = window.location.pathname.endsWith('correct.html');

const isMoviePage = window.location.pathname.endsWith('ques.html');

const questionImage = document.getElementById('questionImage');
const answerImage = document.getElementById('answerImage');

if (isMoviePage && questionImage && playMovieBtn) {
  const questionImageFiles = [
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index).padStart(3, '0')}.jpg`),
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index + 100).padStart(3, '0')}.jpg`),
    ...Array.from({ length: 25 }, (_, index) => `Q${String(index + 300).padStart(3, '0')}.JPG`)
  ];
  const answerImageNumbers = new Set(['100', '122']);
  const matchingQuestionImages = questionImageFiles.filter((filename) => {
    const number = filename.match(/\d+/)?.[0];
    return number && answerImageNumbers.has(number);
  });
  if (matchingQuestionImages.length === 0) {
    throw new Error('対応する問題画像が見つかりません');
  }
  const randomImage = matchingQuestionImages[Math.floor(Math.random() * matchingQuestionImages.length)];
  const questionImageNumber = randomImage.match(/\d+/)?.[0];
  if (!questionImageNumber) {
    throw new Error('対応する問題画像が見つかりません');
  }
  sessionStorage.setItem(QUESTION_IMAGE_NUMBER_KEY, questionImageNumber);
  setCurrentProblemNumber(questionImageNumber);
  questionImage.src = `question/${randomImage}`;

  playMovieBtn.addEventListener('click', () => {
    if (playMovieBtn.dataset.played === 'true') return;

    playMovieBtn.dataset.played = 'true';
    playMovieBtn.disabled = true;
    setAnswerStartTime(Date.now());
    questionImage.classList.add('is-visible');

    window.setTimeout(() => {
      questionImage.classList.remove('is-visible');
    }, 10000);
  });
}

if (isCorrectPage && answerImage && playMovieBtn) {
  const questionImageNumber = sessionStorage.getItem(QUESTION_IMAGE_NUMBER_KEY);
  if (!questionImageNumber) {
    throw new Error('問題画像の番号が保存されていません');
  }

  answerImage.src = `meaning/A${questionImageNumber}.jpg`;
  answerImage.addEventListener('error', () => {
    console.error(`正解画像を読み込めませんでした: ${answerImage.src}`);
  });

  playMovieBtn.addEventListener('click', () => {
    answerImage.classList.add('is-visible');
  });
}

if (movieVideo && playMovieBtn) {
  playMovieBtn.addEventListener('click', async () => {
    if (!isCorrectPage && playMovieBtn.dataset.played === 'true') return;

    if (!isCorrectPage) {
      playMovieBtn.dataset.played = 'true';
      playMovieBtn.disabled = true;
      setAnswerStartTime(Date.now()); // 解答開始時間を保存
    }

    try {
      playMovieBtn.classList.add('is-played');
      movieVideo.pause();
      movieVideo.currentTime = 0;
      await movieVideo.play();
    } catch (error) {
      console.error('動画再生に失敗しました:', error);
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

// num_area.html 用
const buttons = document.querySelectorAll('.button-16grid button, .area-image-button');
const confirmPopup = document.getElementById('confirmPopup');
const selectedColorCircle = document.getElementById('selectedColor');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');

let selectedId = null;

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

if (buttons.length > 0 && confirmPopup && selectedColorCircle && yesBtn && noBtn) {
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

      const areaDiv = document.querySelector('.button-16grid, .area-image-grid');
      const areaNum = areaDiv ? areaDiv.id.replace('area', '') : '1';
      if (!getCurrentProblemNumber()) {
        setCurrentProblemNumber(areaNum);
      }
      setSelectedColor(selectedId);
      addCandidateColor(selectedId);
      addQuestionEvent('color_select', { color: selectedId });
    });
  });

  yesBtn.addEventListener('click', () => {
    const areaDiv = document.querySelector('.button-16grid, .area-image-grid');
    const areaNum = areaDiv ? areaDiv.id.replace('area', '') : '1';
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

const reviewNextBtn = document.getElementById('reviewNextBtn');
if (reviewNextBtn) {
  reviewNextBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    addQuestionEvent('review_next', { color: getSelectedColor() || '' });
    const evaluation = getSelectedRatingValue();
    await flushQuestionLog({ evaluation });
    clearAnswerStartTime();
    window.location.href = 'correct.html';
  });
}

// result.html 用
if (window.location.pathname.endsWith('result.html')) {
  const imageMap = {
    1: {
      '#F4BB31': ['img/meaning/A000.jpg'], //驚き（好意的）
      '#E1B70E': ['img/meaning/A001.jpg'], //快活
      '#E45D37': ['img/meaning/A002.jpg'], //お祭り気分
      '#D6BA00': ['img/meaning/A003.jpg'], //高揚感
      '#F2BF00': ['img/meaning/A004.jpg'], //有頂天
      '#D33941': ['img/meaning/A005.jpg'], //興奮過剰
      '#F7A631': ['img/meaning/A006.jpg'], //陽気
      '#DA425A': ['img/meaning/A007.jpg'], //意欲
      '#F6CC37': ['img/meaning/A008.jpg'], //ひらめき
      '#F78E2E': ['img/meaning/A009.jpg'], //意気揚々
      '#EF8011': ['img/meaning/A010.jpg'], //活力
      '#EE7722': ['img/meaning/A011.jpg'], //活気
      '#C92F45': ['img/meaning/A012.jpg'], //熱意
      '#F0CB73': ['img/meaning/A013.jpg'], //楽観
      '#C43F3D': ['img/meaning/A014.jpg'], //興奮
      '#EB6976': ['img/meaning/A015.jpg'], //嬉しさ
      '#EA8F98': ['img/meaning/A016.jpg'], //幸福
      '#2F7DC5': ['img/meaning/A017.jpg'], //集中
      '#FFD934': ['img/meaning/A018.jpg'], //誇り
      '#B80535': ['img/meaning/A019.jpg'], //スリル
      '#EFCE1F': ['img/meaning/A020.jpg'], //愉快
      '#FAC422': ['img/meaning/A021.jpg'], //歓喜
      '#ECC945': ['img/meaning/A022.jpg'], //希望
      '#F28436': ['img/meaning/A023.jpg'], //遊び心
      '#F5D269': ['img/meaning/A024.jpg'] //至福
      // ... 1エリアの25色分
    },
    2: {
      '#9F2942': ['img/meaning/A100.jpg'], //憤怒
      '#DB2D48': ['img/meaning/A101.jpg'], //パニック
      '#A25854': ['img/meaning/A102.jpg'], //ストレス
      '#A9003B': ['img/meaning/A103.jpg'], //焦燥
      '#C12149': ['img/meaning/A104.jpg'], //衝撃
      '#AC2750': ['img/meaning/A105.jpg'], //激高
      '#B02838': ['img/meaning/A106.jpg'], //激怒
      '#B89BA6': ['img/meaning/A107.jpg'], //もどかしさ
      '#8B9BA7': ['img/meaning/A108.jpg'], //緊張
      '#EBF3E7': ['img/meaning/A109.jpg'], //茫然
      '#A12E39': ['img/meaning/A110.jpg'], //煮えくり返り
      '#402D39': ['img/meaning/A111.jpg'], //恐怖
      '#AD2341': ['img/meaning/A112.jpg'], //怒り
      '#C73A56': ['img/meaning/A113.jpg'], //ドキドキ感
      '#BEAFBE': ['img/meaning/A114.jpg'], //そわそわ感
      '#22395B': ['img/meaning/A115.jpg'], //強度の不安
      '#A25962': ['img/meaning/A116.jpg'], //危惧
      '#486385': ['img/meaning/A117.jpg'], //心配
      '#B73C4C': ['img/meaning/A118.jpg'], //イライラ
      '#C6404B': ['img/meaning/A119.jpg'], //苛立ち
      '#5F3F69': ['img/meaning/A120.jpg'], //嫌悪
      '#2A2E53': ['img/meaning/A121.jpg'], //苦悩
      '#0D465B': ['img/meaning/A122.jpg'], //懸念
      '#77655E': ['img/meaning/A123.jpg'], //胸騒ぎ
      '#484454': ['img/meaning/A124.jpg'] //不機嫌
      // ... 2エリアの25色分
    },
    3: {
      '#63516A': ['img/meaning/A200.jpg'], //うんざり感
      '#4A5365': ['img/meaning/A201.jpg'], //陰気
      '#2E2A27': ['img/meaning/A202.jpg'], //失望
      '#354C6C': ['img/meaning/A203.jpg'], //気分の落ち込み
      '#E1E0DF': ['img/meaning/A204.jpg'], //無関心
      '#355873': ['img/meaning/A205.jpg'], //悲観
      '#322D42': ['img/meaning/A206.jpg'], //陰鬱
      '#476678': ['img/meaning/A207.jpg'], //意気消沈
      '#27557D': ['img/meaning/A208.jpg'], //悲しみ
      '#5B565A': ['img/meaning/A209.jpg'], //退屈
      '#A69BA8': ['img/meaning/A210.jpg'], //疎外感
      '#3D5762': ['img/meaning/A211.jpg'], //惨めさ
      '#5C6472': ['img/meaning/A212.jpg'], //孤独
      '#31495D': ['img/meaning/A213.jpg'], //落胆
      '#5F5768': ['img/meaning/A214.jpg'], //疲れ
      '#25334A': ['img/meaning/A215.jpg'], //悲嘆
      '#343D44': ['img/meaning/A216.jpg'], //うつ状態
      '#1E3338': ['img/meaning/A217.jpg'], //ふさぎ込み
      '#565A75': ['img/meaning/A218.jpg'], //疲れ果て
      '#286075': ['img/meaning/A219.jpg'], //疲労
      '#242228': ['img/meaning/A220.jpg'], //絶望
      '#322F3B': ['img/meaning/A221.jpg'], //絶望的状態
      '#002F49': ['img/meaning/A222.jpg'], //孤立感
      '#EBF2F6': ['img/meaning/A223.jpg'], //虚脱
      '#FAEFE7': ['img/meaning/A224.jpg'] //エネルギー枯渇
      // ... 3エリアの25色分
    },
    4: {
      '#E18E82': ['img/meaning/A300.jpg'], //安堵
      '#FFDBBE': ['img/meaning/A301.jpg'], //大らかさ
      '#E3CF68': ['img/meaning/A302.jpg'], //充足
      '#E7757F': ['img/meaning/A303.jpg'], //愛おしさ
      '#FFA024': ['img/meaning/A304.jpg'], //充実感
      '#8FA9BE': ['img/meaning/A305.jpg'], //冷静
      '#CDAFAF': ['img/meaning/A306.jpg'], //安心
      '#F16D4C': ['img/meaning/A307.jpg'], //満足
      '#DF6465': ['img/meaning/A308.jpg'], //感謝
      '#EE9B99': ['img/meaning/A309.jpg'], //感銘
      '#E5C0BE': ['img/meaning/A310.jpg'], //リラックス
      '#EADBB6': ['img/meaning/A311.jpg'], //平穏な寛ぎ
      '#B3CAB8': ['img/meaning/A312.jpg'], //安らぎ
      '#E65866': ['img/meaning/A313.jpg'], //恩恵感
      '#AECBC7': ['img/meaning/A314.jpg'], //心身の調和
      '#18A76B': ['img/meaning/A315.jpg'], //豊かさ
      '#ADAFCD': ['img/meaning/A316.jpg'], //物思い
      '#9FCABA': ['img/meaning/A317.jpg'], //平和
      '#A7C6D0': ['img/meaning/A318.jpg'], //快適さ
      '#E0CC74': ['img/meaning/A319.jpg'], //気楽さ
      '#A5A8BA': ['img/meaning/A320.jpg'], //眠気
      '#E7D0B7': ['img/meaning/A321.jpg'], //のほほん状態
      '#D0C7AC': ['img/meaning/A322.jpg'], //平穏
      '#92C5A7': ['img/meaning/A323.jpg'], //居心地の良さ
      '#A6BBD0': ['img/meaning/A324.jpg'] //静謐
      // ... 4エリアの25色分
    }
  };
  // URLパラメータからエリアとカラーコードを取得

  const params = new URLSearchParams(window.location.search);
  const area = params.get('area');
  const color = params.get('color');
  const img = document.getElementById('main');
  const photo = document.getElementById('photo');
  const selectedWord = document.getElementById('selectedWord');

  if (color) {
    document.documentElement.style.setProperty('--selected-color', color);
    if (photo) {
      photo.style.borderColor = color;
      photo.style.background = color;
    }
  }

  async function loadSelectedWord() {
    if (!area || !color) return '';

    try {
      const source = await fetch('script.js').then((response) => response.text());
      const escapedColor = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = source.match(
        new RegExp(`'${escapedColor}'\\s*:\\s*\\[[^\\]]*\\]\\s*(?:,)?\\s*//\\s*([^\\r\\n]+)`, 'm')
      );
      return match ? match[1].trim() : '';
    } catch (error) {
      console.error('感情語彙の取得に失敗しました:', error);
      return '';
    }
  }

  if (img && area && color && imageMap[area] && imageMap[area][color]) {
    const currentImage = imageMap[area][color][0];
    img.src = currentImage;

    loadSelectedWord().then((word) => {
      if (selectedWord) {
        selectedWord.textContent = word || '';
      }
    });
  } else if (img) {
    img.src = 'img/仮画像.png';
    if (selectedWord) {
      selectedWord.textContent = '';
    }
  }
}

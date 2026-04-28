'use strict';

// index.html 用
const startBtn = document.querySelector('.start-btn');
const popup = document.getElementById('popup');
const closeBtn = document.querySelector('.close');
const agreeBtn = document.getElementById('agreeBtn');

if (startBtn && popup && closeBtn && agreeBtn) {
  startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => (popup.style.display = 'none'));

  agreeBtn.addEventListener('click', () => {
    window.location.href = 'play.html';
  });
}

// num_area.html 用
const buttons = document.querySelectorAll('.button-16grid button');
const confirmPopup = document.getElementById('confirmPopup');
const selectedColorCircle = document.getElementById('selectedColor');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');

let selectedId = null;

if (buttons.length > 0 && confirmPopup && selectedColorCircle && yesBtn && noBtn) {
  // ボタン押下時
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedId = btn.id;
      selectedColorCircle.style.background = selectedId; // idがカラーコード
      confirmPopup.style.display = 'flex';
    });
  });

  // 「はい」押下時
  yesBtn.addEventListener('click', () => {
    const areaDiv = document.querySelector('.button-16grid');
    const areaNum = areaDiv ? areaDiv.id.replace('area', '') : '1';
    window.location.href = `result.html?area=${areaNum}&color=${encodeURIComponent(selectedId)}`;
  });

  // 「いいえ」押下時
  noBtn.addEventListener('click', () => {
    confirmPopup.style.display = 'none';
  });
}

// result.html 用
if (window.location.pathname.endsWith('result.html')) {
  const imageMap = {
    1: {
      '#92d050': ['img/area1/001.PNG', 'img/area1/101.PNG'],
      '#ffee00': ['img/area1/002.PNG', 'img/area1/102.PNG'],
      '#ffd500': ['img/area1/003.PNG', 'img/area1/103.PNG'],
      '#ff0000': ['img/area1/004.PNG', 'img/area1/104.PNG'],
      '#f7ff40': ['img/area1/005.PNG', 'img/area1/105.PNG'],
      '#ff9900': ['img/area1/006.PNG', 'img/area1/106.PNG'],
      '#fc6204': ['img/area1/007.PNG', 'img/area1/107.PNG'],
      '#ff4343': ['img/area1/008.PNG', 'img/area1/108.PNG'],
      '#fff354': ['img/area1/009.PNG', 'img/area1/109.PNG'],
      '#ffba45': ['img/area1/010.PNG', 'img/area1/110.PNG'],
      '#ff92e0': ['img/area1/011.PNG', 'img/area1/111.PNG'],
      '#ff8989': ['img/area1/012.PNG', 'img/area1/112.PNG'],
      '#f0ea00': ['img/area1/013.PNG', 'img/area1/113.PNG'],
      '#f1a983': ['img/area1/014.PNG', 'img/area1/114.PNG'],
      '#ffcc99': ['img/area1/015.PNG', 'img/area1/115.PNG'],
      '#ff8db4': ['img/area1/016.PNG', 'img/area1/116.PNG']
      // ... 1エリアの16色分
    },
    2: {
      '#c1e4f5': ['img/area2/001.PNG', 'img/area2/101.PNG'],
      '#ffcccc': ['img/area2/002.PNG', 'img/area2/102.PNG'],
      '#ffddf4': ['img/area2/003.PNG', 'img/area2/103.PNG'],
      '#00b050': ['img/area2/004.PNG', 'img/area2/104.PNG'],
      '#83caeb': ['img/area2/005.PNG', 'img/area2/105.PNG'],
      '#ff9999': ['img/area2/006.PNG', 'img/area2/106.PNG'],
      '#d9f9fb': ['img/area2/007.PNG', 'img/area2/107.PNG'],
      '#ffffcc': ['img/area2/008.PNG', 'img/area2/108.PNG'],
      '#4d94d8': ['img/area2/009.PNG', 'img/area2/109.PNG'],
      '#b3e5a1': ['img/area2/010.PNG', 'img/area2/110.PNG'],
      '#b7f2f7': ['img/area2/011.PNG', 'img/area2/111.PNG'],
      '#ffff99': ['img/area2/012.PNG', 'img/area2/112.PNG'],
      '#215e99': ['img/area2/013.PNG', 'img/area2/113.PNG'],
      '#4bb3e1': ['img/area2/014.PNG', 'img/area2/114.PNG'],
      '#1bd5e3': ['img/area2/015.PNG', 'img/area2/115.PNG'],
      '#ffb0ff': ['img/area2/016.PNG', 'img/area2/116.PNG']
      // ... 2エリアの16色分
    },
    3: {
      '#d0d0d0': ['img/area3/001.PNG', 'img/area3/101.PNG'],
      '#2195c9': ['img/area3/002.PNG', 'img/area3/102.PNG'],
      '#16abb6': ['img/area3/003.PNG', 'img/area3/103.PNG'],
      '#5ba142': ['img/area3/004.PNG', 'img/area3/104.PNG'],
      '#747474': ['img/area3/005.PNG', 'img/area3/105.PNG'],
      '#186b90': ['img/area3/006.PNG', 'img/area3/106.PNG'],
      '#0e6d74': ['img/area3/007.PNG', 'img/area3/107.PNG'],
      '#427530': ['img/area3/008.PNG', 'img/area3/108.PNG'],
      '#3a3a3a': ['img/area3/009.PNG', 'img/area3/109.PNG'],
      '#0f4861': ['img/area3/010.PNG', 'img/area3/110.PNG'],
      '#0a5156': ['img/area3/011.PNG', 'img/area3/111.PNG'],
      '#305523': ['img/area3/012.PNG', 'img/area3/112.PNG'],
      '#000000': ['img/area3/013.PNG', 'img/area3/113.PNG'],
      '#0a3041': ['img/area3/014.PNG', 'img/area3/114.PNG'],
      '#084044': ['img/area3/015.PNG', 'img/area3/115.PNG'],
      '#595959': ['img/area3/016.PNG', 'img/area3/116.PNG']
      // ... 3エリアの16色分
    },
    4: {
      '#d2cd00': ['img/area4/001.PNG', 'img/area4/101.PNG'],
      '#d593d3': ['img/area4/002.PNG', 'img/area4/102.PNG'],
      '#9b87b0': ['img/area4/003.PNG', 'img/area4/103.PNG'],
      '#c85a55': ['img/area4/004.PNG', 'img/area4/104.PNG'],
      '#868300': ['img/area4/005.PNG', 'img/area4/105.PNG'],
      '#9668a3': ['img/area4/006.PNG', 'img/area4/106.PNG'],
      '#ae5d5d': ['img/area4/007.PNG', 'img/area4/107.PNG'],
      '#d70000': ['img/area4/008.PNG', 'img/area4/108.PNG'],
      '#545200': ['img/area4/009.PNG', 'img/area4/109.PNG'],
      '#836381': ['img/area4/010.PNG', 'img/area4/110.PNG'],
      '#d7623e': ['img/area4/011.PNG', 'img/area4/111.PNG'],
      '#982e11': ['img/area4/012.PNG', 'img/area4/112.PNG'],
      '#460000': ['img/area4/013.PNG', 'img/area4/113.PNG'],
      '#782170': ['img/area4/014.PNG', 'img/area4/114.PNG'],
      '#b02163': ['img/area4/015.PNG', 'img/area4/115.PNG'],
      '#7c0000': ['img/area4/016.PNG', 'img/area4/116.PNG']
      // ... 4エリアの16色分
    }
  };
  // URLパラメータからエリアとカラーコードを取得

  const params = new URLSearchParams(window.location.search);
  const area = params.get('area');
  const color = params.get('color');
  const img = document.getElementById('main');
  const leftArrow = document.querySelector('.leftArrow');
  const rightArrow = document.querySelector('.rightArrow');

  let imgN = 0;
  let imageList = [];

  function updateArrows() {
    if (!leftArrow || !rightArrow) return;
    // 左端なら左矢印非表示
    leftArrow.style.display = imgN === 0 ? 'none' : 'block';
    // 右端なら右矢印非表示
    rightArrow.style.display = imgN === imageList.length - 1 ? 'none' : 'block';
  }

  if (img && area && color && imageMap[area] && imageMap[area][color]) {
    imageList = imageMap[area][color];
    img.src = imageList[imgN];
    updateArrows();

    // スライドショーのイベント
    if (leftArrow && rightArrow) {
      leftArrow.addEventListener('click', () => {
        if (imgN > 0) {
          imgN -= 1;
          img.src = imageList[imgN];
          updateArrows();
        }
      });
      rightArrow.addEventListener('click', () => {
        if (imgN < imageList.length - 1) {
          imgN += 1;
          img.src = imageList[imgN];
          updateArrows();
        }
      });
    }
  } else if (img) {
    img.src = 'img/仮画像.png';
    if (leftArrow) leftArrow.style.display = 'none';
    if (rightArrow) rightArrow.style.display = 'none';
  }
}

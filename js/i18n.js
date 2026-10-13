/* Inkbloom — strings (Korean / English) */
(function () {
  'use strict';
  var S = {
    ko: {
      title: '번짐', subtitle: 'Inkbloom',
      continue: '이어서 그리기', start: '그리기 시작', allDone: '모든 장을 완성했어요',
      daily: '오늘의 한 장', dailyDone: '오늘 완성', dailyNew: '새 그림이 기다려요',
      streak: '{n}일 연속', bestStreak: '최고 {n}일', noStreak: '오늘부터 시작',
      sketchbook: '스케치북', diary: '그림 일기', settings: '설정',
      chapter: '{n}장', locked: '잠김', newPaper: '새 종이: {p}',
      paintings: '그림 {n}/{m}', seals: '서명 {n}',
      back: '뒤로', close: '닫기', retry: '다시', hint: '힌트', next: '다음 장', replay: '다시 그리기', home: '처음으로',
      beat: '박자', inkLeft: '남은 잉크',
      tapHere: '눌러 보세요', tapWell: '우물을 눌러요',
      ready: '빈 칸을 누르면 시간이 흐르기 시작해요',
      win: '완성', winSeal: '서명 완성', winHint: '도움 받아 완성',
      dailyWin: '오늘의 한 장 완성',
      chapterDone: '{c} 스케치북을 다 채웠어요',
      unlockPaper: '새 종이를 얻었어요: {p}',
      attempts: '{n}번째 시도',
      waitInk: '잉크가 남았어요',
      // failure reasons
      fDry: '이 자리는 비워 둬야 해요',
      fFirst: '{c}{ga} {t}보다 먼저 왔어요',
      fAlone: '여기서 색이 섞였어요. {t}{ga2} 혼자 와야 해요',
      fEarly: '{c}{ga} 먼저 도착했어요',
      fEarlySub: '{o}도 같은 박자에 와야 {t}{ga2} 돼요',
      fTook: '{c}{ga} 이 자리를 차지했어요',
      fLater: '{x}을 조금 더 늦게, 또는 더 멀리 떨어뜨려 보세요',
      fSooner: '{x}을 조금 더 일찍, 또는 더 가까이 떨어뜨려 보세요',
      fAloneSub: '{t}{ga2} 다른 색보다 먼저 닿게 해 보세요',
      fPair: '다른 짝이 만나 {c}{ga} 됐어요',
      fMud: '세 색이 한꺼번에 만나 탁해졌어요',
      fMudSub: '세 잉크가 같은 박자에 닿지 않게 하세요',
      fEmpty: '여기까지 잉크가 닿지 않았어요',
      fEmptySub: '어디에 떨어뜨려야 닿을까요',
      fGenericSub: '자리나 타이밍을 바꿔 보세요',
      hintTip: '막히면 힌트를 눌러 보세요',
      // settings
      sLang: '언어', sSound: '소리', sVibe: '진동', sCB: '색 구분 도움', sCBDesc: '색맹 친화 팔레트와 모든 칸에 색 기호를 표시해요',
      sTempo: '박자 빠르기', tempoNormal: '보통', tempoRelaxed: '느긋하게', sPaper: '종이',
      sReset: '기록 초기화', sResetConfirm: '정말 모든 기록을 지울까요? 한 번 더 누르면 지워져요',
      on: '켬', off: '끔',
      legendTitle: '색 기호', legendDesc: '점 위치가 원색을 뜻해요. 섞인 색은 점이 두 개예요.',
      // mechanics
      mWall: '벽은 잉크를 막아요',
      mWell: '우물에만 떨어뜨릴 수 있어요',
      mSeed: '잠든 잉크는 닿으면 깨어나 번져요',
      mShort: '숫자만큼만 번지는 잉크예요',
      mDry: '점선 칸은 끝까지 하얗게 남겨요',
      mThick: '두꺼운 종이에서는 한 박자 쉬어 가요',
      mBlot: '젖은 잉크는 첫 방울과 함께 번져요',
      mMix: '같은 박자에 만난 색은 섞여요',
      mSeam: '섞인 자리는 벽처럼 잉크를 막아요',
      paperNames: { cream: '크림', hanji: '한지', kraft: '크라프트', sage: '세이지', rose: '로즈', mist: '안개', gold: '금박' },
      colors: { R: '빨강', Y: '노랑', B: '파랑', O: '주황', G: '초록', P: '보라', K: '먹색' },
      weekdays: ['일', '월', '화', '수', '목', '금', '토'],
      months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      dailyLevel: '{m}월 {d}일',
      diff: ['가볍게', '보통', '도전'],
      playToday: '오늘 그리기', viewToday: '오늘 그림 보기',
      tomorrow: '내일 새 그림이 와요',
      streakKeep: '내일도 그리면 {n}일 연속',
      paintingOf: '{n}번째 그림',
      progressLine: '{a}장 중 {b}장 완성',
      solvedIn: '{n}번 만에 완성', firstTry: '한 번에 완성',
      noPaintingYet: '아직 그리지 않았어요',
      owned: '획득'
    },
    en: {
      title: 'Inkbloom', subtitle: '번짐',
      continue: 'Continue', start: 'Start painting', allDone: 'Every page is painted',
      daily: 'Daily Sheet', dailyDone: 'Done today', dailyNew: 'A new sheet awaits',
      streak: '{n}-day streak', bestStreak: 'Best {n}', noStreak: 'Start today',
      sketchbook: 'Sketchbook', diary: 'Diary', settings: 'Settings',
      chapter: 'Book {n}', locked: 'Locked', newPaper: 'New paper: {p}',
      paintings: 'Paintings {n}/{m}', seals: 'Signed {n}',
      back: 'Back', close: 'Close', retry: 'Retry', hint: 'Hint', next: 'Next', replay: 'Paint again', home: 'Home',
      beat: 'Beat', inkLeft: 'Ink left',
      tapHere: 'Tap', tapWell: 'Tap a well',
      ready: 'Time starts with your first drop',
      win: 'Painted', winSeal: 'Signed', winHint: 'Painted with help',
      dailyWin: 'Daily sheet painted',
      chapterDone: '{c} is complete',
      unlockPaper: 'New paper unlocked: {p}',
      attempts: 'Attempt {n}',
      waitInk: 'You still have ink',
      fDry: 'This spot had to stay white',
      fFirst: '{c} got here before {t}',
      fAlone: 'Colours met here. {t} had to arrive alone',
      fEarly: '{c} arrived first',
      fEarlySub: '{o} must arrive on the same beat to make {t}',
      fTook: '{c} took this spot',
      fLater: 'Drop {x} a little later, or farther away',
      fSooner: 'Drop {x} a little sooner, or closer',
      fAloneSub: 'Get {t} here before any other colour',
      fPair: 'The wrong pair met here and made {c}',
      fMud: 'Three colours met at once and turned muddy',
      fMudSub: 'Keep all three from arriving on one beat',
      fEmpty: 'No ink reached this spot',
      fEmptySub: 'Where would a drop reach it?',
      fGenericSub: 'Try another spot or another beat',
      hintTip: 'Stuck? Try a hint',
      sLang: 'Language', sSound: 'Sound', sVibe: 'Vibration', sCB: 'Colour assist', sCBDesc: 'Colour-blind friendly palette and colour marks on every cell',
      sTempo: 'Tempo', tempoNormal: 'Normal', tempoRelaxed: 'Relaxed', sPaper: 'Paper',
      sReset: 'Reset progress', sResetConfirm: 'Erase all progress? Tap again to confirm',
      on: 'On', off: 'Off',
      legendTitle: 'Colour marks', legendDesc: 'Each dot position is a primary. Mixed colours have two dots.',
      mWall: 'Walls block ink',
      mWell: 'Drops only land in wells',
      mSeed: 'Sleeping ink wakes when touched',
      mShort: 'This ink spreads only that many steps',
      mDry: 'Dotted cells must stay white',
      mThick: 'Heavy paper holds ink for an extra beat',
      mBlot: 'Wet ink spreads with your first drop',
      mMix: 'Colours that meet on the same beat mix',
      mSeam: 'A mixed seam blocks ink like a wall',
      paperNames: { cream: 'Cream', hanji: 'Hanji', kraft: 'Kraft', sage: 'Sage', rose: 'Rose', mist: 'Mist', gold: 'Gold leaf' },
      colors: { R: 'Red', Y: 'Yellow', B: 'Blue', O: 'Orange', G: 'Green', P: 'Purple', K: 'Mud' },
      weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      dailyLevel: '{mn} {d}',
      diff: ['Light', 'Medium', 'Tricky'],
      playToday: "Paint today's sheet", viewToday: "View today's painting",
      tomorrow: 'A new sheet arrives tomorrow',
      streakKeep: 'Paint tomorrow for a {n}-day streak',
      paintingOf: 'Painting #{n}',
      progressLine: '{b} of {a} painted',
      solvedIn: 'Painted in {n} tries', firstTry: 'First try',
      noPaintingYet: 'Not painted yet',
      owned: 'unlocked'
    }
  };

  var lang = 'ko';
  function hasBatchim(word) {
    var ch = word.charCodeAt(word.length - 1);
    if (ch < 0xac00 || ch > 0xd7a3) return false;
    return (ch - 0xac00) % 28 !== 0;
  }
  function T(key, vars) {
    var s = (S[lang] && S[lang][key]);
    if (s == null) s = S.en[key];
    if (s == null) return key;
    if (typeof s !== 'string') return s;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return s;
  }
  function colorName(code) { return S[lang].colors[code] || code; }
  // Korean particle helpers: 이/가 after a colour name
  function ga(word) { return lang === 'ko' ? (hasBatchim(word) ? '이' : '가') : ''; }

  window.I18N = {
    T: T, colorName: colorName, ga: ga,
    get lang() { return lang; },
    set: function (l) { lang = S[l] ? l : 'en'; document.documentElement.lang = lang; },
    detect: function () {
      var n = (navigator.language || 'en').toLowerCase();
      return n.indexOf('ko') === 0 ? 'ko' : 'en';
    },
    name: function (obj) { return obj ? (obj[lang] || obj.en || obj.ko || '') : ''; }
  };
})();

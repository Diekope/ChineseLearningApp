const STORAGE_KEY = "chineselearn-state-v1";

const library = [
  {
    id: "ni-hao",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    translation: "hello",
    prompt: "A first greeting. Listen once, then say it slowly.",
    toneTip: "Both syllables start low and rise. Let the sound lift at the end.",
    type: "phrase",
  },
  {
    id: "xie-xie",
    hanzi: "谢谢",
    pinyin: "xiè xie",
    translation: "thank you",
    prompt: "A useful everyday phrase. Keep the first syllable crisp.",
    toneTip: "The first syllable falls clearly. The second is light and short.",
    type: "phrase",
  },
  {
    id: "wo",
    hanzi: "我",
    pinyin: "wǒ",
    translation: "I; me",
    prompt: "A single third-tone syllable. Take your time with the dip.",
    toneTip: "Start low, dip gently, then rise a little.",
    type: "word",
  },
  {
    id: "shi",
    hanzi: "是",
    pinyin: "shì",
    translation: "to be; yes",
    prompt: "A short falling tone. Imagine a clean downward step.",
    toneTip: "Begin high enough that the fall has room.",
    type: "word",
  },
  {
    id: "ma",
    hanzi: "吗",
    pinyin: "ma",
    translation: "question particle",
    prompt: "A light neutral syllable used to make yes-no questions.",
    toneTip: "Keep it short and unstressed after the main sentence.",
    type: "word",
  },
  {
    id: "wo-shi-xuesheng",
    hanzi: "我是学生。",
    pinyin: "wǒ shì xuésheng.",
    translation: "I am a student.",
    prompt: "A tiny sentence. Let each word stay relaxed and separate.",
    toneTip: "Make 是 fall, then keep 学生 smooth and light.",
    type: "sentence",
  },
];

const defaultState = {
  mode: "speak",
  activeView: "practiceView",
  showPinyin: true,
  cloudMode: false,
  audioRate: 0.8,
  cloudCents: 0,
  items: Object.fromEntries(
    library.map((item, index) => [
      item.id,
      {
        practiced: 0,
        comfort: 0,
        due: Date.now() + index * 1000,
        lastFeedback: "New",
      },
    ]),
  ),
};

let state = loadState();
let currentItem = pickNextItem();

const els = {
  practiceKind: document.querySelector("#practiceKind"),
  practiceTitle: document.querySelector("#practiceTitle"),
  practicePrompt: document.querySelector("#practicePrompt"),
  hanziText: document.querySelector("#hanziText"),
  pinyinText: document.querySelector("#pinyinText"),
  translationText: document.querySelector("#translationText"),
  hearButton: document.querySelector("#hearButton"),
  recordButton: document.querySelector("#recordButton"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  feedbackText: document.querySelector("#feedbackText"),
  choiceRow: document.querySelector("#choiceRow"),
  pinyinToggle: document.querySelector("#pinyinToggle"),
  cloudToggle: document.querySelector("#cloudToggle"),
  speedSlider: document.querySelector("#speedSlider"),
  cloudCost: document.querySelector("#cloudCost"),
  reviewList: document.querySelector("#reviewList"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pickNextItem() {
  const now = Date.now();
  return [...library].sort((a, b) => {
    const aState = state.items[a.id];
    const bState = state.items[b.id];
    const aDue = aState.due <= now ? -1 : aState.due;
    const bDue = bState.due <= now ? -1 : bState.due;
    return aDue - bDue || aState.comfort - bState.comfort;
  })[0];
}

function render() {
  renderPractice();
  renderSettings();
  renderReview();
  updateNavigation();
  saveState();
}

function renderPractice() {
  const modeLabels = {
    speak: "Speaking practice",
    listen: "Listening practice",
    read: "Reading practice",
  };

  els.practiceKind.textContent = modeLabels[state.mode];
  els.practiceTitle.textContent = getTitleForMode();
  els.practicePrompt.textContent = currentItem.prompt;
  els.hanziText.textContent = currentItem.hanzi;
  els.pinyinText.textContent = currentItem.pinyin;
  els.pinyinText.hidden = !state.showPinyin;
  els.translationText.textContent = currentItem.translation;
  els.translationText.hidden = state.mode !== "read";
  els.recordButton.textContent = state.mode === "listen" ? "Answer" : "Practice speaking";
  els.choiceRow.hidden = state.mode !== "listen";

  if (state.mode === "listen") renderChoices();

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function getTitleForMode() {
  if (state.mode === "listen") return "Listen first, then choose what you heard.";
  if (state.mode === "read") return "Read a short phrase without rushing.";
  return "Say this out loud, gently and clearly.";
}

function renderChoices() {
  const options = shuffle([
    currentItem.translation,
    ...library.filter((item) => item.id !== currentItem.id).slice(0, 2).map((item) => item.translation),
  ]);

  els.choiceRow.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => handleChoice(button, option));
    els.choiceRow.append(button);
  });
}

function renderSettings() {
  els.pinyinToggle.checked = state.showPinyin;
  els.cloudToggle.checked = state.cloudMode;
  els.speedSlider.value = state.audioRate;
  els.cloudCost.textContent = state.cloudMode
    ? `Estimated cloud cost: ${state.cloudCents} cents this session.`
    : `Estimated cloud cost: ${state.cloudCents} cents. Cloud mode is off.`;
}

function renderReview() {
  els.reviewList.innerHTML = "";
  library.forEach((item) => {
    const itemState = state.items[item.id];
    const row = document.createElement("article");
    row.className = "review-item";
    row.innerHTML = `
      <div class="review-term">${item.hanzi} <span class="pinyin">${item.pinyin}</span></div>
      <div class="review-meta">${item.translation} · ${describeComfort(itemState)}</div>
      <div class="review-meta">${itemState.lastFeedback}</div>
    `;
    els.reviewList.append(row);
  });
}

function describeComfort(itemState) {
  if (itemState.practiced === 0) return "new";
  if (itemState.comfort < 2) return "worth revisiting soon";
  if (itemState.comfort < 4) return "getting familiar";
  return "becoming comfortable";
}

function updateNavigation() {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === state.activeView);
  });

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });
}

function hearCurrentItem() {
  if (!("speechSynthesis" in window)) {
    showFeedback("Audio is not available in this browser yet. You can still read and practice aloud.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentItem.hanzi);
  utterance.lang = "zh-CN";
  utterance.rate = Number(state.audioRate);
  window.speechSynthesis.speak(utterance);
}

function practiceCurrentItem() {
  if (state.mode === "listen") {
    hearCurrentItem();
    showFeedback("Listen once, then choose the meaning below.");
    return;
  }

  const feedback = [
    `Nice. For ${currentItem.pinyin}, ${currentItem.toneTip}`,
    `Good pass. Try it once more with an easy breath before the first syllable.`,
    `Close. Keep the tone shape clear before thinking about speed.`,
  ][Math.min(state.items[currentItem.id].comfort, 2)];

  completeItem(feedback, 1);
}

function handleChoice(button, option) {
  const correct = option === currentItem.translation;
  [...els.choiceRow.children].forEach((child) => {
    child.disabled = true;
    child.classList.toggle("is-correct", child.textContent === currentItem.translation);
  });
  button.classList.toggle("is-missed", !correct);

  completeItem(
    correct
      ? "Yes. You heard it clearly enough to move on."
      : `Almost. This one means "${currentItem.translation}". Listen once more and it will settle.`,
    correct ? 1 : 0,
  );
}

function completeItem(feedback, comfortDelta) {
  const itemState = state.items[currentItem.id];
  itemState.practiced += 1;
  itemState.comfort = Math.max(0, Math.min(5, itemState.comfort + comfortDelta));
  itemState.lastFeedback = feedback;
  itemState.due = Date.now() + getReviewDelay(itemState.comfort);

  if (state.cloudMode) state.cloudCents += 1;

  showFeedback(feedback);
  window.setTimeout(() => {
    currentItem = pickNextItem();
    els.feedbackPanel.hidden = true;
    render();
  }, 1500);
  saveState();
}

function showFeedback(message) {
  els.feedbackText.textContent = message;
  els.feedbackPanel.hidden = false;
}

function getReviewDelay(comfort) {
  const minutes = [0.1, 0.5, 2, 8, 30, 90][comfort] ?? 5;
  return minutes * 60 * 1000;
}

function shuffle(items) {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

els.hearButton.addEventListener("click", hearCurrentItem);
els.recordButton.addEventListener("click", practiceCurrentItem);
els.pinyinToggle.addEventListener("change", (event) => {
  state.showPinyin = event.target.checked;
  render();
});
els.cloudToggle.addEventListener("change", (event) => {
  state.cloudMode = event.target.checked;
  render();
});
els.speedSlider.addEventListener("input", (event) => {
  state.audioRate = event.target.value;
  render();
});

document.querySelector("#settingsButton").addEventListener("click", () => {
  state.activeView = "settingsView";
  render();
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    els.feedbackPanel.hidden = true;
    currentItem = pickNextItem();
    render();
  });
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeView = button.dataset.view;
    render();
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

render();

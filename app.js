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
  showPinyin: false,
  pinyinDefaultVersion: 2,
  localAiMode: false,
  localAiEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
  audioRate: 0.8,
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
let recognition = null;
let isListening = false;

const els = {
  practiceKind: document.querySelector("#practiceKind"),
  practiceTitle: document.querySelector("#practiceTitle"),
  levelSummary: document.querySelector("#levelSummary"),
  practicePrompt: document.querySelector("#practicePrompt"),
  hanziText: document.querySelector("#hanziText"),
  pinyinText: document.querySelector("#pinyinText"),
  translationText: document.querySelector("#translationText"),
  speechPanel: document.querySelector("#speechPanel"),
  speechStatus: document.querySelector("#speechStatus"),
  transcriptText: document.querySelector("#transcriptText"),
  hearButton: document.querySelector("#hearButton"),
  recordButton: document.querySelector("#recordButton"),
  continueButton: document.querySelector("#continueButton"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  feedbackText: document.querySelector("#feedbackText"),
  choiceRow: document.querySelector("#choiceRow"),
  pinyinToggle: document.querySelector("#pinyinToggle"),
  localAiToggle: document.querySelector("#localAiToggle"),
  localAiEndpoint: document.querySelector("#localAiEndpoint"),
  testLocalAiButton: document.querySelector("#testLocalAiButton"),
  speedSlider: document.querySelector("#speedSlider"),
  aiStatus: document.querySelector("#aiStatus"),
  levelPanel: document.querySelector("#levelPanel"),
  reviewList: document.querySelector("#reviewList"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = { ...structuredClone(defaultState), ...JSON.parse(saved) };
    if (parsed.pinyinDefaultVersion !== defaultState.pinyinDefaultVersion) {
      parsed.showPinyin = false;
      parsed.pinyinDefaultVersion = defaultState.pinyinDefaultVersion;
    }
    return parsed;
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
  els.levelSummary.textContent = getLearnerLevel().name;
  els.practicePrompt.textContent = currentItem.prompt;
  els.hanziText.textContent = currentItem.hanzi;
  els.pinyinText.textContent = currentItem.pinyin;
  els.pinyinText.hidden = !state.showPinyin;
  els.translationText.textContent = currentItem.translation;
  els.translationText.hidden = state.mode !== "read";
  els.speechPanel.hidden = state.mode !== "speak";
  els.recordButton.textContent = isListening ? "Listening..." : state.mode === "listen" ? "Play again" : "Start microphone";
  els.recordButton.disabled = isListening;
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
  els.localAiToggle.checked = state.localAiMode;
  els.localAiEndpoint.value = state.localAiEndpoint;
  els.speedSlider.value = state.audioRate;
  els.aiStatus.textContent = state.localAiMode
    ? "Local AI is on. LM Studio will be asked for kinder feedback after the browser transcript is captured."
    : "Local AI is off. Speaking feedback uses browser speech recognition only.";
}

function renderReview() {
  els.reviewList.innerHTML = "";
  const level = getLearnerLevel();
  els.levelPanel.innerHTML = `
    <p class="eyebrow">Current level</p>
    <h3>${level.name}</h3>
    <p class="quiet-copy">${level.description}</p>
  `;
  library.forEach((item) => {
    const itemState = state.items[item.id];
    const row = document.createElement("article");
    row.className = "review-item";
    row.innerHTML = `
      <div class="review-term">${item.hanzi} ${state.showPinyin ? `<span class="pinyin">${item.pinyin}</span>` : ""}</div>
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

async function practiceCurrentItem() {
  if (state.mode === "listen") {
    hearCurrentItem();
    showFeedback("Listen once, then choose the meaning below.");
    return;
  }

  if (state.mode !== "speak") return;
  await startSpeechPractice();
}

async function startSpeechPractice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.speechPanel.hidden = false;
    els.speechStatus.textContent = "Speech recognition is not available in this browser.";
    els.transcriptText.textContent = "";
    showFeedback(
      "I cannot listen from this browser yet. Try Chrome or Edge for microphone practice. LM Studio can help evaluate text, but it still needs a transcript first.",
    );
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  isListening = true;
  els.speechPanel.hidden = false;
  els.speechStatus.textContent = "Listening. Say the phrase once.";
  els.transcriptText.textContent = "";
  els.feedbackPanel.hidden = true;
  els.continueButton.hidden = true;
  renderPractice();

  recognition.onresult = async (event) => {
    const results = [...event.results];
    const latest = results[results.length - 1];
    const transcript = latest?.[0]?.transcript?.trim() ?? "";
    els.transcriptText.textContent = transcript ? `Heard: ${transcript}` : "";

    if (!latest?.isFinal) return;

    stopSpeechRecognition();
    const localFeedback = evaluateSpeech(transcript, currentItem);
    const feedback = state.localAiMode
      ? await getLocalAiFeedback(transcript, localFeedback)
      : localFeedback.message;
    completeItem(feedback, localFeedback.comfortDelta, { autoAdvance: false });
  };

  recognition.onerror = (event) => {
    stopSpeechRecognition();
    els.speechStatus.textContent = "Listening stopped.";
    showFeedback(getSpeechErrorMessage(event.error));
  };

  recognition.onend = () => {
    if (isListening) {
      stopSpeechRecognition();
      showFeedback("I did not catch that. Try again close to the microphone, slowly.");
    }
  };

  recognition.start();
}

function stopSpeechRecognition() {
  isListening = false;
  els.speechStatus.textContent = "Evaluation ready.";
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  renderPractice();
}

function evaluateSpeech(transcript, item) {
  const normalizedTranscript = normalizeMandarin(transcript);
  const normalizedTarget = normalizeMandarin(item.hanzi);
  const similarity = getSimilarity(normalizedTranscript, normalizedTarget);
  const containsTarget = normalizedTranscript.includes(normalizedTarget);
  const comfortDelta = containsTarget || similarity >= 0.72 ? 1 : 0;
  const message =
    comfortDelta > 0
      ? `Good, I heard "${transcript}". ${item.toneTip} Move on when that feels steady.`
      : `I heard "${transcript || "nothing clear"}", so let us keep this one. Aim for ${item.hanzi}. ${item.toneTip}`;

  return { comfortDelta, message, similarity };
}

async function getLocalAiFeedback(transcript, localFeedback) {
  try {
    const response = await fetch(state.localAiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: [
          {
            role: "system",
            content:
              "You are a gentle Mandarin pronunciation coach. Give one short, specific French feedback sentence. No scores, no markdown.",
          },
          {
            role: "user",
            content: `Target: ${currentItem.hanzi} (${currentItem.pinyin}, ${currentItem.translation}). Browser heard: ${transcript}. Local note: ${localFeedback.message}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 80,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || localFeedback.message;
  } catch (error) {
    return `${localFeedback.message} LM Studio did not answer at ${state.localAiEndpoint}.`;
  }
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
    { autoAdvance: false },
  );
}

function completeItem(feedback, comfortDelta, options = {}) {
  const itemState = state.items[currentItem.id];
  itemState.practiced += 1;
  itemState.comfort = Math.max(0, Math.min(5, itemState.comfort + comfortDelta));
  itemState.lastFeedback = feedback;
  itemState.due = Date.now() + getReviewDelay(itemState.comfort);

  showFeedback(feedback);
  els.continueButton.hidden = false;
  if (options.autoAdvance) {
    window.setTimeout(goToNextItem, 1500);
  }
  saveState();
}

function goToNextItem() {
    currentItem = pickNextItem();
    els.feedbackPanel.hidden = true;
    els.continueButton.hidden = true;
    els.transcriptText.textContent = "";
    els.speechStatus.textContent = "Ready when you are.";
    render();
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

function normalizeMandarin(value) {
  return value
    .replace(/[，。！？,.!?;；\s]/g, "")
    .replace(/[你妳]/g, "你")
    .trim();
}

function getSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
}

function getSpeechErrorMessage(error) {
  if (error === "not-allowed") return "Microphone access was blocked. Allow microphone access, then try again.";
  if (error === "no-speech") return "I did not hear speech. Try again a little closer to the microphone.";
  if (error === "network") return "The browser speech service is unavailable. Try again, or use a browser with local speech support.";
  return "Listening stopped before I could evaluate that. Try once more.";
}

function getLearnerLevel() {
  const practiced = library.reduce((total, item) => total + state.items[item.id].practiced, 0);
  const comfort = library.reduce((total, item) => total + state.items[item.id].comfort, 0);

  if (comfort >= 18) {
    return {
      name: "Level 3 - Short sentences",
      description: "You are ready to hear and repeat tiny sentence patterns more often.",
    };
  }

  if (comfort >= 8 || practiced >= 10) {
    return {
      name: "Level 2 - Tone pairs",
      description: "Single words are starting to settle. The app will keep mixing pairs and short phrases.",
    };
  }

  return {
    name: "Level 1 - First sounds",
    description: "The focus is recognition, relaxed repetition, and a few essential HSK1 words.",
  };
}

els.hearButton.addEventListener("click", hearCurrentItem);
els.recordButton.addEventListener("click", practiceCurrentItem);
els.continueButton.addEventListener("click", goToNextItem);
els.pinyinToggle.addEventListener("change", (event) => {
  state.showPinyin = event.target.checked;
  render();
});
els.localAiToggle.addEventListener("change", (event) => {
  state.localAiMode = event.target.checked;
  render();
});
els.localAiEndpoint.addEventListener("change", (event) => {
  state.localAiEndpoint = event.target.value.trim() || defaultState.localAiEndpoint;
  render();
});
els.testLocalAiButton.addEventListener("click", async () => {
  state.localAiEndpoint = els.localAiEndpoint.value.trim() || defaultState.localAiEndpoint;
  state.localAiMode = true;
  render();
  els.aiStatus.textContent = "Testing LM Studio...";
  const feedback = await getLocalAiFeedback("你好", {
    message: "Testing local AI feedback.",
    comfortDelta: 0,
  });
  els.aiStatus.textContent = feedback.includes("did not answer")
    ? feedback
    : "LM Studio answered. Local AI feedback is ready.";
  saveState();
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

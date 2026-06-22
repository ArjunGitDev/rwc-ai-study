/* =========================================================================
   Educational AI Tutor study — application logic
   ========================================================================= */

/* ----------------------------- CONFIG ----------------------------------- */

// Optional: paste a URL here to auto-POST each participant's full data to a
// central collector (e.g. a Google Apps Script web-app URL, Formspree, or any
// endpoint that accepts a JSON POST). Leave "" to rely on the auto-download
// + localStorage copy only. See README.md for setup.
const DATA_ENDPOINT = "https://script.google.com/macros/s/AKfycbzVBu_KSB4VUcYTkJfyzqKRQfue9XFBLa4MioDWsUn7SM6qYHUh6oYfg98AJi7yeisQ9Q/exec";

// How long the AI "thinks" before revealing its predetermined answer (ms).
const AI_THINK_MS = 2000;

const STORAGE_KEY = "rwc_ai_study_session";

/* --------------------------- TIME HELPERS ------------------------------- */

// High-resolution wall-clock time since the Unix epoch, in milliseconds,
// including sub-millisecond (microsecond) fractional precision where the
// browser allows it. performance.timeOrigin is the epoch time at which the
// page's performance clock started; adding performance.now() (a fractional
// millisecond high-res value) yields a fractional epoch timestamp.
function epochHiRes() {
  return performance.timeOrigin + performance.now();
}

/* --------------------------- SESSION STATE ------------------------------ */

const session = {
  participantId: null,
  schemaVersion: 2,
  group: null,                 // "AI" | "control"
  assignment: null,            // details of the time-based coin flip
  ageRange: null,
  startedAtIso: null,
  studyStartEpoch: null,       // hi-res epoch ms captured at "Begin"
  finishedAtIso: null,
  environment: {},
  answers: {},                 // qid -> final selected choice index
  confidence: {},              // qid -> likert 1..5 (AI group only)
  aiShown: {},                 // qid -> hi-res epoch ms the AI response appeared
  events: [],                  // full chronological event log
  summary: null
};

// in-memory UI state (not persisted as-is)
let currentIndex = 0;
const aiThinkTimers = {};      // qid -> timeout handle

/* ----------------------------- LOGGING ---------------------------------- */

function logEvent(type, data) {
  const tEpoch = epochHiRes();
  const evt = {
    type: type,
    qid: (data && "qid" in data) ? data.qid : null,
    tEpoch: tEpoch,                                       // hi-res epoch ms
    tRel: session.studyStartEpoch != null
            ? +(tEpoch - session.studyStartEpoch).toFixed(3)
            : null,                                       // ms since study start
    iso: new Date().toISOString(),
    data: data || {}
  };
  session.events.push(evt);
  persist();
  return evt;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) { /* storage may be full / disabled — non-fatal */ }
}

/* --------------------------- SCREEN ROUTING ----------------------------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

/* ============================ SCREEN 1: INTRO =========================== */

const ageSelect   = document.getElementById("age-range");
const ageError    = document.getElementById("age-error");
const consentBox  = document.getElementById("consent-check");
const beginBtn    = document.getElementById("begin-btn");

beginBtn.addEventListener("click", () => {
  if (!ageSelect.value) { ageError.hidden = false; ageSelect.focus(); return; }
  ageError.hidden = true;
  if (!consentBox.checked) { consentBox.focus(); return; }

  // ---- THE MOMENT THEY START: capture hi-res epoch time & assign group ----
  const startEpoch = epochHiRes();           // fractional epoch milliseconds
  // Preserve as many decimal places as possible by converting to an integer
  // number of MICROseconds since the epoch, then test that integer's parity.
  const micros = Math.floor(startEpoch * 1000);   // microseconds since epoch
  const parity = micros % 2;                       // 0 = even, 1 = odd
  const group  = (parity === 0) ? "AI" : "control"; // even -> AI, odd -> no AI

  session.participantId = makeParticipantId(micros);
  session.studyStartEpoch = startEpoch;
  session.startedAtIso = new Date().toISOString();
  session.ageRange = ageSelect.value;
  session.group = group;
  session.assignment = {
    epochMsHiRes: startEpoch,        // e.g. 1718900000123.456
    epochMsString: startEpoch.toFixed(6),
    microsSinceEpoch: micros,        // integer used for the parity test
    modulo: 2,
    parity: parity,                  // 0 even / 1 odd
    result: group,
    rule: "even -> AI, odd -> control"
  };
  session.environment = collectEnvironment();

  logEvent("study_start", {
    group, ageRange: session.ageRange, assignment: session.assignment
  });

  document.body.classList.toggle("has-ai", group === "AI");
  renderBriefing(group);
  showScreen("screen-briefing");
});

function makeParticipantId(micros) {
  const rand = Math.random().toString(36).slice(2, 7);
  return "P-" + micros.toString(36).slice(-7) + "-" + rand;
}

function collectEnvironment() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform || "",
    timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
    screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio },
    viewport: { w: window.innerWidth, h: window.innerHeight }
  };
}

/* ========================== SCREEN 2: BRIEFING ========================== */

function renderBriefing(group) {
  const title = document.getElementById("briefing-title");
  const body  = document.getElementById("briefing-body");
  const list  = document.getElementById("instructions-list");

  if (group === "AI") {
    title.textContent = "You'll be testing the AI tutor";
    body.innerHTML = `
      <span class="briefing-tag tag-ai">AI tutor group</span>
      <p>You have been assigned to <strong>test our new educational AI tutor</strong>.
      As you work through the quiz, the AI assistant will appear in a panel on the
      right and offer its answer to each question.</p>
      <p>The assistant stays open for the entire study — it can't be closed or
      minimized. After it responds, we'll ask how confident you are in its answer.
      The final answer you give to each question is entirely your own choice.</p>`;
    list.innerHTML = `
      <li>The AI takes a couple of seconds to "think", then shows its answer.</li>
      <li>After each AI response, rate your confidence in it on a 1–5 scale.</li>
      <li>Select the answer <em>you</em> believe is correct — you can change it any time.</li>
      <li>You can jump between questions freely using the numbered navigator.</li>
      <li>Click <strong>Finish &amp; submit</strong> when you're done.</li>`;
  } else {
    title.textContent = "You're in the baseline group";
    body.innerHTML = `
      <span class="briefing-tag tag-control">Baseline / control group</span>
      <p>You have been assigned to the <strong>baseline group</strong>. You will take
      the same quiz <em>without</em> the AI tutor. Your results establish the baseline
      quiz performance that we compare against participants who do use the AI.</p>
      <p>Just answer each question as best you can.</p>`;
    list.innerHTML = `
      <li>Answer each question with the choice you believe is correct.</li>
      <li>You can change an answer any time before submitting.</li>
      <li>You can jump between questions freely using the numbered navigator.</li>
      <li>Click <strong>Finish &amp; submit</strong> when you're done.</li>`;
  }
}

document.getElementById("start-quiz-btn").addEventListener("click", () => {
  showScreen("screen-quiz");
  logEvent("quiz_open", {});
  buildNavigator();
  buildLikert();
  goToQuestion(0, "start");
});

/* ============================ SCREEN 3: QUIZ ============================ */

const elPrompt   = document.getElementById("q-prompt");
const elNumber   = document.getElementById("q-number");
const elFigure   = document.getElementById("q-figure");
const elImage    = document.getElementById("q-image");
const elChoices  = document.getElementById("q-choices");
const elProgress = document.getElementById("progress-text");
const elQnav     = document.getElementById("qnav");

function buildNavigator() {
  elQnav.innerHTML = "";
  QUESTIONS.forEach((q, i) => {
    const b = document.createElement("button");
    b.textContent = q.id;
    b.dataset.index = i;
    b.addEventListener("click", () => goToQuestion(i, "navigator"));
    elQnav.appendChild(b);
  });
}

/* ---- Validation helpers ---- */

// True if the participant must provide a Likert before leaving this question.
// Condition: AI group, they've selected an answer, AND the AI has already responded.
function requiresLikert(q) {
  return session.group === "AI"
    && session.answers[q.id] != null
    && session.aiShown[q.id] != null;
}

// True if the question is fully complete (answer given + Likert if required).
function questionIsComplete(q) {
  if (session.answers[q.id] == null) return false;
  if (requiresLikert(q) && session.confidence[q.id] == null) return false;
  return true;
}

// Flash an element red briefly via CSS animation.
function flashRed(el) {
  el.classList.remove("flash-error");
  void el.offsetWidth; // reflow to restart animation
  el.classList.add("flash-error");
}

function refreshNavigator() {
  [...elQnav.children].forEach((b, i) => {
    const q = QUESTIONS[i];
    const answered = session.answers[q.id] != null;
    const complete = questionIsComplete(q);
    b.classList.toggle("answered", answered && complete);
    b.classList.toggle("incomplete", answered && !complete);
    b.classList.toggle("current", i === currentIndex);
  });
}

function goToQuestion(index, via) {
  if (index < 0 || index >= QUESTIONS.length) return;

  // When navigating away (not on initial load or validation jump), enforce Likert.
  if (via !== "start" && via !== "validation") {
    const prev = QUESTIONS[currentIndex];
    if (requiresLikert(prev) && session.confidence[prev.id] == null) {
      flashRed(aiConfWrap);
      return; // block navigation until Likert is filled
    }
    logEvent("question_leave", { qid: prev.id });
  } else if (via === "validation") {
    // Still log the leave for the question we're jumping away from.
    logEvent("question_leave", { qid: QUESTIONS[currentIndex].id });
  }

  currentIndex = index;
  const q = QUESTIONS[index];

  elNumber.textContent = "Question " + q.id;
  elProgress.textContent = `Question ${index + 1} of ${QUESTIONS.length}`;
  elPrompt.textContent = q.prompt;

  if (q.image) {
    elImage.src = q.image;
    elImage.alt = "Figure for question " + q.id;
    elFigure.hidden = false;
  } else {
    elFigure.hidden = true;
    elImage.removeAttribute("src");
  }

  renderChoices(q);
  updateNavButtons();
  refreshNavigator();

  logEvent("question_view", { qid: q.id, index: index, via: via, phase: q.phase });

  // Drive the AI sidebar for the AI group
  if (session.group === "AI") handleAiForQuestion(q);
}

function renderChoices(q) {
  elChoices.innerHTML = "";
  const letters = "ABCDEFGH";
  q.choices.forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.dataset.index = idx;
    if (session.answers[q.id] === idx) btn.classList.add("selected");

    const marker = document.createElement("span");
    marker.className = "marker";
    marker.textContent = letters[idx];

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = label;

    btn.appendChild(marker);
    btn.appendChild(text);
    btn.addEventListener("click", () => selectAnswer(q, idx));
    elChoices.appendChild(btn);
  });
}

function selectAnswer(q, idx) {
  const previous = session.answers[q.id];
  const changed = previous != null && previous !== idx;
  session.answers[q.id] = idx;

  // Record EVERY click, including changes / second-guessing.
  logEvent("answer_click", {
    qid: q.id,
    choiceIndex: idx,
    choiceLabel: q.choices[idx],
    previousIndex: (previous == null ? null : previous),
    isChange: changed,
    aiResponseShown: session.aiShown[q.id] != null,
    msSinceAiResponse: session.aiShown[q.id] != null
        ? +(epochHiRes() - session.aiShown[q.id]).toFixed(3)
        : null
  });

  // reflect selection in UI
  [...elChoices.children].forEach((b, i) =>
    b.classList.toggle("selected", i === idx));
  refreshNavigator();
}

function updateNavButtons() {
  document.getElementById("prev-btn").disabled = currentIndex === 0;
  document.getElementById("next-btn").disabled = currentIndex === QUESTIONS.length - 1;
}

document.getElementById("prev-btn").addEventListener("click", () => goToQuestion(currentIndex - 1, "prev"));
document.getElementById("next-btn").addEventListener("click", () => goToQuestion(currentIndex + 1, "next"));

/* ----------------------------- AI SIDEBAR ------------------------------- */

const aiBody    = document.getElementById("ai-body");
const aiStatus  = document.getElementById("ai-status");
const aiConfWrap = document.getElementById("ai-confidence");

function handleAiForQuestion(q) {
  // cancel any pending think timer from a previous question
  Object.keys(aiThinkTimers).forEach(k => {
    clearTimeout(aiThinkTimers[k]);
    delete aiThinkTimers[k];
  });

  if (session.aiShown[q.id] != null) {
    // already revealed earlier — show immediately, restore any confidence
    showAiResponse(q, /*firstReveal=*/false);
    return;
  }

  // Fresh: show "thinking" for AI_THINK_MS, then reveal
  aiConfWrap.hidden = true;
  aiStatus.textContent = "Thinking…";
  aiStatus.classList.add("thinking");
  aiBody.innerHTML = `
    <div class="thinking-row">
      <span>Reading the question</span>
      <span class="dots"><span></span><span></span><span></span></span>
    </div>`;
  logEvent("ai_thinking_start", { qid: q.id });

  aiThinkTimers[q.id] = setTimeout(() => {
    delete aiThinkTimers[q.id];
    // Only reveal if the participant is still on this question
    session.aiShown[q.id] = epochHiRes();
    persist();
    logEvent("ai_response", {
      qid: q.id,
      aiCorrect: q.ai.correct,
      aiAnswerIndex: q.ai.answerIndex,
      aiAnswerLabel: q.choices[q.ai.answerIndex],
      text: q.ai.text
    });
    if (QUESTIONS[currentIndex].id === q.id) showAiResponse(q, /*firstReveal=*/true);
  }, AI_THINK_MS);
}

function showAiResponse(q, firstReveal) {
  aiStatus.textContent = "Online";
  aiStatus.classList.remove("thinking");
  aiBody.innerHTML = `
    <div class="ai-bubble">
      <span class="ai-bubble-label">AI tutor's answer</span>
      ${escapeHtml(q.ai.text)}
    </div>`;

  // Confidence widget for this question's AI response
  aiConfWrap.hidden = false;
  const saved = session.confidence[q.id];
  [...document.getElementById("likert").children].forEach(b =>
    b.classList.toggle("selected", saved != null && +b.dataset.val === saved));

  if (firstReveal) logEvent("ai_confidence_shown", { qid: q.id });
}

/* ---------------------------- CONFIDENCE -------------------------------- */

function buildLikert() {
  const likert = document.getElementById("likert");
  likert.innerHTML = "";
  for (let v = 1; v <= 5; v++) {
    const b = document.createElement("button");
    b.textContent = v;
    b.dataset.val = v;
    b.addEventListener("click", () => setConfidence(v));
    likert.appendChild(b);
  }
}

function setConfidence(val) {
  const q = QUESTIONS[currentIndex];
  const previous = session.confidence[q.id];
  session.confidence[q.id] = val;
  [...document.getElementById("likert").children].forEach(b =>
    b.classList.toggle("selected", +b.dataset.val === val));
  logEvent("confidence_rating", {
    qid: q.id,
    rating: val,
    previousRating: (previous == null ? null : previous),
    msSinceAiResponse: session.aiShown[q.id] != null
        ? +(epochHiRes() - session.aiShown[q.id]).toFixed(3)
        : null
  });
}

/* ------------------------ FOCUS / VISIBILITY ---------------------------- */
// Useful behavioural signal: leaving the tab may indicate fact-checking.

window.addEventListener("blur", () => {
  if (session.studyStartEpoch) logEvent("window_blur", { qid: currentQid() });
});
window.addEventListener("focus", () => {
  if (session.studyStartEpoch) logEvent("window_focus", { qid: currentQid() });
});
document.addEventListener("visibilitychange", () => {
  if (session.studyStartEpoch)
    logEvent("visibility_change", { qid: currentQid(), state: document.visibilityState });
});
function currentQid() {
  return QUESTIONS[currentIndex] ? QUESTIONS[currentIndex].id : null;
}

/* ============================== FINISH ================================= */

document.getElementById("finish-btn").addEventListener("click", () => {
  // Collect every question that isn't fully complete.
  const incomplete = QUESTIONS.filter(q => !questionIsComplete(q));
  if (incomplete.length) {
    // Flash all bad navigator buttons red.
    [...elQnav.children].forEach((b, i) => {
      if (!questionIsComplete(QUESTIONS[i])) flashRed(b);
    });
    // If the current question itself is the problem, also flash the relevant widget.
    const curr = QUESTIONS[currentIndex];
    if (session.answers[curr.id] == null) {
      flashRed(elChoices);
    } else if (requiresLikert(curr) && session.confidence[curr.id] == null) {
      flashRed(aiConfWrap);
    }
    // Jump to the first incomplete question.
    const firstBadIndex = QUESTIONS.indexOf(incomplete[0]);
    if (firstBadIndex !== currentIndex) goToQuestion(firstBadIndex, "validation");
    return;
  }
  finishStudy();
});

function finishStudy() {
  session.finishedAtIso = new Date().toISOString();
  session.summary = buildSummary();
  logEvent("study_finish", { score: session.summary.score, total: QUESTIONS.length });
  persist();

  // surface to the done screen
  document.getElementById("completion-code").textContent = session.participantId;
  document.getElementById("data-dump").value = JSON.stringify(session, null, 2);

  autoDownload();      // always give the researcher a local copy
  sendToEndpoint();    // optional central collection

  showScreen("screen-done");
}

function buildSummary() {
  let score = 0;
  const perQuestion = QUESTIONS.map(q => {
    const final = session.answers[q.id];
    const correct = final != null && final === q.correctIndex;
    if (correct) score++;

    // event-derived metrics
    const clicks = session.events.filter(e => e.type === "answer_click" && e.qid === q.id);
    const aiResp = session.events.find(e => e.type === "ai_response" && e.qid === q.id);
    const firstClickAfterAi = aiResp
      ? clicks.find(c => c.tEpoch >= aiResp.tEpoch)
      : null;

    return {
      qid: q.id,
      phase: q.phase,
      finalAnswerIndex: (final == null ? null : final),
      finalAnswerLabel: (final == null ? null : q.choices[final]),
      correctIndex: q.correctIndex,
      correctLabel: q.choices[q.correctIndex],
      isCorrect: correct,
      aiShown: session.group === "AI" ? (session.aiShown[q.id] != null) : null,
      aiCorrect: session.group === "AI" ? q.ai.correct : null,
      aiAnswerLabel: session.group === "AI" ? q.choices[q.ai.answerIndex] : null,
      followedAi: session.group === "AI" && final != null
                    ? (final === q.ai.answerIndex) : null,
      confidence: session.group === "AI" ? (session.confidence[q.id] ?? null) : null,
      numAnswerClicks: clicks.length,
      numAnswerChanges: Math.max(0, clicks.filter(c => c.data.isChange).length),
      msToFirstAnswerAfterAi: firstClickAfterAi ? firstClickAfterAi.data.msSinceAiResponse : null
    };
  });

  return {
    group: session.group,
    ageRange: session.ageRange,
    score: score,
    total: QUESTIONS.length,
    perQuestion: perQuestion
  };
}

/* ------------------------- EXPORT / DELIVERY ---------------------------- */

function autoDownload() {
  downloadFile(
    `rwc-ai-study_${session.participantId}.json`,
    JSON.stringify(session, null, 2),
    "application/json"
  );
}

function sendToEndpoint() {
  const statusEl = document.getElementById("upload-status");
  if (!DATA_ENDPOINT) {
    statusEl.hidden = false;
    statusEl.className = "upload-status warn";
    statusEl.textContent =
      "No central collector is configured — a data file was downloaded to this device. " +
      "Please send it to the research team.";
    return;
  }
  fetch(DATA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session)
  }).then(() => {
    statusEl.hidden = false;
    statusEl.className = "upload-status ok";
    statusEl.textContent = "Your responses were submitted to the research team. Thank you!";
  }).catch(() => {
    // Fall back to no-cors fire-and-forget (common for Apps Script endpoints)
    fetch(DATA_ENDPOINT, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(session)
    }).catch(() => {});
    statusEl.hidden = false;
    statusEl.className = "upload-status ok";
    statusEl.textContent = "Your responses were submitted. A backup file was also downloaded.";
  });
}

document.getElementById("download-json").addEventListener("click", autoDownload);
document.getElementById("download-csv").addEventListener("click", () =>
  downloadFile(`rwc-ai-study_${session.participantId}_events.csv`, eventsToCsv(), "text/csv"));
document.getElementById("copy-json").addEventListener("click", () => {
  const ta = document.getElementById("data-dump");
  ta.select();
  navigator.clipboard.writeText(ta.value).catch(() => document.execCommand("copy"));
});

function eventsToCsv() {
  const header = [
    "participantId", "group", "ageRange",
    "eventType", "qid", "tEpochMs", "tRelMs", "iso", "details"
  ];
  const rows = session.events.map(e => [
    session.participantId, session.group, session.ageRange,
    e.type, e.qid == null ? "" : e.qid,
    e.tEpoch, e.tRel == null ? "" : e.tRel, e.iso,
    JSON.stringify(e.data)
  ].map(csvCell).join(","));
  return header.join(",") + "\n" + rows.join("\n");
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ------------------------------ UTIL ------------------------------------ */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Warn participants before they accidentally leave mid-study.
window.addEventListener("beforeunload", (e) => {
  if (session.studyStartEpoch && !session.finishedAtIso) {
    e.preventDefault();
    e.returnValue = "";
  }
});

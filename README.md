# Educational AI Tutor — Research Study Site

A self-contained static website that runs the RWC Leadership "AI tutor" experiment.
It can be hosted for free on **GitHub Pages**.

## What it does

- Explains that participants are taking part in a study of an *educational AI tutor*.
- At the moment a participant presses **Begin**, it reads the high-resolution
  time since the Unix epoch (`performance.timeOrigin + performance.now()`,
  fractional milliseconds), converts it to an integer number of **microseconds**
  to keep as much decimal precision as possible, and takes that value **mod 2**:
  - **even → AI group** (gets the AI tutor)
  - **odd → control group** (baseline, no AI)
  This gives a ~50/50 split. The exact timestamp, the microsecond integer, and
  the parity are all stored with the participant's data for auditability.
- **AI group:** a sidebar AI tutor that *cannot be closed or minimized* appears.
  For each question it "thinks" for **2 seconds**, then outputs a **predetermined**
  answer (the AI is faked — answers are scripted). On the designed questions
  (Q6, Q10, Q11, Q13, Q14) the AI is deliberately wrong. After each response a
  **1–5 Likert** confidence scale is shown.
- **Control group:** the same quiz, no AI, no confidence scale.
- Participants can **jump between questions freely**.
- Every interaction is logged with a high-resolution timestamp — including
  **every answer click** (so initial answers, second-guessing, and changes are
  all captured), AI thinking/response timing, confidence ratings, navigation,
  and tab focus/blur (a fact-checking signal).

## Files

```
index.html     screens (intro, briefing, quiz, done)
styles.css     styling (clean / white / professional)
questions.js   the 14-question bank + scripted AI answers
app.js         assignment, logging, quiz logic, AI sidebar, export
images/        question figures (q2, q4, q5, q8, q9_new, q10, q11, q12, q14_new)
apps-script/   Code.gs — optional Google Sheet collector (see below)
```

## Hosting on GitHub Pages

1. Create a new GitHub repository and upload **all** of these files (keep the
   `images/` folder).
2. In the repo: **Settings → Pages → Build and deployment**, set
   **Source: Deploy from a branch**, **Branch: `main` / `(root)`**, Save.
3. After a minute the site is live at
   `https://<your-username>.github.io/<repo-name>/`.

> Everything is plain HTML/CSS/JS — no build step.

## Collecting the data

GitHub Pages is static (no server), so by default each participant's complete
data is:

- saved to the browser's `localStorage`, **and**
- **auto-downloaded** as a JSON file when they finish (they're asked to send it
  to the research team). A CSV of the raw event log is also available.

### Automatic central collection → Google Sheet (recommended)

A ready-to-paste collector is included at [`apps-script/Code.gs`](apps-script/Code.gs).
It writes every submission into three tabs of a Google Sheet:

- **Participants** — one row per participant (summary + a raw-JSON backup column)
- **PerQuestion** — one row per participant × question (tidy long format for stats)
- **Events** — one row per logged event (every answer click, AI response, etc.)

**Setup (~3 minutes):**

1. Create a new **Google Sheet**.
2. **Extensions → Apps Script**. Delete the sample code and paste in the entire
   contents of `apps-script/Code.gs`.
3. **Deploy → New deployment → Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   Deploy, authorize when prompted, and copy the **Web app `/exec` URL**.
   (Open that URL in a browser to confirm it says the collector is live.)
4. Paste the URL into `DATA_ENDPOINT` near the top of [`app.js`](app.js), then
   re-upload `app.js` to your GitHub repo.

When `DATA_ENDPOINT` is set, the finished `session` object is POSTed to your
sheet (the script uses a `no-cors`-friendly path that Apps Script accepts). The
per-participant local download still happens as a backup. To **re-deploy after
editing the script**, use *Deploy → Manage deployments → edit → Version: New*.

> Other webhooks (Formspree, Sheet.best, Pipedream, etc.) also work — any URL
> that accepts a JSON `POST`.

## Data dictionary (per participant `session` object)

| Field | Meaning |
|---|---|
| `participantId` | unique id (derived from start time + random) |
| `group` | `"AI"` or `"control"` |
| `assignment` | start timestamp, microsecond integer, parity, result |
| `ageRange` | reported age band (independent variable) |
| `answers` | final selected choice index per question |
| `confidence` | Likert 1–5 per question (AI group) |
| `aiShown` | epoch ms each AI response appeared |
| `events[]` | full chronological log (see below) |
| `summary` | score + per-question derived metrics |

Key `events[]` types: `study_start`, `quiz_open`, `question_view`,
`question_leave`, `answer_click` (includes `isChange`, `previousIndex`,
`msSinceAiResponse`), `ai_thinking_start`, `ai_response` (includes `aiCorrect`),
`ai_confidence_shown`, `confidence_rating`, `window_blur` / `window_focus` /
`visibility_change`, `study_finish`. Each event carries `tEpoch` (hi-res epoch
ms) and `tRel` (ms since the participant started).

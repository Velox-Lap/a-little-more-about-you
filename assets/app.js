(() => {
  const bank = window.QUESTION_BANK || [];
  const questionCatalog = bank.flatMap((group, groupIndex) => group.questions.map((text, localIndex) => ({
    id: `Q${String(groupIndex * 10 + localIndex + 1).padStart(3, "0")}`,
    category: group.category,
    categoryEn: group.en,
    text
  })));
  const questionById = Object.fromEntries(questionCatalog.map((question) => [question.id, question]));
  const levels = (window.CONVERSATION_LEVELS || []).map((level) => ({
    ...level,
    questions: level.questions.map((prompt) => ({
      ...questionById[prompt.id],
      followups: prompt.followups,
      levelId: level.id,
      levelTitle: level.title,
      levelSubtitle: level.subtitle
    }))
  }));
  const questions = levels.flatMap((level) => level.questions);
  const $ = (id) => document.getElementById(id);
  const views = { welcome: $("welcome"), picker: $("question-picker"), quiz: $("questionnaire"), review: $("review") };
  const state = { index: 0, nickname: "", answers: {}, followups: {}, activeFollowup: {}, sending: false, motion: "forward" };
  const configured = () => window.APP_CONFIG && /^https:\/\//.test(window.APP_CONFIG.SUPABASE_URL) && !window.APP_CONFIG.SUPABASE_URL.includes("YOUR-PROJECT") && window.APP_CONFIG.SUPABASE_ANON_KEY && !window.APP_CONFIG.SUPABASE_ANON_KEY.includes("YOUR_");
  const client = configured() && window.supabase ? window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY) : null;

  $("question-total").textContent = questions.length;
  $("progress-count").textContent = `ตอบแล้ว 0 / ${questions.length}`;
  $("progress-track").setAttribute("aria-valuemax", String(questions.length));
  renderPicker();
  checkSubmissionService();

  async function checkSubmissionService() {
    const status = $("service-status");
    const startButton = $("start-btn");
    if (!client) {
      status.textContent = "ระบบส่งคำตอบส่วนตัวยังไม่ได้ตั้งค่า";
      status.classList.add("error");
      startButton.disabled = true;
      return;
    }
    try {
      const response = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: window.APP_CONFIG.SUPABASE_ANON_KEY },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}`);
      status.textContent = "ระบบส่งคำตอบพร้อมใช้งาน · คำตอบอ่านได้เฉพาะเจ้าของ";
      status.classList.remove("error");
      status.classList.add("ready");
      startButton.disabled = false;
    } catch (error) {
      console.error("Could not verify the questionnaire submission service.", error);
      status.textContent = "ระบบส่งคำตอบยังไม่พร้อม กรุณาแจ้งเจ้าของก่อนเริ่ม";
      status.classList.remove("ready");
      status.classList.add("error");
      startButton.disabled = true;
    }
  }

  function show(view) {
    Object.values(views).forEach((node) => node.classList.add("hidden"));
    views[view].classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function answeredQuestions() {
    return questions.filter((question) => (state.answers[question.id] || "").trim());
  }

  function renderPicker() {
    const answered = answeredQuestions().length;
    $("picker-answered").textContent = answered
      ? `แบ่งปันแล้ว ${answered} จาก ${questions.length} ข้อ · จะหยุดแค่นี้ก็ได้`
      : `เลือกตอบข้อไหนก่อนก็ได้ · ไม่จำเป็นต้องตอบให้ครบ ${questions.length} ข้อ`;
    $("review-btn").disabled = answered === 0;
    $("level-list").innerHTML = levels.map((level, index) => {
      const count = level.questions.filter((question) => (state.answers[question.id] || "").trim()).length;
      const questionButtons = level.questions.map((question) => {
        const isAnswered = Boolean((state.answers[question.id] || "").trim());
        return `<button class="prompt-choice${isAnswered ? " is-answered" : ""}" type="button" data-question-id="${escapeHtml(question.id)}" aria-label="${escapeHtml(question.text)}${isAnswered ? " · ตอบแล้ว" : ""}"><span>${escapeHtml(question.text)}</span><span class="prompt-choice-state" aria-hidden="true">${isAnswered ? "✓" : "→"}</span></button>`;
      }).join("");
      return `<article class="level-card level-card-${index + 1}"><div class="level-card-head"><span class="level-index">0${index + 1}</span><div><span class="level-subtitle">${escapeHtml(level.subtitle)}</span><h2>${escapeHtml(level.title)}</h2></div><span class="level-count">${count}/${level.questions.length}</span></div><p>${escapeHtml(level.description)}</p><div class="prompt-choices">${questionButtons}</div></article>`;
    }).join("");
  }

  function renderQuestion() {
    const question = questions[state.index];
    $("category-chip").textContent = question.levelSubtitle;
    $("question-number").textContent = `${question.levelTitle} · ${String(state.index + 1).padStart(2, "0")}`;
    $("question-text").textContent = question.text;
    $("question-hint").textContent = state.nickname
      ? `ค่อย ๆ เล่าได้เลย ${state.nickname} — ตอบเท่าที่สบายใจนะ`
      : "ค่อย ๆ เล่าได้เลย ตอบเท่าที่สบายใจ ไม่มีคำตอบถูกหรือผิด";
    $("answer-input").value = state.answers[question.id] || "";
    renderProgress();
    $("prev-btn").disabled = state.index === 0;
    $("next-btn").innerHTML = state.index === questions.length - 1
      ? 'ตรวจคำตอบ <span>→</span>'
      : 'คำถามถัดไป <span>→</span>';
    const card = $("question-card");
    card.classList.toggle("deck-reverse", state.index % 2 === 1);
    card.classList.remove("card-enter-forward", "card-enter-backward");
    void card.offsetWidth;
    card.classList.add(`card-enter-${state.motion}`);
    updateCount();
    renderFollowups(question);
  }

  function renderProgress() {
    const currentQuestion = questions[state.index];
    const currentAnswer = $("answer-input").value.trim();
    const answered = answeredQuestions().filter((question) => question.id !== currentQuestion.id).length
      + Number(Boolean(currentAnswer));
    $("progress-count").textContent = `ตอบแล้ว ${answered} / ${questions.length}`;
    $("progress-fill").style.width = `${(answered / questions.length) * 100}%`;
    $("progress-track").setAttribute("aria-valuenow", String(answered));
    const progressCount = $("progress-count");
    progressCount.classList.remove("counter-update");
    void progressCount.offsetWidth;
    progressCount.classList.add("counter-update");
  }

  function updateCount() {
    $("char-count").textContent = `${$("answer-input").value.length} / 1200`;
  }

  function renderFollowups(question) {
    const container = $("followup-list");
    const isNewQuestion = container.dataset.questionId !== question.id;
    if (isNewQuestion) {
      container.dataset.questionId = question.id;
      container.innerHTML = "";
    }
    if (!$("answer-input").value.trim()) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    const followupAnswers = state.followups[question.id] || [];
    const activeIndex = state.activeFollowup[question.id];
    const nextUnanswered = question.followups.findIndex((_, index) => !followupAnswers[index]);
    const selectedIndex = Number.isInteger(activeIndex)
      ? activeIndex
      : nextUnanswered >= 0 ? nextUnanswered : -1;
    const choices = question.followups.map((prompt, index) => {
      const completed = Boolean(followupAnswers[index]);
      return `<button class="followup-choice${index === selectedIndex ? " is-active" : ""}${completed ? " is-complete" : ""}" type="button" data-followup-choice="${index}" aria-pressed="${index === selectedIndex}"><span>${escapeHtml(prompt)}</span><span class="followup-choice-state" aria-hidden="true">${completed ? "✓" : index === selectedIndex ? "•" : "+"}</span></button>`;
    }).join("");
    const activePrompt = selectedIndex >= 0
      ? `<label class="followup-field"><span>${escapeHtml(question.followups[selectedIndex])}</span><textarea rows="2" maxlength="700" data-followup-index="${selectedIndex}" placeholder="เล่าเพิ่มได้ตามสบาย...">${escapeHtml(followupAnswers[selectedIndex] || "")}</textarea></label><button class="text-btn followup-done-btn" type="button" data-followup-done>${followupAnswers[selectedIndex] ? "บันทึกแล้ว · ชวนคุยต่ออีกข้อ" : "ข้ามคำถามนี้"}</button>`
      : '<p class="followup-complete">ตอบคำถามต่อยอดครบแล้ว · เลือกข้อด้านบนเพื่อแก้ไขได้</p>';
    container.innerHTML = `<p class="followup-intro">อยากเล่าต่อเรื่องไหน เลือกได้ทีละข้อ จะข้ามทั้งหมดก็ได้</p><div class="followup-choices">${choices}</div>${activePrompt}`;
  }

  function saveFollowupInput() {
    const question = questions[state.index];
    const input = $("followup-list").querySelector("[data-followup-index]");
    if (!input) return;
    const index = Number(input.dataset.followupIndex);
    const answers = [...(state.followups[question.id] || [])];
    answers[index] = input.value.trim();
    if (answers.some(Boolean)) state.followups[question.id] = answers;
    else delete state.followups[question.id];
  }

  function saveCurrent() {
    const question = questions[state.index];
    const answer = $("answer-input").value.trim();
    if (!answer) {
      delete state.answers[question.id];
      delete state.followups[question.id];
      delete state.activeFollowup[question.id];
      $("followup-list").classList.add("hidden");
      $("followup-list").innerHTML = "";
      $("followup-list").dataset.questionId = "";
      return;
    }
    state.answers[question.id] = answer;
    saveFollowupInput();
  }

  function openReview() {
    if (!views.quiz.classList.contains("hidden")) saveCurrent();
    const answered = answeredQuestions();
    $("answered-count").textContent = answered.length;
    $("review-list").innerHTML = answered.map((question) => {
      const followups = state.followups[question.id] || [];
      const followupContent = question.followups.map((prompt, index) => followups[index]
        ? `<div class="review-followup"><span>${escapeHtml(prompt)}</span><p>${escapeHtml(followups[index])}</p></div>`
        : "").join("");
      return `<article class="review-item"><span>${escapeHtml(question.levelTitle)} · ${escapeHtml(question.category)}</span><h3>${escapeHtml(question.text)}</h3><p>${escapeHtml(state.answers[question.id])}</p>${followupContent ? `<div class="review-followups">${followupContent}</div>` : ""}</article>`;
    }).join("") || '<div class="empty-state">ยังไม่มีคำตอบที่บันทึกไว้ กลับไปเลือกเรื่องที่อยากแบ่งปันได้เลย</div>';
    $("submit-message").textContent = "";
    show("review");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  $("start-btn").addEventListener("click", () => {
    state.nickname = $("nickname").value.trim();
    renderPicker();
    show("picker");
  });
  $("level-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-question-id]");
    if (!button) return;
    const index = questions.findIndex((question) => question.id === button.dataset.questionId);
    if (index < 0) return;
    state.index = index;
    state.motion = "forward";
    renderQuestion();
    show("quiz");
  });
  $("exit-btn").addEventListener("click", () => {
    saveCurrent();
    renderPicker();
    show("picker");
  });
  $("answer-input").addEventListener("input", () => {
    updateCount();
    renderProgress();
    renderFollowups(questions[state.index]);
  });
  $("followup-list").addEventListener("input", (event) => {
    if (!event.target.matches("[data-followup-index]")) return;
    saveFollowupInput();
    const doneButton = $("followup-list").querySelector("[data-followup-done]");
    if (doneButton) doneButton.textContent = event.target.value.trim()
      ? "บันทึกแล้ว · ชวนคุยต่ออีกข้อ"
      : "ข้ามคำถามนี้";
  });
  $("followup-list").addEventListener("click", (event) => {
    const choice = event.target.closest("[data-followup-choice]");
    if (choice) {
      saveFollowupInput();
      state.activeFollowup[questions[state.index].id] = Number(choice.dataset.followupChoice);
      renderFollowups(questions[state.index]);
      return;
    }
    if (!event.target.closest("[data-followup-done]")) return;
    saveFollowupInput();
    const question = questions[state.index];
    const answers = state.followups[question.id] || [];
    const activeIndex = state.activeFollowup[question.id];
    let nextUnanswered = question.followups.findIndex((_, index) => !answers[index] && index > activeIndex);
    if (nextUnanswered < 0) nextUnanswered = question.followups.findIndex((_, index) => !answers[index]);
    state.activeFollowup[question.id] = nextUnanswered >= 0 ? nextUnanswered : -1;
    renderFollowups(question);
  });
  $("prev-btn").addEventListener("click", () => {
    saveCurrent();
    if (state.index > 0) {
      state.index--;
      state.motion = "backward";
      renderQuestion();
    }
  });
  $("skip-btn").addEventListener("click", () => {
    saveCurrent();
    if (state.index < questions.length - 1) {
      state.index++;
      state.motion = "forward";
      renderQuestion();
    } else {
      openReview();
    }
  });
  $("next-btn").addEventListener("click", () => {
    saveCurrent();
    if (state.index < questions.length - 1) {
      state.index++;
      state.motion = "forward";
      renderQuestion();
    } else {
      openReview();
    }
  });
  $("review-btn").addEventListener("click", openReview);
  $("edit-btn").addEventListener("click", () => {
    renderPicker();
    show("picker");
  });
  $("submit-btn").addEventListener("click", async () => {
    const message = $("submit-message");
    if (!client) {
      message.textContent = "ยังไม่ได้เชื่อมต่อฐานข้อมูลส่วนตัว กรุณาตั้งค่า Supabase ตามคู่มือใน README ก่อนเปิดใช้งานจริง";
      message.className = "form-message error";
      return;
    }
    const answered = answeredQuestions().length;
    if (!answered) {
      message.textContent = "ยังไม่มีคำตอบ กรุณาเลือกเรื่องที่อยากแบ่งปันอย่างน้อยหนึ่งข้อ";
      message.className = "form-message error";
      return;
    }
    if (state.sending) return;
    state.sending = true;
    $("submit-btn").disabled = true;
    $("submit-btn").textContent = "กำลังส่ง…";
    try {
      const followupCount = Object.values(state.followups).flat().filter(Boolean).length;
      const payload = {
        respondent_name: state.nickname || "",
        answers: {
          ...state.answers,
          _followups: { ...state.followups },
          _meta: {
            answered_count: answered,
            followup_count: followupCount,
            total_questions: questions.length,
            question_bank_version: 2
          }
        }
      };
      const { error } = await client.from("questionnaire_responses").insert(payload);
      if (error) throw error;
      views.review.innerHTML = `<div class="success-state"><div class="success-icon">♡</div><div class="eyebrow"><span class="eyebrow-dot"></span> RECEIVED WITH CARE</div><h1>ขอบคุณที่<br><em>เล่าให้ฟังนะ</em></h1><p class="intro">ขอบคุณที่แบ่งปันทั้งคำตอบและเรื่องราวเบื้องหลัง เราจะเก็บรักษาไว้อย่างดี</p><a class="primary-btn link-button" href="index.html">กลับหน้าแรก <span>→</span></a></div>`;
    } catch (error) {
      message.textContent = `ส่งคำตอบไม่สำเร็จ: ${error.message || "เกิดข้อผิดพลาด"}`;
      message.className = "form-message error";
      state.sending = false;
      $("submit-btn").disabled = false;
      $("submit-btn").innerHTML = 'ส่งคำตอบ <span>♡</span>';
    }
  });
})();
(() => {
  const $ = (id) => document.getElementById(id);
  const questionBank = window.QUESTION_BANK || [];
  const questionLabels = questionBank.flatMap((group, groupIndex) => group.questions.map((text, localIndex) => ({
    id: `Q${String(groupIndex * 10 + localIndex + 1).padStart(3, "0")}`,
    category: group.category,
    text
  }))).reduce((map, question) => { map[question.id] = question; return map; }, {});
  const followupPrompts = (window.CONVERSATION_LEVELS || []).flatMap((level) => level.questions.map((question) => ({
    id: question.id,
    level: level.title,
    prompts: question.followups
  }))).reduce((map, question) => { map[question.id] = question; return map; }, {});
  const configured = () => window.APP_CONFIG && /^https:\/\//.test(window.APP_CONFIG.SUPABASE_URL) && !window.APP_CONFIG.SUPABASE_URL.includes("YOUR-PROJECT") && window.APP_CONFIG.SUPABASE_ANON_KEY && !window.APP_CONFIG.SUPABASE_ANON_KEY.includes("YOUR_");
  const client = configured() && window.supabase ? window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY) : null;
  const loginView = $("login-view"), dashboard = $("dashboard-view");
  if (!client) { $("login-message").textContent = "ยังไม่ได้ตั้งค่า Supabase ดูขั้นตอนใน README ก่อนใช้งาน"; $("login-message").className = "form-message error"; }
  function safe(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function formatDate(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "ไม่ทราบเวลา" : d.toLocaleString("th-TH", { dateStyle:"medium", timeStyle:"short" }); }
  function showDashboard() { loginView.classList.add("hidden"); dashboard.classList.remove("hidden"); loadResponses(); }
  async function verifyOwner() {
    const { data, error } = await client.rpc("is_questionnaire_owner");
    if (error) throw error;
    if (data !== true) throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์ผู้ดูแล กรุณาใช้บัญชีเจ้าของที่ได้รับอนุญาต");
  }
  async function loadResponses() {
    const container = $("responses-list"); container.innerHTML = '<div class="empty-state">กำลังโหลดข้อมูล…</div>';
    const { data, error } = await client.from("questionnaire_responses").select("id, respondent_name, answers, submitted_at").order("submitted_at", { ascending:false });
    if (error) { container.innerHTML = '<div class="empty-state">ไม่สามารถอ่านข้อมูลได้ โปรดตรวจสอบบัญชีผู้ดูแลและ RLS</div>'; $("dashboard-message").textContent = error.message; $("dashboard-message").className = "form-message error"; return; }
    $("submission-total").textContent = data.length;
    $("last-received").textContent = data.length ? formatDate(data[0].submitted_at) : "—";
    if (!data.length) { container.innerHTML = '<div class="empty-state">ยังไม่มีคำตอบเข้ามา</div>'; return; }
    container.innerHTML = data.map((row, index) => {
      const answers = row.answers || {};
      const questions = Object.entries(answers).filter(([key, answer]) => /^Q\d{3}$/.test(key) && typeof answer === "string");
      const answered = answers._meta?.answered_count ?? questions.length;
      const followups = answers._followups || {};
      const followupCount = Number.isFinite(answers._meta?.followup_count)
        ? answers._meta.followup_count
        : Object.values(followups).flat().filter((answer) => typeof answer === "string" && answer.trim()).length;
      const content = questions.map(([id, answer]) => {
        const question = questionLabels[id];
        const prompts = followupPrompts[id]?.prompts || [];
        const responses = Array.isArray(followups[id]) ? followups[id] : [];
        const followupContent = prompts.map((prompt, promptIndex) => responses[promptIndex]
          ? `<div class="admin-followup"><span>${safe(prompt)}</span><p>${safe(responses[promptIndex])}</p></div>`
          : "").join("");
        const label = followupPrompts[id]?.level || question?.category || id;
        return `<div class="answer-row"><span>${safe(label)} · ${safe(id)}${question ? ` — ${safe(question.text)}` : ""}</span><div><p>${safe(answer)}</p>${followupContent ? `<div class="admin-followups">${followupContent}</div>` : ""}</div></div>`;
      }).join("");
      return `<details class="response-card" ${index === 0 ? "open" : ""}><summary><div><span class="response-date">${safe(formatDate(row.submitted_at))}</span><h3>${safe(row.respondent_name || "ไม่ระบุชื่อ")}</h3></div><div class="response-meta"><span>${answered} คำตอบ${followupCount ? ` · ${followupCount} ต่อ` : ""}</span><span class="chevron">⌄</span></div></summary><div class="response-content">${content || '<p class="empty-state">ไม่มีคำตอบ</p>'}</div></details>`;
    }).join("");
  }
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;
    const message = $("login-message"); message.textContent = "กำลังตรวจสอบ…"; message.className = "form-message";
    const { error } = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) { message.textContent = "เข้าสู่ระบบไม่สำเร็จ: " + error.message; message.className = "form-message error"; return; }
    try {
      await verifyOwner();
      message.textContent = "";
      showDashboard();
    } catch (ownerError) {
      await client.auth.signOut();
      message.textContent = ownerError.message;
      message.className = "form-message error";
    }
  });
  $("logout-btn").addEventListener("click", async () => { if (client) await client.auth.signOut(); dashboard.classList.add("hidden"); loginView.classList.remove("hidden"); });
  $("refresh-btn").addEventListener("click", loadResponses);
  (async () => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    try {
      await verifyOwner();
      showDashboard();
    } catch (_) {
      await client.auth.signOut();
    }
  })();
})();
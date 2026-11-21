(() => {
  const bank = window.QUESTION_BANK || [];
  const questions = bank.flatMap((group, gi) => group.questions.map((text, qi) => ({
    id: `Q${String(gi * 10 + qi + 1).padStart(3, "0")}`,
    category: group.category, categoryEn: group.en, text
  })));
  const $ = id => document.getElementById(id);
  const views = {welcome:$("welcome"), quiz:$("questionnaire"), review:$("review")};
  const state = {index:0,nickname:"",answers:{},sending:false};
  const configured = () => window.APP_CONFIG && /^https:\/\//.test(window.APP_CONFIG.SUPABASE_URL || "") && window.APP_CONFIG.SUPABASE_ANON_KEY;
  const client = configured() && window.supabase ? window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL,window.APP_CONFIG.SUPABASE_ANON_KEY) : null;
  $("question-total").textContent = questions.length;
  $("review-total").textContent = questions.length;
  $("progress-count").textContent = `01 / ${questions.length}`;
  if (!questions.length) { $("start-btn").disabled = true; return; }
  const esc = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function show(view){Object.values(views).forEach(v=>v.classList.add("hidden"));views[view].classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
  function count(){ $("char-count").textContent=`${$("answer-input").value.length} / 1200`; }
  function save(){const q=questions[state.index],v=$("answer-input").value.trim();if(v)state.answers[q.id]=v;else delete state.answers[q.id];}
  function render(){
    const q=questions[state.index];$("category-chip").textContent=q.categoryEn;
    $("question-number").textContent=`QUESTION ${String(state.index+1).padStart(2,"0")}`;
    $("question-text").textContent=q.text;
    $("question-hint").textContent=state.nickname?`ค่อย ๆ ตอบได้เลย ${state.nickname} — ไม่มีคำตอบถูกหรือผิด`:"ค่อย ๆ ตอบได้เลย ไม่มีคำตอบถูกหรือผิด";
    $("answer-input").value=state.answers[q.id]||"";
    $("progress-count").textContent=`${String(state.index+1).padStart(2,"0")} / ${questions.length}`;
    $("progress-fill").style.width=`${(state.index+1)/questions.length*100}%`;
    $("prev-btn").disabled=state.index===0;
    $("next-btn").innerHTML=state.index===questions.length-1?'ตรวจคำตอบ <span>→</span>':'ข้อต่อไป <span>→</span>';
    count();
  }
  function review(){
    save();const answered=questions.filter(q=>state.answers[q.id]).length;
    $("answered-count").textContent=answered;
    $("review-list").innerHTML=questions.filter(q=>state.answers[q.id]).map(q=>`<article class="review-item"><span>${esc(q.category)} · ${q.id}</span><h3>${esc(q.text)}</h3><p>${esc(state.answers[q.id])}</p></article>`).join("")||'<div class="empty-state">ยังไม่มีคำตอบที่บันทึกไว้</div>';
    $("submit-message").textContent="";show("review");
  }
  $("start-btn").addEventListener("click",()=>{state.nickname=$("nickname").value.trim().slice(0,80);state.index=0;render();show("quiz");});
  $("exit-btn").addEventListener("click",()=>show("welcome"));
  $("answer-input").addEventListener("input",count);
  $("prev-btn").addEventListener("click",()=>{save();if(state.index>0)state.index--;render();});
  $("skip-btn").addEventListener("click",()=>{save();if(state.index<questions.length-1){state.index++;render();}else review();});
  $("next-btn").addEventListener("click",()=>{save();if(state.index<questions.length-1){state.index++;render();}else review();});
  $("edit-btn").addEventListener("click",()=>{state.index=0;render();show("quiz");});
  $("submit-btn").addEventListener("click",async()=>{
    const message=$("submit-message"),count=Object.keys(state.answers).length;
    if(!client){message.textContent="ยังไม่ได้ตั้งค่า Supabase";message.className="form-message error";return;}
    if(!count){message.textContent="กรุณาตอบอย่างน้อยหนึ่งข้อก่อนส่ง";message.className="form-message error";return;}
    if(state.sending)return;state.sending=true;$("submit-btn").disabled=true;$("submit-btn").textContent="กำลังส่ง…";
    try{
      const payload={respondent_name:state.nickname,answers:{...state.answers,_meta:{answered_count:count,total_questions:questions.length,question_bank_version:1}}};
      const {error}=await client.from("questionnaire_responses").insert(payload);if(error)throw error;
      views.review.innerHTML='<div class="success-state"><div class="success-icon">♡</div><div class="eyebrow"><span class="eyebrow-dot"></span> RECEIVED WITH CARE</div><h1>ส่งคำตอบ<br><em>เรียบร้อยแล้ว</em></h1><p class="intro">ขอบคุณที่แบ่งปันเรื่องราวของตัวเองนะ</p><a class="primary-btn link-button" href="index.html">กลับหน้าแรก <span>→</span></a></div>';
    }catch(error){message.textContent="ส่งคำตอบไม่สำเร็จ: "+(error.message||"เกิดข้อผิดพลาด");message.className="form-message error";state.sending=false;$("submit-btn").disabled=false;$("submit-btn").innerHTML='ส่งคำตอบ <span>♡</span>';}
  });
})();
(() => {
  const $=id=>document.getElementById(id), bank=window.QUESTION_BANK||[];
  const labels=bank.flatMap((g,gi)=>g.questions.map((text,qi)=>({id:`Q${String(gi*10+qi+1).padStart(3,"0")}`,category:g.category,text}))).reduce((o,q)=>(o[q.id]=q,o),{});
  const ready=window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL&&window.APP_CONFIG.SUPABASE_ANON_KEY;
  const client=ready&&window.supabase?window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL,window.APP_CONFIG.SUPABASE_ANON_KEY):null;
  const login=$("login-view"),dash=$("dashboard-view");
  if(!client){$("login-message").textContent="Supabase ยังไม่ได้ตั้งค่า";$("login-message").className="form-message error";}
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?"ไม่ทราบเวลา":d.toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"});};
  async function verify(){const {data,error}=await client.rpc("is_questionnaire_owner");if(error)throw error;if(data!==true)throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์ผู้ดูแล");}
  function openDash(){login.classList.add("hidden");dash.classList.remove("hidden");load();}
  async function load(){
    const area=$("responses-list");area.innerHTML='<div class="empty-state">กำลังโหลดข้อมูล…</div>';
    const {data,error}=await client.from("questionnaire_responses").select("id,respondent_name,answers,submitted_at").order("submitted_at",{ascending:false});
    if(error){area.innerHTML='<div class="empty-state">ไม่สามารถอ่านข้อมูลได้</div>';$("dashboard-message").textContent=error.message;$("dashboard-message").className="form-message error";return;}
    $("submission-total").textContent=data.length;$("last-received").textContent=data.length?date(data[0].submitted_at):"—";
    if(!data.length){area.innerHTML='<div class="empty-state">ยังไม่มีคำตอบเข้ามา</div>';return;}
    area.innerHTML=data.map((row,i)=>{const answers=row.answers||{},items=Object.entries(answers).filter(([k])=>!k.startsWith("_"));
      const body=items.map(([id,value])=>{const q=labels[id];return `<div class="answer-row"><span>${esc(q?.category||id)} · ${esc(id)}</span><p>${esc(q?q.text+" — ":"")}${esc(value)}</p></div>`;}).join("");
      return `<details class="response-card" ${i===0?"open":""}><summary><div><span class="response-date">${esc(date(row.submitted_at))}</span><h3>${esc(row.respondent_name||"ไม่ระบุชื่อ")}</h3></div><div class="response-meta"><span>${items.length} คำตอบ</span><span class="chevron">⌄</span></div></summary><div class="response-content">${body||'<p class="empty-state">ไม่มีคำตอบ</p>'}</div></details>`;
    }).join("");
  }
  $("login-form").addEventListener("submit",async e=>{e.preventDefault();if(!client)return;const m=$("login-message");m.textContent="กำลังตรวจสอบ…";m.className="form-message";
    const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if(error){m.textContent="เข้าสู่ระบบไม่สำเร็จ: "+error.message;m.className="form-message error";return;}
    try{await verify();m.textContent="";openDash();}catch(err){await client.auth.signOut();m.textContent=err.message;m.className="form-message error";}
  });
  $("logout-btn").addEventListener("click",async()=>{if(client)await client.auth.signOut();dash.classList.add("hidden");login.classList.remove("hidden");});
  $("refresh-btn").addEventListener("click",load);
  (async()=>{if(!client)return;const {data}=await client.auth.getSession();if(!data.session)return;try{await verify();openDash();}catch(_){await client.auth.signOut();}})();
})();
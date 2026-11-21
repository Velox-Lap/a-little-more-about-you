#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const checks=[];
const failures=[];
function assert(ok,message){checks.push({ok:Boolean(ok),message});if(!ok)failures.push(message);}
function read(file){const full=path.join(root,file);assert(fs.existsSync(full),`Required file exists: ${file}`);return fs.existsSync(full)?fs.readFileSync(full,'utf8'):'';}
const required=['index.html','admin.html','assets/admin.js','assets/app.js','assets/config.js','assets/conversation.js','assets/questions.js','assets/styles.css','assets/theme.css','supabase/schema.sql'];
for(const file of required)read(file);
for(const file of ['assets/admin.js','assets/app.js','assets/config.js','assets/conversation.js','assets/questions.js']){
 try{new vm.Script(read(file),{filename:file});assert(true,`JavaScript syntax: ${file}`);}
 catch(error){assert(false,`JavaScript syntax: ${file} (${error.message})`);}
}
const context={window:{}};
vm.runInNewContext(read('assets/questions.js'),context,{filename:'assets/questions.js'});
vm.runInNewContext(read('assets/conversation.js'),context,{filename:'assets/conversation.js'});
const bank=context.window.QUESTION_BANK||[];
const levels=context.window.CONVERSATION_LEVELS||[];
const catalog=bank.flatMap((group,i)=>(group.questions||[]).map((question,j)=>({id:`Q${String(i*10+j+1).padStart(3,'0')}`,question})));
const ids=catalog.map(item=>item.id),known=new Set(ids);
const selected=levels.flatMap(level=>level.questions||[]);
assert(bank.length===8,`Question bank has 8 categories (found ${bank.length})`);
assert(bank.every(group=>Array.isArray(group.questions)&&group.questions.length===10),'Each category contains exactly 10 questions');
assert(ids.length===80,`Question bank contains 80 questions (found ${ids.length})`);
assert(new Set(ids).size===ids.length,'Question IDs are unique');
assert(levels.length===3,`Conversation has 3 levels (found ${levels.length})`);
assert(selected.length===15,`Conversation has 15 selected questions (found ${selected.length})`);
assert(new Set(selected.map(q=>q.id)).size===selected.length,'Selected question IDs are unique');
for(const q of selected){assert(known.has(q.id),`Selected question ${q.id} exists`);assert(Array.isArray(q.followups)&&q.followups.length>0,`Selected question ${q.id} has follow-ups`);}
for(const [htmlFile,jsFile] of [['index.html','assets/app.js'],['admin.html','assets/admin.js']]){
 const html=read(htmlFile),js=read(jsFile),idsInHtml=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),idSet=new Set(idsInHtml);
 assert(idSet.size===idsInHtml.length,`${htmlFile} has no duplicate IDs`);
 const refs=[...js.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map(m=>m[1]);
 const missing=[...new Set(refs.filter(id=>!idSet.has(id)))];
 assert(missing.length===0,`${jsFile} references only IDs present in ${htmlFile}${missing.length?': '+missing.join(', '):''}`);
 const local=[...html.matchAll(/(?:src|href)="((?:assets|supabase)\/[^"]+)"/g)].map(m=>m[1]);
 const absent=local.filter(file=>!fs.existsSync(path.join(root,file)));
 assert(absent.length===0,`${htmlFile} local assets exist${absent.length?': '+absent.join(', '):''}`);
}
const config=read('assets/config.js');
assert(!/service[_-]?role|sb_secret|secret[_-]?key/i.test(config),'Browser config has no service-role or secret-key identifier');
assert(/sb_publishable_[A-Za-z0-9_-]+/.test(config),'Browser config uses a publishable key');
const sql=read('supabase/schema.sql');
assert(/enable row level security/i.test(sql),'Reference schema enables RLS');
assert(/grant insert on public\.questionnaire_responses to anon, authenticated/i.test(sql),'Both anon and authenticated roles can submit');
assert(/for insert\s+to anon, authenticated/i.test(sql),'Insert policy covers anon and authenticated roles');
assert(/for select\s+to authenticated[\s\S]*private\.is_app_admin\(\)/i.test(sql),'Read policy is owner-gated');
assert(!/grant\s+(?:all|update|delete)[^;]*questionnaire_responses[^;]*\b(?:anon|authenticated)\b/i.test(sql),'Browser roles have no UPDATE/DELETE grants');
const passed=checks.filter(check=>check.ok).length;
console.log(`\nAudit results: ${passed}/${checks.length} checks passed.`);
for(const check of checks)console.log(`${check.ok?'PASS':'FAIL'}  ${check.message}`);
if(failures.length)process.exitCode=1;

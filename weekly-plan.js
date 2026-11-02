/* SORPHAYAHIRAN | Weekly workplan by contract installment
 * Reads/writes the same spy_milestones localStorage as the main 13-installment WBS.
 * Never writes to the existing S-Curve (scurve.html) or another company's apps.
 * Prototype login is not authorization for sensitive data. No financial values here.
 */
(function(){
'use strict';
const D=window.SPY_CONTRACT_DATA;
const $=id=>document.getElementById(id);
if(!D||!$('weeklyApp'))return;
const DAY=86400000;
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert('บันทึกข้อมูลไม่ได้: '+e.message);return false}};
const byDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const [y,m,d]=value.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null};
const fmtISO=date=>date?date.toISOString().slice(0,10):'';
const plusDays=(date,n)=>new Date(date.getTime()+n*DAY);
const thaiDate=value=>{const d=typeof value==='string'?byDate(value):value;return d?d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'ยังไม่กำหนด'};
const compactDate=date=>date?date.toLocaleDateString('th-TH',{day:'numeric',month:'short',timeZone:'UTC'}):'-';
const clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
const role=(()=>{try{return sessionStorage.getItem('spy_demo_role')}catch{return null}})();
const parsed=new URLSearchParams(location.search);
let stageIndex=Math.max(0,Math.min(12,Number.parseInt(parsed.get('stage')||'1',10)-1||0));
const back='./index.html?tab=plan';
if(role!=='owner'&&role!=='admin'){
 $('weeklyAuth').hidden=false;
 $('weeklyLoginLink').href='./index.html?return=weekly&stage='+(stageIndex+1);
 // Entry directly from a bookmarked stage should not leave the user stuck here.
 location.replace($('weeklyLoginLink').href);
 return;
}
$('weeklyApp').hidden=false;
const contractStart=()=>byDate(storage('spy_contract_date',D.contractDateDefault))||byDate(D.contractDateDefault);
function sourceCategory(name){
 if(/Shop Drawing|ขออนุมัติวัสดุ|แผนการ/.test(name))return 'เอกสารอนุมัติและส่งงวด';
 if(/ไฟฟ้า|สื่อสาร|Solar|Fire Alarm|หม้อแปลง|High-mast|เครื่องเสียง/.test(name))return 'ไฟฟ้าและสื่อสาร';
 if(/สุขาภิบาล|ประปา|ท่อน้ำ|ระบายน้ำ|สุขภัณฑ์|ถังบำบัด/.test(name))return 'สุขาภิบาลและท่อน้ำ';
 if(/ปรับอากาศ|ระบายอากาศ|ดับเพลิง/.test(name))return 'เครื่องกลและปรับอากาศ';
 if(/ฝ้า|ทาสี|ประตู|หน้าต่าง|Facade|ฟาซาด|ก่อ|ปูกระเบื้อง|ผิวพื้น|มุงหลังคา/.test(name))return 'สถาปัตยกรรมและตกแต่ง';
 if(/ถนน|ลานจอด|ทางเดิน|ภูมิทัศน์/.test(name))return 'งานภายนอก';
 if(/ครุภัณฑ์|ฝึกอบรม|BIM|AutoCAD|As-built|Commissioning|ส่งมอบ|อื่น ๆ|ทำความสะอาด/.test(name))return 'ครุภัณฑ์และส่งมอบ';
 return 'งานโครงสร้างและเตรียมการ';
}
function fallbackStage(i){
 const annex=D.installments[i],contractDate=contractStart(),end=plusDays(contractDate,annex.days);
 const grouped=new Map();
 annex.items.forEach((item,j)=>{
  const category=sourceCategory(item[0]);
  if(!grouped.has(category))grouped.set(category,[]);
  grouped.get(category).push({
   id:'spym'+(i+1)+'t'+(j+1),name:item[0],owner:'',
   start:'',end:fmtISO(end),weight:1,planned:0,actual:0,
   status:'ยังไม่เริ่ม',targetPercent:item[1],
   notes:'เงื่อนไขตรวจรับ '+item[1]+'% อ้างอิงเอกสารแบ่งงวด หน้า '+annex.page+
     (item[2]?' · '+item[2]:'')
  });
 });
 return {
  number:i+1,title:'งวดที่ '+(i+1),
  due:fmtISO(end),days:annex.days,sourcePage:annex.page,
  description:'รายการตามเอกสารแบ่งงวดหน้า '+annex.page,
  groups:[...grouped].map(([name,tasks])=>({
   name,weight:tasks.length*100/annex.items.length,tasks
  }))
 };
}
let stages=storage('spy_milestones',null);
let stageChanged=false;
if(!Array.isArray(stages)){stages=Array.from({length:13},(_,i)=>fallbackStage(i));stageChanged=true}
else{
 for(let i=0;i<13;i++){
  if(!stages[i]||!Array.isArray(stages[i].groups)||stages[i].groups.length===0){
   stages[i]=fallbackStage(i);stageChanged=true;
  }else{
   for(const group of stages[i].groups){
    if(!Array.isArray(group.tasks)){group.tasks=[];stageChanged=true}
    for(const task of group.tasks){
     if(!task.id){task.id='spy-task-'+i+'-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));stageChanged=true}
    }
   }
  }
 }
}
if(stageChanged)save('spy_milestones',stages);
let collapsedByStage=storage('spy_weekly_collapsed_v1',{});
if(!collapsedByStage||typeof collapsedByStage!=='object')collapsedByStage={};
let selected=null;
let printExpanded=false;
const persistStages=()=>save('spy_milestones',stages);
const collapsed=()=>new Set(Array.isArray(collapsedByStage[stageIndex])?collapsedByStage[stageIndex]:[]);
const persistCollapsed=set=>{collapsedByStage[stageIndex]=[...set];save('spy_weekly_collapsed_v1',collapsedByStage)};
function stageBounds(i){
 const due=byDate(stages[i]?.due)||plusDays(contractStart(),D.installments[i].days);
 let start=i===0?contractStart():plusDays(byDate(stages[i-1]?.due)||plusDays(contractStart(),D.installments[i-1].days),1);
 if(start>due)start=due;
 return {start,end:due};
}
function weeksFor(i){
 const {start,end}=stageBounds(i);
 const weeks=[];
 for(let d=new Date(start);d<=end;d=plusDays(d,7)){
  weeks.push({start:d,end:new Date(Math.min(plusDays(d,6).getTime(),end.getTime()))});
  if(weeks.length>60)break;
 }
 return weeks;
}
function groupPct(group,key){
 const tasks=group.tasks||[],sum=tasks.reduce((a,t)=>a+(Math.max(0,Number(t.weight)||0)),0);
 return sum?tasks.reduce((a,t)=>a+clamp(t[key])*(Math.max(0,Number(t.weight)||0)),0)/sum:0;
}
function stagePct(stage,key){
 const groups=stage.groups||[],sum=groups.reduce((a,g)=>a+Math.max(0,Number(g.weight)||0),0);
 return sum?groups.reduce((a,g)=>a+groupPct(g,key)*Math.max(0,Number(g.weight)||0),0)/sum:0;
}
function counts(stage){
 let total=0,scheduled=0;
 for(const g of stage.groups||[])for(const t of g.tasks||[]){
  total++;
  if(byDate(t.start)&&byDate(t.end)&&t.start<=t.end)scheduled++;
 }
 return {total,scheduled};
}
function renderStats(weeks){
 const stage=stages[stageIndex],range=stageBounds(stageIndex),c=counts(stage);
 const planned=stagePct(stage,'planned'),actual=stagePct(stage,'actual'),gap=actual-planned;
 $('weeklyStats').innerHTML=[
  {label:'งวดงาน / วันครบกำหนด',value:'งวด '+(stageIndex+1),small:'ครบ '+thaiDate(range.end)},
  {label:'แผนงานย่อย',value:c.total+' รายการ',small:'กำหนดวันที่แล้ว '+c.scheduled+' รายการ'},
  {label:'ความก้าวหน้าจริง',value:actual.toFixed(1)+'%',small:'ตามแผน '+planned.toFixed(1)+'% · ส่วนต่าง '+(gap>=0?'+':'')+gap.toFixed(1)+'%'},
  {label:'ความละเอียดแผน',value:weeks.length+' สัปดาห์',small:thaiDate(range.start)+' – '+thaiDate(range.end)}
 ].map(k=>'<div class="weekly-stat"><span>'+escapeHTML(k.label)+'</span><strong>'+escapeHTML(k.value)+'</strong><small>'+escapeHTML(k.small)+'</small></div>').join('');
 $('weeklyRangeText').textContent='งวดที่ '+(stageIndex+1)+' · '+thaiDate(range.start)+' ถึง '+thaiDate(range.end)+
  ' · แบ่งช่วงละ 7 วัน (สัปดาห์สุดท้ายอาจสั้นกว่า 7 วัน)';
 $('weeklySource').textContent='รายการงานจากเอกสารแบ่งงวด หน้า '+D.installments[stageIndex].page+
  ' · แสดงช่วงงานที่ผู้ใช้กำหนดเท่านั้น · บันทึกและตรวจทานแผนงานก่อนนำไปใช้งานส่งผู้ควบคุมงาน';
 const unscheduled=c.total-c.scheduled;
 $('weeklyNotice').textContent=unscheduled?
  'มี '+unscheduled+' งานยังไม่ได้ระบุวันเริ่ม–สิ้นสุดครบถ้วน จึงไม่แสดงเป็นแถบงานในไทม์ไลน์เพื่อไม่ให้เข้าใจว่าเป็นแผนอนุมัติแล้ว คลิกชื่องานเพื่อตั้งวันที่ได้ทันที':
  'กำหนดวันเริ่ม–เสร็จครบทุกงานแล้ว สามารถปรับความก้าวหน้าและพิมพ์แผนรายสัปดาห์ได้';
}
function currentWeek(week){
 const today=byDate(fmtISO(new Date()));
 return !!today&&today>=week.start&&today<=week.end;
}
function paintWeek(task,week,index){
 const start=byDate(task.start),end=byDate(task.end);
 if(!start||!end||start>end){
  return '<td class="weekly-week'+(currentWeek(week)?' weekly-current-week':'')+'">'+
   (index===0?'<span class="weekly-placeholder" title="ยังไม่กำหนดระยะเวลาดำเนินการ"></span>':'')+'</td>';
 }
 const from=Math.max(start.getTime(),week.start.getTime());
 const until=Math.min(end.getTime(),week.end.getTime());
 if(from>until)return '<td class="weekly-week'+(currentWeek(week)?' weekly-current-week':'')+'"></td>';
 const duration=end.getTime()-start.getTime()+DAY;
 const completeAt=start.getTime()+duration*clamp(task.actual)/100;
 const weekFinish=until+DAY;
 const finishedWithin=Math.min(weekFinish,completeAt)-from;
 const weekDuration=until-from+DAY;
 const fraction=Math.max(0,Math.min(100,finishedWithin/weekDuration*100));
 const begins=from===start.getTime(),ends=until===end.getTime();
 const tooltip='กำหนด '+thaiDate(start)+' – '+thaiDate(end)+' · งานจริง '+clamp(task.actual).toFixed(1)+'%';
 return '<td class="weekly-week'+(currentWeek(week)?' weekly-current-week':'')+'" title="'+escapeHTML(tooltip)+'">'+
  '<span class="weekly-week-track'+(begins?' weekly-track-start':'')+(ends?' weekly-track-end':'')+'"><i style="width:'+fraction.toFixed(1)+'%"></i></span></td>';
}
function renderTable(weeks){
 const firstCols='<th class="weekly-task-col">หมวด / งานย่อย</th><th class="weekly-owner-col">ผู้รับผิดชอบ</th><th class="weekly-progress-col">แผน / ผลงานจริง</th>';
 const weekCols=weeks.map((w,i)=>'<th class="weekly-week'+(currentWeek(w)?' weekly-now':'')+'">สัปดาห์ '+(i+1)+
  '<small>'+escapeHTML(compactDate(w.start))+' – '+escapeHTML(compactDate(w.end))+'</small></th>').join('');
 $('weeklyTableHead').innerHTML='<tr>'+firstCols+weekCols+'</tr>';
 const stage=stages[stageIndex],hiddenGroups=collapsed();
 let rows='';
 stage.groups.forEach((g,groupIndex)=>{
  const isClosed=!printExpanded&&hiddenGroups.has(groupIndex);
  rows+='<tr class="weekly-group"><th colspan="'+(weeks.length+3)+'"><div class="weekly-group-header">'+
   '<button type="button" data-week-action="toggle" data-group="'+groupIndex+'" aria-expanded="'+(!isClosed)+'">'+
   (isClosed?'▸ ':'▾ ')+escapeHTML(g.name)+' <span>('+g.tasks.length+' งาน · จริง '+groupPct(g,'actual').toFixed(1)+'%)</span></button>'+
   '<button type="button" class="weekly-add-task" data-week-action="add" data-group="'+groupIndex+'">＋ เพิ่มงานย่อย</button>'+
   '</div></th></tr>';
  if(isClosed)return;
  g.tasks.forEach((t,taskIndex)=>{
   const status=escapeHTML(t.status||'ยังไม่เริ่ม');
   const start=byDate(t.start),end=byDate(t.end),scheduled=!!start&&!!end&&start<=end;
   rows+='<tr class="weekly-task-row"><td class="weekly-task-col">'+
    '<button class="weekly-task-button" type="button" data-week-action="edit" data-group="'+groupIndex+'" data-task="'+taskIndex+'">'+escapeHTML(t.name)+'</button>'+
    '<small class="weekly-task-meta">'+(scheduled?escapeHTML(compactDate(start)+' – '+compactDate(end)):'⚠ ยังไม่ได้วางช่วงเวลา')+
    ' · '+status+'</small></td>'+
    '<td class="weekly-owner-col"><span class="weekly-owner-text">'+escapeHTML(t.owner||'—')+'</span></td>'+
    '<td class="weekly-progress-col"><span class="weekly-progress-line"><span>แผน '+clamp(t.planned).toFixed(0)+'%</span><b>จริง '+clamp(t.actual).toFixed(0)+'%</b></span>'+
    '<div class="weekly-progress-bar"><i style="width:'+clamp(t.actual)+'%"></i></div></td>'+
    weeks.map((w,i)=>paintWeek(t,w,i)).join('')+'</tr>';
  });
 });
 if(!stage.groups.length)rows='<tr><td colspan="'+(weeks.length+3)+'" style="padding:28px;text-align:center">ยังไม่มีหมวดงานในงวดนี้ กดเพิ่มหมวดงานได้เลย</td></tr>';
 $('weeklyTableBody').innerHTML=rows;
}
function renderLinkStatus(){
 const info=window.SPY_STAGE_LINK?.status(stageIndex,stages[stageIndex]);
 if(!info)return;
 const panel=$('weeklyLinkSummary'),head=$('weeklyLinkHeadline'),detail=$('weeklyLinkDetail');
 const button=$('weeklyPublish');
 if(info.linked){
  panel.dataset.state='linked';
  head.textContent='✅ แผนงวดที่ '+(stageIndex+1)+' เชื่อมกับแผนใหญ่แล้ว';
  detail.textContent='วางวันครบ '+info.scheduled+'/'+info.total+' งาน · ผลงานจริง '+info.progress.toFixed(1)+'% · เปิด S-Curve ใหญ่เพื่อดูสถานะ';
  button.textContent='✓ เชื่อมแล้ว';
  button.disabled=true;
 }else if(info.outdated){
  panel.dataset.state='outdated';
  head.textContent='⚠️ มีการปรับแผนหลังเชื่อม ต้องยืนยันใหม่';
  detail.textContent='วันเริ่ม–สิ้นสุดครบ '+info.scheduled+'/'+info.total+' งาน · แผนที่แก้ไขยังไม่ยืนยันในแผนใหญ่';
  button.textContent='↻ ยืนยันเชื่อมแผนที่แก้ไข';
  button.disabled=!info.ready;
 }else if(info.ready){
  panel.dataset.state='ready';
  head.textContent='✅ กำหนดวันเริ่ม–สิ้นสุดงานย่อยครบแล้ว';
  detail.textContent=info.scheduled+'/'+info.total+' งานพร้อมเชื่อม · ตรวจทานแล้วกดปุ่มเชื่อมเพื่อแสดงสถานะใน S-Curve ใหญ่';
  button.textContent='🔗 เชื่อมแผนย่อยเข้าแผนใหญ่';
  button.disabled=false;
 }else{
  panel.dataset.state='pending';
  head.textContent='กำลังจัดทำแผนงานย่อย งวดที่ '+(stageIndex+1);
  detail.textContent='กำหนดวันเริ่ม–สิ้นสุดแล้ว '+info.scheduled+'/'+info.total+' งาน · ต้องครบก่อนเชื่อมแผนใหญ่';
  button.textContent='🔗 เชื่อมเมื่อวางแผนครบ';
  button.disabled=true;
 }
}
function publishToMaster(){
 const info=window.SPY_STAGE_LINK?.status(stageIndex,stages[stageIndex]);
 if(!info)return alert('ระบบเชื่อมแผนยังไม่พร้อม');
 if(!info.ready)return alert('ยังไม่สามารถเชื่อมได้: กรุณาระบุวันเริ่ม–สิ้นสุดทุกงาน ('+info.scheduled+'/'+info.total+')');
 const outside=(()=>{
   const bounds=stageBounds(stageIndex);let count=0;
   for(const g of stages[stageIndex].groups||[])for(const t of g.tasks||[]){
    const start=byDate(t.start),end=byDate(t.end);
    if(start&&end&&(start<bounds.start||end>bounds.end))count++;
   }
   return count;
 })();
 const notice=outside?'\nข้อสังเกต: มี '+outside+' งานระบุวันที่นอกช่วงงวดนี้ โปรดตรวจสอบความเกี่ยวข้องกับงวดอื่นด้วย':'';
 if(!confirm('ยืนยันเชื่อมแผนย่อยงวดที่ '+(stageIndex+1)+' ('+info.total+' งาน) เข้าแผน S-Curve ใหญ่ใช่หรือไม่?\n\nจะแสดงสถานะแผนย่อยและความก้าวหน้าในงวดนั้น โดยไม่เปลี่ยนเส้นกราฟรายเดือนหรือยอดเงินตามสัญญา'+notice))return;
 if(!persistStages())return;
 const result=window.SPY_STAGE_LINK.publish(stageIndex,stages[stageIndex]);
 if(!result.ok)return alert(result.reason);
 renderLinkStatus();
 $('weeklyNotice').textContent='✅ เชื่อมแผนย่อยงวดที่ '+(stageIndex+1)+' กับแผนใหญ่แล้ว สามารถกด S-Curve แผนใหญ่เพื่อตรวจสถานะได้';
}

/* Print options are independent from scheduling data and the S-Curve. The print
   report splits long weekly timelines into readable slices of the selected page. */
const PAPER_FORMATS=Object.freeze({
 A4:{width:210,height:297,margin:7},
 A3:{width:297,height:420,margin:9},
 A2:{width:420,height:594,margin:12},
 A1:{width:594,height:841,margin:14}
});
const PAPER_KEY='spy_weekly_print_paper_v1';
function readPaperPrefs(){
 const saved=storage(PAPER_KEY,{size:'A3',orientation:'landscape'});
 return {size:PAPER_FORMATS[saved?.size]?saved.size:'A3',
  orientation:['portrait','landscape'].includes(saved?.orientation)?saved.orientation:'landscape'};
}
let paperPrefs=readPaperPrefs();
const paperOrientationLabel=()=>paperPrefs.orientation==='landscape'?'แนวนอน':'แนวตั้ง';
function printRange(){
 const from=Math.max(1,Math.min(13,Number($('weeklyPrintFrom')?.value)||stageIndex+1));
 const to=Math.max(1,Math.min(13,Number($('weeklyPrintTo')?.value)||stageIndex+1));
 return {from:Math.min(from,to),to:Math.max(from,to)};
}
function updatePaperInfo(){
 const fmt=PAPER_FORMATS[paperPrefs.size],margin=fmt.margin;
 const rule=$('weeklyPrintPageSettings');
 if(rule)rule.textContent='@page{size:'+paperPrefs.size+' '+paperPrefs.orientation+';margin:'+margin+'mm;}';
 document.documentElement.dataset.paperSize=paperPrefs.size;
 document.documentElement.dataset.paperOrientation=paperPrefs.orientation;
 const range=printRange(),count=range.to-range.from+1;
 const weeks=weeksFor(stageIndex);
 const hasManyWeeks=range.from===range.to?weeks.length>=15:Array.from({length:count},(_,i)=>weeksFor(range.from+i-1).length).some(n=>n>=15);
 $('weeklyPrintInfo').textContent=
  'หนึ่งงวดต่อหนึ่งหน้า · งวดที่ '+range.from+(count>1?' ถึง '+range.to:'')+
  ' รวม '+count+' หน้าใน PDF ไฟล์เดียว · '+paperPrefs.size+' '+paperOrientationLabel()+
  (hasManyWeeks&&paperPrefs.size==='A4'?' · ตารางรายสัปดาห์อาจมีตัวอักษรเล็ก แนะนำ A3 หรือ A2':'');
}
function paperOptionChanged(){
 paperPrefs.size=PAPER_FORMATS[$('weeklyPaperSize').value]?$('weeklyPaperSize').value:'A3';
 paperPrefs.orientation=['landscape','portrait'].includes($('weeklyPaperOrientation').value)?$('weeklyPaperOrientation').value:'landscape';
 save(PAPER_KEY,paperPrefs);
 updatePaperInfo();
}
function printWidthHeight(){
 const format=PAPER_FORMATS[paperPrefs.size];
 const landscape=paperPrefs.orientation==='landscape';
 return {
  width:(landscape?format.height:format.width)-2*format.margin,
  height:(landscape?format.width:format.height)-2*format.margin
 };
}
function printLayout(stage,weekCount){
 const size=printWidthHeight(),groups=(stage?.groups||[]).length;
 const tasks=(stage?.groups||[]).reduce((sum,g)=>sum+(g.tasks||[]).length,0);
 // Keep complete installment rows on one sheet: compress spacing when necessary
 // instead of slicing weeks across multiple sheets.
 const availableRowSpace=Math.max(40,size.height-50);
 const row= Math.max(2.4,Math.min(paperPrefs.size==='A4'?7.2:8.6,
  availableRowSpace/Math.max(1,tasks+groups*0.87+1.5)));
 const groupHeight=Math.max(2.1,row*0.84);
 const compact=paperPrefs.size==='A4'||weekCount>18;
 const small=weekCount>=18;
 const taskFont=(paperPrefs.size==='A1'?10.6:paperPrefs.size==='A2'?9.3:paperPrefs.size==='A3'?8.4:7.6)*
  (row<4.5?.75:row<6?.87:1);
 const weekFont=(size.width*0.52/weekCount<6.5?5:small?6:paperPrefs.size==='A4'?6.2:7.2);
 return 'style="--weekly-print-row:'+row.toFixed(2)+'mm;'+
  '--weekly-print-group:'+groupHeight.toFixed(2)+'mm;'+
  '--weekly-print-task-font:'+taskFont.toFixed(2)+'pt;'+
  '--weekly-print-week-font:'+weekFont.toFixed(2)+'pt;'+
  '--weekly-print-date-font:'+(compact?5.3:6.5)+'pt;"';
}
function printWeekDate(date){
 if(!date)return '';
 const buddhistYear=String(date.getUTCFullYear()+543).slice(-2);
 return String(date.getUTCDate()).padStart(2,'0')+'/'+String(date.getUTCMonth()+1).padStart(2,'0')+'/'+buddhistYear;
}
// Embed the existing company-mark SVG in each print page to avoid a missing logo.png
// or a delayed image request when Chrome opens Print/Save as PDF.
const PRINT_LOGO_SVG="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 643 595\" role=\"img\" aria-labelledby=\"title desc\">\n<title id=\"title\">ตราสัญลักษณ์บริษัท ศรพญาหิรัญ จำกัด</title>\n<desc id=\"desc\">รูปทรงเรขาคณิตสีฟ้าทางซ้ายและน้ำเงินทางขวา อ้างอิงจากภาพโลโก้ความคมชัดสูงที่บริษัทส่งมา</desc>\n<defs>\n  <linearGradient id=\"cyan\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n    <stop offset=\"0\" stop-color=\"#11bbdf\"/>\n    <stop offset=\"1\" stop-color=\"#00b5e3\"/>\n  </linearGradient>\n  <linearGradient id=\"blue\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n    <stop offset=\"0\" stop-color=\"#1135dd\"/>\n    <stop offset=\"1\" stop-color=\"#1611bf\"/>\n  </linearGradient>\n  <clipPath id=\"left\"><path d=\"M0 0H330V595H0Z\"/></clipPath>\n  <clipPath id=\"right\"><path d=\"M330 0H643V595H330Z\"/></clipPath>\n</defs>\n<!-- Roof apex and upper folded segment -->\n<path d=\"M135 290 330 35 330 136 291 220 330 220 330 290Z\" fill=\"url(#cyan)\"/>\n<path d=\"M330 35 433 168H330Z\" fill=\"url(#blue)\"/>\n<!-- S-shaped folded wing, with the horizontal white void left open -->\n<path d=\"M330 220H471L583 366 529 411H330V341H462L423 290H330Z\" fill=\"url(#blue)\"/>\n<!-- Lower horizontal ribbon and pointed left tip -->\n<path d=\"M97 341H330V411H133L76 367Z\" fill=\"url(#cyan)\"/>\n<!-- Narrow bevel-edged stripe -->\n<g clip-path=\"url(#left)\" fill=\"url(#cyan)\">\n  <path d=\"M194 445H466L478 461 465 476H194L183 461Z\"/>\n  <path d=\"M193 506H466V551Q329 620 193 551Z\"/>\n</g>\n<g clip-path=\"url(#right)\" fill=\"url(#blue)\">\n  <path d=\"M194 445H466L478 461 465 476H194L183 461Z\"/>\n  <path d=\"M193 506H466V551Q329 620 193 551Z\"/>\n</g>\n</svg>";
const printCreatedAt=()=>new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
function paperTaskCell(task){
 const start=byDate(task.start),end=byDate(task.end);
 const scheduled=!!start&&!!end&&start<=end;
 return '<td class="print-col-task">'+
  '<div class="weekly-print-work-title">'+escapeHTML(task.name)+'</div>'+
  '<span class="weekly-print-task-details">'+(scheduled?escapeHTML(compactDate(start)+' – '+compactDate(end)):'ยังไม่ระบุวันเริ่ม–เสร็จ')+
  ' · '+escapeHTML(task.status||'ยังไม่เริ่ม')+'</span></td>';
}
function printSheet(installment,pageNo,pageCount){
 const stage=stages[installment],bounds=stageBounds(installment),weeks=weeksFor(installment);
 const stageReal=stagePct(stage,'actual'),stagePlanned=stagePct(stage,'planned');
 const linkedInfo=window.SPY_STAGE_LINK?.status(installment,stage);
 const linkedLabel=linkedInfo?.linked?'เชื่อมแผนใหญ่แล้ว':linkedInfo?.outdated?'มีการแก้ไข รอเชื่อมใหม่':'ยังไม่เชื่อมแผนใหญ่';
 const header='<thead><tr><th class="print-col-task">หมวด / งานย่อย</th>'+
  '<th class="print-col-owner">ผู้รับผิดชอบ</th>'+
  '<th class="print-col-progress">แผน / จริง</th>'+
  weeks.map((week,j)=>'<th class="weekly-print-week'+(currentWeek(week)?' weekly-now':'')+'" title="สัปดาห์ที่ '+(j+1)+' · '+printWeekDate(week.start)+' ถึง '+printWeekDate(week.end)+'">'+
   'ส.'+(j+1)+
   '<span class="weekly-print-week-start">'+printWeekDate(week.start)+'</span>'+
   '<span class="weekly-print-week-end">'+printWeekDate(week.end)+'</span></th>').join('')+
  '</tr></thead>';
 let rows='';
 for(const group of stage.groups||[]){
  const tasks=group.tasks||[];
  rows+='<tr class="weekly-print-group"><th colspan="'+(weeks.length+3)+'">'+escapeHTML(group.name)+
   ' · '+tasks.length+' งานย่อย</th></tr>';
  for(const task of tasks){
   rows+='<tr>'+paperTaskCell(task)+
    '<td class="print-col-owner"><span class="weekly-print-owner-text">'+escapeHTML(task.owner||'—')+'</span></td>'+
    '<td class="print-col-progress"><span class="weekly-print-progress-text">แผน '+clamp(task.planned).toFixed(0)+
    '%<br>จริง '+clamp(task.actual).toFixed(0)+'%</span></td>'+
    weeks.map((week,j)=>paintWeek(task,week,j)).join('')+'</tr>';
  }
 }
 if(!rows)rows='<tr><td colspan="'+(weeks.length+3)+'">ยังไม่มีรายการงานย่อย</td></tr>';
 return '<section class="weekly-print-sheet" '+printLayout(stage,weeks.length)+'>'+
  '<div class="weekly-print-top"><div class="weekly-print-identity">'+
  '<span class="weekly-print-logo" aria-label="ตราสัญลักษณ์บริษัท ศรพญาหิรัญ">'+PRINT_LOGO_SVG+'</span>'+
  '<div><strong>บริษัท ศรพญาหิรัญ จำกัด</strong>'+
  '<p>โครงการอาคารเรียนและปฏิบัติการเอนกประสงค์ · มทร.ล้านนา ดอยสะเก็ด</p></div></div>'+
  '<div class="weekly-print-meta"><span class="weekly-print-date">วันที่จัดพิมพ์ '+printCreatedAt()+'</span>'+
    '<span class="weekly-print-page-number">'+paperPrefs.size+' '+paperOrientationLabel()+
    ' · หน้าที่ '+pageNo+'/'+pageCount+'</span></div></div>'+
  '<div class="weekly-print-title"><h2>แผนงานย่อยรายสัปดาห์ · งวดที่ '+(installment+1)+'</h2>'+
  '<p>กำหนดงวด '+escapeHTML(thaiDate(bounds.start))+' – '+escapeHTML(thaiDate(bounds.end))+
  ' · ครบทั้ง '+weeks.length+' สัปดาห์ในหน้าเดียว</p></div>'+
  '<div class="weekly-print-metrics">'+
   '<span>แผน <strong>'+stagePlanned.toFixed(1)+'%</strong></span>'+
   '<span>งานจริง <strong>'+stageReal.toFixed(1)+'%</strong></span>'+
   '<span>งานย่อย <strong>'+counts(stage).total+' รายการ</strong></span>'+
   '<span>สถานะ <strong>'+escapeHTML(linkedLabel)+'</strong></span>'+
  '</div>'+
  '<table class="weekly-print-table" aria-label="แผนงานย่อยทั้งงวดที่ '+(installment+1)+'">'+
   '<colgroup><col class="print-col-task"><col class="print-col-owner"><col class="print-col-progress">'+
    weeks.map(()=>'<col class="weekly-print-week">').join('')+'</colgroup>'+
   header+'<tbody>'+rows+'</tbody></table>'+
  '<p class="weekly-print-foot">วันที่จัดพิมพ์ '+printCreatedAt()+' · อ้างอิงเอกสารแบ่งงวด หน้า '+D.installments[installment].page+
   ' · ตารางครบทั้งงวดแสดงรายสัปดาห์โดยไม่ตัดเป็นช่วง · เอกสารก่อนใช้งานจริงควรผ่านการตรวจสอบแผน</p></section>';
}
function buildPrintSheets(){
 updatePaperInfo();
 const range=printRange(),count=range.to-range.from+1,html=[];
 for(let installment=range.from-1;installment<=range.to-1;installment++)
  html.push(printSheet(installment,html.length+1,count));
 $('weeklyPrintSheets').innerHTML=html.join('');
}

function render(){
 const stage=stages[stageIndex],weeks=weeksFor(stageIndex);
 $('weeklyStageTitle').textContent=stageIndex+1;
 $('weeklyStageSelect').value=String(stageIndex+1);
 $('weeklyPrev').disabled=stageIndex===0;
 $('weeklyNext').disabled=stageIndex===12;
 $('weeklyBack').href=back;
 $('weeklyBackBottom').href=back;
 document.title='งวดที่ '+(stageIndex+1)+' · แผนงานรายสัปดาห์ · ศรพญาหิรัญ';
 renderStats(weeks);renderTable(weeks);renderLinkStatus();updatePaperInfo();
}
function goToStage(value){
 const i=Number(value)-1;if(!Number.isInteger(i)||i<0||i>=13)return;
 stageIndex=i;selected=null;closeEditor();
 $('weeklyPrintFrom').value=String(i+1);
 $('weeklyPrintTo').value=String(i+1);
 const url=new URL(location.href);url.searchParams.set('stage',String(i+1));history.pushState({},'',url);
 render();$('weeklyScroll').scrollLeft=0;window.scrollTo({top:0,behavior:'smooth'});
}
function closeEditor(){
 $('weeklyBackdrop').hidden=true;
 document.body.style.overflow='';
 selected=null;
}
function showEditor(group,task){
 const t=stages[stageIndex]?.groups[group]?.tasks[task];if(!t)return;
 selected={group,task};
 $('weeklyEditorPath').textContent='งวดที่ '+(stageIndex+1)+' / '+stages[stageIndex].groups[group].name;
 $('weeklyEditorTitle').textContent='ปรับแผนงานย่อย';
 for(const [id,val] of Object.entries({
  weeklyTaskName:t.name,weeklyTaskOwner:t.owner||'',
  weeklyTaskStart:t.start||'',weeklyTaskEnd:t.end||'',
  weeklyTaskPlanned:clamp(t.planned),weeklyTaskActual:clamp(t.actual),
  weeklyTaskWeight:Number(t.weight??1),
  weeklyTaskStatus:t.status||'ยังไม่เริ่ม',weeklyTaskNotes:t.notes||''
 }))$(id).value=val;
 $('weeklyDateHint').textContent='เมื่อกำหนดวันเริ่มและวันสิ้นสุดครบแล้ว งานนี้จะแสดงแถบสีฟ้าตามสัปดาห์ทันที';
 $('weeklyBackdrop').hidden=false;
 document.body.style.overflow='hidden';
 $('weeklyTaskName').focus();
}
function addGroup(){
 const name=prompt('ชื่อหมวดงานใหม่สำหรับงวดที่ '+(stageIndex+1));
 if(!name?.trim())return;
 stages[stageIndex].groups.push({name:name.trim(),weight:0,tasks:[]});
 if(persistStages())render();
}
function addTask(group){
 const name=prompt('ชื่องานย่อยใหม่ในหมวด '+stages[stageIndex].groups[group].name);
 if(!name?.trim())return;
 const task={
  id:'spy-weekly-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),
  name:name.trim(),owner:'',start:'',end:'',weight:1,planned:0,actual:0,
  status:'ยังไม่เริ่ม',notes:'รายการเพิ่มเติมโดยผู้ใช้',targetPercent:100
 };
 stages[stageIndex].groups[group].tasks.push(task);
 if(!persistStages()){stages[stageIndex].groups[group].tasks.pop();return}
 const hidden=collapsed();hidden.delete(group);persistCollapsed(hidden);
 render();showEditor(group,stages[stageIndex].groups[group].tasks.length-1);
}
function saveTask(event){
 event.preventDefault();
 if(!selected)return;
 const task=stages[stageIndex].groups[selected.group].tasks[selected.task];
 if(!task)return;
 const name=$('weeklyTaskName').value.trim();
 const start=$('weeklyTaskStart').value,end=$('weeklyTaskEnd').value;
 const planned=Number($('weeklyTaskPlanned').value),actual=Number($('weeklyTaskActual').value),
  weight=Number($('weeklyTaskWeight').value);
 if(!name)return alert('กรุณาใส่ชื่องาน');
 if((start&&!byDate(start))||(end&&!byDate(end))||(start&&end&&start>end))
  return alert('ตรวจสอบวันเริ่มและวันสิ้นสุด (วันที่เริ่มต้องไม่เกินวันสิ้นสุด)');
 if(![planned,actual,weight].every(Number.isFinite)||planned<0||actual<0||planned>100||actual>100||weight<0)
  return alert('กรอกเปอร์เซ็นต์ 0–100 และน้ำหนักไม่ติดลบ');
 const before={...task};
 Object.assign(task,{
  name,owner:$('weeklyTaskOwner').value.trim(),
  start,end,planned,actual,weight,
  status:$('weeklyTaskStatus').value,notes:$('weeklyTaskNotes').value.trim()
 });
 if(!persistStages()){Object.assign(task,before);return}
 closeEditor();render();
 $('weeklyNotice').textContent='✅ บันทึก "'+name+'" แล้ว · ตัวเลขความก้าวหน้าอัปเดตจากข้อมูลในเบราว์เซอร์นี้';
}
function removeTask(){
 if(!selected)return;
 const group=stages[stageIndex].groups[selected.group],task=group.tasks[selected.task];
 if(!confirm('ต้องการลบงานย่อย "'+task.name+'" ใช่หรือไม่? เอกสารที่ผูกกับงานนี้อาจหาความเชื่อมโยงไม่พบหลังลบ'))return;
 const index=selected.task;group.tasks.splice(index,1);
 if(!persistStages()){group.tasks.splice(index,0,task);return}
 closeEditor();render();
}
function goDocuments(){
 if(!selected)return;
 const t=stages[stageIndex].groups[selected.group].tasks[selected.task];
 try{
  sessionStorage.setItem('spy_active_installment',String(stageIndex));
  sessionStorage.setItem('spy_scurve_jump',JSON.stringify({
   stage:stageIndex,group:selected.group,taskId:t.id
  }));
 }catch{}
 location.href=back;
}
$('weeklyTableBody').addEventListener('click',event=>{
 const btn=event.target.closest('button[data-week-action]');if(!btn)return;
 const group=Number(btn.dataset.group),action=btn.dataset.weekAction;
 if(!Number.isInteger(group)||!stages[stageIndex]?.groups[group])return;
 if(action==='toggle'){
  const current=collapsed();if(current.has(group))current.delete(group);else current.add(group);
  persistCollapsed(current);renderTable(weeksFor(stageIndex));
 }else if(action==='add'){addTask(group)}
 else if(action==='edit'){
  const task=Number(btn.dataset.task);
  if(Number.isInteger(task))showEditor(group,task);
 }
});
$('weeklyStageSelect').innerHTML=Array.from({length:13},(_,i)=>'<option value="'+(i+1)+'">งวดที่ '+(i+1)+'</option>').join('');
$('weeklyStageSelect').addEventListener('change',e=>goToStage(e.target.value));
$('weeklyPrev').addEventListener('click',()=>goToStage(stageIndex));
$('weeklyNext').addEventListener('click',()=>goToStage(stageIndex+2));
$('weeklyExpand').addEventListener('click',()=>{persistCollapsed(new Set());renderTable(weeksFor(stageIndex))});
$('weeklyCollapse').addEventListener('click',()=>{persistCollapsed(new Set(stages[stageIndex].groups.map((_,i)=>i)));renderTable(weeksFor(stageIndex))});
$('weeklyPublish').addEventListener('click',publishToMaster);
const rangeOptions=Array.from({length:13},(_,i)=>'<option value="'+(i+1)+'">งวดที่ '+(i+1)+'</option>').join('');
$('weeklyPrintFrom').innerHTML=rangeOptions;
$('weeklyPrintTo').innerHTML=rangeOptions;
$('weeklyPrintFrom').value=String(stageIndex+1);
$('weeklyPrintTo').value=String(stageIndex+1);
$('weeklyPrintFrom').addEventListener('change',()=>{
 if(Number($('weeklyPrintFrom').value)>Number($('weeklyPrintTo').value))
  $('weeklyPrintTo').value=$('weeklyPrintFrom').value;
 updatePaperInfo();
});
$('weeklyPrintTo').addEventListener('change',()=>{
 if(Number($('weeklyPrintTo').value)<Number($('weeklyPrintFrom').value))
  $('weeklyPrintFrom').value=$('weeklyPrintTo').value;
 updatePaperInfo();
});
$('weeklyPrintAll').addEventListener('click',()=>{
 $('weeklyPrintFrom').value='1';$('weeklyPrintTo').value='13';updatePaperInfo();
});
$('weeklyPaperSize').value=paperPrefs.size;
$('weeklyPaperOrientation').value=paperPrefs.orientation;
$('weeklyPaperSize').addEventListener('change',paperOptionChanged);
$('weeklyPaperOrientation').addEventListener('change',paperOptionChanged);
$('weeklyPrint').addEventListener('click',()=>{buildPrintSheets();window.print()});
$('weeklyAddGroup').addEventListener('click',addGroup);
$('weeklyEditForm').addEventListener('submit',saveTask);
$('weeklyDeleteTask').addEventListener('click',removeTask);
$('weeklyTaskDocs').addEventListener('click',goDocuments);
$('weeklyCloseEditor').addEventListener('click',closeEditor);
$('weeklyBackdrop').addEventListener('click',e=>{if(e.target===$('weeklyBackdrop'))closeEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEditor()});
window.addEventListener('beforeprint',buildPrintSheets);
window.addEventListener('afterprint',()=>{printExpanded=false});
window.addEventListener('popstate',()=>{
 const n=Number(new URLSearchParams(location.search).get('stage'))-1;
 if(Number.isInteger(n)&&n>=0&&n<13){stageIndex=n;closeEditor();render()}
});
window.addEventListener('storage',e=>{
 if(e.key==='spy_milestones'){
  const latest=storage('spy_milestones',null);
  if(Array.isArray(latest)&&latest.length===13){stages=latest;closeEditor();render()}
 }
});
render();
})();
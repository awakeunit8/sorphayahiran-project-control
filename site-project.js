/* Site contract functions: local prototype, based on annex pages 1-10. */
(function(){
'use strict';
const D=window.SPY_CONTRACT_DATA,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert('บันทึกไม่สำเร็จ: '+e.message);return false}};
const isoAdd=(date,days)=>{if(!date)return '';let [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10)};
const dateThai=d=>d?new Date(d+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'ไม่ระบุ';
const isoToday=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let start=get('spy_contract_date',D.contractDateDefault);
let requirements=get('spy_required_doc_v2',null);
let catalog=get('spy_material_catalog_v2',null);
function groupName(name){
 if(/Shop Drawing|ขออนุมัติวัสดุ|แผนการ/.test(name))return 'เอกสารอนุมัติและส่งงวด';
 if(/ไฟฟ้า|สื่อสาร|Solar|Fire Alarm|หม้อแปลง|High-mast|เครื่องเสียง/.test(name))return 'ไฟฟ้าและสื่อสาร';
 if(/สุขาภิบาล|ประปา|ท่อน้ำ|ระบายน้ำ|สุขภัณฑ์|ถังบำบัด/.test(name))return 'สุขาภิบาลและท่อน้ำ';
 if(/ปรับอากาศ|ระบายอากาศ|ดับเพลิง/.test(name))return 'เครื่องกลและปรับอากาศ';
 if(/ฝ้า|ทาสี|ประตู|หน้าต่าง|Facade|ฟาซาด|ก่อ|ปูกระเบื้อง|ผิวพื้น|มุงหลังคา/.test(name))return 'สถาปัตยกรรมและตกแต่ง';
 if(/ถนน|ลานจอด|ทางเดิน|ภูมิทัศน์/.test(name))return 'งานภายนอก';
 if(/ครุภัณฑ์|ฝึกอบรม|BIM|AutoCAD|As-built|Commissioning|ส่งมอบ|อื่น ๆ|ทำความสะอาด/.test(name))return 'ครุภัณฑ์และส่งมอบ';
 return 'งานโครงสร้างและเตรียมการ';
}
function newStage(i){
 const stage=D.installments[i],groups=new Map();
 stage.items.forEach((item,j)=>{
   const group=groupName(item[0]);if(!groups.has(group))groups.set(group,[]);
   groups.get(group).push({id:'spym'+(i+1)+'t'+(j+1),name:item[0],owner:'',start:'',end:isoAdd(start,stage.days),weight:1,planned:0,actual:0,status:'ยังไม่เริ่ม',
     notes:'เงื่อนไขตรวจรับ: '+item[1]+'%'+(item[2]?'\n'+item[2]:'')+'\nที่มา: 20260720110346547.pdf หน้า '+stage.page,targetPercent:item[1]});
 });
 return {number:i+1,title:'งวดที่ '+(i+1),days:stage.days,percent:D.paymentPercent[i],due:isoAdd(start,stage.days),
  description:'รายการตรวจรับงวดที่ '+(i+1)+' · ร้อยละ '+D.paymentPercent[i]+' ของค่าสัญญา · '+D.source.installments+' หน้า '+stage.page,
  sourcePage:stage.page,contractSeed:true,groups:[...groups].map(([name,tasks])=>({name,weight:tasks.length*100/stage.items.length,tasks}))};
}
function isSample(m){
 const sample=['งานเตรียมการและสำรวจ','งานโครงสร้าง','งานสถาปัตยกรรม','งานระบบไฟฟ้าและสื่อสาร','งานระบบสุขาภิบาลและเครื่องกล'];
 return m?.groups?.length>0 && m.groups.every(g=>sample.includes(g.name)) &&
  m.groups.every(g=>g.tasks.every(t=>!t.owner&&!t.start&&!t.end&&!Number(t.actual||0)&&!Number(t.planned||0)));
}
function hydrate(force=false){
 let updated=false;
 for(let i=0;i<13;i++){
  const old=milestones[i];
  if(force||!old?.groups?.length||isSample(old)){milestones[i]=newStage(i);updated=true}
  else{
   old.percent??=D.paymentPercent[i];old.days??=D.installments[i].days;
   old.sourcePage??=D.installments[i].page;
   if(!old.due){old.due=isoAdd(start,old.days);updated=true}
  }
 }
 if(updated){put('spy_milestones',milestones);wbs=milestones[selectedMilestone].groups;drawWbs();renderMilestones()}
}
window.spyReimportStages=()=>{
 if(!confirm('แทนที่แผนงานทุกงวดด้วยรายการจากเอกสารแบ่งงวด 13 งวด? ข้อมูลที่แก้ไว้จะถูกเขียนทับ กรุณาสำรองก่อน'))return;
 hydrate(true);alert('นำเข้างวดงานตามเอกสารแล้ว');
};
function updateContractDate(newDate){
 if(!newDate)return;
 const old=start;start=newDate;put('spy_contract_date',start);
 for(let i=0;i<13;i++){
  let m=milestones[i],oldDue=isoAdd(old,D.installments[i].days),newDue=isoAdd(start,D.installments[i].days);
  if(!m.due||m.due===oldDue){m.due=newDue;for(const g of m.groups||[])for(const t of g.tasks||[])if(t.end===oldDue)t.end=newDue}
 }
 put('spy_milestones',milestones);
 for(const id of ['spyContractStart','spyOwnerContractStart'])if($(id))$(id).value=start;
 wbs=milestones[selectedMilestone].groups;drawWbs();renderMilestones();renderDocs();
 if(window.spyRenderFinance)window.spyRenderFinance();
}
function addStageBadges(){
 const original=renderMilestones;
 window.renderMilestones=function(){
  original();
  [...$('milestoneList').querySelectorAll('.spy-stage-card')].forEach((card,i)=>{
   const b=document.createElement('span');b.className='spy-stage-contract-pct';
   b.textContent='รับเงิน '+D.paymentPercent[i]+'% · ภายใน '+D.installments[i].days+' วัน';card.appendChild(b);
  });
  const x=document.createElement('p');x.className='spy-sourced-note';
  x.textContent='เอกสารแบ่งงวด หน้า '+D.installments[selectedMilestone].page+
    ' · ค่างวด '+D.paymentPercent[selectedMilestone]+'% · ระยะ '+D.installments[selectedMilestone].days+' วัน';
  $('selectedMilestoneInfo').appendChild(x);
 };
}
function defaultDocs(){
 const arr=D.documents.map(d=>({...d,status:'ยังไม่ได้ส่ง',number:'',sent:'',fileName:''}));
 for(let i=1;i<=13;i++){
  arr.push({id:'handover-'+i,name:'หนังสือส่งมอบงาน / ขอให้ตรวจรับงวดที่ '+i,
    source:'แนบแบ่งงวด หน้า '+D.installments[i-1].page,stage:i,
    rule:'ต้องมีผลงานและเอกสารตามเงื่อนไขครบก่อนขอเบิก',
    status:'ยังไม่ได้ส่ง',number:'',sent:'',fileName:''});
 }
 for(let i=3;i<=13;i++)for(const t of ['Shop Drawing','อนุมัติวัสดุ']){
  arr.push({id:(t==='Shop Drawing'?'shop':'mat')+i,name:(t==='Shop Drawing'?'ขออนุมัติ Shop Drawing':'ขออนุมัติวัสดุ')+' สำหรับงวด '+i,
    source:'แนบแบ่งงวด หน้า '+D.installments[i-2].page,stage:i-1,rule:'ต้องอนุมัติก่อนเบิกงวด '+(i-1),status:'ยังไม่ได้ส่ง',number:'',sent:'',fileName:''});
 }
 return arr;
}
if(!Array.isArray(requirements))requirements=defaultDocs();
else{const ids=new Set(requirements.map(d=>d.id));for(const d of defaultDocs())if(!ids.has(d.id))requirements.push(d)}
put('spy_required_doc_v2',requirements);
function due(d){return d.days?isoAdd(start,d.days):(d.stage?milestones[d.stage-1]?.due||'':d.due||'')}
function fileStore(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open('spy-required-files-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('files');
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
async function storeFile(id,file){const db=await fileStore();return new Promise((resolve,reject)=>{
 const t=db.transaction('files','readwrite');t.objectStore('files').put(file,id);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)};
})}
async function getFile(id){const db=await fileStore();return new Promise((resolve,reject)=>{
 const t=db.transaction('files','readonly'),q=t.objectStore('files').get(id);
 q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>{db.close();reject(q.error)};
})}
function csv(rows,name){const blob=new Blob(['\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});download(blob,name)}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
window.spySaveRequirement=(id,field,value)=>{
 const d=requirements.find(x=>x.id===id);if(!d||!['status','number','sent','due'].includes(field))return;
 d[field]=value;put('spy_required_doc_v2',requirements);renderSummary();
};
window.spyAttachRequirement=async(id,input)=>{
 const file=input.files?.[0],d=requirements.find(x=>x.id===id);
 if(!d||!file)return;
 if(file.size>20*1024*1024||!(/\.pdf$|\.png$|\.jpe?g$|\.webp$/i.test(file.name))){alert('เลือก PDF หรือรูปภาพไม่เกิน 20 MB');input.value='';return}
 try{await storeFile(id,file);d.fileName=file.name;d.fileAt=new Date().toISOString();put('spy_required_doc_v2',requirements);renderDocs()}
 catch(e){alert('เก็บไฟล์ในเครื่องนี้ไม่ได้: '+e.message)}
};
window.spyDownloadRequirement=async id=>{
 const d=requirements.find(x=>x.id===id);if(!d?.fileName)return;
 try{const file=await getFile(id);if(!file)throw Error('ไม่พบไฟล์บนเครื่องนี้');download(file,d.fileName)}
 catch(e){alert(String(e))}
};
let activeRequirementLetter=null;
window.spyCreateRequirementLetter=function(id){
 const d=requirements.find(x=>x.id===id);if(!d)return;
 if(typeof window.createTaskDocument!=='function')return alert('ฟอร์มหนังสือยังไม่พร้อม');
 activeRequirementLetter=id;
 window.createTaskDocument();
 $('docTitle').value=d.name;
 $('docBody').value='บริษัทฯ ขอนำส่ง '+d.name+' เพื่อโปรดพิจารณา ตามเอกสารแนบ';
 const type=/Shop Drawing/.test(d.name)?'Shop Drawing':/อนุมัติวัสดุ|พัสดุ/.test(d.name)?'ขออนุมัติวัสดุ':/เหล็ก/.test(d.name)?'ผลทดสอบเหล็กเส้น':/ลูกปูน/.test(d.name)?'ผลทดสอบลูกปูน':'หนังสือทั่วไป';
 $('docType').value=type;
 if(due(d))$('docDue').value=due(d);
 $('docSaveMessage').textContent='กำลังสร้างหนังสือสำหรับรายการ: '+d.name+' · บันทึกแล้วเลขร่างจะกลับไปแสดงในทะเบียนเอกสารที่ต้องส่ง';
};
const originalSaveTaskDocument=window.saveTaskDocument;
if(typeof originalSaveTaskDocument==='function'){
 window.saveTaskDocument=async function(){
  await originalSaveTaskDocument();
  if(!activeRequirementLetter)return;
  const number=$('docSerial')?.value||'';
  if(!number)return;
  const d=requirements.find(x=>x.id===activeRequirementLetter);if(!d)return;
  d.number=number;
  if(d.status==='ยังไม่ได้ส่ง')d.status='กำลังจัดทำ';
  put('spy_required_doc_v2',requirements);
  activeRequirementLetter=null;renderSummary();
 };
}
window.spyAddRequirement=()=>{
 const name=prompt('ชื่อหัวข้อเอกสารที่ต้องส่ง');if(!name?.trim())return;
 const date=prompt('วันที่ต้องส่ง (YYYY-MM-DD) ไม่ทราบเว้นว่าง','');
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('วันที่ไม่ถูกต้อง');
 requirements.push({id:'custom-'+Date.now(),name:name.trim(),due:date,source:'ผู้ใช้งานเพิ่ม',status:'ยังไม่ได้ส่ง',number:'',sent:'',fileName:''});
 put('spy_required_doc_v2',requirements);renderDocs();
};
window.spyExportRequirements=()=>csv([['ชื่อ','ที่มา','กำหนด','สถานะ','เลขหนังสือ','วันที่ส่ง','ไฟล์'],...requirements.map(d=>[d.name,d.source,due(d),d.status,d.number,d.sent,d.fileName])],'SPY-document-checklist.csv');
function renderSummary(){
 let sent=requirements.filter(d=>['ส่งแล้ว','รออนุมัติ','อนุมัติแล้ว'].includes(d.status)).length;
 let late=requirements.filter(d=>due(d)&&due(d)<isoToday()&&!['ส่งแล้ว','รออนุมัติ','อนุมัติแล้ว'].includes(d.status)).length;
 $('spyDocStats').innerHTML='ทั้งหมด <strong>'+requirements.length+'</strong> · ส่งแล้ว/รออนุมัติ <strong>'+sent+'</strong> · <strong class="spy-late">ค้างเกินกำหนด '+late+'</strong>';
 if($('docCount'))$('docCount').textContent=requirements.length;
 if($('approvedCount'))$('approvedCount').textContent=requirements.filter(d=>d.status==='อนุมัติแล้ว').length;
}
function renderDocs(){
 if(!$('spyRequirementsRows'))return;
 const q=($('spyDocSearch')?.value||'').toLowerCase(),filter=$('spyDocFilter')?.value||'';
 const list=requirements.filter(d=>(!filter||d.status===filter)&&(!q||(d.name+' '+d.source).toLowerCase().includes(q)));
 $('spyRequirementsRows').innerHTML=list.map(d=>{
  const date=due(d),over=date&&date<isoToday()&&!['ส่งแล้ว','รออนุมัติ','อนุมัติแล้ว'].includes(d.status);
  const opts=['ยังไม่ได้ส่ง','กำลังจัดทำ','ส่งแล้ว','รออนุมัติ','อนุมัติแล้ว','ตีกลับแก้ไข'];
  return '<tr class="'+(over?'spy-overdue':'')+'"><td><b>'+esc(d.name)+'</b>'+(d.alternativeDays?' <span class="spy-alert-mini">⚠ 30/60 วัน</span>':'')+
    '<small>ที่มา: '+esc(d.source)+'</small></td>'+
    '<td><b>'+esc(dateThai(date))+'</b><small>'+esc(d.rule||'')+'</small>'+(!d.days&&!d.stage?'<input type="date" value="'+esc(d.due||'')+'" aria-label="กำหนดส่ง" onchange="spySaveRequirement(\''+d.id+'\',\'due\',this.value)">':'')+'</td>'+
    '<td><select aria-label="สถานะเอกสาร" onchange="spySaveRequirement(\''+d.id+'\',\'status\',this.value)">'+opts.map(v=>'<option '+(v===d.status?'selected':'')+'>'+v+'</option>').join('')+'</select></td>'+
    '<td><input aria-label="เลขที่เอกสาร" value="'+esc(d.number)+'" placeholder="เลขที่เอกสาร" onchange="spySaveRequirement(\''+d.id+'\',\'number\',this.value)"></td>'+
    '<td><input type="date" aria-label="วันที่ส่ง" value="'+esc(d.sent)+'" onchange="spySaveRequirement(\''+d.id+'\',\'sent\',this.value)"></td>'+
    '<td><div class="spy-upload-stack">'+(d.fileName?'<button onclick="spyDownloadRequirement(\''+d.id+'\')">⬇ '+esc(d.fileName)+'</button>':'<span>ยังไม่มีไฟล์</span>')+
    '<input type="file" accept="application/pdf,image/*" aria-label="แนบเอกสาร" onchange="spyAttachRequirement(\''+d.id+'\',this)"></div></td>'+
    '<td><button onclick="spyCreateRequirementLetter(\''+d.id+'\')">✎ สร้างหนังสือ</button></td></tr>';
 }).join('')||'<tr><td colspan="7">ไม่พบรายการ</td></tr>';
 renderSummary();
}
function initCatalog(){if(Array.isArray(catalog))return;
 catalog=D.boqCategories.map((g,i)=>({name:g.name,items:g.items.map((name,j)=>({id:'m'+i+'-'+j,name,quantity:'',status:'ยังไม่ดำเนินการ',number:'',submitted:''}))}));
 put('spy_material_catalog_v2',catalog);
}
window.spySaveMaterial=(i,j,key,value)=>{if(catalog[i]?.items[j]&&['quantity','status','number','submitted'].includes(key)){catalog[i].items[j][key]=value;put('spy_material_catalog_v2',catalog)}};
window.spyAddMaterialItem=i=>{const name=prompt('ชื่อวัสดุ / งาน');if(name?.trim()){catalog[i].items.push({name:name.trim(),quantity:'',status:'ยังไม่ดำเนินการ',number:'',submitted:''});put('spy_material_catalog_v2',catalog);renderCatalog()}};
window.spyAddMaterialCategory=()=>{const name=prompt('ชื่อหมวดใหม่');if(name?.trim()){catalog.push({name:name.trim(),items:[]});put('spy_material_catalog_v2',catalog);renderCatalog()}};
window.spyExportMaterialCatalog=()=>csv([['หมวด','รายการ','จำนวน','สถานะ','เลขที่','วันที่ส่ง'],...catalog.flatMap(c=>c.items.map(m=>[c.name,m.name,m.quantity,m.status,m.number,m.submitted]))],'SPY-materials-no-prices.csv');
function renderCatalog(){
 if(!$('spyMaterialList'))return;
 $('spyMaterialList').innerHTML=catalog.map((g,i)=>'<details class="spy-material-category"><summary>'+esc(g.name)+' <small>('+g.items.length+' รายการ)</small></summary>'+
 '<div class="actions"><button onclick="spyAddMaterialItem('+i+')">+ เพิ่มรายการ</button></div><div class="spy-table-wrap"><table><thead><tr><th>วัสดุ / รายการ</th><th>จำนวน / หน่วย</th><th>สถานะ</th><th>เลขหนังสือ</th><th>วันที่ส่ง</th></tr></thead><tbody>'+
 g.items.map((t,j)=>'<tr><td>'+esc(t.name)+'</td>'+
 '<td><input value="'+esc(t.quantity)+'" onchange="spySaveMaterial('+i+','+j+',\'quantity\',this.value)" aria-label="จำนวน/หน่วย"></td>'+
 '<td><select onchange="spySaveMaterial('+i+','+j+',\'status\',this.value)">'+['ยังไม่ดำเนินการ','กำลังทำเอกสาร','ขออนุมัติแล้ว','อนุมัติแล้ว','สั่งซื้อแล้ว','รับของแล้ว'].map(v=>'<option '+(t.status===v?'selected':'')+'>'+v+'</option>').join('')+'</select></td>'+
 '<td><input value="'+esc(t.number)+'" onchange="spySaveMaterial('+i+','+j+',\'number\',this.value)" aria-label="เลขที่อนุมัติ"></td>'+
 '<td><input type="date" value="'+esc(t.submitted)+'" onchange="spySaveMaterial('+i+','+j+',\'submitted\',this.value)" aria-label="วันที่ส่ง"></td></tr>').join('')+'</tbody></table></div></details>').join('');
}
const originalRefresh=window.refresh;
if(typeof originalRefresh==='function')window.refresh=function(){originalRefresh();if($('spyDocStats'))renderSummary()};
addStageBadges();hydrate(false);
if($('spyContractStart')){$('spyContractStart').value=start;$('spyContractStart').onchange=e=>updateContractDate(e.target.value)}
if($('spyOwnerContractStart')){$('spyOwnerContractStart').value=start;$('spyOwnerContractStart').onchange=e=>updateContractDate(e.target.value)}
initCatalog();renderDocs();renderCatalog();
$('spyDocSearch')?.addEventListener('input',renderDocs);
$('spyDocFilter')?.addEventListener('change',renderDocs);
const originalTab=window.showTab;
window.showTab=function(tab){originalTab(tab);if(tab==='contractDocs')renderDocs();if(tab==='materials')renderCatalog();if(tab==='plan')renderMilestones();if(tab==='finance'&&window.spyRenderFinance)window.spyRenderFinance()};
const panel=$('plan')?.querySelector('.panel:nth-of-type(2) .actions');
if(panel){const btn=document.createElement('button');btn.textContent='↻ นำเข้า 13 งวดจากเอกสารใหม่';btn.onclick=window.spyReimportStages;panel.appendChild(btn)}
window.SPY_SITE={getStart:()=>start,isoAdd,displayDate:dateThai,csv,currency:v=>Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})};
})();

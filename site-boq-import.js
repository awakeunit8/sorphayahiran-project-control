/* BOQ xlsx reader – all decoding inside browser (no third-party CDN).
   Simplified OpenXML ZIP parser; values shown as reference only, no arithmetic double-counting.
   Confidential use requires real server authentication + RLS, not this demo PIN. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const D=window.SPY_CONTRACT_DATA;
const canUse=()=>document.getElementById('role')?.value==='manager'&&!document.body.classList.contains('spy-gated');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,loaded=false;
function zipEntries(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),text=new TextDecoder('utf-8');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break}}
 if(end<0)throw Error('ไฟล์ไม่ใช่ ZIP/XLSX ที่ถูกต้อง');
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true);
 let ptr=offset;const entries=new Map();
 for(let i=0;i<count;i++){
  if(view.getUint32(ptr,true)!==0x02014b50)throw Error('อ่านโครงสร้างไฟล์ Excel ไม่สำเร็จ');
  const method=view.getUint16(ptr+10,true),size=view.getUint32(ptr+20,true);
  const nameLen=view.getUint16(ptr+28,true),extraLen=view.getUint16(ptr+30,true),commentLen=view.getUint16(ptr+32,true),local=view.getUint32(ptr+42,true);
  const name=text.decode(bytes.subarray(ptr+46,ptr+46+nameLen));
  entries.set(name,{method,size,local});ptr+=46+nameLen+extraLen+commentLen;
 }
 async function read(name){
  const entry=entries.get(name);if(!entry)return null;
  const at=entry.local;
  if(view.getUint32(at,true)!==0x04034b50)throw Error('ไฟล์ ZIP ไม่ถูกต้อง');
  const start=at+30+view.getUint16(at+26,true)+view.getUint16(at+28,true);
  const compressed=bytes.slice(start,start+entry.size);
  if(entry.method===0)return text.decode(compressed);
  if(entry.method!==8)throw Error('ZIP compression แบบนี้ยังไม่รองรับ');
  if(typeof DecompressionStream==='undefined')throw Error('เบราว์เซอร์ไม่รองรับการอ่าน ZIP นี้ ใช้ Chrome/Edge เวอร์ชันใหม่');
  const result=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  return text.decode(new Uint8Array(result));
 }
 return {read,names:[...entries.keys()]};
}
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
function sstText(source){
 if(!source)return[];
 const doc=xml(source),items=[...doc.getElementsByTagName('si')];
 return items.map(si=>[...si.getElementsByTagName('t')].map(n=>n.textContent).join(''));
}
function cellValue(cell,strings){
 const type=cell.getAttribute('t');
 if(type==='inlineStr')return [...cell.getElementsByTagName('t')].map(n=>n.textContent||'').join('');
 const v=cell.getElementsByTagName('v')[0]?.textContent||'';
 if(type==='s')return strings[Number(v)]||'';
 if(type==='b')return v==='1'?'TRUE':'FALSE';
 return v;
}
function colIndex(address){
 const match=/^[A-Z]+/.exec(address||'');if(!match)return 0;
 return [...match[0]].reduce((sum,char)=>sum*26+char.charCodeAt(0)-64,0)-1;
}
function categoryOf(desc){
 const x=String(desc);
 if(/โครงสร้าง|เสาเข็ม|คาน|เหล็กเส้น|คอนกรีต|Post|เสา|พื้นค.ส.ล/.test(x))return 'งานโครงสร้าง / งานฐานราก / Post-tension';
 if(/ระบบไฟฟ้า|ไฟฟ้าแรงสูง|MDB|Transformer|ตู้ไฟ|สายไฟ|โคมไฟ|แสงสว่าง/.test(x))return 'งานไฟฟ้ากำลัง';
 if(/CCTV|โทรศัพท์|เครือข่าย|สื่อสาร|Fire Alarm|เสียง|ลำโพง|จอแสดงผล/.test(x))return 'งานไฟฟ้าสื่อสารและระบบพิเศษ';
 if(/ประปา|สุขาภิบาล|ท่อระบาย|น้ำทิ้ง|บ่อพัก|สุขภัณฑ์|ท่อ PVC/.test(x))return 'งานระบบสุขาภิบาล / ประปา';
 if(/ปรับอากาศ|ระบายอากาศ|AHU|FCU|พัดลม/.test(x))return 'งานปรับอากาศและระบายอากาศ';
 if(/ลิฟต์|Lift|Elevator/.test(x))return 'งานลิฟต์และงานระบบขนส่ง';
 if(/Solar|แผงเซลล์|PV/.test(x))return 'งานระบบ Solar Cell';
 if(/ครุภัณฑ์|เก้าอี้|Scoreboard|เครื่องออกกำลัง|กีฬา/.test(x))return 'งานครุภัณฑ์และอุปกรณ์';
 if(/ถนน|ที่จอด|ภูมิทัศน์|รางระบายน้ำ|ลานจอด/.test(x))return 'งานภายนอกและภูมิทัศน์';
 if(/ผนัง|ปูกระเบื้อง|ฝ้า|ประตู|หน้าต่าง|เฟอร์นิเจอร์|ทาสี|อลูมิเนียม|สถาปัต/.test(x))return 'งานสถาปัตยกรรม';
 return 'หมวดอื่น / ต้องตรวจสอบ';
}
function describeRow(values){
 const texts=values.filter(x=>typeof x==='string'&&x.trim()&&!/^[\d.,\-() %]+$/.test(x.trim()));
 if(!texts.length)return null;
 const desc=texts.sort((a,b)=>b.length-a.length)[0].trim();
 if(desc.length<3||desc.length>600)return null;
 const numerics=values.map((v,i)=>({v:String(v??'').trim(),col:i+1})).filter(x=>x.v&&/^[-+]?\d[\d,]*(?:\.\d+)?$/.test(x.v)).slice(-8);
 const note=values.filter(x=>typeof x==='string'&&x.trim()&&x.trim()!==desc).slice(0,5).join(' · ');
 return {description:desc,category:categoryOf(desc),numbers:numerics.map(x=>'คอลัมน์ '+x.col+': '+x.v).join(' | '),note};
}
async function parseWorkbook(file){
 if(file.size>25*1024*1024)throw Error('ไฟล์ Excel ต้องไม่เกิน 25 MB');
 const archive=zipEntries(await file.arrayBuffer()),strings=sstText(await archive.read('xl/sharedStrings.xml'));
 const workbookXml=await archive.read('xl/workbook.xml'),relsXml=await archive.read('xl/_rels/workbook.xml.rels');
 const sheetNames=new Map();
 if(workbookXml&&relsXml){
  const book=xml(workbookXml),rel=xml(relsXml),relation=new Map();
  [...rel.getElementsByTagName('Relationship')].forEach(n=>relation.set(n.getAttribute('Id'),n.getAttribute('Target')));
  [...book.getElementsByTagName('sheet')].forEach(n=>{
   const id=n.getAttribute('r:id')||n.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
   let target=relation.get(id)||'';
   if(target){if(target.startsWith('/'))target=target.slice(1);else if(!target.startsWith('xl/'))target='xl/'+target;
    sheetNames.set(target.replace(/\\/g,'/'),n.getAttribute('name')||target)}
  });
 }
 const sheets=archive.names.filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).slice(0,40);
 if(!sheets.length)throw Error('ไม่พบตาราง Worksheet ใน Excel');
 const rows=[];
 for(const sheet of sheets){
  const body=await archive.read(sheet);if(!body)continue;
  const doc=xml(body),name=sheetNames.get(sheet)||sheet.split('/').pop();
  const sheetRows=[...doc.getElementsByTagName('row')];
  for(const row of sheetRows){
   const values=[];
   for(const c of [...row.getElementsByTagName('c')]){
    const ix=colIndex(c.getAttribute('r'));if(ix>100)continue;
    values[ix]=cellValue(c,strings);
   }
   const entry=describeRow(values);
   if(entry)rows.push({...entry,sheet:name,row:Number(row.getAttribute('r')||0)});
   if(rows.length>=20000)break;
  }
  if(rows.length>=20000)break;
 }
 return rows;
}
function database(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open('spy-owner-boq',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('data');
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
async function putData(rows,name){
 const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction('data','readwrite');
  tx.objectStore('data').put({rows,name,at:new Date().toISOString()},'import');
  tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};
 });
}
async function getData(){const db=await database();return new Promise((resolve,reject)=>{
 const tx=db.transaction('data','readonly'),req=tx.objectStore('data').get('import');
 req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)};
})}
window.spyImportBoq=async function(){
 if(!canUse())return;
 const file=$('spyBoqImport')?.files?.[0];if(!file)return alert('กรุณาเลือกไฟล์ BOQ .xlsx ก่อน');
 if(!/\.xlsx$/i.test(file.name))return alert('รองรับเฉพาะ XLSX');
 const status=$('spyBoqImportSummary');status.textContent='กำลังอ่าน BOQ Excel ภายในเบราว์เซอร์...';
 try{
  const rows=await parseWorkbook(file);
  if(!rows.length)throw Error('ไม่พบแถวรายการใน Excel');
  await putData(rows,file.name);
  data={rows,name:file.name,at:new Date().toISOString()};
  loaded=true;render();alert('นำเข้ารายการ BOQ จากไฟล์ต้นฉบับแล้ว '+rows.length+' แถว (ยังไม่ได้ตั้งต้นทุนจริงอัตโนมัติ)');
 }catch(e){status.textContent='อ่านไม่สำเร็จ: '+e.message;alert('นำเข้าไม่ได้: '+e.message)}
};
function render(){
 if(!canUse())return;
 if(!data){$('spyBoqImportSummary').textContent='ยังไม่ได้อ่าน BOQ Excel ในเครื่องนี้';return}
 const rows=data.rows||[];
 $('spyBoqImportSummary').textContent='ไฟล์ '+data.name+' · พบรายการ '+rows.length+' แถว · แสดงเฉพาะ Owner โหมดทดลอง (ห้ามใช้เก็บข้อมูลลับจริง)';
 const categories=[...new Set(rows.map(r=>r.category))].sort();
 const filter=$('spyBoqCategoryFilter');const selected=filter.value;
 filter.innerHTML='<option value="">ทุกหมวดงาน</option>'+categories.map(c=>'<option value="'+esc(c)+'" '+(c===selected?'selected':'')+'>'+esc(c)+'</option>').join('');
 const q=($('spyBoqSearch').value||'').trim().toLowerCase(),cat=filter.value;
 const matching=rows.filter(r=>(!cat||r.category===cat)&&(!q||(r.description+' '+r.sheet+' '+r.numbers).toLowerCase().includes(q)));
 $('spyImportedBoqRows').innerHTML=matching.slice(0,150).map((r,i)=>
  '<tr><td>'+esc(r.sheet)+' / '+r.row+'</td><td>'+esc(r.category)+'</td><td>'+esc(r.description)+'<small>'+esc(r.note)+'</small></td>'+
  '<td>'+esc(r.numbers||'-')+'</td><td><button onclick="spyAppendBoqItem('+rows.indexOf(r)+')">+ เข้าแผนงบ</button></td></tr>').join('')||
  '<tr><td colspan="5">ไม่พบข้อมูล</td></tr>';
 if(matching.length>150)$('spyBoqImportSummary').textContent+=' · พบตรงเงื่อนไข '+matching.length+' แถว (แสดง 150 แถวแรก โปรดใช้ช่องค้นหา)';
}
window.spyAppendBoqItem=function(i){
 if(!canUse())return;
 const row=data?.rows?.[i];if(!row)return;
 if(!window.spyAppendFinanceCategory)return alert('โมดูลบัญชียังไม่พร้อม');
 window.spyAppendFinanceCategory(row.category+' / '+row.description);
};
window.spyExportImportedBoq=function(){
 if(!canUse())return;
 if(!data?.rows?.length)return alert('ยังไม่ได้โหลด Excel');
 const rows=[['ชีต','แถว','หมวด','รายละเอียด','ข้อมูลประกอบ','ตัวเลขแถว'],...data.rows.map(r=>[r.sheet,r.row,r.category,r.description,r.note,r.numbers])];
 window.SPY_SITE.csv(rows,'SPY-imported-BOQ-rows.csv');
};
$('spyBoqSearch')?.addEventListener('input',render);
$('spyBoqCategoryFilter')?.addEventListener('change',render);
const original=window.spyRenderFinance;
window.spyRenderFinance=function(){
 if(original)original();
 if(!canUse())return;
 if(loaded)render();
 else{loaded=true;getData().then(x=>{data=x;render()}).catch(()=>render())}
};
})();
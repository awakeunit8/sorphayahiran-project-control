/* Owner budget prototype. Do not use for confidential figures until server auth + RLS.
   No BOQ price numbers or hidden credentials shipped in this public source. */
(function(){
'use strict';
const D=window.SPY_CONTRACT_DATA,$=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const isOwner=()=>$('role')?.value==='manager'&&!document.body.classList.contains('spy-gated');
const blank=()=>({contractAmount:'',receipts:Array.from({length:13},()=>({amount:'',date:''})),
  categories:D.boqCategories.flatMap((c,i)=>[{name:c.name,budget:'',spent:'',id:'boq-cat'+i},
   ...c.items.map((name,j)=>({name:'↳ '+name,budget:'',spent:'',id:'boq-row'+i+'-'+j}))])});
let data=null;
function read(){if(!isOwner())return null;
 if(!data){try{data=JSON.parse(localStorage.getItem('spy_owner_finance_v1'))||blank()}catch{data=blank()}}
 if(!Array.isArray(data.categories))data.categories=blank().categories;
 if(!Array.isArray(data.receipts))data.receipts=blank().receipts;
 return data;
}
function save(){if(!isOwner())return;try{localStorage.setItem('spy_owner_finance_v1',JSON.stringify(data))}catch(e){alert('บันทึกไม่สำเร็จ: '+e.message)}}
const add=(date,days)=>window.SPY_SITE.isoAdd(date,days);
const dateThai=v=>window.SPY_SITE.displayDate(v);
function render(){
 const d=read();if(!d)return;
 const contract=Number(d.contractAmount||0),start=window.SPY_SITE.getStart();
 if($('spyContractValue')&&document.activeElement!==$('spyContractValue'))$('spyContractValue').value=d.contractAmount??'';
 if($('spyOwnerContractStart'))$('spyOwnerContractStart').value=start;
 const now=new Date().toLocaleDateString('en-CA');
 const shouldReceive=D.paymentPercent.reduce((sum,pct,i)=>sum+(add(start,D.installments[i].days)<=now?contract*pct/100:0),0);
 const collected=d.receipts.reduce((sum,r)=>sum+Number(r?.amount||0),0);
 const budgeted=d.categories.reduce((sum,c)=>sum+Number(c.budget||0),0);
 const spent=d.categories.reduce((sum,c)=>sum+Number(c.spent||0),0);
 $('spyFinanceOverview').innerHTML=[
  ['ราคาสัญญาที่ Owner กรอก',contract?fmt(contract)+' ฿':'รอกรอกสัญญาจริง'],
  ['ครบงวดที่ควรได้รับถึงวันนี้',fmt(shouldReceive)+' ฿'],
  ['รับเงินจริงที่บันทึก',fmt(collected)+' ฿'],
  ['ส่วนต่างเงินรับจริงเทียบงวดครบกำหนด',fmt(collected-shouldReceive)+' ฿'],
  ['งบจัดสรรต้นทุนทั้งหมด',fmt(budgeted)+' ฿'],
  ['จ่ายสะสม / งบคงเหลือ',fmt(spent)+' / '+fmt(budgeted-spent)+' ฿']
 ].map(row=>'<div class="card">'+safe(row[0])+'<strong>'+safe(row[1])+'</strong></div>').join('');
 $('spyCashflowRows').innerHTML=D.paymentPercent.map((pct,i)=>{
  const planned=contract*pct/100,actual=Number(d.receipts[i]?.amount||0);
  return '<tr><td>งวด '+(i+1)+'</td><td>'+safe(dateThai(add(start,D.installments[i].days)))+'<small>ภายใน '+D.installments[i].days+' วัน</small></td><td>'+pct+'%</td>'+
   '<td>'+fmt(planned)+'</td><td><input id="spyReceiptAmount'+i+'" type="number" min="0" step=".01" value="'+safe(d.receipts[i]?.amount??'')+'" placeholder="ยอดรับจริง"></td>'+
   '<td><input id="spyReceiptDate'+i+'" type="date" value="'+safe(d.receipts[i]?.date??'')+'"></td>'+
   '<td class="'+(actual-planned<0?'spy-negative':'spy-positive')+'">'+fmt(actual-planned)+'</td>'+
   '<td><button onclick="spySaveReceipt('+i+')">💾</button></td></tr>';
 }).join('');
 $('spyCostRows').innerHTML=d.categories.map((c,i)=>{
  const remaining=Number(c.budget||0)-Number(c.spent||0);
  return '<tr><td>'+safe(c.name)+'</td>'+
   '<td><input type="number" id="spyCostBudget'+i+'" min="0" step=".01" value="'+safe(c.budget??'')+'" placeholder="งบต้นทุน"></td>'+
   '<td><input type="number" id="spyCostSpent'+i+'" min="0" step=".01" value="'+safe(c.spent??'')+'" placeholder="ยอดจ่าย"></td>'+
   '<td class="'+(remaining<0?'spy-negative':'spy-positive')+'">'+fmt(remaining)+'</td>'+
   '<td><button onclick="spySaveCost('+i+')">💾</button></td></tr>';
 }).join('');
}
window.spySaveFinanceSettings=function(){
 if(!isOwner())return;
 const v=$('spyContractValue').value;if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0))return alert('ยอดไม่ถูกต้อง');
 read().contractAmount=v;save();render();
};
window.spySaveReceipt=function(i){
 if(!isOwner())return;
 const value=$('spyReceiptAmount'+i).value;
 if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))return alert('ยอดไม่ถูกต้อง');
 read().receipts[i]={amount:value,date:$('spyReceiptDate'+i).value};save();render();
};
window.spySaveCost=function(i){
 if(!isOwner())return;
 const budget=$('spyCostBudget'+i).value,spent=$('spyCostSpent'+i).value;
 if([budget,spent].some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<0)))return alert('ยอดไม่ถูกต้อง');
 read().categories[i].budget=budget;read().categories[i].spent=spent;save();render();
};
window.spyAddCostCategory=function(){
 if(!isOwner())return;
 const name=prompt('ชื่อรายการต้นทุนเพิ่ม');if(!name?.trim())return;
 read().categories.push({name:name.trim(),budget:'',spent:'',id:'cost'+Date.now()});save();render();
};
window.spyAppendFinanceCategory=function(name){
 if(!isOwner()||!name)return;
 const d=read();if(d.categories.some(c=>c.name===name)){alert('มีรายการนี้ในงบแล้ว');return}
 d.categories.push({name,budget:'',spent:'',id:'import'+Date.now()});save();render();
 alert('เพิ่มรายการลงแผนงบ Owner แล้ว: '+name+'\nกรอกงบที่วางแผนจะจ่ายและจ่ายจริงในตารางด้านบน');
};
window.spyExportFinance=function(){
 const d=read();if(!d)return;
 const rows=[['ประเภท','หัวข้อ','เปอร์เซ็นต์','กำหนด','ยอดงบ/ตามแผน','ยอดจริง','วันที่']];
 D.paymentPercent.forEach((p,i)=>rows.push(['งวดเงิน','งวด '+(i+1),p,add(window.SPY_SITE.getStart(),D.installments[i].days),
  Number(d.contractAmount||0)*p/100,d.receipts[i]?.amount||'',d.receipts[i]?.date||'']));
 d.categories.forEach(c=>rows.push(['BOQ',''+c.name,'','',c.budget,c.spent,'']));
 window.SPY_SITE.csv(rows,'SPY-Owner-finance.csv');
};
window.spyRenderFinance=render;
const logout=$('spyLogout');
if(logout)logout.addEventListener('click',()=>{data=null},true);
})();
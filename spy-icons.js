/* Stylish, consistent stroke icons for the Sorphayahiran site only. */
(function(){
  'use strict';
  const shapes={
    home:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    plan:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v6M8 15h3m3 0h4M8 17h6"/>',
    docs:'<path d="M8 2h7l5 5v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v6h5M9 13h7M9 17h6"/>',
    documents:'<rect x="4" y="3" width="13" height="17" rx="2"/><path d="M8 8h6M8 12h6M8 16h4M17 7h3v14a1 1 0 0 1-1 1H8"/>',
    daily:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
    letter:'<path d="M4 4h12l4 4v12H4zM16 4v5h4M8 12h8M8 16h8"/>',
    package:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
    money:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M7 15h3M16 15h1"/>',
    logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 4h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6"/>',
    crown:'<path d="M2 8l5 4 5-8 5 8 5-4-2 12H4L2 8zM4 17h16"/>',
    hardhat:'<path d="M4 16v-3a8 8 0 0 1 16 0v3M12 5v9M2 17h20v3H2z"/>',
    shield:'<path d="M12 22c5-2.4 8-6.1 8-11V5l-8-3-8 3v6c0 4.9 3 8.6 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    right:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    filecheck:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-12 6 2.5 2.5L16 11"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 16 4-4 3 2 6-7"/><circle cx="20" cy="7" r="1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    test:'<path d="M9 2h6M10 2v7L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V2"/><path d="M7 17h10"/>',
    print:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 15h12v7H6z"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
    upload:'<path d="M12 17V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'
  };
  function svg(name){
    return '<svg class="spy-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||shapes.docs)+'</svg>';
  }
  const tabs={
    home:['home','ภาพรวมไซต์งาน'],
    plan:['plan','งวดงานและแผนย่อย'],
    doccenter:['documents','ทะเบียนหนังสือ'],
    docs:['filecheck','ติดตามเอกสาร'],
    daily:['daily','รายงานประจำวัน'],
    letters:['letter','สร้างหนังสือ'],
    materials:['package','วัสดุและจัดซื้อ'],
    finance:['money','งบประมาณ']
  };
  function addNavIcons(){
    document.querySelectorAll('body>nav button[data-tab]').forEach(function(btn){
      const entry=tabs[btn.dataset.tab];
      if(!entry||btn.dataset.spyIconified==='1')return;
      btn.innerHTML=svg(entry[0])+'<span></span>';
      btn.lastElementChild.textContent=entry[1];
      btn.dataset.spyIconified='1';
    });
  }
  function iconifyButton(button,icon){
    if(!button||button.dataset.spyIconified==='1')return;
    const label=button.textContent.replace(/^[^ก-๙A-Za-z0-9]+/u,'').trim()||button.textContent.trim();
    button.textContent=label;
    button.insertAdjacentHTML('afterbegin',svg(icon));
    button.classList.add('spy-icon-button');
    button.dataset.spyIconified='1';
  }
  function enhance(){
    addNavIcons();
    document.querySelectorAll('.spy-home-actions button').forEach((btn,i)=>iconifyButton(btn,i===0?'plan':'documents'));
    document.querySelectorAll('#home .grid .actions button').forEach((btn,i)=>iconifyButton(btn,['right','daily','plus'][i]||'right'));
    iconifyButton(document.getElementById('spyLogout'),'logout');
    document.querySelectorAll('#spyLoginSubmit').forEach(btn=>iconifyButton(btn,'right'));
    document.querySelectorAll('.spy-role-choices .spy-choice .icon').forEach((icon,i)=>{
      if(icon.dataset.spyIconified)return;
      icon.innerHTML=svg(i===0?'crown':'hardhat');
      icon.dataset.spyIconified='1';
    });
    document.querySelectorAll('#taskDocuments .actions button').forEach((btn,i)=>iconifyButton(btn,i===0?'plus':i===1?'documents':btn.textContent.includes('เทส')?'test':'filecheck'));
  }
  // Prefer the approved original logo file as favicon when it has been uploaded.
  const logoCheck=new Image();
  logoCheck.onload=function(){
    const link=document.querySelector('link[rel="icon"]');
    if(link){link.href='logo.png';link.type='image/png'}
  };
  logoCheck.src='logo.png';
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
  let timer;
  document.addEventListener('click',function(event){
    if(event.target.closest('button[data-tab="plan"]')){clearTimeout(timer);timer=setTimeout(enhance,30)}
  });
})();

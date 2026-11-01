/* Dedicated Sorphayahiran project prototype login.
   These five-digit PINs are DEMO ONLY. This cannot secure company data.
   Migrate to server-side authentication + Row Level Security before real use. */
(function(){
  'use strict';
  const login=document.getElementById('spyLogin');
  const form=document.getElementById('spyLoginForm');
  const pin=document.getElementById('spyPin');
  const error=document.getElementById('spyLoginError');
  const logout=document.getElementById('spyLogout');
  const roleSelect=document.getElementById('role');
  const DEMO_PINS={owner:'54321',admin:'12345'};
  if(!login||!form||!pin||!error||!logout||!roleSelect)return;
  function activeRole(){return document.querySelector('input[name="spyLoginRole"]:checked')?.value==='admin'?'admin':'owner'}
  function remember(value){try{if(value)sessionStorage.setItem('spy_demo_role',value);else sessionStorage.removeItem('spy_demo_role')}catch{}}
  function enter(role){
    roleSelect.value=role==='owner'?'manager':'employee';
    if(typeof updateRole==='function')updateRole();
    document.body.classList.remove('spy-gated');
    login.setAttribute('aria-hidden','true');
    document.getElementById('spyPin').value='';
    error.textContent='';
    remember(role);
    // A direct S-Curve link must return to its 13-installment view after login.
    const query=new URLSearchParams(location.search);
    if(query.get('return')==='scurve'){
      location.replace('./scurve.html');
      return;
    }
    if(typeof showTab==='function'){
      const initialTab=query.get('tab');
      showTab(initialTab==='plan'?'plan':'home');
    }
  }
  form.addEventListener('submit',function(event){
    event.preventDefault();
    const selected=activeRole();
    if(pin.value!==DEMO_PINS[selected]){
      error.textContent='รหัสไม่ถูกต้อง กรุณาลองใหม่';
      pin.value='';
      pin.focus();
      return;
    }
    enter(selected);
  });
  logout.addEventListener('click',function(){
    remember('');
    roleSelect.value='employee';
    if(typeof updateRole==='function')updateRole();
    document.body.classList.add('spy-gated');
    login.removeAttribute('aria-hidden');
    const selected=document.querySelector('input[name="spyLoginRole"][value="owner"]');
    if(selected)selected.checked=true;
    pin.value='';
    error.textContent='';
    pin.focus();
  });
  document.querySelectorAll('input[name="spyLoginRole"]').forEach(function(input){
    input.addEventListener('change',()=>{pin.value='';error.textContent='';pin.focus()});
  });
  let saved=null;try{saved=sessionStorage.getItem('spy_demo_role')}catch{}
  if(saved==='owner'||saved==='admin')enter(saved);
})();

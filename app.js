// Vee final - localStorage based site
const STORAGE_KEY = 'veefinal_data_v1';

function loadData(){ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return { admin:{user:'Vee',pass:'411'}, users:{}, paid:[] }; try{ return JSON.parse(raw); }catch(e){ return { admin:{user:'Vee',pass:'411'}, users:{}, paid:[] }; } }
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

let DATA = loadData();

// elements
const freeListEl = document.getElementById('freeList');
const paidListEl = document.getElementById('paidList');
const userInfoEl = document.getElementById('userInfo');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const storeSection = document.getElementById('store');
const adminPanel = document.getElementById('adminPanel');
const usersListEl = document.getElementById('usersList');
const statUsersEl = document.getElementById('statUsers');
const statPurchasesEl = document.getElementById('statPurchases');

// default free commands
const FREE = [
  {cmd:'pkg update && pkg upgrade', desc:'تحديث النظام'},
  {cmd:'pkg install python', desc:'تثبيت بايثون'},
  {cmd:'termux-setup-storage', desc:'ربط التخزين'}
];

function renderFree(){
  freeListEl.innerHTML='';
  FREE.forEach(f=>{
    const d = document.createElement('div'); d.className='list-item';
    d.innerHTML = `<div><strong>${f.cmd}</strong><div class="small">${f.desc}</div></div><div><button class="btn" onclick="copyText('${f.cmd.replace(/'/g,"\\'")}')">نسخ</button></div>`;
    freeListEl.appendChild(d);
  });
}

function renderPaid(){
  paidListEl.innerHTML='';
  if(!DATA.paid || DATA.paid.length===0){ paidListEl.innerHTML = '<div class="muted small">لا يوجد محتوى مدفوع حالياً</div>'; return; }
  const sess = getSession();
  DATA.paid.forEach(item=>{
    const d = document.createElement('div'); d.className='list-item';
    const boughtBy = item.boughtBy || [];
    const bought = sess && boughtBy.includes(sess.username);
    const html = `<div><strong>${item.title}</strong><div class="small">${item.payload||''}</div></div>
      <div style="display:flex;gap:8px;align-items:center"><div class="small" style="color:var(--gold)">${item.price} نقطة</div>
      <button class="btn" onclick="buyItem('${item.id}')">${bought? 'مفتوح':'شراء'}</button></div>`;
    d.innerHTML = html;
    paidListEl.appendChild(d);
  });
}

function copyText(t){ navigator.clipboard?.writeText(t).then(()=>alert('تم النسخ')) }

// session
function getSession(){ const s = sessionStorage.getItem('veefinal_session'); return s?JSON.parse(s):null; }
function setSession(u){ if(u) sessionStorage.setItem('veefinal_session', JSON.stringify(u)); else sessionStorage.removeItem('veefinal_session'); updateUI(); }
function updateUI(){
  const sess = getSession();
  if(sess){
    userInfoEl.innerHTML = `👤 <strong>${sess.username}</strong><div class="small">النقاط: ${sess.points||0}</div>`;
    logoutBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    storeSection.classList.remove('hidden'); // show store only after login
  } else {
    userInfoEl.innerHTML = 'لم تقم بتسجيل الدخول';
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    storeSection.classList.add('hidden');
    adminPanel.classList.add('hidden');
  }
  renderPaid();
  renderAdminStats();
}

// auth flows
loginBtn.addEventListener('click', ()=>{
  showModal('تسجيل الدخول', `
    <div>
      <input id="mUser" placeholder="اسم المستخدم"><br><br>
      <input id="mPass" placeholder="كلمة المرور" type="password"><br><br>
      <div style="display:flex;gap:8px"><button id="mLogin" class="btn">دخول</button><button id="mCancel" class="ghost">إغلاق</button></div>
    </div>
  `);
  setTimeout(()=>{
    document.getElementById('mCancel').addEventListener('click', closeModal);
    document.getElementById('mLogin').addEventListener('click', ()=>{
      const u = document.getElementById('mUser').value.trim();
      const p = document.getElementById('mPass').value.trim();
      DATA = loadData();
      if(u === DATA.admin.user && p === DATA.admin.pass){
        closeModal(); adminPanel.classList.remove('hidden'); renderAdminPanel(); alert('تم تسجيل دخول الأدمن');
        return;
      }
      if(!DATA.users[u]){ alert('المستخدم غير موجود'); return; }
      // demo accepts any password for normal users
      const userObj = { username: u, points: DATA.users[u].points || 0 };
      setSession(userObj);
      closeModal();
    });
  },100);
});

registerBtn.addEventListener('click', ()=>{
  showModal('إنشاء حساب', `
    <div>
      <input id="rUser" placeholder="اسم المستخدم"><br><br>
      <input id="rPass" placeholder="كلمة المرور" type="password"><br><br>
      <div style="display:flex;gap:8px"><button id="rCreate" class="btn">إنشاء</button><button id="rCancel" class="ghost">إغلاق</button></div>
    </div>
  `);
  setTimeout(()=>{
    document.getElementById('rCancel').addEventListener('click', closeModal);
    document.getElementById('rCreate').addEventListener('click', ()=>{
      const u = document.getElementById('rUser').value.trim();
      const p = document.getElementById('rPass').value.trim();
      if(!u || !p) return alert('يرجى إدخال اسم وكلمة مرور');
      DATA = loadData();
      if(DATA.users[u]) return alert('هذا الاسم مستخدم');
      DATA.users[u] = { points: 0, created: Date.now() };
      saveData(DATA);
      alert('تم إنشاء الحساب');
      setSession({ username: u, points: 0 });
      closeModal();
    });
  },100);
});

logoutBtn.addEventListener('click', ()=>{ setSession(null); });

// buying
function buyItem(id){
  const sess = getSession();
  if(!sess) return alert('يرجى تسجيل الدخول لشراء المحتوى');
  DATA = loadData();
  const item = DATA.paid.find(p=>p.id===id);
  if(!item) return alert('البند غير موجود');
  const userData = DATA.users[sess.username] || { points:0 };
  if((userData.points||0) < item.price) return alert('رصيد غير كاف');
  userData.points -= item.price;
  DATA.users[sess.username] = userData;
  item.boughtBy = item.boughtBy || [];
  if(!item.boughtBy.includes(sess.username)) item.boughtBy.push(sess.username);
  saveData(DATA);
  setSession({ username: sess.username, points: userData.points });
  alert('تم الشراء وفتح المحتوى');
  renderPaid();
}

// admin panel functions
function renderAdminPanel(){
  renderAdminStats();
  usersListEl.innerHTML = '';
  Object.keys(DATA.users).forEach(u=>{
    const info = DATA.users[u];
    const div = document.createElement('div'); div.className='list-item';
    div.innerHTML = `<div><strong>${u}</strong><div class="small">نقاط: ${info.points||0}</div></div><div style="display:flex;gap:8px">
      <button class="btn" onclick="adminCharge('${u}')">شحن</button>
      <button class="ghost" onclick="adminDelete('${u}')">حذف</button>
    </div>`;
    usersListEl.appendChild(div);
  });
}

function renderAdminStats(){
  DATA = loadData();
  statUsersEl.textContent = 'المستخدمون: ' + Object.keys(DATA.users).length;
  const purchases = DATA.paid.reduce((s,i)=> s + ((i.boughtBy||[]).length), 0);
  statPurchasesEl.textContent = 'المشتريات: ' + purchases;
}

function adminCharge(username){
  const amt = parseInt(prompt('أدخل عدد النقاط للشحن:', '100'));
  if(isNaN(amt) || amt<=0) return alert('قيمة غير صحيحة');
  DATA = loadData();
  if(!DATA.users[username]) return alert('الحساب غير موجود');
  DATA.users[username].points = (DATA.users[username].points||0) + amt;
  saveData(DATA);
  renderAdminPanel();
  alert('تم شحن الحساب');
}
function adminDelete(username){
  if(!confirm('هل تريد حذف المستخدم '+username+'؟')) return;
  DATA = loadData();
  delete DATA.users[username];
  saveData(DATA);
  renderAdminPanel();
}

// add paid
document.getElementById('addPaid').addEventListener('click', ()=>{
  const title = document.getElementById('newTitle').value.trim();
  const price = parseInt(document.getElementById('newPrice').value) || 0;
  const payload = document.getElementById('newPayload').value.trim();
  if(!title || price<=0) return alert('ادخل عنوان وسعر صحيح');
  DATA = loadData();
  const id = 'p'+Date.now();
  DATA.paid.push({ id, title, price, payload, boughtBy: [] });
  saveData(DATA);
  document.getElementById('newTitle').value=''; document.getElementById('newPrice').value=''; document.getElementById('newPayload').value='';
  renderPaid(); renderAdminPanel();
  alert('تمت الإضافة');
});

// export/import
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = loadData();
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='veefinal_data.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const txt = await f.text();
    try{ const obj = JSON.parse(txt); saveData(obj); DATA = loadData(); renderPaid(); renderAdminPanel(); alert('تم الاستيراد'); } catch(e){ alert('ملف غير صالح'); }
  };
  inp.click();
});

// modal helpers
function showModal(title, html){
  document.getElementById('modalContent').innerHTML = `<h3>${title}</h3>` + html;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').setAttribute('aria-hidden','false');
}
function closeModal(){ document.getElementById('modal').classList.add('hidden'); document.getElementById('modal').setAttribute('aria-hidden','true'); }
document.getElementById('closeModal').addEventListener('click', closeModal);

// navigation
document.getElementById('btnHome').addEventListener('click', ()=>{ window.scrollTo({top:0,behavior:'smooth'}); });
document.getElementById('btnFree').addEventListener('click', ()=>{ document.getElementById('free').scrollIntoView({behavior:'smooth'}); });
document.getElementById('btnStore').addEventListener('click', ()=>{ const sess = getSession(); if(!sess){ alert('سجل دخول لعرض المتجر'); return; } document.getElementById('store').scrollIntoView({behavior:'smooth'}); });

// init default data & UI
(function init(){
  DATA = loadData();
  if(!DATA.admin) DATA.admin = { user:'Vee', pass:'411' };
  saveData(DATA);
  renderFree();
  renderPaid();
  updateUI();
})();
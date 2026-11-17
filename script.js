const $ = id => document.getElementById(id);
const store = {
  patients: JSON.parse(localStorage.getItem('cp_patients') || '[]'),
  doctors: JSON.parse(localStorage.getItem('cp_doctors') || '[]'),
  appointments: JSON.parse(localStorage.getItem('cp_appointments') || '[]'),
  bills: JSON.parse(localStorage.getItem('cp_bills') || '[]')
};
let editing = null, currentType = '';
const configs = {
  patients: {title:'Patient', id:'patientId', fields:[
    ['name','Full Name','text',true],['age','Age','number',true],['gender','Gender','select',['Male','Female','Other']],['phone','Phone Number','tel',true],['blood','Blood Group','select',['A+','A-','B+','B-','AB+','AB-','O+','O-']],['address','Address','text',false,true]
  ]},
  doctors: {title:'Doctor', id:'doctorId', fields:[
    ['name','Full Name','text',true],['specialty','Specialization','text',true],['phone','Phone Number','tel',true],['fee','Consultation Fee (₹)','number',true]
  ]},
  appointments: {title:'Appointment', id:'appointmentId', fields:[
    ['patient','Patient','patient',true],['doctor','Doctor','doctor',true],['date','Appointment Date','date',true],['time','Appointment Time','time',true],['status','Status','select',['Scheduled','Completed','Pending','Cancelled']]
  ]},
  bills: {title:'Bill', id:'billId', fields:[
    ['patient','Patient','patient',true],['description','Description','text',true],['date','Bill Date','date',true],['amount','Amount (₹)','number',true],['status','Payment Status','select',['Paid','Unpaid']]
  ]}
};
function save(){Object.keys(store).forEach(k=>localStorage.setItem('cp_'+k,JSON.stringify(store[k])));render();}
function uid(prefix){return prefix+'-'+String(Date.now()).slice(-6);}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN');}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function emptyRow(cols,msg='No records found.'){return `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;}
function status(s){return `<span class="status ${esc(s)}">${esc(s)}</span>`;}
function actions(type,id){return `<button class="action-btn" onclick="editRecord('${type}','${id}')">Edit</button><button class="action-btn delete" onclick="deleteRecord('${type}','${id}')">Delete</button>`;}
function render(){
  $('stat-patients').textContent=store.patients.length;
  $('stat-doctors').textContent=store.doctors.length;
  $('stat-appointments').textContent=store.appointments.length;
  const revenue=store.bills.filter(b=>b.status==='Paid').reduce((a,b)=>a+Number(b.amount),0);
  $('stat-revenue').textContent=money(revenue);
  $('billing-revenue').textContent=money(revenue);$('billing-count').textContent=store.bills.length;
  $('patients-table').innerHTML=filtered('patients','patient-search',p=>`<tr><td>${esc(p.patientId)}</td><td><strong>${esc(p.name)}</strong></td><td>${esc(p.age)}</td><td>${esc(p.gender)}</td><td>${esc(p.phone)}</td><td>${esc(p.blood||'-')}</td><td>${actions('patients',p.patientId)}</td></tr>`,7);
  $('doctors-table').innerHTML=filtered('doctors','doctor-search',d=>`<tr><td>${esc(d.doctorId)}</td><td><strong>${esc(d.name)}</strong></td><td>${esc(d.specialty)}</td><td>${esc(d.phone)}</td><td>${money(d.fee)}</td><td>${actions('doctors',d.doctorId)}</td></tr>`,6);
  $('appointments-table').innerHTML=filtered('appointments','appointment-search',a=>`<tr><td>${esc(a.appointmentId)}</td><td><strong>${esc(a.patient)}</strong></td><td>${esc(a.doctor)}</td><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${status(a.status)}</td><td>${actions('appointments',a.appointmentId)}</td></tr>`,7);
  $('billing-table').innerHTML=store.bills.length?store.bills.map(b=>`<tr><td>${esc(b.billId)}</td><td><strong>${esc(b.patient)}</strong></td><td>${esc(b.description)}</td><td>${esc(b.date)}</td><td>${money(b.amount)}</td><td>${status(b.status)}</td><td>${actions('bills',b.billId)}</td></tr>`).join(''):emptyRow(7);
  const recent=[...store.appointments].slice(-5).reverse();
  $('recent-appointments').innerHTML=recent.length?recent.map(a=>`<tr><td><strong>${esc(a.patient)}</strong></td><td>${esc(a.doctor)}</td><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${status(a.status)}</td></tr>`).join(''):emptyRow(5,'No appointments yet. Add your first appointment.');
}
function filtered(type,inputId,template,cols){const q=$(inputId).value.toLowerCase();const rows=store[type].filter(x=>Object.values(x).join(' ').toLowerCase().includes(q));return rows.length?rows.map(template).join(''):emptyRow(cols);}
function showPage(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('page-title').textContent=name[0].toUpperCase()+name.slice(1);window.scrollTo(0,0);}
document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));
function openModal(type,item=null){
  currentType=type;editing=item?item[configs[type].id]:null;
  const c=configs[type];$('modal-title').textContent=(item?'Edit ':'Add ')+c.title;
  $('form-fields').innerHTML=c.fields.map(([key,label,kind,extra,full])=>{
    let control='';
    if(kind==='select'){control=`<select name="${key}" ${extra?'required':''}>${extra.map(v=>`<option>${v}</option>`).join('')}</select>`;}
    else if(kind==='patient'||kind==='doctor'){
      const options=store[kind==='patient'?'patients':'doctors'].map(x=>x.name);
      control=`<select name="${key}" required>${options.map(v=>`<option>${esc(v)}</option>`).join('')}</select>`;
    } else control=`<input name="${key}" type="${kind}" ${extra===true?'required':''} ${kind==='number'?'min="0"':''}>`;
    return `<div class="field ${full?'full':''}"><label>${label}</label>${control}</div>`;
  }).join('');
  if(item)Object.entries(item).forEach(([k,v])=>{const el=$('form-fields').querySelector(`[name="${k}"]`);if(el)el.value=v;});
  $('record-dialog').showModal();
}
function closeModal(){$('record-dialog').close();}
$('add-patient').onclick=()=>openModal('patients');$('add-doctor').onclick=()=>openModal('doctors');$('add-appointment').onclick=()=>{if(!store.patients.length||!store.doctors.length){toast('Add at least one patient and doctor first.');return;}openModal('appointments');};$('add-bill').onclick=()=>{if(!store.patients.length){toast('Add a patient before creating a bill.');return;}openModal('bills');};
$('close-modal').onclick=closeModal;$('cancel-modal').onclick=closeModal;
$('record-form').addEventListener('submit',e=>{
  e.preventDefault();const c=configs[currentType],data=Object.fromEntries(new FormData(e.target).entries());
  if(currentType==='appointments'&&!store.doctors.some(d=>d.name===data.doctor)){toast('Please select a valid doctor.');return;}
  if(currentType==='appointments'&&!store.patients.some(p=>p.name===data.patient)){toast('Please select a valid patient.');return;}
  if(editing){const idx=store[currentType].findIndex(x=>x[c.id]===editing);store[currentType][idx]={...store[currentType][idx],...data};}
  else store[currentType].push({[c.id]:uid(currentType.slice(0,-1).toUpperCase()),...data});
  save();closeModal();e.target.reset();toast(c.title+' saved successfully.');
});
window.editRecord=(type,id)=>{const item=store[type].find(x=>x[configs[type].id]===id);openModal(type,item);};
window.deleteRecord=(type,id)=>{if(!confirm('Are you sure you want to delete this record?'))return;store[type]=store[type].filter(x=>x[configs[type].id]!==id);save();toast('Record deleted.');};
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2400);}
['patient-search','doctor-search','appointment-search'].forEach(id=>$(id).addEventListener('input',render));
$('today').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
render();

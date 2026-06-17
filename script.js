// Personal Work & Salary Tracker - Vanilla JS
const el = id => document.getElementById(id);
const fmt = v => v.toLocaleString('uz-UZ', {style:'currency',currency:'UZS',maximumFractionDigits:0});

// ---------- Settings & Data ----------
function loadSettings(){
    const raw = localStorage.getItem('pws_settings');
    if(raw) return JSON.parse(raw);
    return { monthlySalary: 3000000, workingDays: 22, theme: 'light' };
}
function saveSettings(s){ localStorage.setItem('pws_settings', JSON.stringify(s)); }

function monthKey(y,m){ return `pws_month_${y}_${String(m).padStart(2,'0')}`; }
function loadMonthData(y,m){ const r=localStorage.getItem(monthKey(y,m)); return r?JSON.parse(r):{}; }
function saveMonthData(y,m,d){ localStorage.setItem(monthKey(y,m), JSON.stringify(d)); }

// Ishlab chiqarish uchun alohida storage
function prodKey(y,m){ return `pws_prod_${y}_${String(m).padStart(2,'0')}`; }
function loadProdData(y,m){ const r=localStorage.getItem(prodKey(y,m)); return r?JSON.parse(r):{}; }
function saveProdData(y,m,d){ localStorage.setItem(prodKey(y,m), JSON.stringify(d)); }

// ---------- App State ----------
const state = {
    today: new Date(),
    viewYear: null,
    viewMonth: null,
    selectedDay: null,
    settings: loadSettings(),
    monthData: {},
    prodData: {},
    bottomOpen: false,
    profile: {
        name: localStorage.getItem('pws_userName') || '+ yaratish',
        img: localStorage.getItem('pws_userImg') || ''
    }
};

// ---------- KALENDAR ----------
function renderMonth(){
    const {viewYear, viewMonth, monthData, prodData} = state;
    const calendar = el('calendar');
    if(!calendar) return;
    calendar.innerHTML = '';

    const dows = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'];
    dows.forEach(d=>{
        const h=document.createElement('div'); h.className='dow'; h.textContent=d; calendar.appendChild(h);
    });

    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startDow    = new Date(viewYear, viewMonth-1, 1).getDay();

    for(let i=0;i<startDow;i++){
        const c=document.createElement('div'); c.className='cell empty'; calendar.appendChild(c);
    }

    for(let d=1;d<=daysInMonth;d++){
        const c=document.createElement('div'); c.className='cell'; c.dataset.day=d;
        if(state.selectedDay===d) c.classList.add('selected');

        const dateSpan=document.createElement('div'); dateSpan.className='date'; dateSpan.textContent=d;
        c.appendChild(dateSpan);

        const val=monthData[d];
        if(val===1) c.classList.add('full');
        else if(val===0.5) c.classList.add('half');
        else if(val===0) c.classList.add('off');

        const small=document.createElement('small');
        small.textContent=(val==null)?'':fmt(calcDailyEarning(val));
        c.appendChild(small);

        // Ishlab chiqarish nuqtasi
        if(hasProd(prodData[d])){
            const dot=document.createElement('span'); dot.className='prod-dot'; c.appendChild(dot);
        }

        c.addEventListener('click',()=>{
            state.selectedDay=d;
            document.querySelectorAll('.cell').forEach(x=>x.classList.remove('selected'));
            c.classList.add('selected');
            openDayModal(d);
        });
        calendar.appendChild(c);
    }

    el('monthLabelCenter').textContent=new Date(viewYear,viewMonth-1,1)
        .toLocaleString('uz-UZ',{month:'long',year:'numeric'});
    renderStats();
}

function hasProd(dp){
    if(!dp) return false;
    if(dp.plita && dp.plita.length>0) return true;
    if(dp.blok  && dp.blok.count>0)  return true;
    if(dp.kalods && dp.kalods.length>0) return true;
    if(dp.krishka && dp.krishka.length>0) return true;
    return false;
}

// ---------- STATS ----------
function renderStats(){
    const {settings, monthData} = state;
    let full=0,half=0,off=0,totalEarned=0,totalWorked=0;
    for(const k in monthData){
        const v=Number(monthData[k]);
        if(v===1){full++;totalWorked+=1;}
        else if(v===0.5){half++;totalWorked+=0.5;}
        else if(v===0){off++;}
        totalEarned+=(v||0)*safeDaily(settings);
    }
    if(el('statOpshi')) el('statOpshi').textContent=totalWorked;
    if(el('statFull'))  el('statFull').textContent=full;
    if(el('statHalf'))  el('statHalf').textContent=half;
    if(el('statOff'))   el('statOff').textContent=off;
    if(el('statEarned')) el('statEarned').textContent=fmt(totalEarned);

    const daysInMonth=new Date(state.viewYear,state.viewMonth,0).getDate();
    const pct=Math.min(100,Math.round((totalWorked/daysInMonth)*100));
    if(el('progressFill'))      el('progressFill').style.width=pct+'%';
    if(el('progressIndicator')) el('progressIndicator').style.left=pct+'%';
    if(el('progressPercent'))   el('progressPercent').textContent=pct+'%';

    if(state.bottomOpen) renderBottomPanel();
}

function safeDaily(s){
    return Number(s.monthlySalary||0)/new Date(state.viewYear,state.viewMonth,0).getDate();
}
function calcDailyEarning(v){ return v==null?0:v*safeDaily(state.settings); }

// ---------- EXPAND PANEL ----------
function toggleBottomPanel(){
    state.bottomOpen=!state.bottomOpen;
    const panel=el('bottomExpandPanel'), arrow=el('expandArrow');
    if(!panel) return;
    if(state.bottomOpen){
        renderBottomPanel();
        panel.style.maxHeight=panel.scrollHeight+400+'px';
        panel.style.opacity='1';
        if(arrow) arrow.style.transform='rotate(180deg)';
    } else {
        panel.style.maxHeight='0';
        panel.style.opacity='0';
        if(arrow) arrow.style.transform='rotate(0deg)';
    }
}

function renderBottomPanel(){
    const panel=el('bottomExpandPanel');
    if(!panel) return;
    const {monthData,prodData}=state;
    let full=0,half=0,off=0,total=0;
    for(const k in monthData){
        const v=Number(monthData[k]);
        if(v===1){full++;total+=1;} else if(v===0.5){half++;total+=0.5;} else if(v===0){off++;}
    }
    const t=calcProdTotals(prodData);
    const hasP=t.plita>0||t.blok>0||t.kalods>0||t.krishka>0;

    panel.innerHTML=`
      <div class="expand-inner">
        <div class="expand-badges">
          <span class="badge opshi">Umumiy: <strong>${total}</strong></span>
          <span class="badge full">To'liq: <strong>${full}</strong></span>
          <span class="badge half">Yarim: <strong>${half}</strong></span>
          <span class="badge off">Dam: <strong>${off}</strong></span>
        </div>
        ${hasP?`
        <div class="expand-prod-chips">
          ${t.plita >0?`<span class="prod-chip">P: <strong>${t.plita}</strong></span>`:''}
          ${t.blok  >0?`<span class="prod-chip">B: <strong>${t.blok}</strong></span>`:''}
          ${t.kalods>0?`<span class="prod-chip">K: <strong>${t.kalods}</strong></span>`:''}
          ${t.krishka>0?`<span class="prod-chip">Kr: <strong>${t.krishka}</strong></span>`:''}
        </div>
        <button class="expand-detail-btn" onclick="showProdDetailModal()">Batafsil ko'rish</button>
        `:`<p class="expand-no-prod">Bu oyda ishlab chiqarish ma'lumoti yo'q</p>`}
      </div>`;
    if(state.bottomOpen) panel.style.maxHeight=panel.scrollHeight+100+'px';
}

function calcProdTotals(pd){
    let plita=0,blok=0,kalods=0,krishka=0;
    for(const d in pd){
        const dp=pd[d];
        if(dp.plita)  dp.plita.forEach(i=>plita+=Number(i.count)||0);
        if(dp.blok)   blok+=Number(dp.blok.count)||0;
        if(dp.kalods) dp.kalods.forEach(i=>kalods+=Number(i.count)||0);
        if(dp.krishka)dp.krishka.forEach(i=>krishka+=Number(i.count)||0);
    }
    return {plita,blok,kalods,krishka};
}

// ---------- KUN MODALI ----------
function openDayModal(day){
    const modal=el('dayModal'); if(!modal) return;
    const mn=new Date(state.viewYear,state.viewMonth-1,1).toLocaleString('uz-UZ',{month:'long'});
    el('dayModalTitle').textContent=`${day}-${mn}`;
    renderDayTypeButtons(day);
    renderProdSection(day);
    modal.classList.remove('hidden');
    modal.style.display='flex';
}
function closeDayModal(){
    const m=el('dayModal'); if(m){m.style.display='none';m.classList.add('hidden');}
}

function renderDayTypeButtons(day){
    const cont=el('dayTypeButtons'); if(!cont) return;
    const cur=state.monthData[day];
    const types=[
        {val:0,   label:'Dam',    cls:'btn-day-off'},
        {val:0.5, label:'Yarim',  cls:'btn-day-half'},
        {val:1,   label:"To'liq", cls:'btn-day-full'},
    ];
    cont.innerHTML='';
    types.forEach(t=>{
        const b=document.createElement('button');
        b.className=`day-type-btn ${t.cls} ${cur===t.val?'active':''}`;
        b.textContent=t.label;
        b.onclick=()=>{
            state.monthData[day]=t.val;
            saveMonthData(state.viewYear,state.viewMonth,state.monthData);
            renderMonth();
            renderDayTypeButtons(day);
        };
        cont.appendChild(b);
    });
}

// ---------- ISHLAB CHIQARISH BO'LIMI ----------

function renderProdSection(day){
    const cont=el('productionSection'); if(!cont) return;
    const dp=state.prodData[day]||{};
    cont.innerHTML=
        renderPlitaBlock(day,dp.plita||[]) +
        renderBlokBlock(day,dp.blok||{count:''}) +
        renderKalodsBlock(day,dp.kalods||[]) +
        renderKrishkaBlock(day,dp.krishka||[]);
}

// --- PLITA: uzunlik x [1.2m | 1m] = dona ---
function renderPlitaBlock(day,items){
    const rows=items.map((it,i)=>`
      <div class="prod-row">
        <input class="prod-inp prod-len" type="number" placeholder="Uzunlik"
          value="${it.length||''}" step="0.1" min="0"
          oninput="updPlita(${day},${i},'length',this.value)">
        <div class="prod-width-btns">
          <button class="width-btn ${it.width==='1.2'?'active':''}"
            onclick="updPlita(${day},${i},'width','1.2')">1.2m</button>
          <button class="width-btn ${it.width==='1'?'active':''}"
            onclick="updPlita(${day},${i},'width','1')">1m</button>
        </div>
        <span class="prod-eq">=</span>
        <input class="prod-inp prod-cnt" type="number" placeholder="Dona"
          value="${it.count||''}" min="0"
          oninput="updPlita(${day},${i},'count',this.value)">
        <button class="prod-del" onclick="delPlita(${day},${i})">✕</button>
      </div>`).join('');
    return `
      <div class="prod-cat-block">
        <div class="prod-cat-head">
          <span class="prod-cat-ico">🧱</span>
          <span class="prod-cat-name">Plita</span>
          <button class="prod-add-btn" onclick="addPlita(${day})">+ Qo'shish</button>
        </div>
        <div class="prod-rows">${rows}</div>
      </div>`;
}
function addPlita(day){
    if(!state.prodData[day]) state.prodData[day]={};
    if(!state.prodData[day].plita) state.prodData[day].plita=[];
    state.prodData[day].plita.push({length:'',width:'1.2',count:''});
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}
function updPlita(day,i,f,v){
    if(!state.prodData[day]||!state.prodData[day].plita) return;
    state.prodData[day].plita[i][f]=v;
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    if(f==='width') renderProdSection(day);
    renderMonth();
}
function delPlita(day,i){
    state.prodData[day].plita.splice(i,1);
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}

// --- BLOK: faqat soni (razmer yo'q) ---
function renderBlokBlock(day,blok){
    return `
      <div class="prod-cat-block">
        <div class="prod-cat-head">
          <span class="prod-cat-ico">🪨</span>
          <span class="prod-cat-name">Blok</span>
        </div>
        <div class="prod-rows">
          <div class="prod-row prod-row-blok">
            <span class="blok-label">Soni:</span>
            <input class="prod-inp prod-blok-cnt" type="number" placeholder="Dona"
              value="${blok.count||''}" min="0"
              oninput="updBlok(${day},this.value)">
          </div>
        </div>
      </div>`;
}
function updBlok(day,v){
    if(!state.prodData[day]) state.prodData[day]={};
    state.prodData[day].blok={count:v};
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderMonth();
}

// --- KALODS: uzunlik x [1.5m | 1m] = dona ---
function renderKalodsBlock(day,items){
    const rows=items.map((it,i)=>`
      <div class="prod-row">
        <input class="prod-inp prod-len" type="number" placeholder="Uzunlik"
          value="${it.length||''}" step="0.1" min="0"
          oninput="updKalods(${day},${i},'length',this.value)">
        <div class="prod-width-btns">
          <button class="width-btn ${it.width==='1.5'?'active':''}"
            onclick="updKalods(${day},${i},'width','1.5')">1.5m</button>
          <button class="width-btn ${it.width==='1'?'active':''}"
            onclick="updKalods(${day},${i},'width','1')">1m</button>
        </div>
        <span class="prod-eq">=</span>
        <input class="prod-inp prod-cnt" type="number" placeholder="Dona"
          value="${it.count||''}" min="0"
          oninput="updKalods(${day},${i},'count',this.value)">
        <button class="prod-del" onclick="delKalods(${day},${i})">✕</button>
      </div>`).join('');
    return `
      <div class="prod-cat-block">
        <div class="prod-cat-head">
          <span class="prod-cat-ico">⬛</span>
          <span class="prod-cat-name">Kalods</span>
          <button class="prod-add-btn" onclick="addKalods(${day})">+ Qo'shish</button>
        </div>
        <div class="prod-rows">${rows}</div>
      </div>`;
}
function addKalods(day){
    if(!state.prodData[day]) state.prodData[day]={};
    if(!state.prodData[day].kalods) state.prodData[day].kalods=[];
    state.prodData[day].kalods.push({length:'',width:'1.5',count:''});
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}
function updKalods(day,i,f,v){
    if(!state.prodData[day]||!state.prodData[day].kalods) return;
    state.prodData[day].kalods[i][f]=v;
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    if(f==='width') renderProdSection(day);
    renderMonth();
}
function delKalods(day,i){
    state.prodData[day].kalods.splice(i,1);
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}

// --- KRISHKA: [1.5m | 1m] = dona (uzunlik YO'Q) ---
function renderKrishkaBlock(day,items){
    const rows=items.map((it,i)=>`
      <div class="prod-row">
        <div class="prod-width-btns">
          <button class="width-btn ${it.width==='1.5'?'active':''}"
            onclick="updKrishka(${day},${i},'width','1.5')">1.5m</button>
          <button class="width-btn ${it.width==='1'?'active':''}"
            onclick="updKrishka(${day},${i},'width','1')">1m</button>
        </div>
        <span class="prod-eq">=</span>
        <input class="prod-inp prod-cnt" type="number" placeholder="Dona"
          value="${it.count||''}" min="0"
          oninput="updKrishka(${day},${i},'count',this.value)">
        <button class="prod-del" onclick="delKrishka(${day},${i})">✕</button>
      </div>`).join('');
    return `
      <div class="prod-cat-block">
        <div class="prod-cat-head">
          <span class="prod-cat-ico">🔲</span>
          <span class="prod-cat-name">Krishka</span>
          <button class="prod-add-btn" onclick="addKrishka(${day})">+ Qo'shish</button>
        </div>
        <div class="prod-rows">${rows}</div>
      </div>`;
}
function addKrishka(day){
    if(!state.prodData[day]) state.prodData[day]={};
    if(!state.prodData[day].krishka) state.prodData[day].krishka=[];
    state.prodData[day].krishka.push({width:'1.5',count:''});
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}
function updKrishka(day,i,f,v){
    if(!state.prodData[day]||!state.prodData[day].krishka) return;
    state.prodData[day].krishka[i][f]=v;
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    if(f==='width') renderProdSection(day);
    renderMonth();
}
function delKrishka(day,i){
    state.prodData[day].krishka.splice(i,1);
    saveProdData(state.viewYear,state.viewMonth,state.prodData);
    renderProdSection(day); renderMonth();
}

// ---------- BATAFSIL MODAL ----------
function showProdDetailModal(){
    const modal=el('prodDetailModal'), body=el('prodDetailBody');
    if(!modal||!body) return;
    const mn=new Date(state.viewYear,state.viewMonth-1,1).toLocaleString('uz-UZ',{month:'long'});
    el('prodDetailTitle').textContent=`${mn} — Ishlab chiqarish`;

    const days=Object.keys(state.prodData).map(Number).sort((a,b)=>b-a);
    if(!days.length){
        body.innerHTML='<p style="text-align:center;color:var(--muted);padding:20px">Ma\'lumot yo\'q</p>';
    } else {
        body.innerHTML=days.map(day=>{
            const dp=state.prodData[day]; let html='';
            if(dp.plita&&dp.plita.length){
                const rows=dp.plita.filter(i=>i.count).map(i=>`${i.length||'?'}\xd7${i.width}=${i.count}`).join('   ');
                const tot=dp.plita.reduce((s,i)=>s+(Number(i.count)||0),0);
                if(rows) html+=`<div class="det-row"><span class="det-name">🧱 P:</span><span class="det-vals">${rows}</span><span class="det-tot">Jami: ${tot}</span></div>`;
            }
            if(dp.blok&&dp.blok.count){
                html+=`<div class="det-row"><span class="det-name">🪨 B:</span><span class="det-vals">${dp.blok.count} dona</span><span class="det-tot">Jami: ${dp.blok.count}</span></div>`;
            }
            if(dp.kalods&&dp.kalods.length){
                const rows=dp.kalods.filter(i=>i.count).map(i=>`${i.length||'?'}\xd7${i.width}=${i.count}`).join('   ');
                const tot=dp.kalods.reduce((s,i)=>s+(Number(i.count)||0),0);
                if(rows) html+=`<div class="det-row"><span class="det-name">⬛ K:</span><span class="det-vals">${rows}</span><span class="det-tot">Jami: ${tot}</span></div>`;
            }
            if(dp.krishka&&dp.krishka.length){
                const rows=dp.krishka.filter(i=>i.count).map(i=>`${i.width}=${i.count}`).join('   ');
                const tot=dp.krishka.reduce((s,i)=>s+(Number(i.count)||0),0);
                if(rows) html+=`<div class="det-row"><span class="det-name">🔲 Kr:</span><span class="det-vals">${rows}</span><span class="det-tot">Jami: ${tot}</span></div>`;
            }
            if(!html) return '';
            return `<div class="det-day-block"><div class="det-day-head">${day}-${mn}</div>${html}</div>`;
        }).filter(Boolean).join('');
    }
    modal.classList.remove('hidden'); modal.style.display='flex';
}
function closeProdDetailModal(){
    const m=el('prodDetailModal'); if(m){m.style.display='none';m.classList.add('hidden');}
}

// ---------- OYLIK STATISTIKA — P: B: K: Kr: chips ----------
function showFullStatistics(){
    const modal=el('statsModal'), list=el('statsList');
    if(!modal||!list) return;
    list.innerHTML='';

    let keys=[];
    for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k.startsWith('pws_month_')) keys.push(k);
    }
    keys.sort().reverse();

    if(!keys.length){
        list.innerHTML='<p style="text-align:center;padding:20px;color:var(--muted);">Hozircha ma\'lumot yo\'q.</p>';
    }

    keys.forEach(key=>{
        const data=JSON.parse(localStorage.getItem(key));
        const [,,yS,mS]=key.split('_');
        const year=parseInt(yS), month=parseInt(mS);

        let totalWorked=0, totalOff=0;
        Object.values(data).forEach(v=>{
            const n=Number(v);
            if(n===1) totalWorked+=1;
            else if(n===0.5) totalWorked+=0.5;
            else if(n===0) totalOff++;
        });

        if(!Object.keys(data).length) return;

        const mn=new Date(year,month-1).toLocaleString('uz-UZ',{month:'long'});
        const capMn=mn.charAt(0).toUpperCase()+mn.slice(1);
        const daily=state.settings.monthlySalary/new Date(year,month,0).getDate();
        const earned=totalWorked*daily;

        // Bu oyning ishlab chiqarish totallari
        const pd=loadProdData(year,month);
        const t=calcProdTotals(pd);
        const hasP=t.plita>0||t.blok>0||t.kalods>0||t.krishka>0;

        // === 1-RASM O'ZGARISHI: emoji o'rniga P: B: K: Kr: ===
        const prodChips=hasP?`
          <div class="stat-prod-row">
            ${t.plita >0?`<span class="stat-prod-chip">P: ${t.plita}</span>`:''}
            ${t.blok  >0?`<span class="stat-prod-chip">B: ${t.blok}</span>`:''}
            ${t.kalods>0?`<span class="stat-prod-chip">K: ${t.kalods}</span>`:''}
            ${t.krishka>0?`<span class="stat-prod-chip">Kr: ${t.krishka}</span>`:''}
          </div>`:''

        const item=document.createElement('div');
        item.className='stat-item';
        item.onclick=()=>{
            state.viewYear=year; state.viewMonth=month; state.selectedDay=null;
            state.monthData=loadMonthData(year,month);
            state.prodData=loadProdData(year,month);
            renderMonth(); renderCalendar(); closeStatsModal();
        };
        item.innerHTML=`
          <div class="stat-row-top">
            <span>${capMn} ${year}-yil</span>
            <span class="stat-salary">${fmt(earned)}</span>
          </div>
          <div class="stat-row-bottom">
            <span>Ish: <strong>${totalWorked} kun</strong></span>
            <span>Dam: <strong>${totalOff} kun</strong></span>
          </div>
          ${prodChips}`;
        list.appendChild(item);
    });

    modal.style.display='flex'; modal.classList.remove('hidden');
}
function closeStatsModal(){
    const m=el('statsModal'); if(m){m.style.display='none';m.classList.add('hidden');}
}

// ---------- SETTINGS, THEME, NAV ----------
function setSelectedValue(value){
    if(!state.selectedDay) return alert("Avval taqvimdan kunni tanlang!");
    state.monthData[state.selectedDay]=Number(value);
    saveMonthData(state.viewYear,state.viewMonth,state.monthData);
    renderMonth();
}

function formatNumberInput(v){ return v.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,' '); }

function bindSettings(){
    const s=el('monthlySalary'); if(!s) return;
    if(state.settings.monthlySalary) s.value=formatNumberInput(state.settings.monthlySalary.toString());
    s.addEventListener('input',e=>{
        const raw=e.target.value.replace(/\s/g,'');
        e.target.value=formatNumberInput(raw);
        state.settings.monthlySalary=Number(raw)||0;
        saveSettings(state.settings); renderStats(); renderMonth();
    });
}

function bindActions(){
    el('prevMonth2').addEventListener('click',()=>{
        state.viewMonth--;
        if(state.viewMonth<1){state.viewMonth=12;state.viewYear--;}
        state.selectedDay=null;
        state.monthData=loadMonthData(state.viewYear,state.viewMonth);
        state.prodData=loadProdData(state.viewYear,state.viewMonth);
        collapsePanel();
        renderMonth(); renderCalendar();
    });
    el('nextMonth2').addEventListener('click',()=>{
        state.viewMonth++;
        if(state.viewMonth>12){state.viewMonth=1;state.viewYear++;}
        state.selectedDay=null;
        state.monthData=loadMonthData(state.viewYear,state.viewMonth);
        state.prodData=loadProdData(state.viewYear,state.viewMonth);
        collapsePanel();
        renderMonth(); renderCalendar();
    });

    document.querySelectorAll('.action').forEach(b=>{
        b.addEventListener('click',()=>setSelectedValue(b.dataset.value));
    });

    el('themeToggle').addEventListener('click',toggleTheme);

    const expandBtn=el('expandBtn');
    if(expandBtn) expandBtn.addEventListener('click',toggleBottomPanel);

    const closeDayBtn=el('closeDayModal');
    if(closeDayBtn) closeDayBtn.addEventListener('click',closeDayModal);

    const closeProdBtn=el('closeProdDetailModal');
    if(closeProdBtn) closeProdBtn.addEventListener('click',closeProdDetailModal);

    window.addEventListener('click',e=>{
        if(e.target===el('statsModal')) closeStatsModal();
        if(e.target===el('dayModal'))   closeDayModal();
        if(e.target===el('prodDetailModal')) closeProdDetailModal();
    });
}

function collapsePanel(){
    state.bottomOpen=false;
    const p=el('bottomExpandPanel'),a=el('expandArrow');
    if(p){p.style.maxHeight='0';p.style.opacity='0';}
    if(a) a.style.transform='rotate(0deg)';
}

function applyTheme(){
    if(state.settings.theme==='dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
}
function toggleTheme(){
    state.settings.theme=state.settings.theme==='dark'?'light':'dark';
    saveSettings(state.settings); applyTheme();
}

function renderCalendar(){
    const label=el('monthLabelCenter'); if(!label) return;
    const now=new Date(), vM=state.viewMonth, vY=state.viewYear;
    const mn=new Date(vY,vM-1,1).toLocaleString('uz-UZ',{month:'long'});
    if(vM===(now.getMonth()+1)&&vY===now.getFullYear()){
        label.innerText=`${now.getDate()}-${mn}, ${vY}`;
    } else {
        label.innerText=`${mn.charAt(0).toUpperCase()+mn.slice(1)}, ${vY}`;
    }
}

document.getElementById('imageInput').onchange=function(e){
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{ el('imagePreview').src=ev.target.result; el('previewContainer').style.display='block'; el('labelText').textContent=file.name; };
    r.readAsDataURL(file);
};

function setupProfile(){
    const modal=el('profileModal'),trigger=el('profileTrigger'),
          saveBtn=el('saveProfile'),closeBtn=el('closeModal'),
          nameInp=el('nameInput'),imgInp=el('imageInput');

    const sn=localStorage.getItem('pws_userName');
    const si=localStorage.getItem('userImg');
    if(sn){el('userNameDisplay').textContent=sn; nameInp.value=sn;}
    if(si) el('userImg').src=si;

    trigger.onclick=()=>{modal.classList.remove('hidden');modal.style.display='flex';};
    const hide=()=>{modal.classList.add('hidden');modal.style.display='none';};
    closeBtn.onclick=hide;
    saveBtn.onclick=()=>{
        if(nameInp.value.trim()){localStorage.setItem('pws_userName',nameInp.value.trim());el('userNameDisplay').textContent=nameInp.value.trim();}
        const file=imgInp.files[0];
        if(file){ const r=new FileReader(); r.onloadend=()=>{localStorage.setItem('userImg',r.result);el('userImg').src=r.result;hide();}; r.readAsDataURL(file); }
        else hide();
    };
}

function init(){
    state.viewYear=state.today.getFullYear();
    state.viewMonth=state.today.getMonth()+1;
    state.monthData=loadMonthData(state.viewYear,state.viewMonth);
    state.prodData=loadProdData(state.viewYear,state.viewMonth);
    bindSettings(); bindActions(); applyTheme(); renderMonth(); setupProfile(); renderCalendar();
}

document.addEventListener('DOMContentLoaded',init);

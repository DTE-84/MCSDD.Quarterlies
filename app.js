// ─────────────────────────────────────────────
//  Quarterly Pro | MCSDD Compliance Engine
//  app.js v1.6 — High-Fidelity Satellite Node
//  © 2024-2026 DTE Solutions. All Rights Reserved.
// ─────────────────────────────────────────────

// ── Theme Management ──
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('quarterly_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('quarterly_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

let linkedPcsp = null;
let activeGoals = [];
let trackedServices = [];
let muiLog = [];
let prevQuarterNarrative = ""; 

// ── STAFF DIRECTORY (Relational Simulation) ──
const STAFF_DB = [
    { id: 1, name: "Cathy Arrowsmith", title: "Executive Director", email: "carrowsmith@mcsdd.com", isSupervisor: true },
    { id: 2, name: "Mahogany Wallis", title: "Support Coordination Supervisor", email: "mwallis@mcsdd.com", isSupervisor: true },
    { id: 3, name: "Suzanne Wear", title: "Support Coordinator II", email: "swear@mcsdd.com", isSupervisor: false, reportsTo: 2 },
    { id: 4, name: "Generic SC", title: "Support Coordinator I", email: "staff@mcsdd.com", isSupervisor: false, reportsTo: 2 }
];

// ── SERVICE DATABASE (2025 Missouri DD Standard) ──
const SERVICES_DB = [
    {"code": "H2015", "name": "Individualized Supported Living (ISL)", "unit": "15-min / Per Diem", "category": "Residential"},
    {"code": "T1019", "name": "Personal Assistant", "unit": "15-min", "category": "Personal Support"},
    {"code": "T2021", "name": "Day Habilitation", "unit": "15-min", "category": "Day Services"},
    {"code": "H2021", "name": "Community Networking", "unit": "15-min", "category": "Day Services"},
    {"code": "S0215", "name": "Transportation (Mileage)", "unit": "Per Mile", "category": "Transportation"},
    {"code": "T2003", "name": "Transportation (Public/Other)", "unit": "Per Trip", "category": "Transportation"},
    {"code": "T2022", "name": "Job Development", "unit": "Per Event / Hour", "category": "Employment"},
    {"code": "H2025", "name": "Supported Employment", "unit": "15-min", "category": "Employment"},
    {"code": "T2020", "name": "Shared Living (Host Home)", "unit": "Per Diem", "category": "Residential"},
    {"code": "S5150", "name": "Respite Care (In-Home)", "unit": "15-min", "category": "Crisis/Respite"},
    {"code": "T1005", "name": "Respite Care (Out-of-Home)", "unit": "15-min", "category": "Crisis/Respite"}
];

const MUI_CATEGORIES = [
    "Accidental Injury", "Aggressive Behavior", "Fall (with injury)", 
    "Medication Error", "Missing Person", "Physical/Verbal Abuse", "Unexplained Injury"
];

function init() {
    console.log("Quarterly Pro Engine v1.6: Online");
    initTheme();
    populateStaffSelection();
    updateUI();
}

function populateStaffSelection() {
    const scDropdown = document.getElementById('scName');
    if (!scDropdown) return;
    scDropdown.innerHTML = '<option value="">Select Coordinator...</option>' + 
        STAFF_DB.map(s => `<option value="${s.id}">${s.name} (${s.isSupervisor ? 'Supervisor' : 'SC'})</option>`).join("");
}

// ── SERVICE UTILIZATION ──
function addServiceRow() {
    trackedServices.push({
        id: Date.now(),
        serviceCode: "",
        auth: 0,
        used: 0,
        isTelehealth: false,
        varianceNote: ""
    });
    renderServices();
    updateUI();
}

function removeServiceRow(id) {
    trackedServices = trackedServices.filter(s => s.id !== id);
    renderServices();
    updateUI();
}

function updateServiceField(id, field, val) {
    const s = trackedServices.find(x => x.id === id);
    if (s) {
        if (field === 'auth' || field === 'used') {
            s[field] = parseFloat(val) || 0;
        } else if (field === 'isTelehealth') {
            s[field] = val;
        } else {
            s[field] = val;
        }
    }
    renderServices();
    updateUI();
}

function calculateVariance(auth, used) {
    if (!auth || auth == 0) return 0;
    return ((used - auth) / auth) * 100;
}

function renderServices() {
    const container = document.getElementById('utilizationContainer');
    if (!container) return;
    if (!trackedServices.length) {
        container.innerHTML = '<p class="section-hint">No services currently tracked for this quarter.</p>';
        return;
    }

    container.innerHTML = `
        <div class="utilization-grid-header" style="display: grid; grid-template-columns: 2.5fr 0.8fr 1fr 1fr 1fr 2fr auto; gap: 10px; margin-bottom: 10px; font-size: 10px; font-weight: 800; color: var(--text-label); text-transform: uppercase; align-items: center;">
            <div>Service / Code</div>
            <div style="text-align:center">GT</div>
            <div>Auth Units</div>
            <div>Used Units</div>
            <div>Remaining</div>
            <div>Variance/Justification</div>
            <div></div>
        </div>
    ` + trackedServices.map(s => {
        const serviceObj = SERVICES_DB.find(obj => obj.code === s.serviceCode);
        const remaining = (s.auth || 0) - (s.used || 0);
        const is15Min = serviceObj?.unit.includes("15-min");
        const hoursUsed = is15Min ? ((s.used || 0) / 4).toFixed(2) : null;
        const variance = calculateVariance(s.auth, s.used);
        const hasHighVariance = Math.abs(variance) >= 10;

        return `
        <div class="service-row" style="display: grid; grid-template-columns: 2.5fr 0.8fr 1fr 1fr 1fr 2fr auto; gap: 10px; margin-bottom: 10px; align-items: start;">
            <select onchange="updateServiceField(${s.id}, 'serviceCode', this.value)">
                <option value="">Select Service...</option>
                ${SERVICES_DB.map(obj => `
                    <option value="${obj.code}" ${s.serviceCode === obj.code ? 'selected' : ''}>${obj.name} (${obj.code})</option>
                `).join('')}
            </select>
            <div style="text-align:center; padding-top: 10px;">
                <input type="checkbox" ${s.isTelehealth ? 'checked' : ''} onchange="updateServiceField(${s.id}, 'isTelehealth', this.checked)" title="Telehealth GT Modifier">
            </div>
            <input type="number" value="${s.auth}" oninput="updateServiceField(${s.id}, 'auth', this.value)" placeholder="Auth">
            <div>
                <input type="number" value="${s.used}" oninput="updateServiceField(${s.id}, 'used', this.value)" placeholder="Used">
                ${hoursUsed ? `<div style="font-size: 9px; color: var(--primary); margin-top: 4px;">≈ ${hoursUsed} Hours</div>` : ''}
            </div>
            <div style="padding-top: 10px; font-weight: 700; color: ${remaining < 0 ? 'var(--danger)' : 'var(--success)'}; font-size: 13px; text-align: center;">
                ${remaining}
            </div>
            <textarea style="min-height: 40px; padding: 8px; font-size: 11px; border-color: ${hasHighVariance && !s.varianceNote ? 'var(--danger)' : 'var(--border)'}" 
                placeholder="Justification if >10% variance..." oninput="updateServiceField(${s.id}, 'varianceNote', this.value)">${s.varianceNote || ""}</textarea>
            <button class="remove-rep-btn" onclick="removeServiceRow(${s.id})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:18px; padding-top: 5px;">×</button>
        </div>
    `}).join("");
}

// ── MUI/UI LOG ENGINE ──
function addMuiEntry() {
    muiLog.push({
        id: Date.now(),
        category: "",
        occurrenceDate: "",
        discoveryDate: "",
        lateJustification: ""
    });
    renderMuiLog();
    updateUI();
}

function removeMuiEntry(id) {
    muiLog = muiLog.filter(m => m.id !== id);
    renderMuiLog();
    updateUI();
}

function updateMuiField(id, field, val) {
    const m = muiLog.find(x => x.id === id);
    if (m) {
        m[field] = val;
    }
    renderMuiLog();
    updateUI();
}

function renderMuiLog() {
    const container = document.getElementById('muiLogContainer');
    if (!container) return;
    if (!muiLog.length) {
        container.innerHTML = '<p class="section-hint">No MUIs or incidents logged this quarter.</p>';
        return;
    }

    container.innerHTML = muiLog.map(m => {
        const lateCheck = checkMUILateFiling(m.discoveryDate);
        return `
        <div class="outcome-card" style="border-left-color: var(--danger); background: rgba(255, 77, 77, 0.02);">
            <div class="rep-header" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <span class="outcome-domain" style="color: var(--danger)">INCIDENT LOG</span>
                <button onclick="removeMuiEntry(${m.id})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:18px;">×</button>
            </div>
            <div class="form-grid">
                <div class="field-group">
                    <label>Incident Category</label>
                    <select onchange="updateMuiField(${m.id}, 'category', this.value)">
                        <option value="">Select Category...</option>
                        ${MUI_CATEGORIES.map(cat => `<option value="${cat}" ${m.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="field-group">
                    <label>Date of Occurrence</label>
                    <input type="datetime-local" value="${m.occurrenceDate}" onchange="updateMuiField(${m.id}, 'occurrenceDate', this.value)">
                </div>
                <div class="field-group">
                    <label>Date of Discovery</label>
                    <input type="datetime-local" value="${m.discoveryDate}" onchange="updateMuiField(${m.id}, 'discoveryDate', this.value)">
                </div>
                ${lateCheck.isLate ? `
                <div class="field-group full" style="animation: fadeIn 0.3s ease;">
                    <label style="color: var(--danger)">⚠️ Late Filing Justification (Required >24hrs)</label>
                    <textarea style="border-color: var(--danger)" placeholder="${lateCheck.message}" oninput="updateMuiField(${m.id}, 'lateJustification', this.value)">${m.lateJustification}</textarea>
                </div>
                ` : ''}
            </div>
        </div>
    `}).join("");
}

// ── PCSP INGESTION ENGINE ──
function triggerPcspImport() {
    document.getElementById('pcspImport').click();
}

function handlePcspImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            processLinkedPcsp(data);
        } catch (err) {
            alert("Error: Corrupted PCSP signal detected.");
        }
    };
    reader.readAsText(file);
}

function processLinkedPcsp(data) {
    linkedPcsp = data;
    
    document.getElementById('display-name').textContent = (data.coverLegalName || "Unknown").toUpperCase();
    document.getElementById('display-dob').textContent = data.clientDOB || "—";
    document.getElementById('display-dmh').textContent = data.coverDmhID || "—";
    
    activeGoals = data._goalsData || [];
    renderOutcomes();
    
    if (data.coordinator) {
        const staff = STAFF_DB.find(s => s.name.toLowerCase().includes(data.coordinator.toLowerCase()));
        if (staff) {
            document.getElementById('scName').value = staff.id;
        }
    }
    
    updateUI();
}

function renderOutcomes() {
    const container = document.getElementById('outcomesContainer');
    if (!container) return;
    if (!activeGoals.length) {
        container.innerHTML = '<p class="section-hint">Linked PCSP contains no active goals in Section 17.</p>';
        return;
    }

    container.innerHTML = activeGoals.map((goal, idx) => `
        <div class="outcome-card">
            <div class="outcome-header">
                <span class="outcome-domain">${goal.domain || "Life Domain"}</span>
                <span class="ind-meta">Goal #${idx + 1}</span>
            </div>
            <div class="field-group full" style="margin-bottom: 20px;">
                <label>PCSP Defined Outcome</label>
                <div style="font-size: 14px; font-weight: 600; color: var(--primary);">${goal.goal}</div>
            </div>
            <div class="form-grid">
                <div class="field-group">
                    <label>Progress Status</label>
                    <select id="goal-status-${idx}" onchange="updateUI()">
                        <option value="Progressing">Progressing</option>
                        <option value="Goal Met">Goal Met</option>
                        <option value="Not Started">Not Started</option>
                        <option value="Barrier Encountered">Barrier Encountered</option>
                        <option value="Goal Discontinued">Goal Discontinued</option>
                    </select>
                </div>
                <div class="field-group">
                    <label>Action Step Ref</label>
                    <input type="text" id="goal-action-${idx}" placeholder="Specific step taken..." oninput="updateUI()">
                </div>
                <div class="field-group full">
                    <label>Supporting Narrative</label>
                    <textarea id="goal-note-${idx}" placeholder="Describe actions taken and results achieved..." oninput="updateUI()"></textarea>
                </div>
            </div>
        </div>
    `).join("");
}

// ── QUALITY AUDIT ENGINE ──
function runQualityAudit() {
    const flags = [];
    const getVal = (id) => document.getElementById(id)?.value || "";
    
    trackedServices.forEach((s) => {
        const variance = calculateVariance(s.auth, s.used);
        if (Math.abs(variance) >= 10 && !s.varianceNote.trim()) {
            const serviceObj = SERVICES_DB.find(obj => obj.code === s.serviceCode);
            flags.push(`<strong>Variance Alert:</strong> ${serviceObj ? serviceObj.name : "Service"} deviation is ${variance.toFixed(1)}%. Justification required.`);
        }
    });

    const redFlagWords = ["refused", "non-compliant", "uncooperative", "failed"];
    const allText = (getVal("successStory") + " " + getVal("healthSafetyNotes")).toLowerCase();
    if (redFlagWords.some(word => allText.includes(word))) {
        flags.push(`<strong>Tone Check:</strong> Compliance-based language detected ("Refused"). Consider using <em>"Declined"</em> or <em>"Expressed a preference for..."</em>`);
    }

    muiLog.forEach(m => {
        const late = checkMUILateFiling(m.discoveryDate);
        if (late.isLate && !m.lateJustification.trim()) {
            flags.push(`<strong>MUI Critical:</strong> Incident [${m.category}] was discovered >24 hours ago. Late filing justification is mandatory.`);
        }
    });

    const currentNarrative = getVal("successStory") + getVal("healthSafetyNotes");
    if (prevQuarterNarrative && currentNarrative) {
        const score = getNarrativeSimilarity(prevQuarterNarrative, currentNarrative);
        if (score > 0.85) {
            flags.push(`<strong>Rubber Stamping Alert:</strong> Narrative is ${(score * 100).toFixed(0)}% identical to previous data.`);
        }
    }

    if (linkedPcsp && linkedPcsp.clientDOB) {
        const age = calculateAge(linkedPcsp.clientDOB);
        if (age >= 16 && !document.getElementById('employDiscuss').checked) {
            flags.push(`<strong>Employment First:</strong> Individual is ${age}. Missouri mandates quarterly employment discussions for ages 16+.`);
        }
    }

    const panel = document.getElementById('auditPanel');
    const list = document.getElementById('auditFlags');
    if (panel && list) {
        if (flags.length > 0) {
            panel.style.display = 'block';
            list.innerHTML = flags.map(f => `<li>${f}</li>`).join("");
        } else {
            panel.style.display = 'none';
        }
    }
}

function checkMUILateFiling(discoveryDate) {
    if (!discoveryDate) return { isLate: false };
    const now = new Date();
    const discovery = new Date(discoveryDate);
    const hoursElapsed = (now - discovery) / (1000 * 60 * 60);
    if (hoursElapsed > 24) {
        return { isLate: true, message: `Missouri requires MUI notification within 24 hours of discovery.` };
    }
    return { isLate: false };
}

function getNarrativeSimilarity(oldText, newText) {
    const getWordSet = (str) => new Set(str.toLowerCase().match(/\b(\w+)\b/g));
    const wordsOld = getWordSet(oldText);
    const wordsNew = getWordSet(newText);
    if (wordsOld.size === 0 || wordsNew.size === 0) return 0;
    let commonCount = 0;
    wordsNew.forEach(word => { if (wordsOld.has(word)) commonCount++; });
    return commonCount / Math.min(wordsOld.size, wordsNew.size);
}

function calculateAge(dobString) {
    const birthday = new Date(dobString);
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs); 
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function updateUI() {
    const getVal = (id) => document.getElementById(id)?.value || "";
    const getCheck = (id) => document.getElementById(id)?.checked ? "YES" : "NO";
    
    const quarter = getVal("reviewQuarter");
    const date = getVal("visitDate");
    const location = getVal("visitLocation");
    const scId = getVal("scName");
    const backupStatus = document.querySelector('input[name="backupCheck"]:checked')?.value || "Not Verified";

    const selectedSc = STAFF_DB.find(s => s.id == scId);
    let supervisor = STAFF_DB.find(s => s.isSupervisor && s.id === 2); 
    if (selectedSc && selectedSc.reportsTo) {
        supervisor = STAFF_DB.find(s => s.id === selectedSc.reportsTo) || supervisor;
    }

    document.getElementById('display-quarter').textContent = quarter;
    document.getElementById('display-sc').textContent = selectedSc ? selectedSc.name : "—";

    let t = `MARION COUNTY SERVICES FOR THE DEVELOPMENTALLY DISABLED\n`;
    t += `12 Northport Plaza, Hannibal, MO 63401 | (573) 248-1077\n`;
    t += `QUARTERLY PROGRESS SUMMARY - 2025\n`;
    t += `═`.repeat(65) + `\n\n`;
    
    if (linkedPcsp) {
        t += `INDIVIDUAL: ${linkedPcsp.coverLegalName.toUpperCase()} | DMH ID: ${linkedPcsp.coverDmhID || "N/A"}\n`;
        t += `DATE OF BIRTH: ${linkedPcsp.clientDOB || "N/A"}\n`;
    }
    
    t += `REPORTING PERIOD: ${quarter} 2025\n`;
    t += `SUPPORT COORDINATOR: ${selectedSc ? selectedSc.name.toUpperCase() : "TBD"}\n`;
    t += `VISIT DATE: ${date || "TBD"} | LOCATION: ${location}\n\n`;

    t += `1. SERVICE UTILIZATION SUMMARY\n`;
    t += `─`.repeat(30) + `\n`;
    trackedServices.forEach(s => {
        const serviceObj = SERVICES_DB.find(obj => obj.code === s.serviceCode);
        const codeDisplay = s.serviceCode + (s.isTelehealth ? "-GT" : "");
        const remaining = (s.auth || 0) - (s.used || 0);
        t += `${serviceObj?.name || "Service"} (${codeDisplay}):\n`;
        t += `   Units: ${s.used} used / ${s.auth} authorized (Balance: ${remaining})\n`;
        if (serviceObj?.unit.includes("15-min")) t += `   Hours: ≈${(s.used / 4).toFixed(2)} delivered\n`;
        if (s.varianceNote) t += `   Variance Justification: ${s.varianceNote}\n`;
        t += `\n`;
    });

    t += `2. MUI/UI INCIDENT LOG\n`;
    t += `─`.repeat(30) + `\n`;
    if (muiLog.length) {
        muiLog.forEach(m => {
            t += `Category: ${m.category} | Occurred: ${m.occurrenceDate} | Discovered: ${m.discoveryDate}\n`;
            if (m.lateJustification) t += `   Late Filing Note: ${m.lateJustification}\n`;
        });
    } else {
        t += `No reportable incidents (MUI/UI) this period.\n`;
    }
    t += `\n`;

    t += `3. 2025 COMPLIANCE & HEALTH\n`;
    t += `─`.repeat(30) + `\n`;
    t += `Medication Changes: ${getCheck("medChange")} | Choice & Control: ${getCheck("choiceControl")}\n`;
    t += `Employment Discussed: ${getCheck("employDiscuss")}\n`;
    t += `Clinical Summary: ${getVal("healthSafetyNotes") || "No deviations."}\n\n`;

    t += `4. SUCCESS STORY OF THE QUARTER\n`;
    t += `─`.repeat(30) + `\n`;
    t += `${getVal("successStory") || "Pending integration note."}\n\n`;

    t += `5. GOAL & OUTCOME PROGRESS\n`;
    t += `─`.repeat(30) + `\n`;
    activeGoals.forEach((goal, idx) => {
        t += `[GOAL #${idx + 1}: ${goal.domain}]\n`;
        t += `Objective: ${goal.goal}\n`;
        t += `Status: ${getVal(`goal-status-${idx}`)} | Action: ${getVal(`goal-action-${idx}`)}\n`;
        t += `Narrative: ${getVal(`goal-note-${idx}`)}\n\n`;
    });

    t += `6. BACKUP VERIFICATION\n`;
    t += `─`.repeat(30) + `\n`;
    t += `Individualized Backup Plan Verified: ${backupStatus}\n\n`;

    t += `═`.repeat(65) + `\n`;
    t += `CERTIFICATION & SIGNATURE\n\n`;
    t += `"I certify that the services listed above were provided in accordance with the Individual's PCSP and that all documentation is true and accurate."\n\n`;
    t += `Provider Signature: ${getVal("signatureName") || "____________________"} Date: ${getVal("submissionDate") || "__________"}\n`;
    t += `Approval Signature (${supervisor.title}): ${supervisor.name}\n`;

    document.getElementById('narrativeDisplay').innerText = t;
    runQualityAudit();
}

function copyNarrative() {
    const text = document.getElementById('narrativeDisplay').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Compliance report copied."));
}

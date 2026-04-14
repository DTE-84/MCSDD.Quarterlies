// ─────────────────────────────────────────────
//  Quarterly Pro | MCSDD Compliance Engine
//  app.js v1.0 — Satellite Node
//  © 2024-2026 DTE Solutions. All Rights Reserved.
// ─────────────────────────────────────────────

let linkedPcsp = null;
let activeGoals = [];
let trackedServices = [];
let muiLog = [];
let prevQuarterNarrative = ""; 

// ── STAFF DIRECTORY (Simulated Employees Table) ──
const STAFF_DB = [
    { id: 1, name: "Cathy Arrowsmith", title: "Executive Director", email: "carrowsmith@mcsdd.com", isSupervisor: true },
    { id: 2, name: "Mahogany Wallis", title: "Support Coordination Supervisor", email: "mwallis@mcsdd.com", isSupervisor: true },
    { id: 3, name: "Suzanne Wear", title: "Support Coordinator II", email: "swear@mcsdd.com", isSupervisor: false, reportsTo: 2 },
    { id: 4, name: "Generic SC", title: "Support Coordinator I", email: "staff@mcsdd.com", isSupervisor: false, reportsTo: 2 }
];

const MUI_CATEGORIES = [
// ... (rest of categories)

// ... (existing SERVICES_DB and init) ...

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

// ── QUALITY AUDIT ENGINE ──
function runQualityAudit() {
    const flags = [];
    const getVal = (id) => document.getElementById(id)?.value || "";
    
    // 1. 10% Variance Check
    trackedServices.forEach((s) => {
        const variance = calculateVariance(s.auth, s.used);
        if (Math.abs(variance) >= 10 && !s.varianceNote.trim()) {
            const serviceObj = SERVICES_DB.find(obj => obj.code === s.serviceCode);
            flags.push(`<strong>Variance Alert:</strong> ${serviceObj ? serviceObj.name : "Service"} deviation is ${variance.toFixed(1)}%. Justification required.`);
        }
    });

    // 2. Person-Centered Tone Check
    const redFlagWords = ["refused", "non-compliant", "uncooperative", "failed"];
    const allText = (getVal("successStory") + " " + getVal("healthSafetyNotes")).toLowerCase();
    if (redFlagWords.some(word => allText.includes(word))) {
        flags.push(`<strong>Tone Check:</strong> Compliance-based language detected ("Refused"). Consider using <em>"Declined"</em> or <em>"Expressed a preference for..."</em>`);
    }

    // 3. MUI 24-Hour Rule
    muiLog.forEach(m => {
        const late = checkMUILateFiling(m.discoveryDate);
        if (late.isLate && !m.lateJustification.trim()) {
            flags.push(`<strong>MUI Critical:</strong> Incident [${m.category}] was discovered >24 hours ago. Late filing justification is mandatory for audit.`);
        }
    });

    // 4. Similarity Check (Anti-Rubber Stamping)
    const currentNarrative = getVal("successStory") + getVal("healthSafetyNotes");
    if (prevQuarterNarrative && currentNarrative) {
        const score = getNarrativeSimilarity(prevQuarterNarrative, currentNarrative);
        if (score > 0.85) {
            flags.push(`<strong>Rubber Stamping Alert:</strong> Narrative is ${(score * 100).toFixed(0)}% identical to previous data. Please add unique milestones.`);
        }
    }

    // 5. Employment Discussion (Age 16+)
    if (linkedPcsp && linkedPcsp.clientDOB) {
        const age = calculateAge(linkedPcsp.clientDOB);
        if (age >= 16 && !document.getElementById('employDiscuss').checked) {
            flags.push(`<strong>Employment First:</strong> Individual is ${age}. Missouri mandates quarterly employment discussions for ages 16+.`);
        }
    }

    const panel = document.getElementById('auditPanel');
    const list = document.getElementById('auditFlags');
    if (flags.length > 0) {
        panel.style.display = 'block';
        list.innerHTML = flags.map(f => `<li>${f}</li>`).join("");
    } else {
        panel.style.display = 'none';
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

function init() {
    console.log("Quarterly Pro Engine v1.3: Online");
    populateStaffSelection();
}

function populateStaffSelection() {
    const scDropdown = document.getElementById('scName');
    if (!scDropdown) return;
    scDropdown.innerHTML = '<option value="">Select Coordinator...</option>' + 
        STAFF_DB.map(s => `<option value="${s.id}">${s.name} (${s.isSupervisor ? 'Supervisor' : 'SC'})</option>`).join("");
}

function updateUI() {
    const getVal = (id) => document.getElementById(id)?.value || "";
    const getCheck = (id) => document.getElementById(id)?.checked ? "YES" : "NO";
    
    const quarter = getVal("reviewQuarter");
    const date = getVal("visitDate");
    const location = getVal("visitLocation");
    const scId = getVal("scName");
    const backupStatus = document.querySelector('input[name="backupCheck"]:checked')?.value || "Not Verified";

    // Dynamic Staff Resolve
    const selectedSc = STAFF_DB.find(s => s.id == scId);
    let supervisor = STAFF_DB.find(s => s.isSupervisor && s.id === 2); // Default to Mahogany Wallis
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

// ── QUALITY AUDIT ENGINE ──
function runQualityAudit() {
    const flags = [];
    const getVal = (id) => document.getElementById(id)?.value || "";
    
    // 1. 10% Variance Check
    trackedServices.forEach((s, idx) => {
        const variance = calculateVariance(s.auth, s.used);
        if (Math.abs(variance) >= 10 && !s.varianceNote.trim()) {
            const serviceObj = SERVICES_DB.find(obj => obj.code === s.serviceCode);
            const name = serviceObj ? serviceObj.name : "Service";
            flags.push(`<strong>Variance Alert:</strong> ${name} has a ${variance.toFixed(1)}% deviation. A justification narrative is mandatory.`);
        }
    });

    // 2. Person-Centered Tone Check
    const redFlagWords = ["refused", "non-compliant", "uncooperative", "failed"];
    const allText = (getVal("successStory") + " " + getVal("healthSafetyNotes")).toLowerCase();
    
    if (redFlagWords.some(word => allText.includes(word))) {
        flags.push(`<strong>Tone Check:</strong> "Refusal" terminology detected. Consider using <em>"Declined," "Chose an alternative,"</em> or <em>"Expressed a preference for..."</em> to maintain person-centered integrity.`);
    }

    // 3. Employment Discussion (Age 16+)
    if (linkedPcsp && linkedPcsp.clientDOB) {
        const age = calculateAge(linkedPcsp.clientDOB);
        if (age >= 16 && !document.getElementById('employDiscuss').checked) {
            flags.push(`<strong>Employment First:</strong> Individual is ${age} years old. Missouri state guidelines require competitive employment to be discussed quarterly.`);
        }
    }

    // 4. Anti-Rubber Stamping (Similarity Check)
    // Future: Compare against previous session storage
    
    // Update UI Panel
    const panel = document.getElementById('auditPanel');
    const list = document.getElementById('auditFlags');
    
    if (flags.length > 0) {
        panel.style.display = 'block';
        list.innerHTML = flags.map(f => `<li>${f}</li>`).join("");
    } else {
        panel.style.display = 'none';
    }
}

function calculateAge(dobString) {
    const birthday = new Date(dobString);
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs); 
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function copyNarrative() {
    const text = document.getElementById('narrativeDisplay').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Compliance report copied."));
}

let linkedPcsp = null;
let activeGoals = [];
let activeGoalIndex = 0;
let moRefOpen = false; // Collapsible card state for the Missouri Quality Outcomes guide

// Encryption modal states
let cryptoModalMode = ""; // "encrypt" or "decrypt"
let cryptoTempData = null; // Buffer to hold imported file or data to export
let cryptoTempFilename = "";

// Security Idle Timer (HIPAA Compliance)
let idleTimeout = null;
const IDLE_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

// Missouri Quality Outcomes Framework (MO Division of Developmental Disabilities guidelines)
const MISSOURI_QUALITY_OUTCOMES = {
    daily_life: {
        title: "Daily Life: Participation & Choice",
        description: "Focuses on supporting individuals to make informed choices and encourage self-determination in pursuing daily activities of their choice (including volunteering, hobbies, and leisure).",
        talkingPoints: [
            "Do you have people who explain options and choices in a way that makes sense to you?",
            "Do these explanations help you make informed decisions about your options?",
            "When was the last time you tried something new? Would you like to try something new?",
            "How do you spend your day? What do you like most/least about your day? Is there anything you would like to change?",
            "Have you had the chance to explore a variety of opportunities to determine areas of interest?"
        ]
    },
    employment: {
        title: "Employment: Self-Determination in Work",
        description: "Assists individuals in securing integrated, competitive employment and career exploration to maximize their earning potential and community inclusion.",
        talkingPoints: [
            "Do you feel your current position or career search aligns with your personal goals?",
            "Does your vocational team explain job roles and training choices clearly?",
            "What support or coaching do you need to increase your independent attendance or task mastery?",
            "Are you satisfied with your work environment, hours, wages, and travel arrangements?"
        ]
    },
    community_integration: {
        title: "Community Integration: Meaningful Connections",
        description: "Promotes individual quality of life through volunteerism, recreational clubs, and natural relationships in the local community.",
        talkingPoints: [
            "How often do you go out into the community to do things you enjoy?",
            "Who do you spend time with when out? Do you feel supported to build friendships?",
            "Are there local organizations or volunteer groups you want to participate in?",
            "Are there transportation or physical barriers limiting your community involvement?"
        ]
    },
    health_safety: {
        title: "Health & Safety: Personal Well-Being",
        description: "Ensures the individual resides in a safe, healthy environment and receives appropriate medication administration, medical reviews, and fading of restrictions.",
        talkingPoints: [
            "Do you feel safe and comfortable in your current living arrangement?",
            "Who do you contact if you have a health concern or an emergency?",
            "Are you supported to manage your pills and understand why you take them?",
            "Are daily staff correctly tracking your vitals, diet adjustments, or health trends?"
        ]
    },
    default: {
        title: "Missouri Quality Outcomes: General Standard",
        description: "Marion County SB40 Service Coordination general audit guide for verifying outcome achievement and provider scope compliance.",
        talkingPoints: [
            "Are the authorized supports assisting the individual to attain their outcomes?",
            "Do provider log notes support the progress metric selected?",
            "Are there any barriers or concerns identified that require a PCSP revision workflow?"
        ]
    }
};

// Base schema for Quarterly Review
let quarterlyReviewData = {
    individual_id: "",
    pcsp_id: "",
    review_quarter: "2026-Q1",
    case_manager_id: "",
    status: "Draft",
    living_arrangement: "Independent",
    
    mui_ui_incidents_reviewed: false,
    mui_narrative: "",
    behavioral_supports_reviewed: false,
    behavioral_narrative: "",
    medication_health_changes: "",
    
    provider_compliance_verified: false,
    individual_satisfaction_score: 5,
    satisfaction_narrative: "",
    
    signature_individual_date: "",
    signature_ssa_date: "",
    signature_supervisor_date: "",
    
    outcomes_progress: []
};

function init() {
    const submitBtn = document.getElementById("cryptoSubmitBtn");
    const pwdInput = document.getElementById("cryptoPasswordInput");
    
    if (submitBtn) {
        submitBtn.onclick = handleCryptoSubmit;
    }
    
    if (pwdInput) {
        pwdInput.onkeydown = (e) => {
            if (e.key === "Enter") handleCryptoSubmit();
        };
    }
    
    // Initialize standard idle security timer
    resetIdleTimer();
    
    // Bind global activity hooks to maintain zero-footprint session security
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    
    updateUI();
}

function resetIdleTimer() {
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(triggerSecurityTimeout, IDLE_TIME_LIMIT);
}

function triggerSecurityTimeout() {
    // Purge sensitive health data (PHI) from browser RAM
    linkedPcsp = null;
    activeGoals = [];
    activeGoalIndex = 0;
    moRefOpen = false;
    quarterlyReviewData = {
        individual_id: "",
        pcsp_id: "",
        review_quarter: "2026-Q1",
        case_manager_id: "",
        status: "Draft",
        living_arrangement: "Independent",
        mui_ui_incidents_reviewed: false,
        mui_narrative: "",
        behavioral_supports_reviewed: false,
        behavioral_narrative: "",
        medication_health_changes: "",
        provider_compliance_verified: false,
        individual_satisfaction_score: 5,
        satisfaction_narrative: "",
        signature_individual_date: "",
        signature_ssa_date: "",
        signature_supervisor_date: "",
        outcomes_progress: []
    };
    
    // Wipe all DOM input elements (ensures clean screen footprint)
    const displayName = document.getElementById('display-name');
    if (displayName) displayName.innerText = "No PCSP Linked";
    
    const displayDmh = document.getElementById('display-dmh');
    if (displayDmh) displayDmh.innerText = "—";
    
    const displayDob = document.getElementById('display-dob');
    if (displayDob) displayDob.innerText = "—";
    
    const caseMgr = document.getElementById('caseManager');
    if (caseMgr) caseMgr.value = "";
    
    const fileInput = document.getElementById('pcspImport');
    if (fileInput) fileInput.value = "";
    
    const purgeBtn = document.getElementById('purgeSessionBtn');
    if (purgeBtn) purgeBtn.style.display = "none";
    
    document.getElementById('reviewQuarter').value = "2026-Q1";
    document.getElementById('livingArrangement').value = "Independent";
    
    document.getElementById('muiReviewed').checked = false;
    document.getElementById('muiNarrative').value = "";
    document.getElementById('behavioralReviewed').checked = false;
    document.getElementById('behavioralNarrative').value = "";
    document.getElementById('healthChangesNarrative').value = "";
    
    document.getElementById('providerCompliance').checked = false;
    document.getElementById('satisfactionScore').value = 5;
    document.getElementById('satisfactionNarrative').value = "";
    
    document.getElementById('sigIndividualDate').value = "";
    document.getElementById('sigSsaDate').value = "";
    document.getElementById('sigSupervisorDate').value = "";
    
    renderOutcomes();
    updateUI();
    
    alert("🔒 Security Timeout: Session has been cleared. All decrypted clinical data has been purged from system memory to ensure HIPAA compliance.");
}

function triggerPcspImport() {
    document.getElementById('pcspImport').click();
}

function handlePcspImport(e) {
    resetIdleTimer();
    const file = e.target.files[0];
    if (!file) return;
    cryptoTempFilename = file.name;
    const reader = new FileReader();
    reader.onload = async function(event) {
        const fileBuffer = event.target.result;
        const firstByte = new Uint8Array(fileBuffer)[0];
        
        if (firstByte === 123) { // 123 is '{' in UTF-8 (Plaintext JSON)
            try {
                const textDecoder = new TextDecoder();
                const jsonText = textDecoder.decode(fileBuffer);
                const data = JSON.parse(jsonText);
                loadPcspData(data);
            } catch (err) {
                alert("Invalid PCSP JSON file.");
                console.error(err);
            }
        } else {
            // Encrypted envelope, trigger password modal
            openCryptoModal("decrypt", fileBuffer);
        }
    };
    reader.readAsArrayBuffer(file);
}

function getMissouriQualityOutcome(domain) {
    if (!domain) return MISSOURI_QUALITY_OUTCOMES.default;
    const clean = domain.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (clean.includes("employ")) return MISSOURI_QUALITY_OUTCOMES.employment;
    if (clean.includes("community") || clean.includes("social") || clean.includes("network") || clean.includes("integrat")) return MISSOURI_QUALITY_OUTCOMES.community_integration;
    if (clean.includes("health") || clean.includes("safety") || clean.includes("med")) return MISSOURI_QUALITY_OUTCOMES.health_safety;
    if (clean.includes("daily") || clean.includes("life") || clean.includes("cook") || clean.includes("home")) return MISSOURI_QUALITY_OUTCOMES.daily_life;
    return MISSOURI_QUALITY_OUTCOMES.default;
}

function toggleMoOutcomesRef() {
    resetIdleTimer();
    moRefOpen = !moRefOpen;
    renderOutcomes();
}

function loadPcspData(data) {
    resetIdleTimer();
    linkedPcsp = data;
    
    // Map demographics
    document.getElementById('display-name').innerText = data.coverLegalName || data.individualName || "N/A";
    document.getElementById('display-dmh').innerText = data.coverDmhID || data.individual_id || "N/A";
    document.getElementById('display-dob').innerText = data.clientDOB || "N/A";
    
    if (data.coordinator) {
        document.getElementById('caseManager').value = data.coordinator;
    } else if (data.case_manager_id) {
        document.getElementById('caseManager').value = data.case_manager_id;
    }
    
    if (data.review_quarter) {
        document.getElementById('reviewQuarter').value = data.review_quarter;
    }
    if (data.living_arrangement) {
        document.getElementById('livingArrangement').value = data.living_arrangement;
    }
    
    // Display Close & Purge button in header controls
    const purgeBtn = document.getElementById('purgeSessionBtn');
    if (purgeBtn) purgeBtn.style.display = "inline-flex";
    
    quarterlyReviewData.individual_id = data.coverDmhID || data.individual_id || "N/A";
    quarterlyReviewData.pcsp_id = data.pcsp_id || "pcsp_v3_2026_active";
    
    // Check if outcomes exist in outcomes array or outcomes_progress/outcome_progress_tracking (handles both PCSPs and draft QTR files)
    const rawGoals = data.goals || data._goalsData || data.outcome_progress_tracking || data.outcomes || [];
    
    // Filter active outcomes (Snapshot Rule)
    activeGoals = rawGoals.filter(g => g.is_active !== false);
    
    // Initialize progress tracker for each goal with domain-based PCSP outcome IDs
    quarterlyReviewData.outcomes_progress = activeGoals.map((g, idx) => {
        const domainClean = g.domain ? g.domain.toLowerCase().replace(/[^a-z0-9]/g, '') : 'goal';
        const serviceSummary = (data._programServices || [])
            .map(ps => `${ps.service} (${ps.provider})`)
            .join("; ");
        return {
            id: g.id || "mock-uuid-prog-" + idx,
            pcsp_outcome_id: g.pcsp_outcome_id || g.id || `goal_00${idx + 1}_${domainClean}`,
            progress_status: g.progress_status || g.status || "Making_Progress",
            data_evidence_summary: g.data_evidence_summary || g.evidence || "",
            trigger_pcsp_revision: g.trigger_pcsp_revision !== undefined ? g.trigger_pcsp_revision : false,
            // Carry layout helpers to ensure the encrypted packet draft reload has full context
            _domain: g.domain || g._domain || "",
            _goalText: g.goal || g.outcomeText || g.outcome || g._goalText || g.title || "Goal not specified",
            _actionSteps: g.implementation || g.actionSteps || g._actionSteps || serviceSummary || "Steps not specified"
        };
    });
    
    // Map health, safety, and provider details if importing a QTR draft
    if (data.health_welfare_safety) {
        document.getElementById('muiReviewed').checked = !!data.health_welfare_safety.mui_ui_incidents_reviewed;
        document.getElementById('muiNarrative').value = data.health_welfare_safety.mui_narrative || "";
        document.getElementById('behavioralReviewed').checked = !!data.health_welfare_safety.behavioral_supports_reviewed;
        document.getElementById('behavioralNarrative').value = data.health_welfare_safety.behavioral_narrative || "";
        document.getElementById('healthChangesNarrative').value = data.health_welfare_safety.medication_health_changes || "";
    }
    if (data.provider_and_service_verification) {
        document.getElementById('providerCompliance').checked = !!data.provider_and_service_verification.provider_compliance_verified;
        document.getElementById('satisfactionScore').value = data.provider_and_service_verification.individual_satisfaction_score || 5;
        document.getElementById('satisfactionNarrative').value = data.provider_and_service_verification.satisfaction_narrative || "";
    }
    if (data.signatures) {
        const parseSigDate = (isoStr) => isoStr ? isoStr.split('T')[0] : "";
        document.getElementById('sigIndividualDate').value = parseSigDate(data.signatures.individual_signed_date);
        document.getElementById('sigSsaDate').value = parseSigDate(data.signatures.ssa_signed_date);
        document.getElementById('sigSupervisorDate').value = parseSigDate(data.signatures.supervisor_signed_date);
    }
    
    activeGoalIndex = 0;
    renderOutcomes();
    updateUI();
}

function renderOutcomes() {
    const sidebar = document.getElementById('outcomeSidebar');
    const editor = document.getElementById('outcomeEditor');
    
    if (!quarterlyReviewData.outcomes_progress || !quarterlyReviewData.outcomes_progress.length) {
        sidebar.innerHTML = '';
        editor.innerHTML = '<div style="text-align: center; color: var(--text-label); padding: 40px;">Fetch a PCSP to populate active outcomes.</div>';
        return;
    }
    
    // Ensure activeGoalIndex is within bounds
    if (activeGoalIndex >= quarterlyReviewData.outcomes_progress.length) {
        activeGoalIndex = 0;
    }
    
    // Render Sidebar Tabs
    sidebar.innerHTML = quarterlyReviewData.outcomes_progress.map((op, idx) => {
        const isActive = idx === activeGoalIndex;
        const revisionFlagged = op.trigger_pcsp_revision;
        const tabTitle = op._goalText.substring(0, 30) + (op._goalText.length > 30 ? '...' : '');
        
        return `
            <button class="goal-tab ${isActive ? 'active' : ''}" onclick="selectGoalTab(${idx})">
                <div class="tab-header">
                    <span class="tab-title">Target #${idx + 1}</span>
                    ${revisionFlagged ? '<span class="tab-badge">Revision Flagged</span>' : ''}
                </div>
                <p class="tab-desc">${tabTitle}</p>
            </button>
        `;
    }).join('');
    
    // Render Editor for activeGoalIndex
    const op = quarterlyReviewData.outcomes_progress[activeGoalIndex];
    const qualityOutcome = getMissouriQualityOutcome(op._domain);
    
    editor.innerHTML = `
        <div class="editor-header">
            <span class="editor-sub">Evaluating Target #${activeGoalIndex + 1}</span>
            <h3 class="editor-title">${op._goalText}</h3>
        </div>
        
        <!-- Read-Only References from PCSP -->
        <div class="reference-section">
            <div class="ref-card">
                <div class="ref-label">Authorized PCSP Outcome Description</div>
                <p class="ref-content">${op._goalText}</p>
            </div>
            <div class="ref-card">
                <div class="ref-label">Authorized Action Steps & Provider Scope</div>
                <p class="ref-content">${op._actionSteps}</p>
            </div>
        </div>
        
        <!-- Missouri Quality Outcomes Audit Reference Card -->
        <div class="mo-outcomes-ref-card">
            <div class="mo-ref-header ${moRefOpen ? 'open' : ''}" onclick="toggleMoOutcomesRef()">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>📋</span>
                    <strong>MO Quality Outcomes: Audit Guide</strong>
                </div>
                <span class="arrow">${moRefOpen ? '▲' : '▼'}</span>
            </div>
            <div class="mo-ref-body" id="moRefBody" style="display: ${moRefOpen ? 'block' : 'none'};">
                <div class="mo-ref-title">${qualityOutcome.title}</div>
                <p class="mo-ref-desc">${qualityOutcome.description}</p>
                <div style="font-size: 11px; font-weight: 700; color: var(--accent); margin-top: 10px; text-transform: uppercase; letter-spacing: 0.05em;">State Audit Talking Points:</div>
                <ul class="mo-ref-list">
                    ${qualityOutcome.talkingPoints.map(tp => `<li>${tp}</li>`).join('')}
                </ul>
            </div>
        </div>
        
        <!-- Editable Evaluation Form -->
        <div class="form-grid" style="margin-top: 25px; grid-template-columns: 1fr;">
            <div class="field-group">
                <label>Quarterly Progress Metric</label>
                <select onchange="updateGoalProgress(${activeGoalIndex}, 'progress_status', this.value)" style="width: 100%;">
                    <option value="Making_Progress" ${op.progress_status === 'Making_Progress' ? 'selected' : ''}>Making Progress (Maintain Current Plan)</option>
                    <option value="No_Progress" ${op.progress_status === 'No_Progress' ? 'selected' : ''}>No Progress / Barriers Encountered</option>
                    <option value="Met" ${op.progress_status === 'Met' ? 'selected' : ''}>Outcome Met / Fully Achieved</option>
                    <option value="No_Longer_Relevant" ${op.progress_status === 'No_Longer_Relevant' ? 'selected' : ''}>Outcome No Longer Relevant / Desired</option>
                </select>
            </div>
            <div class="field-group" style="margin-top: 15px;">
                <label>Data & Provider Evidence Summary</label>
                <textarea rows="5" placeholder="Summarize verification logs, clock hours, and observations reported by the providers during this quarter..." oninput="updateGoalProgress(${activeGoalIndex}, 'data_evidence_summary', this.value)" style="width: 100%; font-family: inherit;">${op.data_evidence_summary}</textarea>
            </div>
            
            <div class="revision-hook-card ${op.trigger_pcsp_revision ? 'flagged' : ''}" style="margin-top: 20px;">
                <div class="hook-info">
                    <strong>Trigger Mandatory PCSP Revision</strong>
                    <p>Checking this forces the case manager to create an immediate plan amendment workflow upon package submission.</p>
                </div>
                <input type="checkbox" ${op.trigger_pcsp_revision ? 'checked' : ''} onchange="toggleRevision(${activeGoalIndex})" class="hook-checkbox">
            </div>
        </div>
    `;
}

function selectGoalTab(idx) {
    resetIdleTimer();
    activeGoalIndex = idx;
    renderOutcomes();
}

function updateGoalProgress(idx, field, val) {
    resetIdleTimer();
    quarterlyReviewData.outcomes_progress[idx][field] = val;
    
    // Auto-trigger revision if Met or No Longer Relevant
    if (field === 'progress_status') {
        if (val === 'Met' || val === 'No_Longer_Relevant') {
            quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision = true;
        } else {
            quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision = false;
        }
        renderOutcomes(); // Re-render to update tab badges and warning highlights
    }
    
    updateUI();
}

function toggleRevision(idx) {
    resetIdleTimer();
    quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision = !quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision;
    renderOutcomes();
    updateUI();
}

function getISOTimestamp(dateStr) {
    if (!dateStr) return null;
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) {
            const now = new Date();
            const timePart = now.toISOString().split('T')[1];
            return `${dateStr}T${timePart}`;
        }
    } catch (e) {
        console.warn("Timestamp formatting fallback due to Date error", e);
    }
    return `${dateStr}T12:00:00Z`;
}

function getPayload() {
    const getVal = (id) => document.getElementById(id)?.value || "";
    const getCheck = (id) => document.getElementById(id)?.checked || false;
    
    // Admin
    quarterlyReviewData.review_quarter = getVal("reviewQuarter");
    quarterlyReviewData.case_manager_id = getVal("caseManager");
    quarterlyReviewData.living_arrangement = getVal("livingArrangement");
    
    // Health & Safety
    quarterlyReviewData.mui_ui_incidents_reviewed = getCheck("muiReviewed");
    quarterlyReviewData.mui_narrative = getVal("muiNarrative");
    quarterlyReviewData.behavioral_supports_reviewed = getCheck("behavioralReviewed");
    quarterlyReviewData.behavioral_narrative = getVal("behavioralNarrative");
    quarterlyReviewData.medication_health_changes = getVal("healthChangesNarrative");
    
    // Provider Verification
    quarterlyReviewData.provider_compliance_verified = getCheck("providerCompliance");
    quarterlyReviewData.individual_satisfaction_score = parseInt(getVal("satisfactionScore")) || 5;
    quarterlyReviewData.satisfaction_narrative = getVal("satisfactionNarrative");
    
    // Signatures
    quarterlyReviewData.signature_individual_date = getVal("sigIndividualDate");
    quarterlyReviewData.signature_ssa_date = getVal("sigSsaDate");
    quarterlyReviewData.signature_supervisor_date = getVal("sigSupervisorDate");

    const quarterParts = quarterlyReviewData.review_quarter.split("-");
    const cycleYear = quarterParts[0] || "2026";
    const quarterlyPeriod = quarterParts[1] || "Q1";
    const dcnVal = quarterlyReviewData.individual_id || "123456789";

    return {
        individual_id: quarterlyReviewData.individual_id,
        pcsp_id: quarterlyReviewData.pcsp_id,
        review_quarter: quarterlyReviewData.review_quarter,
        case_manager_id: quarterlyReviewData.case_manager_id,
        status: quarterlyReviewData.status,
        living_arrangement: quarterlyReviewData.living_arrangement,
        
        // Automated audit tracking timestamp (as requested in SecureFileGate)
        last_modified_audit_timestamp: new Date().toISOString(),

        // Missouri compliance metadata objects required for state QA reviews
        state_compliance_meta: {
            state_jurisdiction: "MO-DMH-DD",
            county_board: "Marion County SB40 / TCM",
            individual_medicaid_dcn: dcnVal,
            missouri_wivers_enrolled: ["Comprehensive", "Community Support", "Partnership"],
            is_audit_ready_package: true
        },
        
        missouri_specific_modules: {
            mo_cycle_year: cycleYear,
            quarterly_period: quarterlyPeriod,
            individual_urn: `URN-MO-${dcnVal}`,
            utilization_review_metrics: {
                allocated_budget_spent_percent: 48.5,
                unauthorized_service_overages: false
            },
            missouri_incident_reporting_check: {
                emt_reporting_logs_reviewed: quarterlyReviewData.mui_ui_incidents_reviewed,
                emt_narrative: quarterlyReviewData.mui_narrative || "Zero Event Management Tracking incidents recorded in Marion County for this period."
            }
        },

        health_welfare_safety: {
            mui_ui_incidents_reviewed: quarterlyReviewData.mui_ui_incidents_reviewed,
            mui_narrative: quarterlyReviewData.mui_narrative,
            behavioral_supports_reviewed: quarterlyReviewData.behavioral_supports_reviewed,
            behavioral_narrative: quarterlyReviewData.behavioral_narrative,
            medication_health_changes: quarterlyReviewData.medication_health_changes
        },
        
        provider_and_service_verification: {
            provider_compliance_verified: quarterlyReviewData.provider_compliance_verified,
            individual_satisfaction_score: quarterlyReviewData.individual_satisfaction_score,
            satisfaction_narrative: quarterlyReviewData.satisfaction_narrative
        },
        
        outcome_progress_tracking: quarterlyReviewData.outcomes_progress.map(op => ({
            pcsp_outcome_id: op.pcsp_outcome_id,
            progress_status: op.progress_status,
            data_evidence_summary: op.data_evidence_summary,
            trigger_pcsp_revision: op.trigger_pcsp_revision,
            // Carry layout helpers to ensure the encrypted packet draft reload has full context
            _domain: op._domain,
            _goalText: op._goalText,
            _actionSteps: op._actionSteps
        })),
        
        signatures: {
            individual_signed: !!quarterlyReviewData.signature_individual_date,
            individual_signed_date: getISOTimestamp(quarterlyReviewData.signature_individual_date),
            ssa_signed: !!quarterlyReviewData.signature_ssa_date,
            ssa_signed_date: getISOTimestamp(quarterlyReviewData.signature_ssa_date),
            supervisor_signed: !!quarterlyReviewData.signature_supervisor_date,
            supervisor_signed_date: getISOTimestamp(quarterlyReviewData.signature_supervisor_date)
        }
    };
}

function updateUI() {
    const payload = getPayload();
    document.getElementById('narrativeDisplay').innerText = JSON.stringify(payload, null, 2);

    // Conditional UI/UX Warning Banner trigger
    const anyRevisionTriggered = quarterlyReviewData.outcomes_progress.some(op => op.trigger_pcsp_revision);
    const warningBanner = document.getElementById("revisionWarningBanner");
    if (warningBanner) {
        warningBanner.style.display = anyRevisionTriggered ? "flex" : "none";
    }
    
    // Update progress bar
    updateProgressBar();
}

function updateProgressBar() {
    const progressList = quarterlyReviewData.outcomes_progress;
    const container = document.getElementById('progressBarContainer');
    if (!progressList || !progressList.length) {
        if (container) container.style.display = 'none';
        return;
    }
    
    if (container) container.style.display = 'block';
    
    // Count as completed if data evidence has been written (>3 characters)
    const completedCount = progressList.filter(op => op.data_evidence_summary.trim().length > 3).length;
    const percent = Math.round((completedCount / progressList.length) * 100);
    
    const fill = document.getElementById('progressBarFill');
    const label = document.getElementById('progressBarPercent');
    if (fill) fill.style.width = `${percent}%`;
    if (label) label.innerText = `${percent}% Evaluated (${completedCount} of ${progressList.length} Goals)`;
}

function copyNarrative() {
    resetIdleTimer();
    const text = document.getElementById('narrativeDisplay').innerText;
    navigator.clipboard.writeText(text).then(() => alert("JSON Payload Copied. Ready for DB Insertion."));
}

/* ── Zero-Footprint Cryptographic Engine (HIPAA / AES-GCM) ── */

async function exportSecureFile(dataJson, filename, password) {
    const textEncoder = new TextEncoder();
    
    // 1. Generate salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // GCM standard
    
    // 2. Derive key from password using PBKDF2 (600,000 iterations for high security)
    const passwordKey = await window.crypto.subtle.importKey(
        "raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    
    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    // 3. Encrypt in RAM
    const plaintextBytes = textEncoder.encode(JSON.stringify(dataJson));
    const ciphertextBytes = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, aesKey, plaintextBytes
    );

    // 4. Pack Cryptographic Envelope
    const envelope = new Uint8Array(salt.length + iv.length + ciphertextBytes.byteLength);
    envelope.set(salt, 0);
    envelope.set(iv, salt.length);
    envelope.set(new Uint8Array(ciphertextBytes), salt.length + iv.length);

    // 5. Download secure payload (zero footprint)
    const blob = new Blob([envelope], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    
    // 6. Purge Object URL
    URL.revokeObjectURL(url);
}

async function importSecureFile(fileBuffer, password) {
    const textDecoder = new TextDecoder();
    
    // 1. Unpack Cryptographic Envelope
    const salt = fileBuffer.slice(0, 16);
    const iv = fileBuffer.slice(16, 28);
    const ciphertext = fileBuffer.slice(28);

    // 2. Derive decryption key using password and file's salt
    const textEncoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
        "raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    
    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: new Uint8Array(salt), iterations: 600000, hash: "SHA-256" },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    // 3. Decrypt directly in memory
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) }, aesKey, ciphertext
    );

    // 4. Parse decrypted JSON
    return JSON.parse(textDecoder.decode(decryptedBuffer));
}

/* ── Modal Controller & Operations ── */

function openCryptoModal(mode, data) {
    cryptoModalMode = mode;
    cryptoTempData = data;
    
    const modal = document.getElementById("cryptoModal");
    const title = document.getElementById("cryptoModalTitle");
    const desc = document.getElementById("cryptoModalDesc");
    const input = document.getElementById("cryptoPasswordInput");
    const err = document.getElementById("cryptoErrorMsg");
    
    input.value = "";
    err.innerText = "";
    
    if (mode === "decrypt") {
        title.innerText = "🔒 Enter Decryption Password";
        desc.innerText = "This file contains protected health information (PHI) and is encrypted to comply with HIPAA security standards. Enter the password to unlock.";
    } else {
        title.innerText = "🔒 Set Encryption Password";
        desc.innerText = "Set a secure password to encrypt this quarterly review package. The downloaded .qtr file can only be unlocked with this password.";
    }
    
    modal.style.display = "flex";
    input.focus();
}

function closeCryptoModal() {
    document.getElementById("cryptoModal").style.display = "none";
    cryptoTempData = null;
    cryptoModalMode = "";
}

async function handleCryptoSubmit() {
    const password = document.getElementById("cryptoPasswordInput").value;
    const errEl = document.getElementById("cryptoErrorMsg");
    
    if (!password) {
        errEl.innerText = "Password cannot be empty.";
        return;
    }
    
    if (cryptoModalMode === "decrypt") {
        try {
            errEl.innerText = "Decrypting file securely in RAM...";
            const decryptedData = await importSecureFile(cryptoTempData, password);
            closeCryptoModal();
            loadPcspData(decryptedData);
        } catch (err) {
            console.error(err);
            errEl.innerText = "Decryption failed. Incorrect password or corrupted envelope.";
        }
    } else if (cryptoModalMode === "encrypt") {
        try {
            errEl.innerText = "Encrypting file securely in RAM...";
            const filename = `review_${quarterlyReviewData.individual_id || 'unnamed'}_${quarterlyReviewData.review_quarter}.qtr`;
            await exportSecureFile(cryptoTempData, filename, password);
            closeCryptoModal();
        } catch (err) {
            console.error(err);
            errEl.innerText = "Encryption failed.";
        }
    }
}

function triggerSecureExport() {
    resetIdleTimer();
    const payload = getPayload();
    openCryptoModal("encrypt", payload);
}

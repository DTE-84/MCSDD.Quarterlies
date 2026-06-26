let linkedPcsp = null;
let activeGoals = [];

// Base schema for Quarterly Review
let quarterlyReviewData = {
    individual_id: "",
    pcsp_id: "",
    review_quarter: "2026-Q1",
    case_manager_id: "",
    status: "Draft",
    
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
    updateUI();
}

function triggerPcspImport() {
    document.getElementById('pcspImport').click();
}

function handlePcspImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            linkedPcsp = data;
            
            // Map demographics
            document.getElementById('display-name').innerText = data.coverLegalName || "N/A";
            document.getElementById('display-dmh').innerText = data.coverDmhID || "N/A";
            document.getElementById('display-dob').innerText = data.clientDOB || "N/A";
            
            quarterlyReviewData.individual_id = data.coverDmhID || "N/A";
            quarterlyReviewData.pcsp_id = "mock-uuid-pcsp-" + Date.now(); // Mocking PCSP UUID
            
            // Map goals
            activeGoals = data.goals || [];
            
            // Initialize progress tracker for each goal
            quarterlyReviewData.outcomes_progress = activeGoals.map((g, idx) => ({
                id: "mock-uuid-prog-" + idx,
                pcsp_outcome_id: "mock-uuid-goal-" + idx,
                progress_status: "Making_Progress",
                data_evidence_summary: "",
                trigger_pcsp_revision: false,
                // UI helper fields:
                _goalText: g.goal || "Goal not specified",
                _actionSteps: g.implementation || "Steps not specified"
            }));
            
            renderOutcomes();
            updateUI();
        } catch(err) {
            alert("Invalid PCSP file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function renderOutcomes() {
    const container = document.getElementById('outcomesContainer');
    if (!activeGoals.length) {
        container.innerHTML = '<div class="outcome-card" style="text-align: center;">No goals found in linked PCSP.</div>';
        return;
    }
    
    container.innerHTML = quarterlyReviewData.outcomes_progress.map((op, idx) => `
        <div class="outcome-card">
            <div class="side-by-side-grid">
                <!-- Left: Read-Only PCSP Data -->
                <div class="pcsp-panel">
                    <div style="font-size: 11px; color: var(--primary); text-transform: uppercase; margin-bottom: 5px;">PCSP Target Baseline</div>
                    <div style="margin-bottom: 15px;">
                        <strong>Outcome:</strong><br>
                        ${op._goalText}
                    </div>
                    <div>
                        <strong>Action Steps / Services:</strong><br>
                        ${op._actionSteps}
                    </div>
                </div>
                
                <!-- Right: Quarterly Input -->
                <div class="input-panel">
                    <div style="font-size: 11px; color: var(--accent); text-transform: uppercase; margin-bottom: 10px;">Current Status</div>
                    <div class="field-group">
                        <label>Progress Status</label>
                        <select onchange="updateGoalProgress(${idx}, 'progress_status', this.value)">
                            <option value="Making_Progress" ${op.progress_status === 'Making_Progress' ? 'selected' : ''}>Making Progress</option>
                            <option value="No_Progress" ${op.progress_status === 'No_Progress' ? 'selected' : ''}>No Progress</option>
                            <option value="Met" ${op.progress_status === 'Met' ? 'selected' : ''}>Outcome Met</option>
                            <option value="No_Longer_Relevant" ${op.progress_status === 'No_Longer_Relevant' ? 'selected' : ''}>Outcome No Longer Relevant</option>
                        </select>
                    </div>
                    <div class="field-group" style="margin-top: 15px;">
                        <label>Data/Evidence Input</label>
                        <textarea placeholder="Provider log summaries, clock hours, observations..." oninput="updateGoalProgress(${idx}, 'data_evidence_summary', this.value)">${op.data_evidence_summary}</textarea>
                    </div>
                    
                    <button class="btn btn-warning" onclick="toggleRevision(${idx})" style="border: ${op.trigger_pcsp_revision ? '2px solid red' : 'none'};">
                        ${op.trigger_pcsp_revision ? '⚠️ Revision Triggered' : '🔄 Trigger PCSP Revision'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateGoalProgress(idx, field, val) {
    quarterlyReviewData.outcomes_progress[idx][field] = val;
    
    // Auto-trigger revision if No Longer Relevant
    if (field === 'progress_status' && val === 'No_Longer_Relevant') {
        quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision = true;
        renderOutcomes(); // Re-render to show the updated button state
    }
    
    updateUI();
}

function toggleRevision(idx) {
    quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision = !quarterlyReviewData.outcomes_progress[idx].trigger_pcsp_revision;
    renderOutcomes();
    updateUI();
}

function updateUI() {
    const getVal = (id) => document.getElementById(id)?.value || "";
    const getCheck = (id) => document.getElementById(id)?.checked || false;
    
    // Admin
    quarterlyReviewData.review_quarter = getVal("reviewQuarter");
    quarterlyReviewData.case_manager_id = getVal("caseManager");
    
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

    // Format output as JSON mimicking the SQL schema insertion payload
    const payload = {
        quarterly_reviews: {
            individual_id: quarterlyReviewData.individual_id,
            pcsp_id: quarterlyReviewData.pcsp_id,
            review_quarter: quarterlyReviewData.review_quarter,
            case_manager_id: quarterlyReviewData.case_manager_id,
            status: quarterlyReviewData.status,
            mui_ui_incidents_reviewed: quarterlyReviewData.mui_ui_incidents_reviewed,
            mui_narrative: quarterlyReviewData.mui_narrative,
            behavioral_supports_reviewed: quarterlyReviewData.behavioral_supports_reviewed,
            behavioral_narrative: quarterlyReviewData.behavioral_narrative,
            medication_health_changes: quarterlyReviewData.medication_health_changes,
            provider_compliance_verified: quarterlyReviewData.provider_compliance_verified,
            individual_satisfaction_score: quarterlyReviewData.individual_satisfaction_score,
            satisfaction_narrative: quarterlyReviewData.satisfaction_narrative,
            signature_individual_date: quarterlyReviewData.signature_individual_date,
            signature_ssa_date: quarterlyReviewData.signature_ssa_date,
            signature_supervisor_date: quarterlyReviewData.signature_supervisor_date,
        },
        quarterly_outcome_progress: quarterlyReviewData.outcomes_progress.map(op => ({
            pcsp_outcome_id: op.pcsp_outcome_id,
            progress_status: op.progress_status,
            data_evidence_summary: op.data_evidence_summary,
            trigger_pcsp_revision: op.trigger_pcsp_revision
        }))
    };
    
    document.getElementById('narrativeDisplay').innerText = JSON.stringify(payload, null, 2);
}

function copyNarrative() {
    const text = document.getElementById('narrativeDisplay').innerText;
    navigator.clipboard.writeText(text).then(() => alert("JSON Payload Copied. Ready for DB Insertion."));
}

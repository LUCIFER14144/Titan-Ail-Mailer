import './index.css';
import { parseCSV } from './csvParser.js';

// --- Tab Switching Logic ---
const tabs = document.querySelectorAll('.nav-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
    });
});

// --- Helper: Show Result ---
function showResult(elementId, data, isError = false) {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    el.style.borderColor = isError ? '#ff4444' : '#333';
    el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

// --- CSV File Upload Handler ---
const csvFileInput = document.getElementById('csvFile');
csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    document.getElementById('recipientsInput').value = text;
});

// --- Bulk Sender Logic ---
const sendBulkBtn = document.getElementById('sendBulkBtn');
sendBulkBtn.addEventListener('click', async () => {
    const recipientsRaw = document.getElementById('recipientsInput').value.trim();
    const subjectTemplate = document.getElementById('subjectInput').value;
    const htmlTemplate = document.getElementById('htmlInput').value;

    if (!recipientsRaw) {
        return alert('Please provide recipients (CSV or text)');
    }

    try {
        // Parse CSV or JSON
        let recipients;
        if (recipientsRaw.startsWith('[')) {
            recipients = JSON.parse(recipientsRaw);
        } else {
            recipients = parseCSV(recipientsRaw);
        }

        sendBulkBtn.textContent = 'Sending...';
        sendBulkBtn.disabled = true;

        // Get SMTP config from localStorage
        const smtpConfigRaw = localStorage.getItem('smtpConfig');
        const smtpConfig = smtpConfigRaw ? JSON.parse(smtpConfigRaw) : null;

        const res = await fetch('/api/sendBulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipients,
                subjectTemplate,
                htmlTemplate,
                smtpConfig
            })
        });
        const data = await res.json();
        showResult('bulkResult', data, !res.ok);

        // Update analytics
        loadAnalytics();
    } catch (err) {
        showResult('bulkResult', 'Error: ' + err.message, true);
    } finally {
        sendBulkBtn.textContent = 'Send Campaign';
        sendBulkBtn.disabled = false;
    }
});

// --- SMTP Config Logic ---
const smtpProviderSelect = document.getElementById('smtpProvider');
smtpProviderSelect.addEventListener('change', () => {
    const isCustom = smtpProviderSelect.value === 'custom';
    document.getElementById('gmailConfig').style.display = isCustom ? 'none' : 'block';
    document.getElementById('customConfig').style.display = isCustom ? 'block' : 'none';
});

const saveSmtpBtn = document.getElementById('saveSmtpBtn');
saveSmtpBtn.addEventListener('click', () => {
    const provider = smtpProviderSelect.value;
    let config = {};

    if (provider === 'gmail') {
        config = {
            provider: 'gmail',
            user: document.getElementById('gmailUser').value,
            pass: document.getElementById('gmailPass').value
        };
    } else {
        config = {
            provider: 'custom',
            host: document.getElementById('smtpHost').value,
            port: document.getElementById('smtpPort').value,
            user: document.getElementById('smtpUser').value,
            pass: document.getElementById('smtpPassword').value,
            tls: document.getElementById('smtpTLS').checked
        };
    }

    // Save to localStorage (for MVP; in production, this would go to backend)
    localStorage.setItem('smtpConfig', JSON.stringify(config));
    showResult('smtpResult', 'SMTP Configuration saved successfully! (Note: In production, this should be saved server-side with encryption.)');
});

// --- AI Generator Logic ---
const generateAiBtn = document.getElementById('generateAiBtn');
generateAiBtn.addEventListener('click', async () => {
    const topic = document.getElementById('aiTopic').value;
    const tone = document.getElementById('aiTone').value;

    if (!topic) return alert('Please enter a topic');

    generateAiBtn.textContent = 'Generating...';
    generateAiBtn.disabled = true;

    try {
        const res = await fetch('/api/generateContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, tone })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('subjectInput').value = data.subject || '';
            document.getElementById('htmlInput').value = data.html || data.text || '';
            showResult('aiResult', 'Success! Content copied to Bulk Sender form.\\n\\n' + JSON.stringify(data, null, 2));
        } else {
            showResult('aiResult', data, true);
        }
    } catch (err) {
        showResult('aiResult', 'Error: ' + err.message, true);
    } finally {
        generateAiBtn.textContent = 'Generate Content';
        generateAiBtn.disabled = false;
    }
});

// --- Spam Checker Logic ---
const checkSpamBtn = document.getElementById('checkSpamBtn');
checkSpamBtn.addEventListener('click', async () => {
    const subject = document.getElementById('spamSubject').value;
    const html = document.getElementById('spamBody').value;

    checkSpamBtn.textContent = 'Checking...';
    checkSpamBtn.disabled = true;

    try {
        const res = await fetch('/api/checkSpam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, html })
        });
        const data = await res.json();
        showResult('spamResult', data, !res.ok);
    } catch (err) {
        showResult('spamResult', 'Error: ' + err.message, true);
    } finally {
        checkSpamBtn.textContent = 'Check Score';
        checkSpamBtn.disabled = false;
    }
});

// --- Analytics Logic ---
function loadAnalytics() {
    // For MVP, use localStorage. In production, fetch from backend API
    const stats = JSON.parse(localStorage.getItem('emailStats') || '{"sentToday":0,"failed":0}');
    document.getElementById('statSentToday').textContent = stats.sentToday || 0;
    document.getElementById('statFailed').textContent = stats.failed || 0;
}

const refreshStatsBtn = document.getElementById('refreshStatsBtn');
refreshStatsBtn.addEventListener('click', loadAnalytics);

// Load analytics on page load
loadAnalytics();

// --- HTML Converter Logic ---

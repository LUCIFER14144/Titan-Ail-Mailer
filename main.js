import './index.css';

// --- Tab Switching Logic ---
const tabs = document.querySelectorAll('.nav-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
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

// --- Bulk Sender Logic ---
const sendBulkBtn = document.getElementById('sendBulkBtn');
sendBulkBtn.addEventListener('click', async () => {
    const recipientsRaw = document.getElementById('recipientsInput').value;
    const subjectTemplate = document.getElementById('subjectInput').value;
    const htmlTemplate = document.getElementById('htmlInput').value;

    try {
        const recipients = JSON.parse(recipientsRaw);
        sendBulkBtn.textContent = 'Sending...';
        sendBulkBtn.disabled = true;

        const res = await fetch('/api/sendBulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients, subjectTemplate, htmlTemplate })
        });
        const data = await res.json();
        showResult('bulkResult', data, !res.ok);
    } catch (err) {
        showResult('bulkResult', 'Error: Invalid JSON or Network Issue\n' + err.message, true);
    } finally {
        sendBulkBtn.textContent = 'Send Campaign';
        sendBulkBtn.disabled = false;
    }
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

        // Auto-fill bulk form if successful
        if (res.ok) {
            document.getElementById('subjectInput').value = data.subject || '';
            document.getElementById('htmlInput').value = data.html || data.text || '';
            showResult('aiResult', 'Success! Content copied to Bulk Sender form.\n\n' + JSON.stringify(data, null, 2));
        } else {
            showResult('aiResult', data, true);
        }
    } catch (err) {
        showResult('aiResult', err.message, true);
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
        showResult('spamResult', err.message, true);
    } finally {
        checkSpamBtn.textContent = 'Check Score';
        checkSpamBtn.disabled = false;
    }
});

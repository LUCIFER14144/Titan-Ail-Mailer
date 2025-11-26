# Titan-Ail-Mailer - Enhanced Edition

Professional bulk email campaign tool with multiple SMTP support, HTML-to-PDF conversion, and deliverability optimization.

## 🚀 New Features

✅ **Multiple SMTP Rotation** - Round-robin between multiple email accounts  
✅ **HTML to PDF** - Direct HTML input converted to personalized PDF attachments  
✅ **Deliverability Optimization**  - Smart delays, spam checking, warm-up modes  
✅ **Automatic Failover** - Switches SMTP automatically if one fails

## Quick Start

### 1. Install Dependencies

Frontend:
```bash
npm install
```

Backend dependencies already in `api/package.json`

### 2. Configure SMTP

Option A: Via UI
- Go to "SMTP Config" tab
- Add Gmail or Custom SMTP
- Can add multiple accounts for rotation

Option B: Via Environment (Production)
```bash
# Create api/.env
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### 3. Run Locally

```bash
npm run dev
```

Or with Vercel:
```bash
vercel dev
```

### 4. Deploy to Vercel

```bash
vercel --prod
```

## 📧 Usage

1. **Add Recipients**: Paste CSV like `email,name,company,invoice,amount`
2. **Compose Email**: Use templates with `{{tags}}`
3. **Optional PDF**: Add HTML for personalized PDF attachment
4. **Configure Deliverability**: Set delays, warm-up mode
5. **Send**: Emails automatically rotate through your SMTP accounts

## 📊 Deliverability Tips

**For 90%+ Inbox Rate:**
- Configure SPF/DKIM/DMARC for your domain
- Use 2-5 second delays between emails
- Warm up new SMTP accounts gradually
- Avoid spam trigger words
- Personalize every email

**Gmail Setup:**
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password (not regular password)

## 🔧 Tech Stack

- **Frontend**: Vite + Vanilla JS
- **Backend**: Vercel Serverless Functions
- **Email**: Nodemailer with SMTP pool
- **PDF**: PDFKit

## 📁 Project Structure

```
├── index.html           # Main UI
├── main.js             # Frontend logic with deliverability support
├── index.css           # Styling
├── api/
│   ├── sendBulk.js            # Enhanced bulk sender with SMTP rotation
│   ├── testSmtp.js            # SMTP connection tester
│   ├── checkDeliverability.js # Content spam checker  
│   ├── checkSpam.js           # Basic spam check
│   ├── generateContent.js     # AI  content generator
│   └── utils/
│       ├── smtpPool.js        # SMTP rotation manager
│       ├── deliverability.js  # Deliverability helpers
│       └── mailer.js          # Email  sending utilities
```

## 🎯 Features

### Multiple SMTP Support
- Add unlimited SMTP accounts
- Automatic round-robin rotation
- Health tracking & automatic failover
- Load distribution across accounts

### HTML to PDF
- Direct HTML textarea input
- Supports {{tag}} personalization
- Auto-generated filenames
- Works with file upload too

### Deliverability
- Smart randomized delays (2-5s default)
- Warm-up mode for new accounts
- Spam score analysis
- Optimal email headers
- SPF/DKIM/DMARC guidance

## 📖 Documentation

See `walkthrough.md` for complete implementation details, testing guide, and best practices.

## 🔐 Security Note

⚠️ **Current Implementation**: SMTP credentials stored in browser localStorage (MVP)  
✅ **Production Recommendation**: Move to encrypted backend database

## License

© 2025 Titan-Ail-Mailer. All rights reserved.

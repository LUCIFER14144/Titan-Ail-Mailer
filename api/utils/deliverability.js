/**
 * Deliverability Optimization Utilities
 * Helps maximize email inbox placement through best practices
 */

/**
 * Calculate spam score for email content
 * Returns score from 0-100 (lower is better)
 */
export function calculateSpamScore(subject, html, text = '') {
    let score = 0;
    const content = (subject + ' ' + html + ' ' + text).toLowerCase();

    // Spam trigger words (weight: 5-15 points each)
    const spamTriggers = [
        { word: 'free', weight: 10 },
        { word: 'winner', weight: 15 },
        { word: 'congratulations', weight: 10 },
        { word: 'click here', weight: 15 },
        { word: 'urgent', weight: 10 },
        { word: 'act now', weight: 12 },
        { word: 'limited time', weight: 10 },
        { word: '100%', weight: 8 },
        { word: 'guarantee', weight: 8 },
        { word: 'risk-free', weight: 8 },
        { word: 'no obligation', weight: 7 },
        { word: 'order now', weight: 10 },
        { word: 'buy now', weight: 10 },
        { word: 'call now', weight: 10 },
        { word: 'subscribe', weight: 5 },
        { word: 'viagra', weight: 20 },
        { word: 'casino', weight: 15 },
        { word: 'lottery', weight: 15 },
        { word: 'credit', weight: 8 },
        { word: 'loan', weight: 8 },
        { word: 'debt', weight: 8 },
        { word: 'income', weight: 7 },
        { word: 'profit', weight: 7 },
        { word: 'investment', weight: 7 }
    ];

    spamTriggers.forEach(({ word, weight }) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
            score += weight * matches.length;
        }
    });

    // ALL CAPS check
    const capsWords = (subject + ' ' + html).match(/\b[A-Z]{4,}\b/g);
    if (capsWords && capsWords.length > 0) {
        score += capsWords.length * 5;
    }

    // Excessive exclamation marks
    const exclamationCount = content.match(/!/g)?.length || 0;
    if (exclamationCount > 3) {
        score += (exclamationCount - 3) * 3;
    }

    // Excessive dollar signs
    const dollarCount = content.match(/\$/g)?.length || 0;
    if (dollarCount > 2) {
        score += (dollarCount - 2) * 5;
    }

    // Subject line length (very short or very long)
    if (subject.length < 10) {
        score += 5;
    } else if (subject.length > 70) {
        score += 10;
    }

    // No plain text alternative
    if (html && !text) {
        score += 5;
    }

    // All links, no content
    const linkCount = (html.match(/<a /g) || []).length;
    const wordCount = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
    if (linkCount > 0 && wordCount < 50) {
        score += 15;
    }

    return Math.min(score, 100);
}

/**
 * Get optimization suggestions based on content analysis
 */
export function getOptimizationSuggestions(subject, html, text = '') {
    const suggestions = [];
    const score = calculateSpamScore(subject, html, text);

    if (score > 50) {
        suggestions.push({
            severity: 'high',
            message: 'High spam score detected. Review content for spam triggers.'
        });
    } else if (score > 30) {
        suggestions.push({
            severity: 'medium',
            message: 'Moderate spam score. Consider reducing promotional language.'
        });
    }

    // Check specific issues
    const content = (subject + ' ' + html + ' ' + text).toLowerCase();

    if (content.match(/\b(free|winner|congratulations)\b/gi)) {
        suggestions.push({
            severity: 'medium',
            message: 'Avoid words like "free", "winner", "congratulations" in subject/body'
        });
    }

    if (subject.match(/[A-Z]{4,}/)) {
        suggestions.push({
            severity: 'medium',
            message: 'Avoid ALL CAPS words in subject line'
        });
    }

    if ((subject.match(/!/g)?.length || 0) > 1) {
        suggestions.push({
            severity: 'low',
            message: 'Reduce exclamation marks in subject (max 1 recommended)'
        });
    }

    if (!text && html) {
        suggestions.push({
            severity: 'low',
            message: 'Add plain text alternative for better deliverability'
        });
    }

    if (subject.length > 60) {
        suggestions.push({
            severity: 'low',
            message: 'Subject line too long (60+ characters). Keep under 50 for mobile.'
        });
    }

    // Add positive feedback
    if (suggestions.length === 0) {
        suggestions.push({
            severity: 'success',
            message: 'Content looks good! Low spam score detected.'
        });
    }

    return suggestions;
}

/**
 * Calculate smart delay between emails with randomization
 */
export function calculateSmartDelay(config = {}) {
    const {
        minDelay = 1000,      // 1 second minimum
        maxDelay = 5000,      // 5 seconds maximum
        randomize = true,
        warmupMode = false
    } = config;

    // Warm-up mode: longer delays for new SMTP accounts
    if (warmupMode) {
        const warmupMin = Math.max(minDelay, 5000);  // At least 5 seconds
        const warmupMax = Math.max(maxDelay, 15000); // At least 15 seconds
        return Math.floor(Math.random() * (warmupMax - warmupMin + 1)) + warmupMin;
    }

    // Normal mode: randomized delay
    if (randomize) {
        return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    }

    // Fixed delay
    return minDelay;
}

/**
 * Generate warm-up schedule for new SMTP accounts
 * Returns daily sending limits for first 2 weeks
 */
export function generateWarmupSchedule(startingLimit = 10) {
    const schedule = [];
    let currentLimit = startingLimit;

    // Week 1: Gradual increase
    for (let day = 1; day <= 7; day++) {
        schedule.push({
            day,
            limit: Math.floor(currentLimit),
            recommendation: 'Send to most engaged recipients'
        });
        currentLimit *= 1.5; // Increase by 50% each day
    }

    // Week 2: Continue increasing
    for (let day = 8; day <= 14; day++) {
        schedule.push({
            day,
            limit: Math.floor(currentLimit),
            recommendation: 'Mix of engaged and new recipients'
        });
        currentLimit *= 1.3; // Increase by 30% each day
    }

    // Day 15+: Full capacity
    schedule.push({
        day: '15+',
        limit: 'Full capacity',
        recommendation: 'SMTP account fully warmed up'
    });

    return schedule;
}

/**
 * Validate email headers for deliverability
 */
export function generateOptimalHeaders(fromEmail, toEmail) {
    const domain = fromEmail.split('@')[1];
    const timestamp = Date.now();

    return {
        'From': fromEmail,
        'To': toEmail,
        'Message-ID': `<${timestamp}.${Math.random().toString(36).substr(2, 9)}@${domain}>`,
        'X-Mailer': 'Titan-Ail-Mailer',
        'X-Priority': '3',
        'Importance': 'Normal',
        'MIME-Version': '1.0'
    };
}

/**
 * Check if rate limit should be applied
 */
export function shouldThrottle(smtpStats, limits = {}) {
    const {
        emailsPerHour = 50,
        emailsPerDay = 500,
        currentHourCount = 0,
        currentDayCount = 0
    } = limits;

    if (currentHourCount >= emailsPerHour) {
        return {
            shouldWait: true,
            reason: 'Hourly limit reached',
            waitTime: 3600000 // 1 hour in ms
        };
    }

    if (currentDayCount >= emailsPerDay) {
        return {
            shouldWait: true,
            reason: 'Daily limit reached',
            waitTime: 86400000 // 24 hours in ms
        };
    }

    return {
        shouldWait: false,
        reason: null,
        waitTime: 0
    };
}

/**
 * Simple SPF/DKIM/DMARC validation guidance
 */
export function getAuthenticationGuidance(domain) {
    return {
        spf: {
            description: 'SPF (Sender Policy Framework) - Verifies sender IP is authorized',
            setup: `Add TXT record to ${domain}: "v=spf1 include:_spf.google.com ~all" (for Gmail)`,
            check: `Use online tools like MXToolbox or dig TXT ${domain}`
        },
        dkim: {
            description: 'DKIM (DomainKeys Identified Mail) - Cryptographic email signature',
            setup: 'Generate DKIM keys in your email provider (e.g., Gmail Admin Console)',
            check: 'Send test email and check email headers for DKIM-Signature'
        },
        dmarc: {
            description: 'DMARC (Domain-based Message Authentication) - Policy for SPF/DKIM failures',
            setup: `Add TXT record: "_dmarc.${domain}" with value "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"`,
            check: `Use online DMARC checker or dig TXT _dmarc.${domain}`
        }
    };
}

export default {
    calculateSpamScore,
    getOptimizationSuggestions,
    calculateSmartDelay,
    generateWarmupSchedule,
    generateOptimalHeaders,
    shouldThrottle,
    getAuthenticationGuidance
};

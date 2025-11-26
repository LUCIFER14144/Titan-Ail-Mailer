import {
    calculateSpamScore,
    getOptimizationSuggestions,
    getAuthenticationGuidance
} from './utils/deliverability.js';

/**
 * Check Email Deliverability Endpoint
 * Analyzes content and provides optimization recommendations
 */
export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { subject, html, text, domain } = req.body;

    if (!subject && !html) {
        return res.status(400).json({
            error: 'At least subject or html content required'
        });
    }

    try {
        // Calculate spam score
        const spamScore = calculateSpamScore(subject || '', html || '', text || '');

        // Get optimization suggestions
        const suggestions = getOptimizationSuggestions(subject || '', html || '', text || '');

        // Determine overall grade
        let grade = 'A';
        if (spamScore > 50) {
            grade = 'F';
        } else if (spamScore > 30) {
            grade = 'D';
        } else if (spamScore > 20) {
            grade = 'C';
        } else if (spamScore > 10) {
            grade = 'B';
        }

        // Get authentication guidance if domain provided
        let authenticationGuidance = null;
        if (domain) {
            authenticationGuidance = getAuthenticationGuidance(domain);
        }

        return res.status(200).json({
            success: true,
            analysis: {
                spamScore,
                grade,
                verdict: spamScore < 10 ? 'Excellent' :
                    spamScore < 20 ? 'Good' :
                        spamScore < 30 ? 'Fair' :
                            spamScore < 50 ? 'Poor' : 'Very Poor',
                suggestions,
                authenticationGuidance
            }
        });
    } catch (error) {
        console.error('Deliverability check error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to analyze deliverability',
            details: error.message
        });
    }
};

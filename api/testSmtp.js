import SMTPPool from './utils/smtpPool.js';

/**
 * Test SMTP Connection Endpoint
 * Validates SMTP credentials before saving
 */
export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { smtpConfig } = req.body;

    if (!smtpConfig) {
        return res.status(400).json({ error: 'SMTP configuration required' });
    }

    // Validate required fields
    if (smtpConfig.provider === 'custom') {
        if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass) {
            return res.status(400).json({
                error: 'Missing required fields: host, port, user, pass'
            });
        }
    } else if (smtpConfig.provider === 'gmail') {
        if (!smtpConfig.user || !smtpConfig.pass) {
            return res.status(400).json({
                error: 'Missing required fields: user, pass'
            });
        }
    }

    try {
        const pool = new SMTPPool([smtpConfig]);
        const result = await pool.testConnection(smtpConfig);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'SMTP connection successful! Server is ready to use.',
                details: result
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'SMTP connection failed',
                error: result.message
            });
        }
    } catch (error) {
        console.error('SMTP test error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to test SMTP connection',
            error: error.message
        });
    }
};

import nodemailer from 'nodemailer';

/**
 * SMTP Pool Manager
 * Manages multiple SMTP configurations with round-robin rotation and automatic failover
 */
class SMTPPool {
    constructor(smtpConfigs = []) {
        this.configs = Array.isArray(smtpConfigs) ? smtpConfigs : [smtpConfigs];
        this.currentIndex = 0;
        this.stats = {};

        // Initialize stats for each SMTP
        this.configs.forEach((config, index) => {
            const id = this.getConfigId(config, index);
            this.stats[id] = {
                sent: 0,
                failed: 0,
                lastUsed: null,
                healthy: true
            };
        });
    }

    /**
     * Generate unique ID for SMTP config
     */
    getConfigId(config, index) {
        if (config.provider === 'custom') {
            return `custom_${config.host}_${config.user}_${index}`;
        }
        return `gmail_${config.user}_${index}`;
    }

    /**
     * Get next SMTP configuration using round-robin
     */
    getNext() {
        if (this.configs.length === 0) {
            throw new Error('No SMTP configurations available');
        }

        // Single config - just return it
        if (this.configs.length === 1) {
            return this.configs[0];
        }

        // Find next healthy SMTP server
        let attempts = 0;
        while (attempts < this.configs.length) {
            const config = this.configs[this.currentIndex];
            const configId = this.getConfigId(config, this.currentIndex);

            // Move to next index for next call
            this.currentIndex = (this.currentIndex + 1) % this.configs.length;

            // Return if healthy
            if (this.stats[configId]?.healthy !== false) {
                return config;
            }

            attempts++;
        }

        // If all are unhealthy, reset health status and try again
        Object.keys(this.stats).forEach(id => {
            this.stats[id].healthy = true;
        });

        return this.configs[0];
    }

    /**
     * Create transporter from config
     */
    createTransporter(config) {
        if (config.provider === 'custom') {
            return nodemailer.createTransport({
                host: config.host,
                port: parseInt(config.port) || 587,
                secure: config.port == 465,
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
                tls: config.tls !== false
            });
        }

        // Gmail config
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.user,
                pass: config.pass
            }
        });
    }

    /**
     * Send email with automatic SMTP rotation and failover
     */
    async sendMail(mailOptions, maxRetries = 3) {
        let lastError = null;
        let attempts = 0;

        while (attempts < Math.min(maxRetries, this.configs.length)) {
            const config = this.getNext();
            const configId = this.getConfigId(config, this.configs.indexOf(config));

            try {
                const transporter = this.createTransporter(config);

                // Set from address if not specified
                if (!mailOptions.from) {
                    mailOptions.from = config.user;
                }

                const result = await transporter.sendMail(mailOptions);

                // Update stats on success
                this.stats[configId].sent++;
                this.stats[configId].lastUsed = new Date();
                this.stats[configId].healthy = true;

                return {
                    success: true,
                    result,
                    smtpUsed: configId
                };
            } catch (error) {
                console.error(`SMTP ${configId} failed:`, error.message);

                // Update stats on failure
                this.stats[configId].failed++;
                this.stats[configId].lastUsed = new Date();

                // Mark as unhealthy if auth or connection issue
                if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
                    this.stats[configId].healthy = false;
                }

                lastError = error;
                attempts++;
            }
        }

        // All attempts failed
        throw new Error(`Failed to send email after ${attempts} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Test SMTP connection
     */
    async testConnection(config) {
        try {
            const transporter = this.createTransporter(config);
            await transporter.verify();
            return { success: true, message: 'SMTP connection successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get statistics for all SMTP servers
     */
    getStats() {
        return this.stats;
    }

    /**
     * Reset health status for all SMTP servers
     */
    resetHealth() {
        Object.keys(this.stats).forEach(id => {
            this.stats[id].healthy = true;
        });
    }
}

export default SMTPPool;

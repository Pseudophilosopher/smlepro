/**
 * Centralized admin configuration for the application.
 * This file serves as the single source of truth for admin-related settings.
 */

// Admin email configuration - change this to update admin access across the entire application
export const ADMIN_CONFIG = {
    // Primary admin email - used for Firestore rules, Cloud Functions, and admin UI
    primaryAdminEmail: 'ohgzzz11@gmail.com',
    
    // Additional admin emails (optional) - for future multi-admin support
    additionalAdminEmails: [
        // 'secondary-admin@example.com'
    ],
    
    // Admin access validation function
    isAdmin(email) {
        if (!email) return false;
        const normalizedEmail = email.toLowerCase().trim();
        return normalizedEmail === this.primaryAdminEmail.toLowerCase() ||
               this.additionalAdminEmails.some(admin => 
                   admin.toLowerCase().trim() === normalizedEmail
               );
    }
};

/**
 * Legacy compatibility exports
 * These maintain backward compatibility with existing code
 */
export const ADMIN_EMAIL = ADMIN_CONFIG.primaryAdminEmail;
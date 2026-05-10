/**
 * Single operator account for admin UI, Firestore rules (email), and Cloud Functions.
 * 
 * NOTE: This file now re-exports from the centralized admin-config.js.
 * For future admin changes, update src/admin-config.js instead.
 */
import { ADMIN_EMAIL } from './admin-config.js';
export { ADMIN_EMAIL };

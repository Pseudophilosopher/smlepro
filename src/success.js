import { app, auth } from './app.js';
import { onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

document.addEventListener("DOMContentLoaded", () => {
    // Check if we're on a Moyasar checkout page with payment status
    // If so, redirect to our success page with the parameters
    if (window.location.hostname === 'checkout.moyasar.com') {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const paymentId = urlParams.get('id');
        
        if (status === 'paid' && paymentId) {
            // Redirect to our success page with the payment parameters
            window.location.href = `https://smlepro.web.app/success.html?status=${status}&id=${paymentId}`;
        }
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const paymentId = urlParams.get('id'); // <-- NEW: Grab the unique Moyasar ID
    const statusMessage = document.getElementById('status-message');
    const dashboardBtn = document.getElementById('dashboard-btn');

    // NEW: We now check that BOTH the status is paid AND a payment ID exists
    if (status === 'paid' && paymentId) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const functions = getFunctions(app, 'us-central1');
                    const verifyPayment = httpsCallable(functions, 'verifyMoyasarPayment');
                    const result = await verifyPayment({ paymentId });
                    const response = result.data || {};

                    if (!response.ok) {
                        statusMessage.innerText = "Payment verification failed. Please contact support.";
                        return;
                    }

                    statusMessage.innerText = "Welcome to SMLE Pro Premium. Your account is fully upgraded!";
                    
                    // Auto-redirect to dashboard after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                    
                    if(dashboardBtn) {
                        dashboardBtn.style.display = 'inline-block';
                        dashboardBtn.classList.remove('hidden'); 
                    }
                    
                } catch (error) {
                    console.error("Failed to upgrade premium status:", error);
                    statusMessage.innerText = "Upgrade failed. Please refresh or contact support.";
                }
            } else {
                statusMessage.innerText = "Error: No user logged in. Please log in to claim your upgrade.";
            }
        });
    } else {
        statusMessage.innerText = "Payment was not successful or is invalid. Please try again.";
    }
});
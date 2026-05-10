# 🚀 SMLE Pro Launch Checklist

## Pre-Launch Preparation

### 1. Payment Gateway Setup
- [x] Update Moyasar public key in `checkout.html`
- [ ] **CRITICAL**: Set Moyasar live secret key via Firebase CLI:
  ```bash
  firebase functions:secrets:set MOYASAR_SECRET_KEY
  ```
  Enter your live secret key when prompted (starts with `sk_live_...`)
- [ ] Deploy Cloud Functions to apply the secret:
  ```bash
  firebase deploy --only functions
  ```
- [ ] Test a real payment (small amount first, then refund)

### 2. Firebase Configuration
- [x] Firestore security rules deployed
- [x] Firebase Authentication configured (Google Sign-In)
- [x] Cloud Functions deployed
- [ ] Verify Firebase Analytics is tracking events

### 3. Legal & Compliance
- [x] PDPL-compliant privacy policy
- [x] Saudi E-Commerce Law compliant refund policy
- [x] Freelance Document displayed on legal page
- [x] Terms & Conditions with KSA jurisdiction
- [x] Analytics consent banner with PDPL reference

### 4. Technical Verification
- [x] No console.log statements in production
- [x] Error handling with user-friendly messages
- [x] Mobile-responsive design
- [x] Swipe navigation for quiz
- [x] Performance optimized (<500KB gzipped)

## Launch Day

### 1. Final Deployment
```bash
# Deploy everything
npm run deploy
# OR
firebase deploy --only hosting,functions
```

### 2. Smoke Test Checklist
- [ ] Visit https://smlepro.web.app
- [ ] Test Daily Dose (free, no login required)
- [ ] Sign in with Google
- [ ] Navigate to dashboard
- [ ] Try a practice quiz
- [ ] Test checkout flow (use a real payment)
- [ ] Verify payment success redirect
- [ ] Check premium features unlock
- [ ] Test on mobile device

### 3. Monitoring Setup
- [ ] Firebase Console → Analytics → Realtime (watch for activity)
- [ ] Firebase Console → Functions → Logs (monitor for errors)
- [ ] Moyasar Dashboard → Invoices (verify payments)

## Post-Launch

### 1. Marketing Activation
- [ ] Share on X/Twitter with #SMLE #MedicalEducation
- [ ] Post on Instagram Stories
- [ ] Share in Saudi medical student groups
- [ ] Create TikTok/Reels content

### 2. Customer Support
- [ ] Monitor smlepro.official@gmail.com
- [ ] Respond to support requests within 24 hours
- [ ] Track common issues and update FAQ

### 3. Performance Monitoring
- [ ] Check Firebase Performance Monitoring
- [ ] Monitor page load times
- [ ] Watch for any 404 errors in Firebase Hosting logs

## Emergency Rollback Plan

If something goes wrong:
1. **Payment issues**: Switch back to test mode in Moyasar dashboard
2. **Major bugs**: Deploy previous stable version
   ```bash
   git revert <commit-hash>
   npm run deploy
   ```
3. **Firebase issues**: Contact Firebase support

## Success Metrics to Track

- Daily Active Users (DAU)
- Conversion rate (free → paid)
- Average revenue per user (ARPU)
- Customer acquisition cost (CAC)
- Churn rate

## Contact Information

- **Support Email**: smlepro.official@gmail.com
- **Firebase Project**: smle-mock-exam-51478532-5ae31
- **Moyasar Dashboard**: https://dash.moyasar.com/

---

**Last Updated**: 22 April 2026
**Version**: 1.0.0
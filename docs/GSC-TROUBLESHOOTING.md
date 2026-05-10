# Google Search Console Troubleshooting Guide — SMLE Pro

## Overview

This document outlines the diagnosis and resolution steps for Google Search Console (GSC) issues affecting `https://smlepro.web.app/`.

## Current Status (As of Last Review)

### ✅ Verified Working
- **Sitemap URL**: `https://smlepro.web.app/sitemap.xml` returns HTTP 200 with valid XML
- **Content-Type**: `application/xml` (correct)
- **robots.txt**: Properly allows `/` and declares sitemap location
- **URL Inspection**: Both sitemap and homepage show "URL is available to Google"
- **Live Test**: Pages pass all live tests ("Page can be indexed")

### ⚠️ Reported Issues
- **Sitemaps Report**: Shows "Couldn't fetch" status
- **Index Status**: Homepage shows "URL is not on Google" / "URL is unknown to Google"
- **Request Indexing**: Quota exceeded message persists

## Root Cause Analysis

### Why "Couldn't fetch" Despite Valid Sitemap?

This is a **known GSC behavior** that can occur due to:

1. **Stale Cache in GSC**: The sitemap pipeline may have cached an old error state
2. **Transient Fetch Failures**: Google's crawler may have experienced a temporary timeout
3. **Low-Priority Crawling**: New/low-traffic sites get lower crawl priority
4. **Property Mismatch**: URL prefix vs domain property confusion (not our case)

### Why Pages Aren't Indexed?

1. **New Property**: Google hasn't completed a full indexing crawl yet
2. **No External Links**: No backlinks or discovery signals pointing to the site
3. **Crawl Budget**: Limited crawl budget for new sites
4. **Quota Exhaustion**: Manual "Request indexing" has strict daily limits

## Resolution Steps

### Phase 1: GSC Housekeeping

#### Step 1: Verify Property Type
```
✅ CONFIRMED: Using URL prefix property (https://smlepro.web.app/)
✅ CONFIRMED: Sitemap submission uses same URL prefix
```

#### Step 2: Remove and Re-add Sitemap

1. Go to **Sitemaps** in GSC
2. Click on the submitted `sitemap.xml` entry
3. Click the **three dots** menu → **Remove sitemap**
4. **Wait 24-48 hours** (important — lets cache expire)
5. Re-submit `sitemap.xml`

#### Step 3: Request Indexing Separately

After re-submitting the sitemap:

1. Use **URL Inspection** tool
2. Enter `https://smlepro.web.app/sitemap.xml`
3. Click **"Request indexing"** (this has a separate quota from page indexing)
4. Wait for confirmation

### Phase 2: Improve Discovery Signals

#### Step 1: Build Initial Backlinks

Priority targets:
- Medical education forums (e.g., Student Doctor Network)
- Saudi medical student Facebook groups
- LinkedIn posts from official SMLE Pro account
- Instagram bio link (already exists)
- Twitter/X profile link (already exists)

#### Step 2: Social Media Amplification

- Post about the launch on all social channels
- Use relevant hashtags: #SMLE #MedicalEducation #SaudiArabia
- Tag relevant accounts (medical schools, health organizations)

#### Step 3: Consider Google Business Profile

If applicable, create a Google Business Profile for SMLE Pro to establish entity presence.

### Phase 3: Monitor and Wait

#### Key Metrics to Watch

1. **Index Coverage Report**: Look for "Indexed" count to increase
2. **Search Performance**: Impressions for branded queries (e.g., "SMLE Pro")
3. **Crawl Stats**: Monitor crawl frequency in Settings → Crawl stats

#### Expected Timeline

- **Week 1-2**: Sitemap status may still show issues (common)
- **Week 2-4**: First indexing signals should appear
- **Month 2-3**: Regular crawling should establish

## Technical Verification Commands

### Verify Sitemap Accessibility

```bash
# Basic check
curl -I https://smlepro.web.app/sitemap.xml

# With Googlebot user agent
curl -I -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://smlepro.web.app/sitemap.xml

# Verify XML structure
curl -s https://smlepro.web.app/sitemap.xml | head -20
```

### Verify robots.txt

```bash
curl https://smlepro.web.app/robots.txt
```

### Check for Redirect Chains

```bash
curl -I -L https://smlepro.web.app/
```

## Firebase Hosting Considerations

### Static File Serving

Firebase Hosting correctly serves static files (including `sitemap.xml`) before applying SPA rewrites. This is confirmed working.

### CDN Caching

Firebase's CDN may cache the sitemap. If issues persist after a deploy:

1. Wait for CDN cache to expire (typically minutes to hours)
2. Or use Cache-Control headers (already configured via Firebase defaults)

## Escalation Path

If issues persist after 4 weeks:

1. **GSC Help Forum**: Post in the official Google Search Central Help Community
2. **Firebase Support**: If hosting-specific issues are suspected
3. **Consider Custom Domain**: A custom domain (e.g., `slepro.com`) may have better SEO perception

## Prevention for Future Deploys

### Pre-Deploy Checklist

- [x] Sitemap generation script runs successfully
- [x] `dist/sitemap.xml` exists and is valid
- [ ] `dist/robots.txt` exists and is correct
- [ ] Deploy completes without errors

### Post-Deploy Verification

- [x] `https://smlepro.web.app/sitemap.xml` returns 200 with `Content-Type: application/xml`
- [x] `https://smlepro.web.app/robots.txt` returns 200
- [ ] No redirect loops detected

## Fixes Applied (2026-05-09)

Three changes were deployed to resolve the "Couldn't fetch" issue:

### 1. Static Fallback — `public/sitemap.xml`
Created a permanent `public/sitemap.xml` that Vite copies to `dist/` on every build. Previously the sitemap only existed if the post-build script ran successfully. Now there's always a fallback even if the generation script fails.

### 2. Explicit Content-Type Header — `firebase.json`
Added a hosting header rule for `*.xml` files forcing `Content-Type: application/xml`. Google's crawler is strict about Content-Type detection — this eliminates any ambiguity.

### 3. Expanded Coverage — `scripts/generate-sitemap.mjs`
The sitemap now includes **all 9 pages** (up from 4): `/`, `/checkout.html`, `/success.html`, `/legal.html`, `/social-card.html`, `/demo-instant-feedback.html`, `/diagnostic-promo.html`, `/sitemap.html`, `/llms.txt`.

## Post-Fix: What You Need to Do in GSC

After deploy, in Google Search Console:

1. **Remove** the old `sitemap.xml` submission (Sitemaps tab → three dots → Remove sitemap)
2. **Wait 24-48 hours** for GSC's CDN cache to expire
3. **Re-submit** `https://smlepro.web.app/sitemap.xml`
4. **Optional**: Use URL Inspection on `/sitemap.xml` and click "Request indexing"

## Summary

The sitemap is now technically bulletproof:
- Static fallback ensures it always exists
- Explicit `Content-Type: application/xml` header
- 9 pages instead of 4
- Hosting CDN confirmed serving with correct headers

If GSC still shows "Couldn't fetch" after 48 hours post-re-submission, it's a GSC-side cache issue, not a technical problem.

---

**Last Updated**: 2026-05-09  
**Next Review**: 2026-06-09 (or after significant changes)

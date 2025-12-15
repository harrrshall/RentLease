---
description: Deploy to Vercel (Preview & Production)
---

# Deploy to Vercel

This workflow guides you through deploying the RentLease application to Vercel using the CLI. It prioritizes safety by using Preview deployments first.

## Prerequisites

- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Vercel Account
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` available

## 1. Login to Vercel
If you rarely use Vercel CLI, ensure you are logged in.
```bash
npx vercel login
```

## 2. Link Project
Link your local directory to a Vercel project.
```bash
npx vercel link
```
*Follow the prompts to set up "RentLease" (or similar).*

## 3. Set Environment Variables
**CRITICAL**: The app will fail without the API Key.
```bash
npx vercel env add GOOGLE_GENERATIVE_AI_API_KEY
```
*   Select `Production`, `Preview`, and `Development` when asked.
*   Paste your API Key value.

## 4. Deploy to Preview
Deploy a test version (Preview) that **does not affect production**.
```bash
npx vercel
```
*   Wait for the build to complete.
*   The command will output a `Production` (if first time) or `Preview` URL (e.g., `https://rent-lease-git-main-user.vercel.app`).
*   **Action**: Open that URL and test:
    *   Search functionality.
    *   Links.

## 5. Deploy to Production
Once the Preview is verified, promote it to Production.
```bash
npx vercel --prod
```
*   This updates the main domain.

> [!TIP]
> If you encounter "Command not found", replace `vercel` with `npx vercel`.

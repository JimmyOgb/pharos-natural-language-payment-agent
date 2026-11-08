# Production Deployment Runbook — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Hosting Platforms:** Vercel (Edge CDN) + GitHub Public Repository  

---

## 1. Prerequisites

- Node.js 20+ (Node.js 24 recommended)
- npm 10+
- Vercel CLI (`npm i -g vercel` or `npx vercel`)
- GitHub CLI (`gh`)

---

## 2. Local Build & Verification

```bash
# Verify local TypeScript compilation and Vite build
npm run build

# Preview production build locally
npm run preview
```

---

## 3. Vercel Production Deployment

The project is structured as a static Single Page Application (SPA) with zero server-side state:

```bash
# Deploy to Vercel production
vercel --prod --yes
```

Configuration in `vercel.json`:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Environment Variables

Pharos PayPilot requires **zero secret environment variables**. All RPC URLs connect to public endpoints (`https://rpc.pharos.xyz`, `https://mainnet.base.org`). Private keys and secret tokens are strictly prohibited.

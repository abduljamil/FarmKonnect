# 6. Mobile Application & Deployment Pipeline

This document details the CI/CD deployment architecture and how the Expo-based mobile app is distributed.

## 6.1 GitHub Actions CI/CD

FarmKonnect implements a fully automated CI/CD pipeline using GitHub Actions to deploy to the AWS EC2 instance.

```mermaid
flowchart LR
    A[Developer Pushes to 'main'] --> B(GitHub Actions Triggered)
    
    B --> C{Run ESLint (Web)}
    
    C -->|Fails| D[Abort Deploy]
    C -->|Passes| E[SSH to AWS EC2]
    
    E --> F[git pull origin main]
    F --> G[docker-compose down]
    G --> H[docker-compose up -d --build]
    H --> I[Prune Old Images]
```

### 6.1.1 Docker Composability
The `docker-compose.yml` file acts as the orchestrator on the EC2 instance. It defines 4 core services:
1. `backend`: The Node.js Express server.
2. `frontend`: The React Vite app served via Nginx.
3. `scrapper`: The Python script that fetches daily AMIS prices.
4. `prediction_service`: The ML cron job.

All containers exist on a shared bridge network, allowing them to communicate securely without exposing ports unnecessarily.

## 6.2 Mobile App Distribution (Expo EAS)

Because the mobile app is built using React Native and Expo, it bypasses traditional compilation bottlenecks via **Expo Application Services (EAS)** and **Over-The-Air (OTA) Updates**.

### 6.2.1 OTA Updates Architecture
When a bug fix or UI change is pushed to GitHub (specifically inside the `mobile/` directory), we do NOT need to rebuild the `.apk` or `.ipa` files.

Instead, a dedicated GitHub Action runs `eas update --branch preview`. 
1. Expo bundles the new JavaScript code.
2. The bundled code is hosted on Expo's CDN.
3. The next time a user opens the FarmKonnect app, the Expo runtime detects the update on the `preview` channel, downloads the payload, and applies the changes instantly.

### 6.2.2 Native Builds
If native modules are modified (e.g., adding a new camera permission or native dependency), an OTA update is insufficient.
In this scenario, developers include the `[build-apk]` tag in their commit message.
- A GitHub Action intercepts this tag.
- It triggers `eas build --profile preview --platform android`.
- Expo provisions a cloud macOS/Linux worker, compiles the Java/Kotlin code, and produces a new `farmkonnect.apk`.
- Users must then download and install this new APK manually from the web landing page.

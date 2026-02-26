# 📦 Aegis AI Mobile - Deployment Guide

This guide covers building and deploying the Aegis AI mobile app to production.

---

## 🎯 Pre-Deployment Checklist

Before building for production, ensure:

- [ ] All features are tested and working
- [ ] Environment variables are configured for production
- [ ] App icons and splash screens are finalized
- [ ] App metadata (name, version, description) is correct
- [ ] Privacy policy and terms of service are ready
- [ ] Backend API is deployed and accessible via HTTPS
- [ ] All dependencies are up to date
- [ ] No console.log statements in production code
- [ ] Error tracking is set up (Sentry, etc.)

---

## 🛠 Setup EAS (Expo Application Services)

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure EAS

```bash
cd mobile
eas build:configure
```

This creates `eas.json` with build profiles.

### 4. Update eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.aegis-ai.com/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 🤖 Android Deployment

### Build APK (for testing)

```bash
eas build --platform android --profile preview
```

### Build AAB (for Google Play Store)

```bash
eas build --platform android --profile production
```

### Submit to Google Play Store

1. **Create a Google Play Developer Account** ($25 one-time fee)

2. **Generate Upload Key:**

   ```bash
   eas credentials
   ```

   Select "Android" → "Production" → "Keystore" → "Generate new keystore"

3. **Build and Submit:**

   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

4. **Fill in Store Listing:**
   - App name: Aegis AI
   - Short description: Your Intelligent AI Assistant
   - Full description: (See template below)
   - Screenshots: Minimum 2, recommended 8
   - Feature graphic: 1024x500
   - App icon: 512x512

---

## 🍎 iOS Deployment

### Prerequisites

- **Apple Developer Account** ($99/year)
- **Mac computer** (required for iOS builds)

### Build for TestFlight

```bash
eas build --platform ios --profile production
```

### Submit to App Store

1. **Configure App Store Connect:**
   - Create app in App Store Connect
   - Fill in metadata
   - Upload screenshots

2. **Build and Submit:**

   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

3. **TestFlight Testing:**
   - Internal testing: Up to 100 testers
   - External testing: Up to 10,000 testers
   - Beta review required for external testing

4. **Submit for Review:**
   - Fill in App Review Information
   - Add demo account credentials
   - Submit for review (typically 24-48 hours)

---

## 🌐 Web Deployment

### Build for Web

```bash
npx expo export --platform web
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## 📝 Store Listing Templates

### App Description (Long)

```
Aegis AI - Your Intelligent AI Assistant

Experience the power of AI in the palm of your hand. Aegis AI brings cutting-edge artificial intelligence to your mobile device with a beautiful, intuitive interface.

🔐 SECURE & PRIVATE
• End-to-end encryption for all conversations
• Secure token storage in device Keychain/Keystore
• No data sharing with third parties
• Your privacy is our priority

💬 SMART CONVERSATIONS
• Natural language understanding
• Context-aware responses
• Multi-turn conversations
• Chat history sync across devices

🎨 BEAUTIFUL DESIGN
• Premium dark mode interface
• Smooth animations
• Intuitive navigation
• Optimized for all screen sizes

⚡ FAST & RELIABLE
• Instant AI responses
• Offline chat history access
• Low battery consumption
• Optimized performance

FEATURES:
✓ Unlimited conversations
✓ Chat management (rename, delete, organize)
✓ Secure authentication
✓ Real-time sync
✓ Export conversations
✓ Customizable settings
✓ Regular updates

Perfect for:
• Students seeking homework help
• Professionals needing quick answers
• Creatives looking for inspiration
• Anyone curious about AI

Download Aegis AI today and experience the future of mobile AI assistants!

Support: support@aegis-ai.com
Privacy: https://aegis-ai.com/privacy
Terms: https://aegis-ai.com/terms
```

### Keywords

```
AI, artificial intelligence, chatbot, assistant, GPT, conversation, smart, intelligent, helper, productivity, chat, messaging, automation, machine learning, neural network
```

### What's New (Version 1.0.0)

```
🎉 Welcome to Aegis AI!

This is our initial release featuring:
• Secure authentication and encryption
• Beautiful dark mode interface
• Unlimited AI conversations
• Chat management tools
• Offline support
• Fast and responsive UI

We're excited to have you on board! Share your feedback at support@aegis-ai.com
```

---

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
EXPO_PUBLIC_API_URL=https://api.aegis-ai.com/api
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
EXPO_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Update eas.json

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.aegis-ai.com/api"
      }
    }
  }
}
```

---

## 📊 Analytics & Monitoring

### Setup Sentry (Error Tracking)

```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative -p ios android
```

### Setup Analytics

```bash
npm install @react-native-firebase/analytics
```

Or use Expo's built-in analytics:

```bash
npm install expo-analytics-amplitude
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd mobile
          npm ci

      - name: Run tests
        run: |
          cd mobile
          npm test

      - name: Build Android
        if: github.ref == 'refs/heads/main'
        run: |
          cd mobile
          eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## 📱 Over-the-Air (OTA) Updates

### Setup EAS Update

```bash
eas update:configure
```

### Publish Update

```bash
eas update --branch production --message "Bug fixes and improvements"
```

### Benefits of OTA Updates

- ✅ Fix bugs without app store review
- ✅ Push new features instantly
- ✅ A/B testing capabilities
- ✅ Rollback if issues occur

---

## 🔍 Testing Before Release

### Internal Testing Checklist

- [ ] Test on multiple devices (iOS & Android)
- [ ] Test on different screen sizes
- [ ] Test with slow internet connection
- [ ] Test offline functionality
- [ ] Test authentication flow
- [ ] Test all chat features
- [ ] Test settings and preferences
- [ ] Check for memory leaks
- [ ] Verify all links work
- [ ] Test deep linking
- [ ] Verify push notifications (if implemented)

### Beta Testing

1. **TestFlight (iOS)**
   - Add internal testers
   - Collect feedback
   - Fix critical issues

2. **Google Play Internal Testing (Android)**
   - Create internal testing track
   - Add testers via email
   - Monitor crash reports

---

## 📈 Post-Launch

### Monitor Key Metrics

- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Retention rate (Day 1, Day 7, Day 30)
- Crash-free rate
- Average session duration
- Feature adoption rate

### Gather Feedback

- In-app feedback form
- App store reviews
- User surveys
- Support tickets
- Social media mentions

### Iterate and Improve

- Fix bugs based on crash reports
- Implement most-requested features
- Optimize performance
- Update UI/UX based on feedback
- Regular security updates

---

## 🆘 Troubleshooting Builds

### Build Failed

```bash
# Clear cache
eas build:clean

# Try again
eas build --platform android --profile production
```

### Credentials Issues

```bash
# Reset credentials
eas credentials

# Select platform and regenerate
```

### Version Conflicts

```bash
# Update all dependencies
npm update

# Check for breaking changes
npm outdated
```

---

## 📞 Support

- **EAS Documentation**: https://docs.expo.dev/eas/
- **Expo Forums**: https://forums.expo.dev/
- **Discord**: https://chat.expo.dev/

---

**Good luck with your deployment! 🚀**

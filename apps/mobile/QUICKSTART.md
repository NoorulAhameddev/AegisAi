# 🚀 Aegis AI Mobile - Quick Start Guide

Welcome to Aegis AI Mobile! This guide will help you get up and running in just a few minutes.

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (2 minutes)

```bash
# Navigate to mobile directory
cd mobile

# Install packages
npm install
```

### Step 2: Configure Backend URL (1 minute)

Create a `.env` file:

```bash
cp .env.example .env
```

**For Physical Device:**

1. Find your computer's IP address:
   - Windows: Open CMD and type `ipconfig`
   - Mac/Linux: Open Terminal and type `ifconfig`
2. Look for your local IP (usually starts with 192.168.x.x or 10.0.x.x)
3. Edit `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:3000/api
   ```
   Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api`

**For Emulator:**

- Android: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api`
- iOS: `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

### Step 3: Start the App (2 minutes)

```bash
# Start Expo development server
npm start
```

**On Your Phone:**

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in your terminal
3. Wait for the app to load

**On Emulator:**

- Press `a` for Android
- Press `i` for iOS (Mac only)

---

## 🎯 First Time Using the App?

### 1. Create an Account

- Tap "Get Started" on the onboarding screen
- Fill in your details
- Tap "Sign Up"

### 2. Start Your First Chat

- Tap the **+** button (bottom right)
- Type your message
- Hit send!

### 3. Manage Your Chats

- **Long press** any chat to rename or delete
- **Pull down** to refresh your chat list
- **Swipe** for quick actions

---

## 🔧 Troubleshooting

### "Cannot connect to server"

**Solution 1: Check Backend**

```bash
# In a new terminal, go to project root
cd ..
npm run dev
```

Make sure you see "Server running on port 3000"

**Solution 2: Verify IP Address**

- Your phone and computer must be on the **same WiFi network**
- Double-check the IP in your `.env` file
- Try pinging your computer from your phone

**Solution 3: Firewall**

- Windows: Allow Node.js through Windows Firewall
- Mac: System Preferences → Security & Privacy → Firewall → Allow Node

### "Something went wrong" in Expo Go

```bash
# Clear cache and restart
npm start -- --clear
```

### App is slow or laggy

```bash
# Restart with production mode
npm start -- --no-dev --minify
```

---

## 📱 Platform-Specific Notes

### Android

- Use `10.0.2.2` instead of `localhost` for emulator
- Enable "Developer Mode" on your physical device
- Allow installation from unknown sources for development builds

### iOS

- Xcode required for iOS simulator (Mac only)
- Physical device testing requires Apple Developer account
- Shake device to open developer menu

---

## 🎨 Customization

### Change App Name

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

### Change App Icon

Replace `assets/images/icon.png` with your 1024x1024 PNG

### Change Splash Screen

Replace `assets/images/splash-icon.png` with your image

---

## 🚀 Next Steps

1. **Explore Settings**: Tap the Settings tab to customize your experience
2. **Try Different Features**: Create multiple chats, rename them, organize your conversations
3. **Read Full Docs**: Check out [README.md](./README.md) for advanced features
4. **Join Community**: Star the repo and join discussions on GitHub

---

## 💡 Pro Tips

- **Shake your device** to open the developer menu
- **Pull to refresh** on the chat list to sync latest data
- **Long press** messages for quick actions
- **Use keyboard shortcuts** in the emulator (press `?` to see all shortcuts)

---

## 🆘 Need Help?

- **Documentation**: [Full README](./README.md)
- **GitHub Issues**: [Report a bug](https://github.com/noorulahamed/aegis-ai/issues)
- **Discussions**: [Ask questions](https://github.com/noorulahamed/aegis-ai/discussions)

---

**Happy Coding! 🎉**

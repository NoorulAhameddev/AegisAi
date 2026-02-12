# Aegis AI - Mobile App 📱

<div align="center">

![Aegis AI](./assets/images/icon.png)

**Your Intelligent AI Assistant - Now on Mobile**

[![Expo](https://img.shields.io/badge/Expo-~54.0-000020?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 🌟 Features

### 🔐 **Security First**

- **End-to-End Encryption**: All conversations are encrypted
- **Secure Token Storage**: JWT tokens stored in device Keychain/Keystore
- **Biometric Authentication**: Face ID / Touch ID support (coming soon)

### 💬 **Smart Chat Interface**

- **Real-time AI Responses**: Instant communication with AI
- **Chat History**: Access all your previous conversations
- **Message Management**: Edit, delete, and organize your chats
- **Optimistic Updates**: Smooth, responsive UI

### 🎨 **Premium Design**

- **Dark Mode**: Beautiful OLED-friendly dark theme
- **Smooth Animations**: Polished micro-interactions
- **Intuitive Navigation**: Easy-to-use tab-based interface
- **Responsive Layout**: Works perfectly on all screen sizes

### ⚡ **Performance**

- **Offline Support**: View chat history without internet
- **Fast Loading**: Optimized for speed
- **Low Battery Impact**: Efficient background processing

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org)
- **npm** or **yarn** package manager
- **Expo Go** app on your mobile device:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **Android Studio** (for Android emulator) or **Xcode** (for iOS simulator) - Optional

### Installation

1. **Navigate to the mobile directory:**

   ```bash
   cd mobile
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment:**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your API URL:

   ```env
   # For Android Emulator
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api

   # For iOS Simulator or Web
   EXPO_PUBLIC_API_URL=http://localhost:3000/api

   # For Physical Device (replace with your computer's IP)
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
   ```

   **Finding your IP address:**

   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac/Linux**: `ifconfig` or `ip addr`

### Running the App

Start the Expo development server:

```bash
npm start
```

Then choose your platform:

- **📱 Physical Device**: Scan the QR code with Expo Go app
- **🤖 Android Emulator**: Press `a`
- **🍎 iOS Simulator**: Press `i` (Mac only)
- **🌐 Web Browser**: Press `w`

---

## 📱 App Structure

```
mobile/
├── app/                      # File-based routing (Expo Router)
│   ├── (auth)/              # Authentication screens
│   │   ├── login.tsx        # Login screen
│   │   └── register.tsx     # Registration screen
│   ├── (protected)/         # Protected routes (require auth)
│   │   ├── chat/            # Chat screens
│   │   │   ├── index.tsx    # Chat list
│   │   │   └── [id].tsx     # Chat detail
│   │   └── settings.tsx     # Settings screen
│   ├── _layout.tsx          # Root layout
│   ├── index.tsx            # Entry point
│   └── onboarding.tsx       # Onboarding screen
├── src/
│   ├── components/          # Reusable UI components
│   ├── context/             # React Context (Auth, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── auth.ts          # Authentication service
│   │   ├── chat.ts          # Chat service
│   │   └── storage.ts       # Secure storage service
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

---

## 🔧 Configuration

### App Configuration (`app.json`)

The app is configured with:

- **App Name**: Aegis AI Mobile
- **Bundle Identifier**: `com.aegis.mobile`
- **Version**: 1.0.0
- **Orientation**: Portrait
- **Platforms**: iOS, Android, Web

### Environment Variables

| Variable              | Description          | Example                       |
| --------------------- | -------------------- | ----------------------------- |
| `EXPO_PUBLIC_API_URL` | Backend API endpoint | `http://192.168.1.5:3000/api` |

---

## 🎯 Key Features Explained

### Authentication Flow

1. **Onboarding Screen**: First-time users see feature highlights
2. **Login/Register**: Secure authentication with JWT tokens
3. **Token Management**: Automatic refresh token handling
4. **Secure Storage**: Tokens stored in device Keychain/Keystore

### Chat Management

- **Create Chat**: Tap the FAB button to start a new conversation
- **Delete Chat**: Long-press a chat or tap the menu icon
- **Rename Chat**: Long-press and select "Rename"
- **View History**: All messages are saved and synced

### Settings & Profile

- **Account Management**: Edit profile, change password
- **App Preferences**: Theme, notifications, language
- **About**: Version info, privacy policy, terms of service

---

## 🐛 Troubleshooting

### Common Issues

**1. Cannot connect to backend**

```bash
# Make sure backend is running
cd ..
npm run dev

# Check your IP address matches .env
ipconfig  # Windows
ifconfig  # Mac/Linux
```

**2. Expo Go app shows "Something went wrong"**

```bash
# Clear cache and restart
npm start -- --clear
```

**3. Module not found errors**

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

**4. Android emulator can't reach localhost**

```env
# Use 10.0.2.2 instead of localhost
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

---

## 🚢 Building for Production

### Android APK

```bash
# Build APK
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS IPA

```bash
# Build for TestFlight
eas build --platform ios --profile production
```

### Prerequisites for Building

1. **Install EAS CLI**:

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:

   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

---

## 🔒 Security Best Practices

- ✅ Tokens stored in secure storage (Keychain/Keystore)
- ✅ No sensitive data in code or version control
- ✅ HTTPS-only API communication in production
- ✅ Certificate pinning (recommended for production)
- ✅ Biometric authentication support

---

## 🛠 Tech Stack

| Technology            | Purpose                |
| --------------------- | ---------------------- |
| **Expo**              | React Native framework |
| **Expo Router**       | File-based navigation  |
| **TypeScript**        | Type safety            |
| **Axios**             | HTTP client            |
| **Expo Secure Store** | Secure token storage   |
| **React Navigation**  | Navigation library     |
| **Ionicons**          | Icon library           |

---

## 📝 Development Scripts

```bash
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Lint code
npm run lint

# Reset project (removes example code)
npm run reset-project
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Expo Team** for the amazing framework
- **React Native Community** for continuous support
- **Contributors** who help improve this project

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/noorulahamed/aegis-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/noorulahamed/aegis-ai/discussions)
- **Email**: support@aegis-ai.com

---

<div align="center">

**Made with ❤️ by the Aegis AI Team**

[Website](https://aegis-ai.com) • [Documentation](https://docs.aegis-ai.com) • [GitHub](https://github.com/noorulahamed/aegis-ai)

</div>

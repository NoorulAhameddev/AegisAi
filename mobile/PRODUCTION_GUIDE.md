# Production-Grade Mobile App

This document provides guidance for deploying and maintaining the production-ready mobile application.

## 🎯 What's Been Implemented

### 1. Environment Configuration
- **Type-safe environment variables** with validation
- **Multi-environment support** (.env.example, .env.production)
- **Centralized configuration** in `src/config/env.ts`

### 2. Error Handling & Logging
- **Structured logging system** with multiple log levels (debug, info, warn, error)
- **Production-grade error classes** (AppError, NetworkError, AuthenticationError, ValidationError)
- **Error boundary component** to catch React errors
- **User-friendly error messages** for better UX
- **Log buffering** for debugging

### 3. Security Enhancements
- **Biometric authentication** support (Face ID, Touch ID, Fingerprint)
- **Input sanitization** to prevent XSS attacks
- **Password strength validation**
- **Secure token storage** using SecureStore (native) and localStorage (web)
- **Security utilities** for data sanitization

### 4. Performance Optimizations
- **Request caching** with configurable TTL
- **Request deduplication** to prevent duplicate API calls
- **Concurrent request limiting** with queue management
- **Performance monitoring** with metrics tracking
- **Debounce & throttle utilities**

### 5. Build Configuration
- **EAS Build configuration** (eas.json) for development, preview, and production
- **Build scripts** for Android and iOS
- **Submit scripts** for app stores
- **OTA updates** support via Expo Updates
- **Version management**

### 6. App State Management
- **Global state provider** for app-wide concerns
- **Network status monitoring**
- **App state tracking** (foreground/background)
- **Loading and error states**
- **Error boundary** with recovery

### 7. Analytics & Monitoring
- **Event tracking system** with structured events
- **Screen view tracking**
- **Error tracking**
- **Performance timing metrics**
- **Device and app information collection**
- **Health check system**

### 8. Offline Support & Network Resilience
- **Network status detection** with listeners
- **Automatic retry with exponential backoff**
- **Request queuing** for offline mode
- **Cache management** for offline data
- **Enhanced API client** with retry and caching

## 📦 New Packages Installed

```bash
expo-local-authentication  # Biometric authentication
@react-native-community/netinfo  # Network detection
expo-device  # Device information
expo-application  # App information
```

## 🚀 Getting Started

### Development
```bash
cd mobile
npm install
npm start
```

### Type Checking
```bash
npm run type-check
```

### Building for Production

#### Android
```bash
npm run build:android:prod
```

#### iOS
```bash
npm run build:ios:prod
```

### Submitting to App Stores
```bash
npm run submit:android  # Google Play
npm run submit:ios      # App Store
```

## 🔧 Configuration

### Environment Variables

Create `.env` file for local development (copy from `.env.example`):

```env
NODE_ENV=development
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000/api
EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true
```

For production, use `.env.production`:
```env
NODE_ENV=production
EXPO_PUBLIC_API_URL=https://api.aegisai.com/api
EXPO_PUBLIC_ENABLE_SSL_PINNING=true
EXPO_PUBLIC_REQUIRE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

### EAS Configuration

Update `eas.json` with your project details:
```json
{
  "extra": {
    "eas": {
      "projectId": "your-actual-project-id"
    }
  }
}
```

## 📊 Monitoring & Analytics

### Analytics Events
The app tracks key user interactions:
- Authentication (login, logout, signup)
- Navigation (screen views, tab changes)
- Chat interactions
- File operations
- Errors and performance metrics

### Performance Monitoring
- API response times
- Slow operations (> 1s)
- Error rates
- Device and app information

### Health Checks
```typescript
import { monitoring } from './src/services/monitoring';

// Get health status
const health = await monitoring.checkHealth();
console.log(health); // { healthy: boolean, issues: string[] }

// Get diagnostics
const diagnostics = monitoring.getDiagnostics();
```

## 🔒 Security Best Practices

### Biometric Authentication
```typescript
import { securityManager } from './src/utils/security';

// Check availability
const available = await securityManager.isBiometricAvailable();

// Authenticate
const success = await securityManager.authenticateWithBiometrics();
```

### Input Validation
```typescript
import { securityManager } from './src/utils/security';

// Validate email
const isValid = securityManager.isValidEmail(email);

// Validate password strength
const result = securityManager.validatePasswordStrength(password);
```

## 🌐 Network & Offline Support

### Enhanced API Client
```typescript
import { enhancedGet, enhancedPost } from './src/services/apiClient';

// GET with caching
const data = await enhancedGet('/api/endpoint', {
  useCache: true,
  cacheTTL: 300000, // 5 minutes
});

// POST with retry
const result = await enhancedPost('/api/endpoint', data, {
  skipRetry: false, // Will retry up to MAX_RETRIES times
});
```

### Network Detection
```typescript
import { networkManager } from './src/utils/network';

// Check online status
const isOnline = await networkManager.isOnline();

// Listen for changes
const unsubscribe = networkManager.addListener((isConnected) => {
  console.log('Network status:', isConnected);
});
```

## 📝 Logging

### Usage
```typescript
import { logger } from './src/utils/logger';

logger.debug('Debug message', { data });
logger.info('Info message', { data });
logger.warn('Warning message', { data });
logger.error('Error occurred', error, { context });
```

### Log Levels
- **debug**: Detailed information for debugging (disabled in production)
- **info**: General informational messages
- **warn**: Warning messages (reported to remote in production)
- **error**: Error messages (always reported to remote)

## 🧪 Testing

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 📱 App Store Submission

### Before Submission

1. **Update version numbers** in [app.json](app.json)
2. **Configure app icons** and splash screens
3. **Update privacy policy** links
4. **Test on physical devices**
5. **Complete app store listings**

### iOS Submission

1. Update [eas.json](eas.json) with Apple credentials
2. Build: `npm run build:ios:prod`
3. Submit: `npm run submit:ios`

### Android Submission

1. Update [eas.json](eas.json) with Google Play credentials
2. Build: `npm run build:android:prod`
3. Submit: `npm run submit:android`

## 🐛 Troubleshooting

### Build Errors
- Check Node.js version (>= 18.x)
- Clear cache: `expo start -c`
- Reinstall: `rm -rf node_modules && npm install`

### Network Issues
- Check API_URL in environment variables
- Verify network connectivity
- Check firewall/proxy settings

### Type Errors
- Run `npm run type-check`
- Check tsconfig.json configuration
- Ensure all dependencies are properly installed

## 📚 Further Reading

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [React Native Security](https://reactnative.dev/docs/security)
- [Performance Best Practices](https://reactnative.dev/docs/performance)

## 🤝 Contributing

When adding new features:
1. Follow the established patterns
2. Add proper error handling
3. Include analytics events
4. Update type definitions
5. Test on both iOS and Android
6. Update documentation

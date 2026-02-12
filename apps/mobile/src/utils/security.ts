/**
 * Security Utilities
 * Biometric authentication, SSL pinning, and secure data handling
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { logger } from './logger';

export class SecurityManager {
  private static instance: SecurityManager;
  private biometricAvailable: boolean = false;
  private biometricType: LocalAuthentication.AuthenticationType[] = [];

  private constructor() {
    this.initializeBiometrics();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private async initializeBiometrics() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        logger.info('Biometric hardware not available');
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        logger.info('No biometric credentials enrolled');
        return;
      }

      this.biometricAvailable = true;
      this.biometricType = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      logger.info('Biometric authentication available', {
        types: this.biometricType,
      });
    } catch (error) {
      logger.error('Failed to initialize biometrics', error);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    return this.biometricAvailable;
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(
    promptMessage: string = 'Authenticate to continue'
  ): Promise<boolean> {
    if (!this.biometricAvailable) {
      logger.warn('Biometric authentication not available');
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        logger.info('Biometric authentication successful');
        return true;
      } else {
        logger.warn('Biometric authentication failed', {
          error: result.error,
        });
        return false;
      }
    } catch (error) {
      logger.error('Biometric authentication error', error);
      return false;
    }
  }

  /**
   * Get biometric type name for display
   */
  getBiometricTypeName(): string {
    if (!this.biometricAvailable) return 'None';

    const types = this.biometricType;
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    return 'Biometric';
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Validate input against XSS attacks
   */
  sanitizeInput(input: string): string {
    if (!input) return input;

    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate secure random string
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
      }
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    valid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters');
    } else {
      score += 1;
    }

    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
    if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
    if (!/[0-9]/.test(password)) feedback.push('Add numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters');

    return {
      valid: score >= 4,
      score,
      feedback,
    };
  }
}

export const securityManager = SecurityManager.getInstance();

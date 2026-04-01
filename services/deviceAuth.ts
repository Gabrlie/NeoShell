import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return false;
  }

  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<{
  success: boolean;
  fallbackToPassword: boolean;
  error?: string;
}> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptSubtitle: '使用设备生物识别完成验证',
    promptDescription: '验证失败或取消后可改用安全密码。',
    cancelLabel: '改用安全密码',
    disableDeviceFallback: true,
    fallbackLabel: '',
  });

  if (result.success) {
    return {
      success: true,
      fallbackToPassword: false,
    };
  }

  return {
    success: false,
    fallbackToPassword: true,
    error: result.error,
  };
}

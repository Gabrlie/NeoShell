import {
  deleteSecureValue,
  getSecureValue,
  setSecureValue,
} from './credential/secureStore';

const SECURITY_PASSWORD_KEY = 'neoshell-security-password';

export async function saveSecurityPassword(password: string): Promise<void> {
  await setSecureValue(SECURITY_PASSWORD_KEY, password);
}

export async function verifySecurityPassword(password: string): Promise<boolean> {
  const storedPassword = await getSecureValue(SECURITY_PASSWORD_KEY);
  if (!storedPassword) {
    return false;
  }

  return storedPassword === password;
}

export async function clearSecurityPassword(): Promise<void> {
  await deleteSecureValue(SECURITY_PASSWORD_KEY);
}

export async function getSecurityPasswordStatus(): Promise<{ configured: boolean }> {
  const storedPassword = await getSecureValue(SECURITY_PASSWORD_KEY);
  return { configured: Boolean(storedPassword) };
}

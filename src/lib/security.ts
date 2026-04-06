const FINBO_STORAGE_KEYS = ['finbo-storage', 'finbo-security'];

const textEncoder = new TextEncoder();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const normalizePin = (pin: string) => pin.trim();

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(normalizePin(pin));

export const generatePinSalt = () => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToHex(salt);
};

export const hashPin = async (pin: string, salt: string) => {
  const payload = textEncoder.encode(`${salt}:${normalizePin(pin)}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return bytesToHex(new Uint8Array(digest));
};

export const createPinRecord = async (pin: string) => {
  const salt = generatePinSalt();
  const hash = await hashPin(normalizePin(pin), salt);
  return { hash, salt };
};

export const verifyPin = async (pin: string, salt: string, expectedHash: string) => {
  const hash = await hashPin(normalizePin(pin), salt);
  return hash === expectedHash;
};

export const clearFinboDeviceData = () => {
  FINBO_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const encoder = new TextEncoder();
const iterations = 100_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations
    },
    key,
    256
  );

  return new Uint8Array(bits);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);

  return `${iterations}:${bytesToBase64(salt)}:${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [storedIterations, salt, expectedHash] = storedHash.split(':');

  if (storedIterations !== String(iterations) || !salt || !expectedHash) {
    return false;
  }

  const hash = await derivePasswordHash(password, base64ToBytes(salt));

  return timingSafeEqual(hash, base64ToBytes(expectedHash));
}

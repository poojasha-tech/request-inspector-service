import {nanoid} from 'nanoid';
import crypto from 'crypto';

const SECRET_KEY = process.env.SECRET_KEY || 'default_super_secret_key';

export function generateSignedId() {
  const id = nanoid(); // Default 21 chars
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY)
    .update(id)
    .digest('hex');

  const signature = hmac.substring(0, 6);
  return `${id}.${signature}`;
}

/**
 * Validates a signed NanoID
 * @param {string} signedId - The ID received from the user
 */
export function validateSignedId(signedId) {
  if (!signedId || !signedId.includes('.')) return false;

  const [id, receivedSignature] = signedId.split('.');

  // Re-calculate the HMAC based on the ID part
  const expectedHmac = crypto.createHmac('sha256', SECRET_KEY)
    .update(id)
    .digest('hex');
    
  const expectedSignature = expectedHmac.substring(0, 6);

  // Use timingSafeEqual to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );

  return isValid ? id : false;
}



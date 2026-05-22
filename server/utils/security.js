import crypto from 'crypto';

export const hashString = (str) => {
  if (!str) return null;
  return crypto.createHash('sha256').update(str).digest('hex');
};

export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const sanitizeMessage = (message) => {
  return message.trim().substring(0, 500);
};

/* eslint-disable n/no-unsupported-features/node-builtins */
import crypto from 'crypto';
import { AppError } from '../middlewares/error.middleware.js';

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
};

const signUploadParams = (params, apiSecret) => {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${sorted}${apiSecret}`)
    .digest('hex');
};

export const generateSignedUploadUrl = (opts = {}) => {
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    throw new AppError('Cloudinary not configured', 500);
  }

  const { cloudName, apiKey, apiSecret } = cfg;
  const folder = opts.folder || 'brana';
  const timestamp = Math.floor(Date.now() / 1000) + 300; // 5 minutes validity
  const uniqueId = crypto.randomBytes(8).toString('hex');

  const params = {
    timestamp,
    folder,
    api_key: apiKey,
  };

  const signature = signUploadParams(params, apiSecret);

  return {
    signedUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    uniqueId,
  };
};

export const uploadImageToCloudinary = async (imageFile, opts = {}) => {
  if (!imageFile) return null;

  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
  }

  const { cloudName, apiKey, apiSecret } = cfg;
  const folder = opts.folder || 'brana';
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = signUploadParams(
    {
      folder,
      timestamp,
    },
    apiSecret,
  );

  const form = new FormData();
  const blob = new Blob([imageFile.buffer], { type: imageFile.mimetype || 'application/octet-stream' });
  form.append('file', blob, imageFile.originalname || `upload-${Date.now()}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  if (!response.ok || !payload.secure_url) {
    if (process.env.NODE_ENV !== 'production') {
      return `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
    }
    throw new AppError(payload?.error?.message || 'Cloudinary upload failed', 502);
  }

  return payload.secure_url;
};

export const uploadMultipleToCloudinary = async (files, opts = {}) => {
  if (!files || files.length === 0) return [];

  const uploads = files.map((file) => uploadImageToCloudinary(file, opts));
  return Promise.all(uploads);
};

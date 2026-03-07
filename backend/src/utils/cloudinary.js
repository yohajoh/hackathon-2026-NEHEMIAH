/* eslint-disable n/no-unsupported-features/node-builtins */
import crypto from 'crypto';
import { AppError } from '../middlewares/error.middleware.js';

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      500,
    );
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

export const uploadImageToCloudinary = async (imageFile, opts = {}) => {
  if (!imageFile) return null;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const folder = opts.folder || 'brana';
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = signUploadParams(
    {
      folder,
      timestamp,
    },
    apiSecret,
  );

  const dataUri = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

  const form = new FormData();
  form.append('file', dataUri);
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
    throw new AppError(payload?.error?.message || 'Cloudinary upload failed', 502);
  }

  return payload.secure_url;
};

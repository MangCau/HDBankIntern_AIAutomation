const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * Generate UUID v4 using crypto
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Upload base64 image to Google Cloud Storage
 * @param {string} base64Image - Base64 encoded image string (with data:image/... prefix)
 * @param {string} folder - Folder path in GCS (e.g., 'news-images')
 * @returns {Promise<string>} - Public URL of uploaded image
 */
async function uploadBase64Image(base64Image, folder = 'images') {
  try {
    // Extract base64 data and mime type
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename using crypto
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${folder}/${generateUUID()}.${extension}`;

    // Create file in GCS
    const file = bucket.file(filename);

    // Upload with metadata
    // Note: Bucket should have IAM permission (allUsers -> Storage Object Viewer) for public access
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Return public URL (works because bucket has public IAM permissions)
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    throw error;
  }
}

/**
 * Delete image from Google Cloud Storage
 * @param {string} imageUrl - Public URL of the image to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteImage(imageUrl) {
  try {
    // Extract filename from URL
    const urlPattern = new RegExp(`https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/(.+)`);
    const matches = imageUrl.match(urlPattern);

    if (!matches || matches.length !== 2) {
      console.log('Invalid GCS URL format, skipping deletion');
      return false;
    }

    const filename = matches[1];
    const file = bucket.file(filename);

    // Delete file
    await file.delete();
    console.log(`Deleted image: ${filename}`);
    return true;
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    // Don't throw error - allow operation to continue even if deletion fails
    return false;
  }
}

module.exports = {
  bucket,
  uploadBase64Image,
  deleteImage
};

/**
 * Supabase Storage Utilities
 * Handles uploading and managing images in Supabase Storage
 */

import { supabase } from '../lib/supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string; // filename with path
  size?: number;
  contentType?: string;
  error?: string;
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  VERIFICATION_SELFIES: 'verification-selfies',
};

// Path prefixes
export const STORAGE_PATHS = {
  profilePictures: (userId: string) => `${userId}/profile`,
  verificationSelfies: (userId: string) => `${userId}/verifications`,
};

/**
 * Upload profile picture to Supabase Storage
 * @param file File to upload (WebP or JPEG)
 * @param userId User ID
 * @returns Upload result with URL
 */
export async function uploadProfilePicture(file: File, userId: string): Promise<UploadResult> {
  try {
    const fileName = `profile-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${STORAGE_PATHS.profilePictures(userId)}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_PICTURES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return {
        success: false,
        error: `Failed to upload profile picture: ${error.message}`,
      };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_PICTURES)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      publicId: filePath,
      size: file.size,
      contentType: file.type,
    };
  } catch (error) {
    return {
      success: false,
      error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Upload verification selfie to Supabase Storage
 * Files are private and only accessible to authenticated users and admins
 * @param file File to upload (WebP or JPEG)
 * @param userId User ID
 * @returns Upload result with URL
 */
export async function uploadVerificationSelfie(file: File, userId: string): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const fileName = `selfie-${timestamp}.${file.name.split('.').pop()}`;
    const filePath = `${STORAGE_PATHS.verificationSelfies(userId)}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.VERIFICATION_SELFIES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return {
        success: false,
        error: `Failed to upload verification selfie: ${error.message}`,
      };
    }

    // Create signed URL (private, expires in 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKETS.VERIFICATION_SELFIES)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      return {
        success: false,
        error: `Failed to create signed URL: ${signedUrlError.message}`,
      };
    }

    return {
      success: true,
      url: signedUrlData.signedUrl,
      publicId: filePath,
      size: file.size,
      contentType: file.type,
    };
  } catch (error) {
    return {
      success: false,
      error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucket Bucket name
 * @param filePath File path to delete
 * @returns Success status
 */
export async function deleteStorageFile(bucket: string, filePath: string): Promise<UploadResult> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get public URL for a file
 * @param bucket Bucket name
 * @param filePath File path
 * @returns Public URL
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Get signed URL for a private file
 * @param bucket Bucket name
 * @param filePath File path
 * @param expiresIn Expiry time in seconds (default 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL error:', error);
    return null;
  }
}

/**
 * List files in a bucket
 * @param bucket Bucket name
 * @param path Path prefix (optional)
 * @returns List of files
 */
export async function listFiles(bucket: string, path?: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Failed to list files:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('List files error:', error);
    return [];
  }
}

/**
 * Update profile picture in database and storage
 * @param userId User ID
 * @param newProfileUrl New profile picture URL
 * @param newPublicId New public ID (file path)
 * @param oldPublicId Old public ID to delete (optional)
 * @returns Success status
 */
export async function updateProfilePictureInDatabase(
  userId: string,
  newProfileUrl: string,
  newPublicId: string,
  oldPublicId?: string
): Promise<UploadResult> {
  try {
    // Delete old profile picture if provided
    if (oldPublicId) {
      await deleteStorageFile(STORAGE_BUCKETS.PROFILE_PICTURES, oldPublicId);
    }

    // Update database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        profile_picture_url: newProfileUrl,
        profile_picture_public_id: newPublicId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update profile: ${updateError.message}`,
      };
    }

    return {
      success: true,
      url: newProfileUrl,
      publicId: newPublicId,
    };
  } catch (error) {
    return {
      success: false,
      error: `Update error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a temporary signed URL for viewing verification images
 * Used by admins to review verification selfies
 * @param filePath File path
 * @param expiresIn Expiry time in seconds (default 24 hours for admin review)
 * @returns Signed URL or null
 */
export async function createVerificationImageSignedUrl(
  filePath: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string | null> {
  return getSignedUrl(STORAGE_BUCKETS.VERIFICATION_SELFIES, filePath, expiresIn);
}

/**
 * Check if file exists in bucket
 * @param bucket Bucket name
 * @param filePath File path
 * @returns True if file exists, false otherwise
 */
export async function fileExists(bucket: string, filePath: string): Promise<boolean> {
  try {
    const files = await listFiles(bucket, filePath.split('/').slice(0, -1).join('/'));
    const fileName = filePath.split('/').pop();
    return files.some((f: any) => f.name === fileName);
  } catch (error) {
    return false;
  }
}

/**
 * Get file size
 * @param bucket Bucket name
 * @param filePath File path
 * @returns File size in bytes or null
 */
export async function getFileSize(bucket: string, filePath: string): Promise<number | null> {
  try {
    const files = await listFiles(bucket, filePath.split('/').slice(0, -1).join('/'));
    const file = files.find((f: any) => f.name === filePath.split('/').pop());
    return file?.metadata?.size || null;
  } catch (error) {
    return null;
  }
}
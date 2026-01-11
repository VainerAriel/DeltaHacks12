import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, isS3Configured } from './client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function uploadVideoToS3(
  file: File | Buffer,
  fileName: string
): Promise<string> {
  // If S3 not configured, fall back to local storage
  if (!isS3Configured) {
    console.log('S3 not configured, saving locally');
    return await saveVideoLocally(file, fileName);
  }

  try {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `recordings/${fileName}`,
      Body: buffer,
      ContentType: file instanceof File ? file.type : 'video/mp4',
      // Make it private (use presigned URLs for access)
      ACL: 'private',
    });

    await s3Client.send(command);

    // Return S3 URL
    const s3Url = process.env.AWS_CLOUDFRONT_DOMAIN
      ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/recordings/${fileName}`
      : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/recordings/${fileName}`;
    
    console.log('Video uploaded to S3:', s3Url);
    return s3Url;
  } catch (error) {
    console.error('S3 upload failed, falling back to local storage:', error);
    return await saveVideoLocally(file, fileName);
  }
}

async function saveVideoLocally(
  file: File | Buffer,
  fileName: string
): Promise<string> {
  // On Vercel, filesystem is read-only except /tmp
  // This fallback should not be used in production
  if (process.env.VERCEL) {
    throw new Error('S3 storage is required on Vercel. Please configure AWS S3 credentials.');
  }
  
  const uploadsDir = path.join(process.cwd(), 'uploads', 'recordings');
  
  // Ensure directory exists
  await mkdir(uploadsDir, { recursive: true });
  
  const filePath = path.join(uploadsDir, fileName);
  
  const buffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file;
    
  await writeFile(filePath, buffer);
  
  // Return local URL that can be served by Next.js
  return `/api/videos/${fileName}`;
}

/**
 * Upload any file to S3
 */
export async function uploadToS3(
  file: File | Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'recordings'
): Promise<string> {
  // On Vercel, S3 is required
  if (process.env.VERCEL && !isS3Configured) {
    throw new Error('S3 storage is required on Vercel. Please configure AWS S3 credentials.');
  }

  // If S3 not configured, fall back to local storage (dev only)
  if (!isS3Configured) {
    console.log('S3 not configured, saving locally (dev mode only)');
    if (process.env.VERCEL) {
      throw new Error('S3 storage is required on Vercel. Please configure AWS S3 credentials.');
    }
    return await saveFileLocally(file, fileName, folder);
  }

  try {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `${folder}/${fileName}`,
      Body: buffer,
      ContentType: contentType,
      // Make it private (use presigned URLs for access)
      ACL: 'private',
    });

    await s3Client.send(command);

    // Return S3 URL
    const s3Url = process.env.AWS_CLOUDFRONT_DOMAIN
      ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${folder}/${fileName}`
      : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${fileName}`;
    
    console.log('File uploaded to S3:', s3Url);
    return s3Url;
  } catch (error) {
    console.error('S3 upload failed:', error);
    if (process.env.VERCEL) {
      throw new Error('S3 upload failed. This is required on Vercel.');
    }
    return await saveFileLocally(file, fileName, folder);
  }
}

async function saveFileLocally(
  file: File | Buffer,
  fileName: string,
  folder: string
): Promise<string> {
  // On Vercel, filesystem is read-only except /tmp
  if (process.env.VERCEL) {
    throw new Error('S3 storage is required on Vercel. Please configure AWS S3 credentials.');
  }
  
  const uploadsDir = path.join(process.cwd(), 'uploads', folder);
  
  // Ensure directory exists
  await mkdir(uploadsDir, { recursive: true });
  
  const filePath = path.join(uploadsDir, fileName);
  
  const buffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file;
    
  await writeFile(filePath, buffer);
  
  // Return local URL
  return `/uploads/${folder}/${fileName}`;
}
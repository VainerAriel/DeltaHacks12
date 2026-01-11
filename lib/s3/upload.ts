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
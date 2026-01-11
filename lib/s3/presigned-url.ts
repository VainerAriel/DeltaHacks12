import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, isS3Configured } from './client';

export async function getPresignedUrl(s3Url: string): Promise<string> {
  // If local URL (starts with /api/videos/), return as-is
  if (s3Url.startsWith('/api/videos/') || s3Url.startsWith('/')) {
    return s3Url;
  }

  // If S3 not configured, return as-is
  if (!isS3Configured) {
    return s3Url;
  }

  // For CloudFront URLs, always generate presigned URLs since the bucket is private
  // CloudFront URLs typically have the format: https://[distribution-id].cloudfront.net/path
  // or custom domain pointing to CloudFront
  if (s3Url.includes('cloudfront.net') || 
      (process.env.AWS_CLOUDFRONT_DOMAIN && s3Url.includes(process.env.AWS_CLOUDFRONT_DOMAIN))) {
    // Extract key from CloudFront URL: https://domain.com/recordings/filename.mp4
    try {
      const urlObj = new URL(s3Url);
      const key = urlObj.pathname.substring(1); // Remove leading slash
      
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 
      });

      console.log('Generated presigned URL for CloudFront:', presignedUrl.substring(0, 100) + '...');
      return presignedUrl;
    } catch (error) {
      console.error('Failed to generate presigned URL for CloudFront:', error);
      return s3Url; // Fallback to original URL
    }
  }

  // For S3 URLs (s3.amazonaws.com)
  if (s3Url.includes('s3.amazonaws.com')) {
    try {
      // Extract key from S3 URL
      // Format: https://bucket.s3.region.amazonaws.com/recordings/filename.mp4
      const urlParts = s3Url.split('.s3.');
      if (urlParts.length < 2) {
        return s3Url; // Invalid URL format
      }
      
      const pathPart = urlParts[1].split('/');
      const key = pathPart.slice(1).join('/'); // Remove bucket name, get the key

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      });

      // Generate presigned URL valid for 1 hour
      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 
      });

      return presignedUrl;
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      return s3Url; // Fallback to original URL
    }
  }

  // For any other URL format, return as-is
  return s3Url;
}
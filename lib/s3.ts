import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a file to S3
 * @param file - The file to upload (File or Buffer)
 * @param fileName - The name to use for the file in S3
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadToS3(
  file: File | Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    // Make the file publicly readable (adjust based on your needs)
    // For private files, remove ACL and use presigned URLs instead
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Construct the public URL
  // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
  // Or if using CloudFront: https://{cloudfront-domain}/{key}
  const region = process.env.AWS_REGION || 'us-east-1';
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  
  if (cloudfrontDomain) {
    // Use CloudFront domain if configured
    return `https://${cloudfrontDomain}/${fileName}`;
  } else {
    // Use S3 direct URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
  }
}

/**
 * Checks if S3 is properly configured
 * @returns true if S3 credentials and bucket are configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

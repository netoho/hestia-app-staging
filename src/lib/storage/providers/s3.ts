/**
 * AWS S3 Storage Provider
 * Implements private file storage with signed URLs
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  StorageUploadOptions,
  SignedUrlOptions,
  StorageFileMetadata,
} from '../types';
import { Readable } from 'stream';
import { sanitizeForS3Metadata, encodeFilenameForHeaders } from '@/lib/utils/filename';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicBucket: string;
  private region: string;

  constructor(config: {
    bucket: string;
    publicBucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  }) {
    this.bucket = config.bucket;
    this.publicBucket = config.publicBucket;
    this.region = config.region;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
    });
  }

  async publicUpload(options: StorageUploadOptions): Promise<string> {
    return this.upload(options, false);
  }

  async privateUpload(options: StorageUploadOptions): Promise<string> {
    return this.upload(options, true);
  }

  async upload(options: StorageUploadOptions, isPrivate: boolean): Promise<string> {
    // Sanitize originalName for S3 metadata (ASCII-only)
    const sanitizedMetadata: Record<string, string> = {};

    // Sanitize originalName
    if (options.file.originalName) {
      sanitizedMetadata.originalName = sanitizeForS3Metadata(options.file.originalName);
    }

    // Sanitize any other metadata values
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        // Ensure all metadata values are ASCII-only
        sanitizedMetadata[key] = value ? sanitizeForS3Metadata(value) : '';
      }
    }

    const acl = isPrivate ? 'private' : 'public-read';
    const bucket = isPrivate ? this.bucket : this.publicBucket;


    console.log({
      Bucket: bucket,
      Key: options.path,
      Body: options.file.buffer,
      ContentType: options.contentType || options.file.mimeType,
      Metadata: sanitizedMetadata,
      // Private by default - no public access
      ACL: acl,
    })

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: options.path,
      Body: options.file.buffer,
      ContentType: options.contentType || options.file.mimeType,
      Metadata: sanitizedMetadata,
      // Private by default - no public access
      ACL: acl,
    });

    await this.client.send(command);
    return options.path;
  }

  async download(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('File not found');
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(path: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(path: string): Promise<StorageFileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        created: response.LastModified || new Date(),
        updated: response.LastModified || new Date(),
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    let command;

    switch (options.action) {
      case 'read':
        let contentDisposition: string | undefined;
        if (options.responseDisposition === 'attachment') {
          const filename = options.fileName || options.path.split('/').pop() || 'download';
          // Use RFC 5987 format for proper encoding of non-ASCII characters
          contentDisposition = `attachment; filename*=UTF-8''${encodeFilenameForHeaders(filename)}`;
        }

        command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: options.path,
          ResponseContentDisposition: contentDisposition,
        });
        break;

      case 'write':
        command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: options.path,
        });
        break;

      case 'delete':
        command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: options.path,
        });
        break;

      default:
        throw new Error(`Unsupported action: ${options.action}`);
    }

    // Default to 60 seconds for security (enough time for downloads)
    const expiresIn = options.expiresInSeconds || 60;

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return signedUrl;
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents
        .filter(obj => obj.Key)
        .map(obj => obj.Key as string);
    } catch (error) {
      console.error('Error listing files from S3:', error);
      return [];
    }
  }

  getPublicUrl(path: string): string {
    // Construct the public S3 URL
    // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    return `https://${this.publicBucket}.s3.${this.region}.amazonaws.com/${path}`;
  }
}

// das-backend/packages/storage-service/src/minio.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { createHash } from 'crypto';

export interface StorageObject {
  bucket: string;
  key: string;
  size: number;
  etag: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private readonly buckets = {
    RAW_MEDIA: 'raw-media',
    PROCESSED_MEDIA: 'processed-media',
    TEMP: 'temp-uploads',
  };

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ROOT_USER', 'minioadmin'),
      secretKey: this.configService.get('MINIO_ROOT_PASSWORD', 'minioadmin'),
    });
  }

  async onModuleInit() {
    await this.ensureBuckets();
  }

  private async ensureBuckets() {
    for (const bucket of Object.values(this.buckets)) {
      try {
        const exists = await this.minioClient.bucketExists(bucket);
        if (!exists) {
          await this.minioClient.makeBucket(bucket, 'us-east-1');
          this.logger.log(`Created bucket: ${bucket}`);
        }
      } catch (error) {
        this.logger.error(`Failed to ensure bucket ${bucket}:`, error);
      }
    }
  }

  async uploadFile(
    bucket: string,
    key: string,
    buffer: Buffer | Readable,
    metadata?: Record<string, string>,
  ): Promise<StorageObject> {
    try {
      const size = Buffer.isBuffer(buffer) ? buffer.length : undefined;
      const stream = Buffer.isBuffer(buffer) ? Readable.from(buffer) : buffer;

      const uploadResult = await this.minioClient.putObject(
        bucket,
        key,
        stream,
        size,
        metadata,
      );

      this.logger.debug(`Uploaded file to ${bucket}/${key}`);

      return {
        bucket,
        key,
        size: size || 0,
        etag: uploadResult.etag,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to ${bucket}/${key}:`, error);
      throw error;
    }
  }

  async downloadFile(path: string): Promise<Buffer> {
    try {
      // Parse MinIO URL: minio://bucket/key
      const match = path.match(/^minio:\/\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error(`Invalid MinIO path: ${path}`);
      }

      const [, bucket, key] = match;
      const stream = await this.minioClient.getObject(bucket, key);
      
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file from ${path}:`, error);
      throw error;
    }
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiry: number = 3600,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(bucket, key, expiry);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${bucket}/${key}:`, error);
      throw error;
    }
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(bucket, key);
      this.logger.debug(`Deleted file ${bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${bucket}/${key}:`, error);
      throw error;
    }
  }

  async listFiles(
    bucket: string,
    prefix?: string,
    maxKeys: number = 1000,
  ): Promise<StorageObject[]> {
    try {
      const stream = this.minioClient.listObjectsV2(bucket, prefix, true);
      const objects: StorageObject[] = [];

      for await (const obj of stream) {
        if (objects.length >= maxKeys) break;
        
        objects.push({
          bucket,
          key: obj.name,
          size: obj.size,
          etag: obj.etag,
        });
      }

      return objects;
    } catch (error) {
      this.logger.error(`Failed to list files in ${bucket}:`, error);
      throw error;
    }
  }

  async statObject(bucket: string, key: string): Promise<StorageObject | null> {
    try {
      const stat = await this.minioClient.statObject(bucket, key);
      return {
        bucket,
        key,
        size: stat.size,
        etag: stat.etag,
        contentType: stat.metaData?.['content-type'],
        metadata: stat.metaData,
      };
    } catch (error) {
      if ((error as any).code === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<void> {
    try {
      await this.minioClient.copyObject(
        destBucket,
        destKey,
        `/${sourceBucket}/${sourceKey}`,
      );
      this.logger.debug(`Copied ${sourceBucket}/${sourceKey} to ${destBucket}/${destKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy object:`, error);
      throw error;
    }
  }

  generateFileKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5').update(filename).digest('hex').substring(0, 8);
    const ext = filename.split('.').pop() || 'unknown';
    return `${prefix}/${timestamp}-${hash}.${ext}`;
  }
}
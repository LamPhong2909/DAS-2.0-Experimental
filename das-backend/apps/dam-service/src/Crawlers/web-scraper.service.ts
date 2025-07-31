// das-backend/apps/dam-service/src/crawlers/web-scraper.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { createHash } from 'crypto';
import * as sharp from 'sharp';
import { MinioService } from '../storage/minio.service';
import { PrismaService } from '@das/prisma-client';
import { MediaItem } from '@prisma/client';

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);
  private browser: Browser | null = null;

  constructor(
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeUrl(
    url: string,
    selector: string,
    depth: number = 1,
    jobId: string,
  ): Promise<MediaItem[]> {
    const page = await this.browser!.newPage();
    const scraped: MediaItem[] = [];

    try {
      // Configure page
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (compatible; DAS-Crawler/1.0; +https://das.ai)',
      });

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Extract image URLs
      const imageUrls = await page.$$eval(selector, (elements) => 
        elements
          .filter((el): el is HTMLImageElement => el.tagName === 'IMG')
          .map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth,
            height: img.naturalHeight,
          }))
          .filter(img => img.src && img.width > 100 && img.height > 100)
      );

      this.logger.log(`Found ${imageUrls.length} images on ${url}`);

      // Process each image
      for (const imgData of imageUrls) {
        try {
          const mediaItem = await this.processImage(
            imgData.src,
            url,
            jobId,
            { alt: imgData.alt }
          );
          if (mediaItem) {
            scraped.push(mediaItem);
          }
        } catch (error) {
          this.logger.error(`Failed to process image ${imgData.src}:`, error);
        }
      }

      // Handle depth recursion
      if (depth > 1) {
        const links = await page.$$eval('a[href]', links => 
          links.map(link => link.href)
            .filter(href => href.startsWith('http'))
        );

        // Process a subset of links to avoid explosion
        const uniqueLinks = [...new Set(links)].slice(0, 5);
        for (const link of uniqueLinks) {
          try {
            const subScraped = await this.scrapeUrl(link, selector, depth - 1, jobId);
            scraped.push(...subScraped);
          } catch (error) {
            this.logger.error(`Failed to scrape ${link}:`, error);
          }
        }
      }

    } catch (error) {
      this.logger.error(`Failed to scrape ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }

    return scraped;
  }

  private async processImage(
    imageUrl: string,
    sourceUrl: string,
    jobId: string,
    metadata: any,
  ): Promise<MediaItem | null> {
    try {
      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Calculate checksum
      const checksum = createHash('sha256').update(buffer).digest('hex');

      // Check for duplicates
      const existing = await this.prisma.mediaItem.findUnique({
        where: { checksum },
      });

      if (existing) {
        this.logger.debug(`Duplicate image detected: ${checksum}`);
        return existing;
      }

      // Process with Sharp
      const image = sharp(buffer);
      const imageMetadata = await image.metadata();
      
      // Calculate perceptual hash (simplified version)
      const pHash = await this.calculatePHash(image);

      // Generate unique filename
      const filename = `${jobId}/${checksum}.${imageMetadata.format}`;

      // Upload to MinIO
      await this.minioService.uploadFile('raw-media', filename, buffer);

      // Create database record
      const mediaItem = await this.prisma.mediaItem.create({
        data: {
          sourceUrl: imageUrl,
          localPath: `minio://raw-media/${filename}`,
          mimeType: `image/${imageMetadata.format}`,
          fileSize: buffer.length,
          width: imageMetadata.width,
          height: imageMetadata.height,
          pHash,
          checksum,
          license: 'Unknown', // Would need to detect from page
          tags: ['scraped', 'unprocessed'],
          metadata: {
            ...metadata,
            originalPageUrl: sourceUrl,
            scrapedAt: new Date().toISOString(),
          },
          acquisitionJobId: jobId,
        },
      });

      this.logger.log(`Successfully processed image: ${mediaItem.id}`);
      return mediaItem;

    } catch (error) {
      this.logger.error(`Failed to process image ${imageUrl}:`, error);
      return null;
    }
  }

  private async calculatePHash(image: sharp.Sharp): Promise<string> {
    // Simplified pHash calculation
    // In production, use a proper pHash library
    const resized = await image
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    const average = resized.reduce((sum, val) => sum + val, 0) / 64;
    
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += resized[i] > average ? '1' : '0';
    }

    return BigInt('0b' + hash).toString(16).padStart(16, '0');
  }
}
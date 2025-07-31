// das-backend/apps/eapp-service/src/augmentation/augmentation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { MinioService } from '../storage/minio.service';
import { PrismaService } from '@das/prisma-client';
import { ExperimentMedia, MediaItem } from '@prisma/client';

interface DegradationParams {
  type: string;
  parameters: Record<string, any>;
}

@Injectable()
export class AugmentationService {
  private readonly logger = new Logger(AugmentationService.name);

  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  async processExperiment(experimentId: string, config: any): Promise<void> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    try {
      // Update status
      await this.prisma.experiment.update({
        where: { id: experimentId },
        data: { status: 'RUNNING' },
      });

      // Get media items based on config
      const mediaItems = await this.getMediaItemsForExperiment(config);
      
      this.logger.log(`Processing ${mediaItems.length} media items for experiment ${experimentId}`);

      // Process each media item
      for (const mediaItem of mediaItems) {
        try {
          await this.processMediaItem(experimentId, mediaItem, config.degradations);
        } catch (error) {
          this.logger.error(`Failed to process media ${mediaItem.id}:`, error);
        }
      }

      // Generate degradation manifest
      const manifest = await this.generateDegradationManifest(experimentId);

      // Update experiment status
      await this.prisma.experiment.update({
        where: { id: experimentId },
        data: {
          status: 'COMPLETED',
          degradationManifest: manifest,
        },
      });

    } catch (error) {
      this.logger.error(`Experiment ${experimentId} failed:`, error);
      
      await this.prisma.experiment.update({
        where: { id: experimentId },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }

  private async processMediaItem(
    experimentId: string,
    mediaItem: MediaItem,
    degradations: DegradationParams[],
  ): Promise<ExperimentMedia> {
    // Download original image
    const buffer = await this.minio.downloadFile(mediaItem.localPath);
    
    // Apply degradations
    let processedImage = sharp(buffer);
    const appliedDegradations: any[] = [];

    for (const degradation of degradations) {
      const result = await this.applyDegradation(processedImage, degradation);
      processedImage = result.image;
      appliedDegradations.push(result.applied);
    }

    // Save processed image
    const processedBuffer = await processedImage.toBuffer();
    const filename = `experiments/${experimentId}/${mediaItem.id}_augmented.jpg`;
    await this.minio.uploadFile('processed-media', filename, processedBuffer);

    // Create database record
    return await this.prisma.experimentMedia.create({
      data: {
        experimentId,
        originalMediaId: mediaItem.id,
        processedPath: `minio://processed-media/${filename}`,
        degradations: appliedDegradations,
      },
    });
  }

  private async applyDegradation(
    image: sharp.Sharp,
    degradation: DegradationParams,
  ): Promise<{ image: sharp.Sharp; applied: any }> {
    const { type, parameters } = degradation;
    let applied: any = { type, parameters, actualParameters: {} };

    switch (type) {
      case 'motion_blur':
        // Simulate motion blur using directional blur
        const kernel = this.createMotionBlurKernel(
          parameters.kernel_size || 5,
          parameters.angle || 0,
        );
        image = image.convolve({
          width: kernel.size,
          height: kernel.size,
          kernel: kernel.values,
        });
        applied.actualParameters = { kernel_size: kernel.size, angle: parameters.angle };
        break;

      case 'gaussian_blur':
        const sigma = parameters.sigma || 1.0;
        image = image.blur(sigma);
        applied.actualParameters = { sigma };
        break;

      case 'brightness':
        const brightness = parameters.factor || 1.0;
        image = image.modulate({ brightness });
        applied.actualParameters = { factor: brightness };
        break;

      case 'contrast':
        // Implement contrast adjustment
        const contrast = parameters.factor || 1.0;
        image = image.linear(contrast, -(128 * (contrast - 1)));
        applied.actualParameters = { factor: contrast };
        break;

      case 'noise':
        // Add noise using composite operation
        const noiseLevel = parameters.level || 0.1;
        const noiseBuffer = await this.generateNoiseImage(
          await image.metadata(),
          noiseLevel,
        );
        image = image.composite([{
          input: noiseBuffer,
          blend: 'over',
          opacity: noiseLevel,
        }]);
        applied.actualParameters = { level: noiseLevel };
        break;

      case 'occlusion':
        // Add random occlusions
        const occlusionParams = await this.addOcclusion(image, parameters);
        image = occlusionParams.image;
        applied.actualParameters = occlusionParams.params;
        break;

      case 'color_shift':
        // Simulate color temperature changes
        const temperature = parameters.temperature || 0;
        image = image.modulate({
          hue: temperature * 10, // Convert to hue shift
        });
        applied.actualParameters = { temperature };
        break;

      default:
        this.logger.warn(`Unknown degradation type: ${type}`);
    }

    return { image, applied };
  }

  private createMotionBlurKernel(size: number, angle: number): any {
    // Create a motion blur kernel
    const kernel = new Array(size * size).fill(0);
    const center = Math.floor(size / 2);
    const angleRad = (angle * Math.PI) / 180;

    for (let i = 0; i < size; i++) {
      const x = Math.round(center + (i - center) * Math.cos(angleRad));
      const y = Math.round(center + (i - center) * Math.sin(angleRad));
      if (x >= 0 && x < size && y >= 0 && y < size) {
        kernel[y * size + x] = 1 / size;
      }
    }

    return { size, values: kernel };
  }

  private async generateNoiseImage(
    metadata: sharp.Metadata,
    level: number,
  ): Promise<Buffer> {
    const width = metadata.width || 100;
    const height = metadata.height || 100;
    
    // Generate random noise
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      const noise = Math.random() * 255 * level;
      pixels[i] = noise;     // R
      pixels[i + 1] = noise; // G
      pixels[i + 2] = noise; // B
      pixels[i + 3] = 255;   // A
    }

    return sharp(pixels, {
      raw: {
        width,
        height,
        channels: 4,
      },
    }).png().toBuffer();
  }

  private async addOcclusion(
    image: sharp.Sharp,
    parameters: any,
  ): Promise<{ image: sharp.Sharp; params: any }> {
    const metadata = await image.metadata();
    const width = metadata.width || 100;
    const height = metadata.height || 100;

    // Generate random occlusion rectangles
    const numOcclusions = parameters.count || 3;
    const occlusions = [];

    for (let i = 0; i < numOcclusions; i++) {
      const occlusionWidth = Math.floor(width * 0.1 + Math.random() * width * 0.2);
      const occlusionHeight = Math.floor(height * 0.1 + Math.random() * height * 0.2);
      const x = Math.floor(Math.random() * (width - occlusionWidth));
      const y = Math.floor(Math.random() * (height - occlusionHeight));

      // Create black rectangle for occlusion
      const rect = Buffer.from(
        `<svg width="${occlusionWidth}" height="${occlusionHeight}">
          <rect width="${occlusionWidth}" height="${occlusionHeight}" fill="black"/>
        </svg>`
      );

      occlusions.push({ input: rect, top: y, left: x });
    }

    image = image.composite(occlusions);

    return {
      image,
      params: {
        count: numOcclusions,
        occlusions: occlusions.map(o => ({
          x: o.left,
          y: o.top,
          width: o.input.length, // Approximate
          height: o.input.length,
        })),
      },
    };
  }

  private async getMediaItemsForExperiment(config: any): Promise<MediaItem[]> {
    const query: any = {};

    if (config.tags && config.tags.length > 0) {
      query.tags = { hasSome: config.tags };
    }

    if (config.dateRange) {
      query.createdAt = {
        gte: new Date(config.dateRange.start),
        lte: new Date(config.dateRange.end),
      };
    }

    return await this.prisma.mediaItem.findMany({
      where: query,
      take: config.limit || 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateDegradationManifest(experimentId: string): Promise<any> {
    const experimentMedia = await this.prisma.experimentMedia.findMany({
      where: { experimentId },
      include: {
        originalMedia: true,
      },
    });

    const manifest = {
      experimentId,
      totalImages: experimentMedia.length,
      timestamp: new Date().toISOString(),
      degradationSummary: {},
      mediaManifest: experimentMedia.map(em => ({
        originalId: em.originalMediaId,
        processedPath: em.processedPath,
        degradations: em.degradations,
      })),
    };

    // Calculate degradation summary
    for (const em of experimentMedia) {
      const degradations = em.degradations as any[];
      for (const deg of degradations) {
        if (!manifest.degradationSummary[deg.type]) {
          manifest.degradationSummary[deg.type] = {
            count: 0,
            parameters: [],
          };
        }
        manifest.degradationSummary[deg.type].count++;
        manifest.degradationSummary[deg.type].parameters.push(deg.actualParameters);
      }
    }

    return manifest;
  }
}
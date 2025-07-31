// das-backend/apps/dam-service/src/jobs/scraping.processor.ts
import { Process, Processor } from '@nestjs/bullmq/dist/decorators';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ScrapeWebRequestDto } from '@das/common-dtos';
import { PrismaService } from '@das/prisma-client';
import { WebScraperService } from '../crawlers/web-scraper.service';
import { SyntheticDataService } from '../generators/synthetic-data.service';

@Processor('scraping-queue')
export class ScrapingProcessor {
  private readonly logger = new Logger(ScrapingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webScraper: WebScraperService,
    private readonly syntheticData: SyntheticDataService,
  ) {}

  @Process({ name: 'scrape-web', concurrency: 5 })
  async handleScrapeWeb(job: Job<ScrapeWebRequestDto>) {
    this.logger.log(`Starting job ${job.id} with ${job.data.urls.length} URLs`);
    
    await this.updateJobStatus(job.id!, 'ACTIVE');

    try {
      await this.webScraper.initialize();
      
      const allMediaItems = [];
      const totalUrls = job.data.urls.length;

      for (let i = 0; i < totalUrls; i++) {
        const url = job.data.urls[i];
        
        try {
          this.logger.log(`Scraping URL ${i + 1}/${totalUrls}: ${url}`);
          
          const mediaItems = await this.webScraper.scrapeUrl(
            url,
            job.data.rules.selector,
            job.data.rules.depth || 1,
            job.id!,
          );

          allMediaItems.push(...mediaItems);
          
          // Update progress
          const progress = Math.round(((i + 1) / totalUrls) * 100);
          await job.updateProgress(progress);
          await this.updateJobProgress(job.id!, progress);

          // Log progress
          await this.appendJobLog(job.id!, `Scraped ${url}: Found ${mediaItems.length} images`);

        } catch (error) {
          this.logger.error(`Failed to scrape ${url}:`, error);
          await this.appendJobLog(job.id!, `ERROR: Failed to scrape ${url}: ${error.message}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Mark job as completed
      await this.updateJobStatus(job.id!, 'COMPLETED', {
        completedAt: new Date(),
        logs: [`Successfully scraped ${allMediaItems.length} images from ${totalUrls} URLs`],
      });

      this.logger.log(`Job ${job.id} completed. Total images: ${allMediaItems.length}`);
      
      return {
        jobId: job.id,
        totalImages: allMediaItems.length,
        urls: job.data.urls,
      };

    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      
      await this.updateJobStatus(job.id!, 'FAILED', {
        errorMessage: error.message,
        completedAt: new Date(),
      });

      throw error;
    } finally {
      await this.webScraper.destroy();
    }
  }

  @Process({ name: 'generate-synthetic', concurrency: 2 })
  async handleGenerateSynthetic(job: Job<any>) {
    // Implementation for synthetic data generation
    this.logger.log(`Generating synthetic data for job ${job.id}`);
    
    try {
      const result = await this.syntheticData.generateImages(job.data);
      return result;
    } catch (error) {
      this.logger.error(`Synthetic generation failed:`, error);
      throw error;
    }
  }

  private async updateJobStatus(jobId: string, status: string, additionalData?: any) {
    await this.prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: status as any,
        ...additionalData,
      },
    });
  }

  private async updateJobProgress(jobId: string, progress: number) {
    await this.prisma.scrapingJob.update({
      where: { id: jobId },
      data: { progress },
    });
  }

  private async appendJobLog(jobId: string, log: string) {
    const job = await this.prisma.scrapingJob.findUnique({
      where: { id: jobId },
    });

    if (job) {
      await this.prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          logs: [...job.logs, `[${new Date().toISOString()}] ${log}`],
        },
      });
    }
  }
}
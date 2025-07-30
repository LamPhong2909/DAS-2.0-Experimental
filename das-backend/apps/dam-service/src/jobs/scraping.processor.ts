import { Process, Processor } from '@nestjs/bullmq/dist/decorators';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ScrapeWebRequestDto } from '@das/common-dtos';
import { PrismaService } from '@das/prisma-client';
// import { chromium } from 'playwright'; // Sẽ được sử dụng trong logic thực tế

/**
 * @class ScrapingProcessor
 * @description Worker xử lý các job trong hàng đợi 'scraping-queue'.
 */
@Processor('scraping-queue')
export class ScrapingProcessor {
  private readonly logger = new Logger(ScrapingProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @method handleScrapeWeb
   * @description Xử lý một job 'scrape-web' từ hàng đợi.
   */
  @Process({ name: 'scrape-web', concurrency: 5 })
  async handleScrapeWeb(job: Job<ScrapeWebRequestDto>) {
    this.logger.log(`Processing job: ${job.id}`);
    await this.prisma.scrapingJob.update({
        where: { id: job.id },
        data: { status: 'ACTIVE' },
    });

    try {
      const totalUrls = job.data.urls.length;
      let processedCount = 0;

      for (const url of job.data.urls) {
        await this.scrapeSingleUrl(url, job.data.rules, job);
        processedCount++;
        const progress = Math.round((processedCount / totalUrls) * 100);
        await job.updateProgress(progress);
        await this.prisma.scrapingJob.update({
            where: { id: job.id },
            data: { progress },
        });
      }

      await this.prisma.scrapingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`Job ${job.id} completed.`);
      return { message: `Successfully scraped ${totalUrls} URLs.` };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      await this.prisma.scrapingJob.update({
        where: { id: job.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private async scrapeSingleUrl(url: string, rules: any, job: Job) {
    this.logger.debug(`[Job ${job.id}] Scraping URL: ${url}`);
    
    // --- NƠI TÍCH HỢP LOGIC THỰC TẾ ---
    // 1. Khởi tạo Playwright browser
    // const browser = await chromium.launch();
    // const page = await browser.newPage();
    // await page.goto(url);

    // 2. Sử dụng `rules.selector` để trích xuất dữ liệu
    // const imageUrls = await page.$$eval(rules.selector, imgs => imgs.map(img => img.src));
    
    // 3. Với mỗi ảnh:
    //    a. Download ảnh.
    //    b. Tạo pHash, lấy dimensions, tính checksum.
    //    c. Upload ảnh vào MinIO.
    //    d. Tạo "Golden Record" trong CSDL (model MediaItem).
    
    // 4. Đóng browser
    // await browser.close();

    await this.prisma.scrapingJob.update({
      where: { id: job.id },
      data: { logs: { push: `Scraped ${url}` } },
    });

    await new Promise(resolve => setTimeout(resolve, 1500)); // Giả lập tác vụ scraping
  }
}
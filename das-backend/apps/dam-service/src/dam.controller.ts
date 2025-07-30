import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ScrapeWebRequestDto } from '@das/common-dtos';
import { PrismaService } from '@das/prisma-client';

@Controller()
export class DamController {
  private readonly logger = new Logger(DamController.name);

  constructor(
    @InjectQueue('scraping-queue') private readonly scrapingQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Lắng nghe event 'scrape_job_created' từ API Gateway.
   * Tạo một bản ghi job trong CSDL và thêm job vào hàng đợi BullMQ.
   */
  @MessagePattern('scrape_job_created')
  async handleScrapeJobCreated(@Payload() data: ScrapeWebRequestDto) {
    this.logger.log(`Received job from gateway: ${JSON.stringify(data.urls)}`);
    
    // 1. Create a record in the database
    const jobRecord = await this.prisma.scrapingJob.create({
      data: {
        status: 'PENDING',
        payload: data as any,
      },
    });

    // 2. Add job to the queue, using the DB record's ID as the BullMQ job ID
    await this.scrapingQueue.add('scrape-web', data, {
      jobId: jobRecord.id,
      priority: data.priority,
    });

    this.logger.log(`Job ${jobRecord.id} queued.`);
    
    // Return the ID so the gateway can forward it to the client
    return { jobId: jobRecord.id };
  }

  /**
   * Lắng nghe message 'get_job_status' từ API Gateway.
   * Truy vấn CSDL và trả về trạng thái của job.
   */
  @MessagePattern({ cmd: 'get_job_status' })
  async getJobStatus(@Payload() data: { jobId: string }) {
    this.logger.log(`Querying status for job ID: ${data.jobId}`);
    const job = await this.prisma.scrapingJob.findUnique({
      where: { id: data.jobId },
    });
    if (!job) {
        return { error: 'Job not found' };
    }
    return job;
  }
}

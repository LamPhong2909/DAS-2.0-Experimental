import { Controller, Post, Body, Inject, Get, Param, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ScrapeWebRequestDto } from '@das/common-dtos';
import { firstValueFrom } from 'rxjs';

@ApiTags('DAM - Data Acquisition Matrix')
@Controller('dam')
export class DamController {
  private readonly logger = new Logger(DamController.name);

  constructor(
    @Inject('DAM_SERVICE') private readonly rmqClient: ClientProxy,
  ) {}

  @Post('jobs/scrape-web')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create a new web scraping job' })
  @ApiResponse({ status: 202, description: 'The job has been accepted for processing and its ID is returned.'})
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid payload.'})
  @ApiBody({ type: ScrapeWebRequestDto })
  async createScrapeJob(@Body() scrapeWebRequestDto: ScrapeWebRequestDto) {
    this.logger.log(`Received new scrape job request for urls: ${scrapeWebRequestDto.urls.join(', ')}`);
    // Use 'send' to get a response (the job ID) back from the service
    const responseObservable = this.rmqClient.send('scrape_job_created', scrapeWebRequestDto);
    // The client gets an immediate response with the Job ID to start polling.
    return await firstValueFrom(responseObservable);
  }
  
  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get the status of a specific job' })
  @ApiParam({ name: 'id', description: 'The ID of the scraping job' })
  @ApiResponse({ status: 200, description: 'The job status.'})
  @ApiResponse({ status: 404, description: 'Job not found.'})
  async getJobStatus(@Param('id') id: string) {
    this.logger.log(`Fetching status for job ID: ${id}`);
    // 'send' is for request-response messages. It returns an Observable.
    const jobStatusObservable = this.rmqClient.send({ cmd: 'get_job_status' }, { jobId: id });
    // Use firstValueFrom to convert the Observable to a Promise
    return await firstValueFrom(jobStatusObservable);
  }
}

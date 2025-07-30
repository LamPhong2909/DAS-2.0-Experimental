import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScrapingProcessor } from './jobs/scraping.processor';
import { DamController } from './dam.controller';
import { PrismaService } from '@das/prisma-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
    BullModule.registerQueue({
      name: 'scraping-queue',
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 1000, // Exponential backoff strategy
        },
      },
    }),
  ],
  controllers: [DamController],
  providers: [ScrapingProcessor, PrismaService],
})
export class AppModule {}

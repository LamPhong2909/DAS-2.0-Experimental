// das-backend/apps/taid-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure microservice
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: process.env.RABBITMQ_QUEUE_TAID || 'taid_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('TAID Analytics API')
    .setDescription('Test Analytics & Insights Dashboard API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Enable CORS for dashboard
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.startAllMicroservices();
  await app.listen(process.env.TAID_PORT || 3003);
}
bootstrap();
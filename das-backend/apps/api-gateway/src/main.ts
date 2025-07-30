import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Áp dụng ValidationPipe toàn cục để tự động xác thực DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Loại bỏ các thuộc tính không được định nghĩa trong DTO
    transform: true, // Tự động chuyển đổi kiểu dữ liệu
  }));
  
  // Cấu hình Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('DAS API Gateway')
    .setDescription('The main entrypoint for the Data Augmentation & Synthesis (DAS) system. Handles authentication, rate-limiting, and routing to microservices.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.API_GATEWAY_PORT || 3000);
}
bootstrap();

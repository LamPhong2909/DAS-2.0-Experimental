import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DamController } from './dam.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'DAM_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: process.env.RABBITMQ_QUEUE_DAM,
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [DamController],
  providers: [],
})
export class DamModule {}

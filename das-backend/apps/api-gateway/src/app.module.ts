import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DamModule } from './dam/dam.module';
// Import other modules for EAPP, TAID etc. here

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    DamModule,
    // Other modules
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { DbService } from './db/db.service';
import { ApiController } from './modules/api.controller';
import { ApiService } from './modules/api.service';
import { AuthController } from './modules/auth.controller';

@Module({
  controllers: [ApiController, AuthController],
  providers: [DbService, ApiService],
})
export class AppModule {}

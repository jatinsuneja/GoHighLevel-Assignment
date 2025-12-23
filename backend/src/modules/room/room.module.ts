/**
 * @fileoverview Room Module
 * @description Configures the room feature module
 * @module modules/room
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './schemas/room.schema';
import { RoomRepository } from './repositories/room.repository';
import { RoomService } from './services/room.service';
import { RoomController } from './controllers/room.controller';
import { SessionModule } from '../session/session.module';

/**
 * Room Module
 * 
 * @description Provides room functionality:
 * - Room schema registration with Mongoose
 * - Repository for data access
 * - Service for business logic
 * - Controller for API endpoints
 * - Integration with SessionModule for history tracking
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
    ]),
    forwardRef(() => SessionModule),
  ],
  controllers: [RoomController],
  providers: [RoomRepository, RoomService],
  exports: [RoomService, RoomRepository],
})
export class RoomModule {}

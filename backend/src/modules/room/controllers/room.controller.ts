/**
 * @fileoverview Room Controller
 * @description REST API endpoints for room operations
 * @module modules/room/controllers/room
 */

import { Controller, Logger } from '@nestjs/common';

/**
 * Room Controller
 *
 * @description Exposes REST API endpoints for room management:
 * @class RoomController
 */
@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);
}

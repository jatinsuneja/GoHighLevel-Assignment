/**
 * @fileoverview Custom Business Exception Classes
 * @description Domain-specific exceptions for the chat application
 * @module common/exceptions
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Business Exception
 *
 * @description Parent class for all business-related exceptions.
 * Provides a consistent structure with error code and message.
 *
 * @class BusinessException
 * @extends {HttpException}
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: errorCode,
        message,
      },
      status,
    );
  }
}

/**
 * Room Not Found Exception
 *
 * @description Thrown when a room with the specified code or ID doesn't exist
 *
 * @example
 * throw new RoomNotFoundException('ABC123');
 */
export class RoomNotFoundException extends BusinessException {
  constructor(identifier: string) {
    super(
      'ROOM_NOT_FOUND',
      `Room with identifier '${identifier}' not found or has been closed`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Room Full Exception
 *
 * @description Thrown when attempting to join a room that already has 2 participants
 *
 * @example
 * throw new RoomFullException('ABC123');
 */
export class RoomFullException extends BusinessException {
  constructor(roomCode: string) {
    super(
      'ROOM_FULL',
      `Room '${roomCode}' already has the maximum of 2 participants`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Room Closed Exception
 *
 * @description Thrown when attempting to interact with a closed room
 *
 * @example
 * throw new RoomClosedException('ABC123');
 */
export class RoomClosedException extends BusinessException {
  constructor(roomCode: string) {
    super(
      'ROOM_CLOSED',
      `Room '${roomCode}' has been closed and is no longer accessible`,
      HttpStatus.GONE,
    );
  }
}

/**
 * Invalid Room Code Exception
 *
 * @description Thrown when the provided room code format is invalid
 *
 * @example
 * throw new InvalidRoomCodeException('abc');
 */
export class InvalidRoomCodeException extends BusinessException {
  constructor(roomCode: string) {
    super(
      'INVALID_ROOM_CODE',
      `Room code '${roomCode}' is not valid. Must be 6 alphanumeric characters.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Session Not Found Exception
 *
 * @description Thrown when the session ID is missing or invalid
 *
 * @example
 * throw new SessionNotFoundException();
 */
export class SessionNotFoundException extends BusinessException {
  constructor() {
    super(
      'SESSION_NOT_FOUND',
      'Session ID is required. Please include X-Session-Id header.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Unauthorized Action Exception
 *
 * @description Thrown when a user attempts an action they're not authorized for
 *
 * @example
 * throw new UnauthorizedActionException('delete this message');
 */
export class UnauthorizedActionException extends BusinessException {
  constructor(action: string) {
    super(
      'UNAUTHORIZED_ACTION',
      `You are not authorized to ${action}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

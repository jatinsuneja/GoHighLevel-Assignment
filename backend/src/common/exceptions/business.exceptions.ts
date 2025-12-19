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

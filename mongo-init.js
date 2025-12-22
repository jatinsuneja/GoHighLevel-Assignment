/**
 * MongoDB Initialization Script
 * 
 * Creates indexes and initial collections for the anonymous chat application.
 * This script runs automatically when the MongoDB container is first created.
 */

// Switch to the application database
db = db.getSiblingDB('anonymous_chat');

// Create collections with schema validation
print('Creating collections...');

// Rooms collection
db.createCollection('rooms', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'roomCode', 'createdBy', 'participants', 'status', 'createdAt'],
      properties: {
        _id: { bsonType: 'string' },
        roomCode: { bsonType: 'string', minLength: 6, maxLength: 6 },
        createdBy: { bsonType: 'string' },
        participants: { bsonType: 'array' },
        maxParticipants: { bsonType: 'int', minimum: 2, maximum: 100 },
        status: { enum: ['active', 'closed'] },
        expiresAt: { bsonType: 'date' },
        lastActivityAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Messages collection
db.createCollection('messages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'roomId', 'senderId', 'senderName', 'content', 'contentType', 'createdAt'],
      properties: {
        _id: { bsonType: 'string' },
        roomId: { bsonType: 'string' },
        senderId: { bsonType: 'string' },
        senderName: { bsonType: 'string' },
        content: { bsonType: 'string' },
        contentType: { enum: ['text', 'image', 'file'] },
        reactions: { bsonType: 'array' },
        isDeleted: { bsonType: 'bool' },
        deletedAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// User sessions collection
db.createCollection('usersessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'sessionId', 'createdAt'],
      properties: {
        _id: { bsonType: 'string' },
        sessionId: { bsonType: 'string' },
        socketId: { bsonType: 'string' },
        isOnline: { bsonType: 'bool' },
        lastActiveAt: { bsonType: 'date' },
        chatHistory: { bsonType: 'array' },
        archivedChats: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

print('Creating indexes...');

// Rooms indexes
db.rooms.createIndex({ roomCode: 1 }, { unique: true });
db.rooms.createIndex({ status: 1 });
db.rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.rooms.createIndex({ lastActivityAt: -1 });
db.rooms.createIndex({ 'participants.userId': 1 });

// Messages indexes
db.messages.createIndex({ roomId: 1, createdAt: -1 });
db.messages.createIndex({ roomId: 1, _id: -1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ isDeleted: 1 });

// User sessions indexes
db.usersessions.createIndex({ sessionId: 1 }, { unique: true });
db.usersessions.createIndex({ isOnline: 1 });
db.usersessions.createIndex({ lastActiveAt: 1 });
db.usersessions.createIndex({ 'chatHistory.roomId': 1 });

print('MongoDB initialization complete!');
print('Collections created: rooms, messages, usersessions');
print('Indexes created for optimal query performance');

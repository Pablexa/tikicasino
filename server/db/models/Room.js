import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { nanoid } from 'nanoid';

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomCode: {
    type: DataTypes.STRING(6),
    unique: true,
    allowNull: false,
    defaultValue: () => nanoid(6).toUpperCase()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 50]
    }
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    validate: {
      min: 2,
      max: 20
    }
  },
  config: {
    type: DataTypes.JSON,
    defaultValue: {
      initialBalance: 10000,
      minBet: 10,
      maxBet: 10000,
      enabledGames: ['blackjack', 'roulette', 'slots', 'crash', 'poker', 'coinflip', 'dice'],
      isCompetitive: false,
      allowNewPlayers: true,
      requireApproval: false,
      chatEnabled: true,
      registeredFriendsOnly: false,
      maxAccountsPerDevice: 1,
      maxAccountsPerIp: 2
    }
  },
  players: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  bannedUsers: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  inviteList: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'rooms',
  timestamps: true
});

export default Room;

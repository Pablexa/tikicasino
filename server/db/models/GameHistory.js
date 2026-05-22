import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const GameHistory = sequelize.define('GameHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  game: {
    type: DataTypes.ENUM('blackjack', 'poker', 'crash', 'roulette', 'slots', 'coinflip', 'dice'),
    allowNull: false
  },
  bet: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  result: {
    type: DataTypes.ENUM('win', 'loss', 'push', 'ongoing'),
    allowNull: false
  },
  payout: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  netProfit: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gameData: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'game_history',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['roomId'] },
    { fields: ['game'] },
    { fields: ['createdAt'] }
  ]
});

export default GameHistory;

import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Transaction = sequelize.define('Transaction', {
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
  type: {
    type: DataTypes.ENUM(
      'initial_bonus',
      'daily_bonus',
      'emergency_refill',
      'game_win',
      'game_loss',
      'game_bet',
      'admin_adjustment',
      'transfer_sent',
      'transfer_received'
    ),
    allowNull: false
  },
  game: {
    type: DataTypes.STRING,
    allowNull: true
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balanceBefore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['roomId'] },
    { fields: ['type'] },
    { fields: ['createdAt'] }
  ]
});

export default Transaction;

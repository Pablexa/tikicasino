import User from './User.js';
import Room from './Room.js';
import Transaction from './Transaction.js';
import GameHistory from './GameHistory.js';

// Define associations
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(GameHistory, { foreignKey: 'userId', as: 'gameHistory' });
GameHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Room.hasMany(Transaction, { foreignKey: 'roomId', as: 'transactions' });
Transaction.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Room.hasMany(GameHistory, { foreignKey: 'roomId', as: 'gameHistory' });
GameHistory.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

export { User, Room, Transaction, GameHistory };

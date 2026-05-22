import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nickname: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      len: [3, 20],
      is: /^[a-zA-Z0-9_]+$/
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: 'default'
  },
  balance: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  initialBonusClaimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dailyBonusLastClaimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emergencyRefillLastClaimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hashedIp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgentHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reputationLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  banReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  stats: {
    type: DataTypes.JSON,
    defaultValue: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      biggestWin: 0,
      biggestLoss: 0,
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
      favoriteGame: null,
      achievements: [],
      timePlayedMinutes: 0
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    }
  }
});

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Instance method to check if account is new (less than 24 hours)
User.prototype.isNewAccount = function() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > dayAgo;
};

// Instance method to check if can claim daily bonus
User.prototype.canClaimDailyBonus = function() {
  if (!this.dailyBonusLastClaimedAt) return true;
  const lastClaim = new Date(this.dailyBonusLastClaimedAt);
  const now = new Date();
  return (now - lastClaim) >= 24 * 60 * 60 * 1000;
};

// Instance method to check if can claim emergency refill
User.prototype.canClaimEmergencyRefill = function() {
  if (this.balance >= 500) return false;
  if (!this.emergencyRefillLastClaimedAt) return true;
  const lastClaim = new Date(this.emergencyRefillLastClaimedAt);
  const now = new Date();
  return (now - lastClaim) >= 30 * 60 * 1000; // 30 minutes
};

export default User;

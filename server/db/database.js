import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';
const databaseUrl = process.env.DATABASE_URL;

// Use SQLite for development if no DATABASE_URL is provided
const sequelize = databaseUrl && !databaseUrl.includes('sqlite')
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: isDev ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: isDev ? console.log : false
    });

// Test connection
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
  } catch (error) {
    console.error('✗ Unable to connect to database:', error);
    throw error;
  }
};

export { sequelize };
export default sequelize;

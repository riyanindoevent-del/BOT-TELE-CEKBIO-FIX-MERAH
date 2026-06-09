import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_BOT_TOKEN } from './config.js';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
export default bot;
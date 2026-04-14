require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');
const { Telegraf } = require('telegraf');

// 1. Принудительные настройки
require('dns').setDefaultResultOrder('ipv4first');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const PROXY_URL = 'http://127.0.0.1:34751';

// 2. Агент с включенным keepAlive и короткими таймаутами
const agent = new HttpsProxyAgent(PROXY_URL, {
    keepAlive: true,
    keepAliveMsecs: 1000,
    timeout: 10000 
});

const bot = new Telegraf(process.env.BOTTOKEN, {
    telegram: { agent }
});

// ТЕСТОВЫЙ ОБРАБОТЧИК (чтобы сразу увидеть результат)
bot.on('text', async (ctx) => {
    console.log(`[${new Date().toLocaleTimeString()}] Сообщение: ${ctx.message.text}`);
    try {
        await ctx.reply('Вижу тебя через прокси!');
    } catch (e) {
        console.error("Ошибка отправки:", e.message);
    }
});

async function start() {
    console.log("Начало работы...");
    try {
        // Проверка связи
        const me = await bot.telegram.getMe();
        console.log(`✅ Авторизован: @${me.username}`);

        console.log("Очистка очереди...");
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });

        console.log("Запуск Long Polling...");
        // Запускаем БЕЗ await, чтобы скрипт шел дальше к логу "Готов"
        bot.launch({
            polling: { timeout: 10 }
        }).catch(err => console.error("Ошибка Polling:", err.message));

        console.log("🚀 Бот запущен! Напиши ему в Telegram.");
        
    } catch (e) {
        console.log("❌ ОШИБКА:", e.message);
        // Если ошибка — пробуем перезапустить через 5 секунд
        setTimeout(start, 5000);
    }
}

start();


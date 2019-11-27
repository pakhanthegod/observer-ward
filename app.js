const Telegraf = require('telegraf');
const dotenv = require('dotenv');
const winston = require('winston');


dotenv.config();
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token)
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console()
  ]
})


bot.on('new_chat_members', (ctx) => {
  const options = {
    parse_mode: 'markdown',
    reply_to_messages_id: ctx.message_id,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "I'm not a bot",
            callback_data: `notbot_${ctx.from.id}`
          }
        ]
      ]
    }
  }
  reply = ctx.telegram.sendMessage(ctx.chat.id, `Hello **${ctx.from.first_name}**, confirm please that you aren't a bot`, options);
  reply.then(data => {
    setTimeout(data => {
      ctx.telegram.deleteMessage(data.chat.id, data.message_id)
        .then(() => {
          ctx.telegram.kickChatMember(ctx.chat.id, ctx.from.id)
            .then(() => {
              logger.info(`Chat member ${ctx.from.first_name} doesn't verified.`)
              ctx.telegram.unbanChatMember(ctx.chat.id, ctx.from.id);
            })
            .catch(() => {
              logger.error(`Can't unban chat member ${ctx.from.first_name}`);
            });
        })
        .catch(() => {
          logger.info(`Chat member ${ctx.from.first_name} verified`)
        });
    }, 15000, data);
  });
});

bot.on('callback_query', (ctx) => {
  const action = ctx.callbackQuery.data;
  const msg = ctx.callbackQuery.message;
  if (action.includes('notbot')) {
    res = action.split('_');
    if (res[1] == ctx.callbackQuery.from.id) {
      ctx.telegram.deleteMessage(msg.chat.id, msg.message_id);
    }
  }
});

bot.startPolling()

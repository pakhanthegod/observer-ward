const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');


dotenv.config();
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});


bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];

});

bot.on('new_chat_members', (msg) => {
  const options = {
    reply_to_messages_id: msg.message_id,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "I'm not a bot",
            callback_data: `notbot_${msg.from.id}`
          }
        ]
      ]
    }
  }
  reply = bot.sendMessage(msg.chat.id, 'Confirm that you are not a bot', options);
  reply.then(data => {
    setTimeout(data => {
      bot.deleteMessage(data.chat.id, data.message_id)
        .then(deletion_data => {
          bot.kickChatMember(msg.chat.id, msg.from.id)
            .then(data => {
              bot.unbanChatMember(msg.chat.id, msg.from.id);
            })
            .catch(err => {
            });
        })
        .catch(err => {
        });
    }, 15000, data);
  });
});

bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  if (action.includes('notbot')) {
    res = action.split('_');
    if (res[1] == callbackQuery.from.id) {
      bot.deleteMessage(msg.chat.id, msg.message_id);
    }
  }
});


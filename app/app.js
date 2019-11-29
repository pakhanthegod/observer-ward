const Telegraf = require('telegraf');
const dotenv = require('dotenv');
const winston = require('winston');
const { MongoClient } = require('mongodb');


dotenv.config();
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
const { USER } = process.env;
const { PASSWORD } = process.env;
const { DATABASE } = process.env;
const mongoUri = `mongodb://${USER}:${encodeURIComponent(PASSWORD)}@db:27017/${DATABASE}`;
const unconfirmedUsers = {};


const userExist = (id) => new Promise((resolve, reject) => {
  // Check if user in database
  MongoClient.connect(mongoUri, (err, client) => {
    logger.info('Connected successfully to server to check exist');
    const db = client.db(DATABASE);
    db.collection('users').findOne({ id }, (intendErr, result) => {
      if (intendErr) reject(intendErr);
      client.close();
      resolve(!!result);
    });
  });
});


const insertUser = (id) => new Promise((resolve, reject) => {
  // insert user in database
  MongoClient.connect(mongoUri, (err, client) => {
    logger.info('Connected successfully to server to insert user');
    const db = client.db(DATABASE);
    db.collection('users').insertOne({ id }, (intendErr) => {
      if (intendErr) reject(intendErr);
      logger.info(`Chat memeber ${id} added to collection`);
      resolve(true);
    });
    client.close();
  });
});


bot.on('new_chat_members', (ctx) => {
  // if chat member join for first time request verify otherwise do nothing
  userExist(ctx.from.id).then((exist) => {
    if (exist === false) {
      const options = {
        parse_mode: 'markdown',
        reply_to_messages_id: ctx.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "I'm not a bot",
                callback_data: `notbot_${ctx.from.id}`,
              },
            ],
          ],
        },
      };
      // add chat member to unconfirmed users
      unconfirmedUsers[ctx.from.id] = false;
      const reply = ctx.telegram.sendMessage(ctx.chat.id, `Hello **${ctx.from.first_name}**, confirm please that you aren't a bot`, options);
      reply.then((replyData) => {
        // if chat member doesn't click at inline key in 15s he will be kicked
        setTimeout((data) => {
          // if the chat member doesn't click a key he will be in unconfirmed users
          if (ctx.from.id in unconfirmedUsers) {
            ctx.telegram.deleteMessage(data.chat.id, data.message_id)
              .then(() => {
                ctx.telegram.kickChatMember(ctx.chat.id, ctx.from.id)
                  .then(() => {
                    logger.info(`Chat member ${ctx.from.first_name} doesn't verified.`);
                    // should manually unban, because telegram API doesn't do it itself
                    // kick = ban
                    ctx.telegram.unbanChatMember(ctx.chat.id, ctx.from.id);
                  })
                  .catch(() => {
                    logger.error(`Can't unban chat member ${ctx.from.first_name}`);
                  });
              })
              .catch(() => {
                logger.info(`Chat member ${ctx.from.first_name} verified`);
              });
          }
        }, 15000, replyData);
      });
    }
  });
});


bot.on('callback_query', (ctx) => {
  const action = ctx.callbackQuery.data;
  const msg = ctx.callbackQuery.message;
  if (action.includes('notbot')) {
    // get from a callback message 'notbot_<chatMemberId>' to recognize a user
    const res = action.split('_');
    const callbackFromId = parseInt(res[1], 10);
    // verify that a key was clicked by a necessary user
    if (callbackFromId === ctx.callbackQuery.from.id) {
      // if a right user remove from unconfirmed users
      delete unconfirmedUsers[callbackFromId];
      ctx.telegram.deleteMessage(msg.chat.id, msg.message_id);
      logger.info(`Chat member ${ctx.callbackQuery.from.first_name} verified`);
      insertUser(ctx.callbackQuery.from.id);
    }
  }
});


bot.startPolling();

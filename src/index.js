"use strict";

const line = require("@line/bot-sdk");
const express = require("express");
const serverless = require('serverless-http');
require('dotenv').config();

const router = express.Router();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

// constants
const START_MESSAGE = 'スタート';

router.post("/linebot", line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
    .then(() => res.end())
    .catch(err => {
        console.error(err);
        res.status(500).end();
    });
});

async function handleEvent(event) {
    switch (event.type) {
        // handle message event
        case 'message':
            const message = event.message;
            switch (message.type) {
                // handle Text message
                case 'text':
                    return handleText(message, event.replyToken, event.source);
                // unknown message
                default:
                    replyText(event.replyToken, 'よく分かりませんでした');
            }
        case 'beacon':
            const beaconType = event.beacon;
            switch (beaconType.type) {
                case 'enter':
                    // 占い開始
                default:
                    replyText(event.replyToken, 'ビーコン圏外');
            }
        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
};

// テキストを返す
function replyText (token, texts) {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text) => ({ type: 'text', text }))
    );
};

// handle TextMessage
function handleText(message, replyToken, event_source) {
    const message_text = message.text;
    if (message_text === START_MESSAGE) {
        const f_message = generateFortuneMessage();
        return client.replyMessage(
            replyToken,
            f_message
        );
    } else {
        return replyText(replyToken, "このボットは占いしかできません");
    }
};

// 占う
function generateFortuneMessage() {
    const fortuneWord_list = ['大吉', 
                    '中吉',
                    '小吉',
                    '吉',
                    '末吉',
                    '凶',
                    '大凶'];

    const fortune_list = ['omikuji_daikichi', 
                    'omikuji_chuukichi',
                    'omikuji_syoukichi',
                    'omikuji_kichi',
                    'omikuji_suekichi',
                    'omikuji_kyou',
                    'omikuji_daikyou'];

    const fortuneIndex = Math.floor(Math.random() * fortune_list.length);
    const fortuneText = fortune_list[fortuneIndex];
    const imageURL = `${process.env.NETLIFY_URL}/${fortuneText}.png`;
    const message_text = fortuneWord_list[fortuneIndex];
    const message = {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": imageURL,
          "size": "md",
          "aspectMode": "fit",
          "align": "center",
          "margin": "xxl",
          "gravity": "center",
          "aspectRatio": "10:20"
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "spacer"
            },
            {
              "type": "button",
              "style": "primary",
              "color": "#005c44",
              "action": {
                "type": "message",
                "label": "もう一度占う",
                "text": START_MESSAGE
              }
            }
          ]
        }
    }
    return {
        "type": "flex",
        "altText": message_text,
        "contents": message
    };
}

// サーバを起動する
app.use('/.netlify/functions/index', router);
module.exports = app;
module.exports.handler = serverless(app);

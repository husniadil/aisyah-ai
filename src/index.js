const FAREWELL_MESSAGE = `Hai! 😊

Terima kasih banyak udah ngobrol sama aku selama ini. Seneng banget bisa kenal dan ngobrol bareng kamu! 💕

Aku pamit dulu ya. Sampai ketemu lagi! ✨

---

Hi! 😊

Thank you so much for chatting with me all this time. I'm really happy to have met and talked with you! 💕

I'm signing off for now. See you again! ✨

— Aisyah`;

async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
  return response.json();
}

async function setupWebhook(botToken, webhookUrl) {
  const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
  const webhookResponse = await fetch(setWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const deleteCommandsUrl = `https://api.telegram.org/bot${botToken}/deleteMyCommands`;
  const commandsResponse = await fetch(deleteCommandsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return {
    webhook: await webhookResponse.json(),
    commands: await commandsResponse.json(),
  };
}

function getChatFromUpdate(update) {
  const message =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post;

  if (message?.chat) {
    return message.chat;
  }

  if (update.callback_query?.message?.chat) {
    return update.callback_query.message.chat;
  }

  if (update.inline_query?.from) {
    return { id: update.inline_query.from.id, type: "private" };
  }

  return null;
}

function isPrivateChat(chat) {
  return chat?.type === "private";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        JSON.stringify({ message: "Aisyah AI - Signing off mode" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.method === "POST" && url.pathname === "/setup") {
      const webhookUrl = `${url.origin}/webhook`;
      const result = await setupWebhook(env.TELEGRAM_BOT_TOKEN, webhookUrl);
      console.log("Setup result:", JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const update = await request.json();
        console.log("Received update:", JSON.stringify(update));

        const chat = getChatFromUpdate(update);
        if (chat && isPrivateChat(chat)) {
          const result = await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chat.id,
            FAREWELL_MESSAGE
          );
          console.log("Sent farewell to chat:", chat.id, "Result:", JSON.stringify(result));
        } else if (chat) {
          console.log("Skipping group/channel chat:", chat.id, "type:", chat.type);
        } else {
          console.log("No chat found in update");
        }
      } catch (error) {
        console.error("Error processing update:", error);
      }

      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  },
};

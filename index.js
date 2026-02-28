const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online!");
});

app.listen(PORT, () => {
  console.log("Servidor web iniciado na porta " + PORT);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log("✅ Bot conectado como " + client.user.tag);
});

client.on("error", console.error);

client.login(process.env.TOKEN)
  .then(() => console.log("🔐 Tentativa de login enviada"))
  .catch(err => console.error("❌ Erro no login:", err));
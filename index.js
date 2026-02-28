const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot rodando!');
});

app.listen(PORT, () => {
  console.log('🌐 Servidor web iniciado na porta ' + PORT);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on('ready', () => {
  console.log('🤖 Bot conectado como ' + client.user.tag);
});

client.on('error', (err) => {
  console.error('Erro no bot:', err);
});

(async () => {
  try {
    console.log('🔐 Tentando login...');
    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error('❌ Erro ao logar:', error);
  }
})();
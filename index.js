require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');
const express = require("express");

const CONFIG_FILE = './config.json';
let configData = {};
const loadConfig = (guildId) => {
  try {
    if (!configData || Object.keys(configData).length === 0) {
      configData = JSON.parse(fs.readFileSync(CONFIG_FILE));
    }
    return configData[guildId] || {};
  } catch (e) {
    console.error('Erro ao carregar config:', e);
    return {};
  }
};

const getSuporteConfig = (guild) => {
  const guildConfig = loadConfig(guild.id);
  return {
    category: guildConfig.suporte?.category || null,
    logChannel: guildConfig.suporte?.logChannel || null
  };
};

const getAdvConfig = (guild) => {
  const guildConfig = loadConfig(guild.id);
  return {
    category: guildConfig.adv?.category || null,
    cargo1: guildConfig.adv?.cargo1 || null,
    cargo2: guildConfig.adv?.cargo2 || null
  };
};

const getStaffRoles = (guild) => {
  const guildConfig = loadConfig(guild.id);
  return guildConfig.staffRoles || [];
};

const isStaff = (member) => {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const guildStaffRoles = getStaffRoles(member.guild);
  return member.roles.cache.some(r => guildStaffRoles.includes(r.id));
};


/* ================= SERVIDOR RENDER ================= */

const app = express();

app.get('/', (req, res) => {
    res.send('Bot rodando!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🌐 Servidor web iniciado na porta ' + PORT);
});

/* ================= CLIENT ================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.on('debug', console.log);

client.once('clientReady', () => {
    console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const REGRAS_FILE = './regras.json';

const getConfig = (guild) => loadConfig(guild.id);

const getChannel = (guild, channelKey) => {
  const config = getConfig(guild);
  return config.channels?.[channelKey] || null;
};

const getSetConfig = (guild) => {
  const config = getConfig(guild);
  return config.set || {};
};

const SET_CARGO_MEMBRO = '1474574071072161883'; // Keep for modal check, as not in config



/* ================= DATABASE ================= */

const DATA_FILE = './metas.json';

let metas = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE))
    : {};

const salvar = () =>
    fs.writeFileSync(DATA_FILE, JSON.stringify(metas, null, 2));

// === REGRAS DATABASE ===
const REGRAS_DEFAULT = `Bem-vindo ao servidor! Para manter a organização e um ambiente saudável, siga as regras abaixo.

━━━━━━━━━━━━━━━━━━━━━━

⚖️┃SISTEMA DE ADVERTÊNCIAS

🔹 Trabajamos com sistema de 3 advertências (warn).
🔹 Ao receber 2 advertências, o jogador ficará sob observação.
🔹 Na 3ª advertência, o jogador será BANIDO PERMANENTEMENTE.

🚨 Dependendo da gravidade da infração, a staff poderá aplicar banimento imediato, sem aviso prévio.

━━━━━━━━━━━━━━━━━━━━━━

🚫┃RESPEITO E CONDUTA

É PROIBIDO:

❌ Racismo
❌ Qualquer tipo de preconceito
❌ Discriminação (religião, etnia, gênero, etc.)
❌ Discurso político provocativo ou extremista
❌ Xingamentos
❌ Desrespeito com membros ou staff
❌ Criar conflitos ou discussões desnecessárias

⚠️ Aquí prezamos por respeito acima de tudo.

━━━━━━━━━━━━━━━━━━━━━━

🔞┃CONTEÚDO PROIBIDO (TOLERÂNCIA ZERO)

🚫 É expressamente proibido enviar:

❌ Conteúdo +18
❌ Conteúdo explícito
❌ Links maliciosos
❌ Divulgação de material ilegal
❌ Qualquer conteúdo envolvendo menores

🔨 Infrações desse tipo resultam em BANIMENTO IMEDIATO.

━━━━━━━━━━━━━━━━━━━━━━

💬┃USO DO CHAT

❌ Flood (mensagens repetitivas)
❌ Spam
❌ Divulgação não autorizada
❌ Discussões fora de controle

Use o chat com maturidade e bom senso.

━━━━━━━━━━━━━━━━━━━━━━

🎟️┃DENÚNCIAS E CONFLITOS

Caso occorra qualquer problema:

📌 Abra um ticket
📌 Envie provas (print ou vídeo)
📌 Aguarde a análise da staff

🔎 A equipe irá avaliar de forma imparcial.

━━━━━━━━━━━━━━━━━━━━━━

🛡️┃AUTORIDADE DA STAFF

✔️ A decisão final será sempre da administração.
✔️ A staff poderá agir conforme necessário para manter a ordem.
✔️ O desconhecimento das regras não isenta punição.

━━━━━━━━━━━━━━━━━━━━━━

📢 Ao permanecer no servidor, você concorda com todas as regras acima.`;

let regrasData = fs.existsSync(REGRAS_FILE)
    ? JSON.parse(fs.readFileSync(REGRAS_FILE))
    : { conteudo: REGRAS_DEFAULT };

const salvarRegras = () =>
    fs.writeFileSync(REGRAS_FILE, JSON.stringify(regrasData, null, 2));

/* ================= PERMISSIONS ================= */
 // Duplicate isStaff removed - using dynamic config version

/* ================= UTILS ================= */

function gerarBarra(atual, meta, tamanho = 20) {
    if (!meta || meta === 0) meta = 5000;
    const progresso = Math.min(atual / meta, 1);
    const preenchido = Math.round(tamanho * progresso);
    return '█'.repeat(preenchido) + '░'.repeat(tamanho - preenchido);
}

function garantir(userId) {
    if (!metas[userId]) {
        metas[userId] = {
            meta: 5000,
            atual: 0,
            historico: [],
            punicoes: []
        };
    }
}

function data() {
    return new Date().toLocaleString('pt-BR');
}

function hora() {
    return new Date().toLocaleTimeString('pt-BR');
}

function sendLog(guild, channelId, embed) {
    const channel = guild.channels.cache.get(channelId);
    if (channel) channel.send({ embeds: [embed] });
}

/* ================= COMANDOS ================= */

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const cmd = args.shift()?.toLowerCase();

    const deleteUserMessage = async () => {
        try {
            await message.delete();
        } catch (e) {
            // silencioso
        }
    };

    // === PAINEL SET ===
    if (cmd === '!set' || cmd === '!painelset') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.guild.name + ' • Sistema de Set',
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle('🔐 Sistema de Set')
            .setDescription(
                '> Bem-vindo ao sistema de set.\n\n' +
                'Escolha uma opção abaixo:\n\n' +
                '👤 **Membro**\n' +
                'Para quem quer fazer parte da equipe.\n' +
                'Preencha seu formulário e aguarde aprovação.\n\n' +
                '⚠️ **Atenção:**\n' +
                '• Membros precisam de aprovação\n' +
                '• Preencha os dados corretamente\n' +
                '• Dados falsos serão reprovados'
            )
            .setColor('#00ff00')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema de Set • 2026' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_membro')
                .setLabel('Realizar Set')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // === PAINEL ADV ===
    if (cmd === '!advpainel' || cmd === '!paineladv') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.guild.name + ' • Sistema de Advertências',
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle('⚠️ Sistema de Advertências')
            .setDescription(
                '> Bem-vindo ao painel de advertências.\n\n' +
                'Selecione uma ação abaixo:\n\n' +
                '📝 **Registrar Adv**\n' +
                'Registre uma nova advertência para um usuário.\n\n' +
                '❌ **Remover Adv**\n' +
                'Remova uma advertência existente.\n\n' +
                '👁️ **Ver Advs**\n' +
                'Visualize as advertências de um usuário.'
            )
            .setColor('#ff0000')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema de Adv • 2026' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('adv_registrar')
                .setLabel('Registrar Adv')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('adv_remover')
                .setLabel('Remover Adv')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('adv_ver')
                .setLabel('Ver Advs')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (cmd === '!painel') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.guild.name + ' • Sistema de Tickets',
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle('🎫 Central de Atendimento')
            .setDescription(
                '> Bem-vindo ao sistema oficial de tickets.\n\n' +
                '📦 **Envio de Farm**\n' +
                'Abra um ticket para registrar seu farm de forma segura.\n\n' +
                '⚠️ Evite abrir múltiplos tickets.\n' +
                '👮 A equipe será notificada automaticamente.\n\n' +
                '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                '📋 **Comandos Disponíveis**\n\n' +
                '🔹 `!ranking` - Veja o ranking de farm\n' +
                '🔹 `!historico` - Veja seu histórico de farm\n' +
                '🔹 `!advs` - Veja seus advs\n\n' +
                '⭐ Use o botão abaixo para abrir um ticket!'
            )
            .setColor('#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema moderno • 2026' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_ticket')
                .setLabel('Abrir Ticket')
                .setEmoji('🎟️')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (cmd === '!ranking') {
        await deleteUserMessage();

        const ranking = Object.entries(metas)
            .sort((a, b) => b[1].atual - a[1].atual)
            .slice(0, 10);

        if (!ranking.length) return message.channel.send({ content: 'Sem dados.' });

        const desc = ranking.map(([id, d], i) =>
            '**' + (i + 1) + '.** <@' + id + '> — ' + d.atual + '/' + d.meta
        ).join('\n');

        return message.channel.send({
            embeds: [new EmbedBuilder().setTitle('🏆 Ranking').setDescription(desc).setColor('Gold')]
        });
    }

    if (cmd === '!addfarm') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const user = message.mentions.users.first();
        const qtd = parseInt(args[1]);

        if (!user || !qtd)
            return message.channel.send({ content: 'Uso: !addfarm @user qtd' });

        garantir(user.id);

        metas[user.id].atual += qtd;
        metas[user.id].historico.push('+' + qtd + ' • ' + message.author.tag);

        salvar();

        const { atual, meta } = metas[user.id];

        const farmEmbed = new EmbedBuilder()
            .setTitle('📈 Farm Adicionado')
            .setDescription('Usuário: ' + user.toString() + '\nAdicionado: **' + qtd + '**\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Green');

        sendLog(message.guild, CHANNEL_FARM_ADDED, farmEmbed);

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('📈 Farm Adicionado')
                .setDescription('Usuário: ' + user.toString() + '\nAdicionado: **' + qtd + '**\nStaff: ' + message.author.toString() + '\nData: ' + data() + '\n\nProgresso: **' + atual + '/' + meta + '**\n\n`' + gerarBarra(atual, meta) + '`')
                .setColor('Green')]
        });
    }

    if (cmd === '!setmeta') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const meta = parseInt(args[1]);

        if (!user || !meta)
            return message.channel.send({ content: 'Uso: !setmeta @user valor' });

        garantir(user.id);
        const metaAntiga = metas[user.id].meta;
        metas[user.id].meta = meta;
        salvar();

        const metaEmbed = new EmbedBuilder()
            .setTitle('📊 Meta Definida')
            .setDescription('Usuário: ' + user.toString() + '\nMeta Anterior: **' + metaAntiga + '**\nNova Meta: **' + meta + '**\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Purple');

        sendLog(message.guild, CHANNEL_META_ADDED, metaEmbed);

        await deleteUserMessage();
        return message.channel.send({ content: '✅ Meta atualizada.' });
    }

    if (cmd === '!removermeta') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        if (!user) return message.channel.send({ content: 'Uso: !removermeta @user' });

        if (!metas[user.id]) return message.channel.send({ content: 'Usuário sem dados.' });

        const metaAntiga = metas[user.id].meta;
        metas[user.id].meta = 5000;
        salvar();

        const metaEmbed = new EmbedBuilder()
            .setTitle('♻️ Meta Removida')
            .setDescription('Usuário: ' + user.toString() + '\nMeta Anterior: **' + metaAntiga + '**\nNova Meta: **5000** (padrão)\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Orange');

        sendLog(message.guild, CHANNEL_META_REMOVED, metaEmbed);

        await deleteUserMessage();
        return message.channel.send({ content: '✅ Meta resetada para 5000.' });
    }

    if (cmd === '!removerfarm') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const user = message.mentions.users.first();
        const qtd = parseInt(args[1]);

        if (!user || !qtd)
            return message.channel.send({ content: 'Uso: !removerfarm @user qtd' });

        garantir(user.id);

        metas[user.id].atual = Math.max(0, metas[user.id].atual - qtd);
        metas[user.id].historico.push('-' + qtd + ' • ' + message.author.tag);

        salvar();

        const { atual, meta } = metas[user.id];

        const farmEmbed = new EmbedBuilder()
            .setTitle('📉 Farm Removido')
            .setDescription('Usuário: ' + user.toString() + '\nRemovido: **' + qtd + '**\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Red');

        sendLog(message.guild, CHANNEL_FARM_REMOVED, farmEmbed);

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('📉 Farm Removido')
                .setDescription('Usuário: ' + user.toString() + '\nRemovido: **' + qtd + '**\nStaff: ' + message.author.toString() + '\nData: ' + data() + '\n\nProgresso: **' + atual + '/' + meta + '**\n\n`' + gerarBarra(atual, meta) + '`')
                .setColor('Red')]
        });
    }

    if (cmd === '!historico') {
        const user = message.mentions.users.first();

        if (!isStaff(message.member)) {
            if (!user || user.id !== message.author.id) {
                return message.channel.send({ content: 'Você só pode ver seu próprio histórico.' });
            }
        } else if (!user) {
            return message.channel.send({ content: 'Uso: !historico @user' });
        }

        garantir(user.id);

        const hist = metas[user.id].historico.slice(-10).reverse();

        return message.channel.send({
            embeds: [new EmbedBuilder().setTitle('📜 Histórico — ' + user.username).setDescription(hist.length ? hist.join('\n') : 'Vazio')]
        });
    }

    if (cmd === '!resetar') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        if (!user) return message.channel.send({ content: 'Uso: !resetar @user' });

        delete metas[user.id];
        salvar();

        const resetEmbed = new EmbedBuilder()
            .setTitle('♻️ Usuário Resetado')
            .setDescription('Usuário: ' + user.toString() + '\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Orange');

        sendLog(message.guild, CHANNEL_FARM_RESET, resetEmbed);

        await deleteUserMessage();
        return message.channel.send({ content: '✅ Resetado.' });
    }

    if (cmd === '!adv') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const motivo = args.slice(1).join(' ');

        if (!user || !motivo)
            return message.channel.send({ content: 'Uso: !adv @user motivo' });

        garantir(user.id);

        metas[user.id].punicoes.push({
            motivo: motivo,
            staff: message.author.id,
            data: data()
        });

        salvar();

        const advEmbed = new EmbedBuilder()
            .setTitle('⚠️ Adv Aplicado')
            .setDescription('Usuário: ' + user.toString() + '\nMotivo: ' + motivo + '\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Red');

        sendLog(message.guild, CHANNEL_PUNISHMENT_ADDED, advEmbed);

        await deleteUserMessage();
        return message.channel.send({ content: '✅ Adv registrado.' });
    }

    if (cmd === '!advs') {
        const user = message.mentions.users.first();

        if (!isStaff(message.member)) {
            if (!user || user.id !== message.author.id) {
                return message.channel.send({ content: 'Você só pode ver seus próprios advs.' });
            }
        } else if (!user) {
            return message.channel.send({ content: 'Uso: !advs @user' });
        }

        garantir(user.id);

        const lista = metas[user.id].punicoes;

        const desc = lista.length
            ? lista.map((p, i) => '**' + (i + 1) + '.** ' + p.motivo + '\n👮 <@' + p.staff + '> • ' + p.data).join('\n\n')
            : 'Sem advs.';

        return message.channel.send({
            embeds: [new EmbedBuilder().setTitle('⚠️ Advs — ' + user.username).setDescription(desc).setColor('Red')]
        });
    }

    if (cmd === '!removeradv') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const indice = parseInt(args[1]) - 1;

        if (!user || isNaN(indice))
            return message.channel.send({ content: 'Uso: !removeradv @user numero' });

        garantir(user.id);

        const lista = metas[user.id].punicoes;

        if (indice < 0 || indice >= lista.length)
            return message.channel.send({ content: 'Número de adv inválido.' });

        const advRemovido = lista.splice(indice, 1)[0];
        salvar();

        const advEmbed = new EmbedBuilder()
            .setTitle('✅ Adv Removido')
            .setDescription('Usuário: ' + user.toString() + '\nAdv Removido: ' + advRemovido.motivo + '\nStaff: ' + message.author.toString() + '\nData: ' + data())
            .setColor('Green');

        sendLog(message.guild, CHANNEL_PUNISHMENT_REMOVED, advEmbed);

        await deleteUserMessage();
        return message.channel.send({ content: '✅ Adv removido.' });
    }

    if (cmd === '!ajuda' || cmd === '!help') {
        await deleteUserMessage();

        const embed = new EmbedBuilder()
            .setTitle('📋 Lista de Comandos')
            .setDescription(
                '**🎫 Sistema de Tickets**\n!painel - Enviar painel de tickets\n\n' +
                '**🔐 Sistema de Set**\n!set - Enviar painel de set\n\n' +
                '**⚠️ Sistema de Adv**\n!advpainel - Enviar painel de advertências\n\n' +
                '**📜 Sistema de Regras**\n !regras - Enviar painel de regras\n\n' +
                '**📊 Comandos Públicos**\n!ranking - Ver ranking de farm\n!historico @user - Ver histórico de farm\n!advs @user - Ver advs\n\n' +
                '**👮 Comandos Staff**\n!addfarm @user qtd - Adicionar farm\n!removerfarm @user qtd - Remover farm\n!setmeta @user valor - Definir meta\n!removermeta @user - Resetar meta para 5000\n!resetar @user - Resetar usuário\n!adv @user motivo - Aplicar adv\n!removeradv @user numero - Remover adv\n!suporte - painel de suporte'
            )
            .setColor('#5865F2');

        return message.channel.send({ embeds: [embed] });
    }

    // === PAINEL DE REGRAS ===
    if (cmd === '!regras') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const canalRegrasId = getConfig(message.guild).channels?.regras || '1474574072355750037';
        const canalRegras = message.guild.channels.cache.get(canalRegrasId);
        
        if (!canalRegras) {
            return message.channel.send({ content: '❌ Canal de regras não encontrado.' });
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.guild.name + ' • Regras Oficiais',
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle('📜┃REGRAS OFICIAIS DO SERVIDOR')
            .setDescription(regrasData.conteudo)
            .setColor('#5865F2')
            .setFooter({ text: 'Sistema de Regras • 2026' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('editar_regras')
                .setLabel('Editar Regras')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary)
        );

        await canalRegras.send({ embeds: [embed], components: [row] });

return message.channel.send({ content: '✅ Painel de regras enviado!' });
    }

    // === PAINEL SUPORTE ===
    if (cmd === '!suporte') {
        if (!isStaff(message.member)) return;
        await deleteUserMessage();

        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.guild.name + ' • Sistema de Suporte',
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle('🎫 Sistema de Suporte')
            .setDescription(
                '> Bem-vindo ao sistema de suporte.\n\n' +
                'Precisa de ajuda? Clique no botão abaixo para abrir um ticket.\n\n' +
                '📝 **Como funciona:**\n' +
                '1. Clique em "Preciso de Ajuda"\n' +
                '2. Descreva seu problema\n' +
                '3. Aguarde um membro da staff\n\n' +
                '⚠️ **Atenção:**\n' +
                '• Evite abrir múltiplos tickets\n' +
                '• Forneça detalhes do seu problema\n' +
                '• Aguarde pacientemente'
            )
            .setColor('#00ff00')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema de Suporte • 2026' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('suporte_abrir')
                .setLabel('Preciso de Ajuda')
                .setEmoji('🆘')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

/* ================= INTERAÇÕES ================= */

client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {

        // === ADV: REGISTRAR ===
        if (interaction.customId === 'adv_registrar') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode registrar advertências.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_adv_registrar')
                .setTitle('Registrar Advertência');

            const inputUsuario = new TextInputBuilder()
                .setCustomId('adv_usuario')
                .setLabel('Usuário (ID ou @menção)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: @usuario ou 123456789');

            const inputMotivo = new TextInputBuilder()
                .setCustomId('adv_motivo')
                .setLabel('Motivo da Advertência')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Descreva o motivo da advertência...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputUsuario),
                new ActionRowBuilder().addComponents(inputMotivo)
            );

            return interaction.showModal(modal);
        }

        // === ADV: VER ===
        if (interaction.customId === 'adv_ver') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode ver advertências.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_adv_ver')
                .setTitle('Ver Advertências');

            const inputUsuario = new TextInputBuilder()
                .setCustomId('adv_usuario_ver')
                .setLabel('Usuário (ID ou @menção)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: @usuario ou 123456789');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputUsuario)
            );

            return interaction.showModal(modal);
        }

        // === ADV: REMOVER ===
        if (interaction.customId === 'adv_remover') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode remover advertências.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_adv_remover')
                .setTitle('Remover Advertência');

            const inputUsuario = new TextInputBuilder()
                .setCustomId('adv_usuario_remover')
                .setLabel('Usuário (ID ou @menção)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: @usuario ou 123456789');

            const inputNumero = new TextInputBuilder()
                .setCustomId('adv_numero_remover')
                .setLabel('Número do Adv')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: 1, 2, 3...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputUsuario),
                new ActionRowBuilder().addComponents(inputNumero)
            );

            return interaction.showModal(modal);
        }

        // === FECHAR TICKET ADV ===
        if (interaction.customId === 'fechar_adv_ticket') {
            const userId = interaction.channel.topic;

            const embed = new EmbedBuilder()
                .setTitle('📕 Ticket de Adv Fechado')
                .setDescription(
                    '**Usuário:** <@' + userId + '>\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                );

            sendLog(interaction.guild, CHANNEL_TICKET_CLOSED, embed);

            await interaction.reply({ content: 'Fechando...', ephemeral: true });
            return interaction.channel.delete();
        }

        // === SET: MEMBRO (ABRE MODAL) ===
        if (interaction.customId === 'set_membro') {
            const member = interaction.member;

            if (member.roles.cache.has(SET_CARGO_MEMBRO)) {
                return interaction.reply({
                    content: '❌ Você já possui cargo de set!',
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_set_membro')
                .setTitle('Formulário de Membro');

            const inputNome = new TextInputBuilder()
                .setCustomId('set_nome')
                .setLabel('Seu Nickname no Jogo')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: bielzin');

            const inputID = new TextInputBuilder()
                .setCustomId('set_id')
                .setLabel('Seu ID no Jogo')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: 029');

            const inputRecrutador = new TextInputBuilder()
                .setCustomId('set_recrutador')
                .setLabel('Quem te recrutou?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: @nikola');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputID),
                new ActionRowBuilder().addComponents(inputRecrutador)
            );

            return interaction.showModal(modal);
        }

        // === APROVAR SET MEMBRO ===
        if (interaction.customId === 'aprovar_set') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            }

            const embed = interaction.message.embeds[0];
            if (!embed) {
                return interaction.reply({ content: '❌ Erro ao obter informações.', ephemeral: true });
            }

            let nome = '';
            let idwl = '';
            let recrutador = '';
            
            if (embed.fields && embed.fields.length >= 3) {
                nome = embed.fields[0]?.value || '';
                idwl = embed.fields[1]?.value || '';
                recrutador = embed.fields[2]?.value || '';
            }

            const userId = embed.footer?.text;
            if (!userId) {
                return interaction.reply({ content: '❌ Erro ao obter informações.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(userId);

            if (!member) {
                return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
            }

            if (!nome) nome = member.user.username;
            if (!idwl) idwl = '000';

            const cargos = ['1474574071072161882', '1474574071072161883'];
            const novoNickname = `${nome}#${idwl}`;
            
            await interaction.reply({ content: '✅ Set aprovado!', ephemeral: true });
            
            try {
                for (const cargoId of cargos) {
                    await member.roles.add(cargoId);
                }
            } catch (err) {
                console.log('Erro ao adicionar cargos:', err.message);
            }

            try {
                await member.setNickname(novoNickname);
            } catch (e) {
                console.log('Erro ao mudar nickname:', e.message);
            }

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎉 Set Aprovado!')
                    .setDescription(
                        'Parabéns! Seu set como **Membro** foi aprovado.\n\n' +
                        'Agora você faz parte da equipe!\n' +
                        'Seu nickname: **' + novoNickname + '**\n\n' +
                        '📌 Leia as regras e divirta-se!'
                    )
                    .setColor('Green')
                    .setTimestamp();

                await member.send({ embeds: [dmEmbed] });
            } catch (e) {
                // Silencioso
            }

            const setAprovadoEmbed = new EmbedBuilder()
                .setTitle('✅ Set Aprovado')
                .setDescription(
                    '**Usuário:** ' + member.toString() + '\n' +
                    '**Nome:** ' + nome + '\n' +
                    '**ID:** ' + idwl + '\n' +
                    '**Recrutador:** ' + recrutador + '\n' +
                    '**Aprovador:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                )
                .setColor('Green')
                .setTimestamp();

            sendLog(interaction.guild, SET_LOG_CHANNEL, setAprovadoEmbed);
        }

        // === REJEITAR SET MEMBRO ===
        if (interaction.customId === 'rejeitar_set') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
            }

            const embed = interaction.message.embeds[0];
            const userId = embed?.footer?.text;
            
            if (!userId) {
                return interaction.reply({ content: '❌ Erro ao obter informações.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);

            const setRejeitadoEmbed = new EmbedBuilder()
                .setTitle('❌ Set Rejeitado')
                .setDescription(
                    '**Usuário:** ' + (member ? member.toString() : '`' + userId + '`') + '\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                )
                .setColor('Red')
                .setTimestamp();

            sendLog(interaction.guild, SET_LOG_CHANNEL, setRejeitadoEmbed);

            if (member) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('❌ Set Reprovado')
                        .setDescription(
                            'Sua solicitação de set como **Membro** foi reprovada.\n\n' +
                            'Para mais informações, procure um membro da staff.\n\n' +
                            'Data: ' + data()
                        )
                        .setColor('Red')
                        .setTimestamp();

                    await member.send({ embeds: [dmEmbed] });
                } catch (e) {
                    // Silencioso
                }
            }

            await interaction.reply({ content: '❌ Set rejeitado.', ephemeral: true });
        }

        // === FECHAR TICKET SET ===
        if (interaction.customId === 'fechar_ticket_set') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode fechar tickets.', ephemeral: true });
            }

            const userId = interaction.channel.topic;

            const embed = new EmbedBuilder()
                .setTitle('📕 Ticket de Set Fechado')
                .setDescription(
                    '**Usuário:** <@' + userId + '>\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                );

            sendLog(interaction.guild, SET_TICKET_CLOSED_CHANNEL, embed);

            await interaction.reply({ content: 'Fechando...', ephemeral: true });
            return interaction.channel.delete();
        }

        // === TICKET FARM ===
        if (interaction.customId === 'abrir_ticket') {

            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ];

const staffRoles = getStaffRoles(interaction.guild);
            for (const roleId of staffRoles) {
                permissionOverwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }

            const canal = await interaction.guild.channels.create({
                name: 'ticket-' + interaction.user.username,
                type: ChannelType.GuildText,
                topic: interaction.user.id,
                parent: '1474574073274040550',
                permissionOverwrites: permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setTitle('📌 Painel de Envio')
                .setDescription(
                    'Olá ' + interaction.user.toString() + '! 👋\n\n' +
                    'Bem-vindo ao seu ticket de envio de farm.\n\n' +
                    '📝 **Como usar:**\n' +
                    'Clique no botão abaixo "Enviar Farm" e insira:\n' +
                    '• Nome do farm\n' +
                    '• Quantidade\n\n' +
                    '⚠️ **Atenção:**\n' +
                    '• Envie apenas farms válidos\n' +
                    '• Envie uma print confirmando o farm\n' +
                    '• Não frude o sistema\n' +
                    '• Staff pode fechar o ticket a qualquer momento'
                )
                .setColor('#2b2d31')
                .setFooter({ text: 'Sistema de Farm • 2026' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('enviar_farm').setLabel('Enviar Farm').setEmoji('📦').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            canal.send({ content: interaction.user.toString(), embeds: [embed], components: [row] });

            const openEmbed = new EmbedBuilder()
                .setTitle('🎟️ Ticket Aberto')
                .setDescription(
                    '**Dono:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                )
                .setColor('Green');

            sendLog(interaction.guild, CHANNEL_TICKET_OPENED, openEmbed);

            return interaction.reply({ content: '✅ Ticket criado: ' + canal.toString() + ' - ' + interaction.user.toString(), ephemeral: true });
        }

        if (interaction.customId === 'fechar_ticket') {

            if (!isStaff(interaction.member))
                return interaction.reply({ content: 'Sem permissão.', ephemeral: true });

            const dono = interaction.channel.topic;

            const embed = new EmbedBuilder()
                .setTitle('📕 Ticket Fechado')
                .setDescription(
                    '**Dono:** ' + (await client.users.fetch(dono)).toString() + '\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                );

            sendLog(interaction.guild, CHANNEL_TICKET_CLOSED, embed);

            await interaction.reply({ content: 'Fechando...', ephemeral: true });
            return interaction.channel.delete();
        }

        if (interaction.customId === 'enviar_farm') {

            const modal = new ModalBuilder()
                .setCustomId('modal_farm')
                .setTitle('Enviar Farm');

            const inputNomeFarm = new TextInputBuilder()
                .setCustomId('nome_farm')
                .setLabel('Nome do Farm')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: Mina, Mob, Evento...');

            const inputQuantidade = new TextInputBuilder()
                .setCustomId('quantidade_farm')
                .setLabel('Quantidade')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ex: 1000, 5000...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNomeFarm),
                new ActionRowBuilder().addComponents(inputQuantidade)
            );

return interaction.showModal(modal);
        }

        // === SUPORTE: ABRIR TICKET ===
        if (interaction.customId === 'suporte_abrir') {
            const modal = new ModalBuilder()
                .setCustomId('modal_suporte')
                .setTitle('Abrir Ticket de Suporte');

            const inputProblema = new TextInputBuilder()
                .setCustomId('suporte_problema')
                .setLabel('Descreva seu problema')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Descreva detalhadamente seu problema...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputProblema)
            );

            return interaction.showModal(modal);
        }

        // === SUPORTE: FECHAR TICKET ===
        if (interaction.customId === 'fechar_ticket_suporte') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode fechar tickets.', ephemeral: true });
            }

            const userId = interaction.channel.topic;

            const embed = new EmbedBuilder()
                .setTitle('📕 Ticket de Suporte Fechado')
                .setDescription(
                    '**Usuário:** <@' + userId + '>\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                );

const suporteConfig = getSuporteConfig(interaction.guild);
            sendLog(interaction.guild, suporteConfig.logChannel, embed);

            await interaction.reply({ content: 'Fechando...', ephemeral: true });
            return interaction.channel.delete();
        }

        // === SUPORTE: CHAMAR MEMBRO ===
        if (interaction.customId === 'suporte_chamar') {
            const userId = interaction.channel.topic;
            const user = await client.users.fetch(userId);

            if (!user) {
                return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
            }

            try {
                const notifyEmbed = new EmbedBuilder()
                    .setTitle('📢 Staff gostaria de falar com você!')
                    .setDescription(
                        'Um membro da staff está esperando por você no ticket de suporte.\n\n' +
                        'Por favor, retorne ao servidor para resolver seu problema.'
                    )
                    .setColor('Gold')
                    .setTimestamp();

                await user.send({ embeds: [notifyEmbed] });
            } catch (e) {
                // Silencioso
            }

            await interaction.reply({ content: '✅ Usuário notificado!', ephemeral: true });
        }

        // === SUPORTE: NOTIFICAR AFK ===
        if (interaction.customId === 'suporte_afk') {
            const userId = interaction.channel.topic;
            const user = await client.users.fetch(userId);

            if (!user) {
                return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
            }

            const member = interaction.guild.members.cache.get(userId);
            let statusAfk = false;

            if (member && member.presence) {
                if (member.presence.status === 'idle' || member.presence.status === 'dnd') {
                    statusAfk = true;
                }
            }

            if (statusAfk) {
                try {
                    const afkEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Você está marcado como AFK')
                        .setDescription(
                            'Um membro da staff está tentando entrar em contato com você.\n\n' +
                            'Por favor, retorne ao servidor quando possível.'
                        )
                        .setColor('Orange')
                        .setTimestamp();

                    await user.send({ embeds: [afkEmbed] });
                } catch (e) {
                    // Silencioso
                }

                await interaction.reply({ content: '⚠️ O usuário está AFK/DND. Foi enviado um alerta para ele.', ephemeral: true });
} else {
                await interaction.reply({ content: 'ℹ️ O usuário não está AFK/DND no momento.', ephemeral: true });
            }
        }

        // === EDITAR REGRAS ===
        if (interaction.customId === 'editar_regras') {
            if (!isStaff(interaction.member)) {
                return interaction.reply({ content: '❌ Apenas staff pode editar as regras.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_editar_regras')
                .setTitle('Editar Regras');

            const inputRegras = new TextInputBuilder()
                .setCustomId('input_regras')
                .setLabel('Novo Conteúdo das Regras')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Digite as novas regras...')
                .setValue(regrasData.conteudo);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputRegras)
            );

            return interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        // === MODAL ADV REGISTRAR ===
        if (interaction.customId === 'modal_adv_registrar') {
            const usuarioInput = interaction.fields.getTextInputValue('adv_usuario');
            const motivo = interaction.fields.getTextInputValue('adv_motivo');

            let userId = usuarioInput.replace(/[<@!>]/g, '');
            
            let user;
            if (/^\d+$/.test(userId)) {
                user = await client.users.fetch(userId).catch(() => null);
            } else {
                const member = interaction.guild.members.cache.find(m => m.user.username === usuarioInput || m.user.tag === usuarioInput);
                if (member) {
                    userId = member.id;
                    user = member.user;
                }
            }

            if (!user) {
                return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
            }

            garantir(userId);

            const numAdv = (metas[userId].punicoes || []).length + 1;

            metas[userId].punicoes.push({
                motivo: motivo,
                staff: interaction.user.id,
                data: data()
            });

            salvar();

            const advEmbed = new EmbedBuilder()
                .setTitle('⚠️ Adv Aplicado')
                .setDescription(
                    '**Usuário:** ' + user.toString() + '\n' +
                    '**Motivo:** ' + motivo + '\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data()
                )
                .setColor('Red');

            sendLog(interaction.guild, CHANNEL_PUNISHMENT_ADDED, advEmbed);

            const member = await interaction.guild.members.fetch(userId).catch(() => null);

            if (member) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Advertência Recebida')
                        .setDescription(
                            'Você recebeu uma advertência no servidor.\n\n' +
                            '**Motivo:** ' + motivo + '\n' +
                            '**Data:** ' + data() + '\n\n' +
                            'Em caso de dúvidas, procure um membro da staff.'
                        )
                        .setColor('Red')
                        .setTimestamp();

                    await member.send({ embeds: [dmEmbed] });
                } catch (e) {
                    // Silencioso
                }

                if (numAdv === 1 && (getAdvConfig(interaction.guild)).cargo1) {
                    try {
                        await member.roles.add((getAdvConfig(interaction.guild)).cargo1);
                    } catch (e) {
                        console.log('Erro ao adicionar cargo 1:', e.message);
                    }
                } else if (numAdv === 2 && (getAdvConfig(interaction.guild)).cargo2) {
                    try {
                        await member.roles.add((getAdvConfig(interaction.guild)).cargo2);
                    } catch (e) {
                        console.log('Erro ao adicionar cargo 2:', e.message);
                    }
                } else if (numAdv >= 3) {
                    try {
                        await member.ban({ reason: '3 advertências' });
                    } catch (e) {
                        console.log('Erro ao banir:', e.message);
                    }
                }

                // Permissões: apenas staff e o usuário da adv
            const staffRoles = getStaffRoles(interaction.guild);
            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ];

            for (const roleId of staffRoles) {
                permissionOverwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }

const advConfig = getAdvConfig(interaction.guild);
                const advCanal = await interaction.guild.channels.create({
                    name: 'adv-' + user.username,
                    type: ChannelType.GuildText,
                    topic: userId,
                    parent: (getAdvConfig(interaction.guild)).category || null,
                    permissionOverwrites: permissionOverwrites
                });

                const advPanelEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Painel de Advertência')
                    .setDescription(
                        '**Usuário:** ' + user.toString() + '\n' +
                        '**Motivo:** ' + motivo + '\n' +
                        '**Staff:** ' + interaction.user.toString() + '\n' +
                        '**Data:** ' + data() + '\n\n' +
                        '**Advertência:** ' + numAdv + 'º\n\n' +
                        (numAdv === 1 ? '⚠️ **Atenção:** Esta é a primeira advertência. Uma segunda advertência resultará em banimento.' : 
                         numAdv === 2 ? '🚨 **Atenção:** Esta é a segunda advertência. Uma terceira advertência resultará em banimento permanente.' :
                         '⛔ **Banido:** O usuário foi banido do servidor por atingir 3 advertências.')
                    )
                    .setColor(numAdv >= 3 ? 'DarkRed' : 'Red')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('fechar_adv_ticket')
                        .setLabel('Fechar Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

                advCanal.send({ embeds: [advPanelEmbed], components: [row] });

                return interaction.reply({ 
                    content: '✅ Advertência registrada! (' + numAdv + 'º adv)\nTicket criado: ' + advCanal.toString(), 
                    ephemeral: true 
                });
            }

            return interaction.reply({ content: '✅ Advertência registrada com sucesso!', ephemeral: true });
        }

        // === MODAL ADV VER ===
        if (interaction.customId === 'modal_adv_ver') {
            const usuarioInput = interaction.fields.getTextInputValue('adv_usuario_ver');
            
            let userId = usuarioInput.replace(/[<@!>]/g, '');
            
            let user;
            if (!/^\d+$/.test(userId)) {
                const member = interaction.guild.members.cache.find(m => m.user.username === usuarioInput || m.user.tag === usuarioInput);
                if (member) {
                    userId = member.id;
                    user = member.user;
                }
            } else {
                user = await client.users.fetch(userId).catch(() => null);
            }

            if (!user) {
                return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
            }

            garantir(userId);
            const lista = metas[userId].punicoes;

            const desc = lista.length
                ? lista.map((p, i) => '**' + (i + 1) + '.** ' + p.motivo + '\n👮 <@' + p.staff + '> • ' + p.data).join('\n\n')
                : 'Sem advs.';

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Advs — ' + user.username)
                .setDescription(desc)
                .setColor('Red')
                .setFooter({ text: userId });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // === MODAL ADV REMOVER ===
        if (interaction.customId === 'modal_adv_remover') {
            const usuarioInput = interaction.fields.getTextInputValue('adv_usuario_remover');
            const numeroAdv = parseInt(interaction.fields.getTextInputValue('adv_numero_remover')) - 1;
            
            let userId = usuarioInput.replace(/[<@!>]/g, '');
            
            let user;
            if (!/^\d+$/.test(userId)) {
                const member = interaction.guild.members.cache.find(m => m.user.username === usuarioInput || m.user.tag === usuarioInput);
                if (member) {
                    userId = member.id;
                    user = member.user;
                }
            } else {
                user = await client.users.fetch(userId).catch(() => null);
            }

            if (!user) {
                return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
            }

            garantir(userId);
            const lista = metas[userId].punicoes;

            if (numeroAdv < 0 || numeroAdv >= lista.length) {
                return interaction.reply({ content: '❌ Número de adv inválido.', ephemeral: true });
            }

            const advRemovido = lista.splice(numeroAdv, 1)[0];
            salvar();

            const advEmbed = new EmbedBuilder()
                .setTitle('✅ Adv Removido')
                .setDescription(
                    '**Usuário:** ' + user.toString() + '\n' +
                    '**Adv Removido:** ' + advRemovido.motivo + '\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data()
                )
                .setColor('Green');

            sendLog(interaction.guild, CHANNEL_PUNISHMENT_REMOVED, advEmbed);

            return interaction.reply({ content: '✅ Adv removido com sucesso!', ephemeral: true });
        }

        // === FORMULÁRIO SET MEMBRO ===
        if (interaction.customId === 'modal_set_membro') {
            const nome = interaction.fields.getTextInputValue('set_nome');
            const idwl = interaction.fields.getTextInputValue('set_id');
            const recrutador = interaction.fields.getTextInputValue('set_recrutador');

            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ];

            for (const roleId of getStaffRoles(interaction.guild)) {
                permissionOverwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }

            const canal = await interaction.guild.channels.create({
                name: 'set-' + interaction.user.username,
                type: ChannelType.GuildText,
                topic: interaction.user.id,
                parent: SET_CATEGORY,
                permissionOverwrites: permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setTitle('📝 Solicitação de Set')
                .addFields(
                    { name: 'Nickname', value: nome, inline: true },
                    { name: 'ID', value: idwl, inline: true },
                    { name: 'Recrutador', value: recrutador, inline: false }
                )
                .setDescription(
                    '**Usuário:** ' + interaction.user.toString() + '\n\n' +
                    '⏰ **Aguardando aprovação da staff...**\n\n' +
                    '📋 **Como funciona:**\n' +
                    '1. Preencha seu formulário corretamente\n' +
                    '2. Aguarde a staff analisar sua solicitação\n' +
                    '3. Se aprovado, você receberá cargo e mensagem na DM\n\n' +
                    '⚠️ **Atenção:**\n' +
                    '• Dados falsos serão reprovados\n' +
                    '• Mantenha seu nickname atualizado\n' +
'• Siga as regras do servidor'
                )
                .setColor('#00ff00')
                .setFooter({ text: interaction.user.id })
                .setTimestamp();

            const staffRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('aprovar_set')
                    .setLabel('Aprovar')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rejeitar_set')
                    .setLabel('Rejeitar')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('fechar_ticket_set')
                    .setLabel('Fechar Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Secondary)
            );

            canal.send({ embeds: [embed], components: [staffRow] });

            return interaction.reply({
                content: '✅ Formulário enviado! Aguarde aprovação no canal: ' + canal.toString(),
                ephemeral: true
            });
        }

        // === ENVIO DE FARM ===
        if (interaction.customId === 'modal_farm') {

            const nomeFarm = interaction.fields.getTextInputValue('nome_farm');
            const quantidade = parseInt(interaction.fields.getTextInputValue('quantidade_farm'));

            const userId = interaction.channel.topic;
            const user = await client.users.fetch(userId);

            if (!user)
                return interaction.reply({
                    content: 'Usuário não encontrado.',
                    ephemeral: true
                });

            garantir(userId);

            metas[userId].atual += quantidade;
            metas[userId].historico.push(
                '+' + quantidade + ' (' + nomeFarm + ') • Ticket'
            );

            salvar();

            const { atual, meta } = metas[userId];

            const embed = new EmbedBuilder()
                .setTitle('📈 Farm Enviado')
                .setDescription(
                    user.toString() + '\n' +
                    'Farm: **' + nomeFarm + '**\n' +
                    'Quantidade: **' + quantidade + '**\n' +
                    'Progresso: **' + atual + '/' + meta + '**\n\n' +
                    '`' + gerarBarra(atual, meta) + '`'
                )
                .setColor('Green');

            await interaction.reply({ embeds: [embed] });

            const farmLogEmbed = new EmbedBuilder()
                .setTitle('📝 Farm Registrado')
                .setDescription(
                    '**Usuário:** ' + user.toString() + '\n' +
                    '**Quantidade:** ' + quantidade + '\n' +
                    '**Farm:** ' + nomeFarm + '\n' +
                    '**Staff:** ' + interaction.user.toString() + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                )
                .setColor('Green');

            sendLog(interaction.guild, CHANNEL_FARM_REGISTERED, farmLogEmbed);
        }

        // === EDITAR REGRAS (SALVAR) ===
        if (interaction.customId === 'modal_editar_regras') {
            const novoConteudo = interaction.fields.getTextInputValue('input_regras');

            regrasData.conteudo = novoConteudo;
            salvarRegras();

            const canalRegras = interaction.guild.channels.cache.get(REGRAS_CHANNEL);

            if (canalRegras) {
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: interaction.guild.name + ' • Regras Oficiais',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTitle('📜┃REGRAS OFICIAIS DO SERVIDOR')
                    .setDescription(novoConteudo)
                    .setColor('#5865F2')
                    .setFooter({ text: 'Sistema de Regras • 2026' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('editar_regras')
                        .setLabel('Editar Regras')
                        .setEmoji('✏️')
                        .setStyle(ButtonStyle.Primary)
                );

                const mensagens = await canalRegras.messages.fetch({ limit: 10 });
                const msgAntiga = mensagens.find(m => m.components.length > 0);

                if (msgAntiga) {
                    await msgAntiga.edit({ embeds: [embed], components: [row] });
                } else {
                    await canalRegras.send({ embeds: [embed], components: [row] });
                }
            }

return interaction.reply({ content: '✅ Regras atualizadas com sucesso!', ephemeral: true });
        }

        // === MODAL SUPORTE (CRIAR TICKET) ===
        if (interaction.customId === 'modal_suporte') {
            const problema = interaction.fields.getTextInputValue('suporte_problema');

            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ];

            for (const roleId of getStaffRoles(interaction.guild)) {
                permissionOverwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }

            const canal = await interaction.guild.channels.create({
                name: 'suporte-' + interaction.user.username,
                type: ChannelType.GuildText,
                topic: interaction.user.id,
                parent: SUPORTE_CATEGORY,
                permissionOverwrites: permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket de Suporte')
                .setDescription(
                    '**Usuário:** ' + interaction.user.toString() + '\n\n' +
                    '**Problema:**\n' + problema + '\n\n' +
                    '⏰ Aguardando atendimento da staff...'
                )
                .setColor('#00ff00')
                .setFooter({ text: 'Sistema de Suporte • 2026' })
                .setTimestamp();

const staffRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket_suporte')
                    .setLabel('Fechar Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('suporte_chamar')
                    .setLabel('Chamar Usuário')
                    .setEmoji('📢')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('suporte_adicionar')
                    .setLabel('Adicionar Membro')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Secondary)
            );

            // Row for user to add someone
            const userRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('suporte_adicionar')
                    .setLabel('Adicionar Membro ao Ticket')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Primary)
            );

            canal.send({ embeds: [embed], components: [staffRow] });
            canal.send({ content: '📌 Use o botão abaixo para adicionar alguém ao ticket:', components: [userRow] });

            // Log quando ticket é aberto
            const openEmbed = new EmbedBuilder()
                .setTitle('🎟️ Ticket de Suporte Aberto')
                .setDescription(
                    '**Usuário:** ' + interaction.user.toString() + '\n' +
                    '**Problema:** ' + problema + '\n' +
                    '**Data:** ' + data() + '\n' +
                    '**Hora:** ' + hora()
                )
                .setColor('Green');

            sendLog(interaction.guild, SUPORTE_TICKET_CHANNEL, openEmbed);

            return interaction.reply({ content: '✅ Ticket criado: ' + canal.toString(), ephemeral: true });
        }
    }
});

/* ================= RESET SEMANAL ================= */

cron.schedule('32 0 * * 2', () => {
    metas = {};
    salvar();
    console.log('Reset semanal executado');
});

/* ================= LOGIN ================= */

(async () => {
    try {
        console.log("TOKEN carregado?", TOKEN ? "SIM" : "NÃO");
        console.log('🔐 Tentando login...');
        await client.login(TOKEN);
    } catch (error) {
        console.error('❌ Erro ao logar:', error);
    }
})();

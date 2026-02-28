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

require('dotenv').config();

const fs = require('fs');
const cron = require('node-cron');
const express = require("express");

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
        GatewayIntentBits.MessageContent
    ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;

const LOG_CHANNEL_ID = '1476236873775972537';
const TICKET_LOG_CHANNEL_ID = '1476229162300739604';

const STAFF_ROLE_ID = [
    '1474574071093268620',
    '1474574071072161891',
    '1474574071105589342',
    '1474574071105589343',
    '1474574071105589344',
    '1474574071105589346'
];

/* ================= DATABASE ================= */

const DATA_FILE = './metas.json';

let metas = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE))
    : {};

const salvar = () =>
    fs.writeFileSync(DATA_FILE, JSON.stringify(metas, null, 2));

/* ================= PERMISSIONS ================= */

const isStaff = (member) => {
    if (!member) return false;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.some(r => STAFF_ROLE_ID.includes(r.id));
};

/* ================= UTILS ================= */

function gerarBarra(atual, meta, tamanho = 20) {
    const progresso = Math.min(atual / meta, 1);
    const preenchido = Math.round(tamanho * progresso);
    return '█'.repeat(preenchido) + '░'.repeat(tamanho - preenchido);
}

function garantir(userId) {
    if (!metas[userId]) {
        metas[userId] = {
            meta: 2000,
            atual: 0,
            historico: [],
            punicoes: []
        };
    }
}

function data() {
    return new Date().toLocaleString('pt-BR');
}

function log(guild, embed) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send({ embeds: [embed] });
}

/* ================= READY ================= */

client.once('ready', () => {
    console.log('🤖 Bot conectado como ' + client.user.tag);
});

client.on('error', (err) => {
    console.error('Erro no bot:', err);
});

/* ================= COMANDOS ================= */

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const cmd = args.shift()?.toLowerCase();

    if (cmd === '!painel') {
        if (!isStaff(message.member)) return;

        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket de Farm')
            .setDescription('Clique para abrir ticket.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_ticket')
                .setLabel('Abrir Ticket')
                .setStyle(ButtonStyle.Success)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (cmd === '!ranking') {
        const ranking = Object.entries(metas)
            .sort((a, b) => b[1].atual - a[1].atual)
            .slice(0, 10);

        if (!ranking.length) return message.reply('Sem dados.');

        const desc = ranking.map(([id, d], i) =>
            `**${i + 1}.** <@${id}> — ${d.atual}/${d.meta}`
        ).join('\n');

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏆 Ranking')
                .setDescription(desc)
                .setColor('Gold')]
        });
    }

    if (cmd === '!addfarm') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const qtd = parseInt(args[1]);

        if (!user || !qtd)
            return message.reply('Uso: !addfarm @user qtd');

        garantir(user.id);

        metas[user.id].atual += qtd;
        metas[user.id].historico.push(`+${qtd} • ${message.author.tag}`);

        salvar();

        const { atual, meta } = metas[user.id];

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('📈 Farm Adicionado')
                .setDescription(
                    `${user}\n` +
                    `Adicionado: **${qtd}**\n` +
                    `Progresso: **${atual}/${meta}**\n\n` +
                    `\`${gerarBarra(atual, meta)}\``
                )
                .setColor('Green')]
        });
    }

    if (cmd === '!setmeta') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const meta = parseInt(args[1]);

        if (!user || !meta) return;

        garantir(user.id);
        metas[user.id].meta = meta;
        salvar();

        return message.reply('Meta atualizada.');
    }

    if (cmd === '!historico') {
        const user = message.mentions.users.first();
        if (!user) return;

        garantir(user.id);

        const hist = metas[user.id].historico.slice(-10).reverse();

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle(`📜 Histórico — ${user.username}`)
                .setDescription(hist.length ? hist.join('\n') : 'Vazio')]
        });
    }

    if (cmd === '!resetar') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        if (!user) return;

        delete metas[user.id];
        salvar();

        return message.reply('Resetado.');
    }

    if (cmd === '!punir') {
        if (!isStaff(message.member)) return;

        const user = message.mentions.users.first();
        const motivo = args.slice(1).join(' ');

        if (!user || !motivo) return;

        garantir(user.id);

        metas[user.id].punicoes.push({
            motivo,
            staff: message.author.id,
            data: data()
        });

        salvar();

        return message.reply('Punição registrada.');
    }

    if (cmd === '!punicoes') {
        const user = message.mentions.users.first();
        if (!user) return;

        garantir(user.id);

        const lista = metas[user.id].punicoes;

        const desc = lista.length
            ? lista.map((p, i) =>
                `**${i + 1}.** ${p.motivo}\n👮 <@${p.staff}> • ${p.data}`
            ).join('\n\n')
            : 'Sem punições.';

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle(`⚠️ Punições — ${user.username}`)
                .setDescription(desc)
                .setColor('Red')]
        });
    }
});

/* ================= INTERAÇÕES ================= */

client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {

        if (interaction.customId === 'abrir_ticket') {

            const permissionOverwrites = [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages
                    ]
                }
            ];

            for (const roleId of STAFF_ROLE_ID) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages
                    ]
                });
            }

            const canal = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                topic: interaction.user.id,
                parent: '1474574073274040550',
                permissionOverwrites
            });

            const embed = new EmbedBuilder()
                .setTitle('📌 Painel de Envio')
                .setDescription('Use o botão abaixo para enviar farm.')
                .setColor('#2b2d31');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('enviar_farm')
                    .setLabel('Enviar Farm')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            canal.send({
                content: `${interaction.user}`,
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content: `Ticket criado: ${canal}`,
                ephemeral: true
            });
        }

        if (interaction.customId === 'fechar_ticket') {

            if (!isStaff(interaction.member))
                return interaction.reply({
                    content: 'Sem permissão.',
                    ephemeral: true
                });

            const dono = interaction.channel.topic;

            const embed = new EmbedBuilder()
                .setTitle('📕 Ticket Fechado')
                .setDescription(
                    `Canal: ${interaction.channel.name}\n` +
                    `Dono: <@${dono}>\n` +
                    `Staff: ${interaction.user}\n` +
                    `Data: ${data()}`
                );

            const logChannel =
                interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

            if (logChannel)
                logChannel.send({ embeds: [embed] });

            await interaction.reply({
                content: 'Fechando...',
                ephemeral: true
            });

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
                .setRequired(true);

            const inputQuantidade = new TextInputBuilder()
                .setCustomId('quantidade_farm')
                .setLabel('Quantidade de Farm')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNomeFarm),
                new ActionRowBuilder().addComponents(inputQuantidade)
            );

            return interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        if (interaction.customId === 'modal_farm') {

            const nomeFarm =
                interaction.fields.getTextInputValue('nome_farm');

            const quantidade = parseInt(
                interaction.fields.getTextInputValue('quantidade_farm')
            );

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
                `+${quantidade} (${nomeFarm}) • Ticket`
            );

            salvar();

            const { atual, meta } = metas[userId];

            const embed = new EmbedBuilder()
                .setTitle('📈 Farm Enviado')
                .setDescription(
                    `${user}\n` +
                    `Farm: **${nomeFarm}**\n` +
                    `Quantidade: **${quantidade}**\n` +
                    `Progresso: **${atual}/${meta}**\n\n` +
                    `\`${gerarBarra(atual, meta)}\``
                )
                .setColor('Green');

            await interaction.reply({ embeds: [embed] });

            const logChannel =
                interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

            if (logChannel) {
                logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('📝 Farm Registrado')
                            .setDescription(
                                `${user} enviou **${quantidade}** de farm (${nomeFarm})`
                            )
                            .setColor('Green')
                    ]
                });
            }
        }
    }
});

/* ================= RESET SEMANAL ================= */

cron.schedule('0 22 * * 5', () => {
    metas = {};
    salvar();
    console.log('Reset semanal executado');
});

/* ================= LOGIN ================= */

(async () => {
  try {
    console.log('🔐 Tentando login...');
    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error('❌ Erro ao logar:', error);
  }
})();

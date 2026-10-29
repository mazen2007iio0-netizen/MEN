const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

// ============================
// 1) تعريف الأوامر
// ============================
const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('ping')
      .setDescription('يعرض سرعة استجابة البوت'),
    async execute(interaction) {
      const sent = await interaction.reply({
        content: 'جاري القياس...',
        fetchReply: true
      });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply(
        `🏓 البونج: ${latency}ms\n📡 WebSocket: ${Math.round(interaction.client.ws.ping)}ms`
      );
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('يعرض قائمة أوامر البوت'),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setTitle('📜 أوامر البوت')
        .setDescription(
          [
            '`/ping` - سرعة استجابة البوت',
            '`/help` - قائمة الأوامر',
            '`/serverinfo` - معلومات السيرفر',
            '`/userinfo [user]` - معلومات عضو',
            '`/avatar [user]` - صورة العضو'
          ].join('\n')
        )
        .setColor(0x5865f2);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('يعرض معلومات السيرفر'),
    async execute(interaction) {
      if (!interaction.guild) {
        return interaction.reply({
          content: 'هذا الأمر يعمل داخل سيرفر فقط.',
          ephemeral: true
        });
      }
      const { guild } = interaction;
      const embed = new EmbedBuilder()
        .setTitle(`معلومات ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: '🆔 ID', value: guild.id, inline: true },
          { name: '👑 المالك', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 الأعضاء', value: `${guild.memberCount}`, inline: true },
          {
            name: '📅 تاريخ الإنشاء',
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
            inline: true
          }
        )
        .setColor(0x5865f2);
      await interaction.reply({ embeds: [embed] });
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('يعرض معلومات عضو')
      .addUserOption(o =>
        o.setName('user').setDescription('العضو المطلوب').setRequired(false)
      ),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild
        ? await interaction.guild.members.fetch(user.id).catch(() => null)
        : null;

      const embed = new EmbedBuilder()
        .setTitle(`معلومات ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '👤 اسم المستخدم', value: user.username, inline: true },
          {
            name: '📅 تاريخ إنشاء الحساب',
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
            inline: true
          }
        )
        .setColor(0x5865f2);

      if (member) {
        embed.addFields({
          name: '📥 تاريخ الانضمام',
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
          inline: true
        });
      }
      await interaction.reply({ embeds: [embed] });
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('يعرض صورة عضو')
      .addUserOption(o =>
        o.setName('user').setDescription('العضو المطلوب').setRequired(false)
      ),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder()
        .setTitle(`🖼️ أفاتار ${user.tag}`)
        .setImage(user.displayAvatarURL({ size: 1024 }))
        .setColor(0x5865f2);
      await interaction.reply({ embeds: [embed] });
    }
  }
];

// ============================
// 2) تسجيل الأوامر تلقائياً
// ============================
async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error('❌ تأكد من DISCORD_TOKEN و CLIENT_ID');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const body = commands.map(c => c.data.toJSON());

  try {
    console.log('⏳ جاري تسجيل أوامر Slash...');
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log('✅ تم تسجيل الأوامر في السيرفر.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log('✅ تم تسجيل Global. قد تحتاج وقتاً للظهور.');
    }
  } catch (err) {
    console.error('❌ فشل تسجيل الأوامر:', err);
  }
}

// ============================
// 3) تشغيل البوت
// ============================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
for (const c of commands) client.commands.set(c.data.name, c);

client.once(Events.ClientReady, c => {
  console.log(`✅ تم تسجيل الدخول باسم ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const payload = { content: '❌ حدث خطأ.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

(async () => {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('❌ لم يتم العثور على DISCORD_TOKEN');
    process.exit(1);
  }
  await deployCommands();
  await client.login(token);
})();

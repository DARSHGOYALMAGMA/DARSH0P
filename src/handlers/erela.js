const { Manager } = require("erela.js");
const Deezer = require("erela.js-deezer");
const Facebook = require("erela.js-facebook");
const Spotify = require("erela.js-spotify");
const { MessageEmbed } = require("discord.js");
const prettyMs = require("pretty-ms");
const { sendMessage } = require("@utils/botUtils");

/**
 * @param {import("@structures/BotClient")} client
 * @returns {Manager}
 */
module.exports = (client) => {
  // Load Plugins
  const plugins = [
    new Deezer({
      albumLimit: 1,
      playlistLimit: 1,
    }),

    new Facebook(),
  ];

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    plugins.push(
      new Spotify({
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        albumLimit: 1,
        playlistLimit: 1,
      })
    );
  }

  const erela = new Manager({
    nodes: client.config.ERELA_JS.NODES,
    autoPlay: true,
    plugins,

    send: (id, payload) => {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  erela.on("nodeConnect", (node) => {
    client.logger.log(`Node "${node.options.identifier}" connected`);
  });

  erela.on("nodeError", (node, error) => {
    client.logger.error(`Node "${node.options.identifier}" encountered an error: ${error.message}.`, error);
  });

  erela.on("nodeReconnect", (node) => {
    client.logger.warn(`Node "${node.options.identifier}" is reconnecting`);
  });

  erela.on("queueEnd", (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    sendMessage(channel, "Queue has ended.");
    player.destroy();
  });

  erela.on("trackError", (player, track, ex) => {
    client.logger.debug(`[${player.guild}] Track Error`);
    client.logger.error(`Track Error ${ex.error}`);
  });

  erela.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);

    const embed = new MessageEmbed()
      .setAuthor({ name: "Now Playing" })
      .setColor(client.config.EMBED_COLORS.BOT_EMBED)
      .setDescription(`[${track.title}](${track.uri})`)
      .addField("Song Duration", "`" + prettyMs(track.duration, { colonNotation: true }) + "`", true)
      .setFooter({ text: `Requested By: ${track.requester.tag}` });

    if (typeof track.displayThumbnail === "function") embed.setThumbnail(track.displayThumbnail("hqdefault"));
    if (player.queue.totalSize > 0) embed.addField("Position in Queue", (player.queue.size - 0).toString(), true);
    sendMessage(channel, { embeds: [embed] });
  });

  return erela;
};

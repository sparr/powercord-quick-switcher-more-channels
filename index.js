const { Plugin } = require("powercord/entities");
const { Icon } = require("powercord/components");
const { inject, uninject } = require("powercord/injector");
const {
  React,
  getModule,
  getModuleByDisplayName,
  i18n: { Messages },
} = require("powercord/webpack");
const i18n = require("./i18n");
const { getChannel } = getModule(["getMutableGuildChannels"], false);

module.exports = class QuickSwitcherMoreChannels extends Plugin {
  async startPlugin() {
    powercord.api.i18n.loadAllStrings(i18n);

    //FIXME: stop doing this when things start working
    this.settings.set("favorite-channels", new Set());

    const QuickSwitcher = getModule(
      (m) => m?.default?.displayName === "QuickSwitcherConnected",
      false
    );

    // add Favorite Channels to the default quick switcher results
    inject(
      "quick-switcher-more-channels-quickswitcher",
      QuickSwitcher,
      "default",
      (_, res) => {
        if (res.props.query != "") return res;
        let index = 0;
        // Favorite Channels goes after Last Channel if present
        if (
          res.props.results.length > 0 &&
          res.props.results[0].record.id === "Last Channel"
        )
          index = 2;
        if (
          res.props.results.length > index &&
          res.props.results[index].record.id === "Favorite Channels"
        )
          return res;
        const favorites = this.settings.get("favorite-channels");
        if (favorites && favorites.size > 0) {
          let favorites_results = Array.from(favorites, (id) => {
            let channel = getChannel(id.toString());
            return {
              comparator: channel.name,
              record: channel,
              score: 0,
              type: "TEXT_CHANNEL",
            };
          });
          favorites_results.unshift({
            record: {
              id: "Favorite Channels",
              text: Messages.QUICKSWITCHER_FAVORITE_CHANNELS,
            },
            score: 0,
            type: "HEADER",
          });
          res.props.results.splice(index, 0, ...favorites_results);
        }
        return res;
      }
    );

    const iconClasses = await getModule(["iconItem"]);
    const Tooltip = await getModuleByDisplayName("Tooltip");
    const ChannelItem = await getModule(
      (m) => m.default && m.default.displayName == "ChannelItem"
    );
    const { getCurrentChannelSettings } = getModule(
      ["getCurrentChannelSettings"],
      false
    );
    const { updateChannelOverrideSettings } = getModule(
      ["updateChannelOverrideSettings"],
      false
    );

    // Add a hover icon to channels in the channel list, to fave/unfave
    inject(
      "quick-switcher-more-channels-channelitem",
      ChannelItem,
      "default",
      (args) => {
        if (args.length == 0) return args;
        if (args[0]["channel"]["type"] == 2) return args;
        let favorites = this.settings.get("favorite-channels");
        const favorited =
          favorites && favorites.size > 0
            ? favorites.has(args[0]["channel"]["id"])
            : false;
        args[0].children.unshift(
          React.createElement(
            "div",
            { className: iconClasses.iconItem },
            React.createElement(
              Tooltip,
              {
                text: favorited
                  ? Messages.REMOVE_FAVORITE_CHANNEL
                  : Messages.ADD_FAVORITE_CHANNEL,
              },
              (props) =>
                React.createElement(Icon, {
                  ...props,
                  name: favorited ? "FavoriteFilled" : "Favorite",
                  className: iconClasses.actionIcon,
                  width: 16,
                  height: 16,
                  onClick: () => {
                    if (!favorited) {
                      favorites.add(args[0]["channel"]["id"]);
                      this.settings.set("favorite-channels", favorites);
                    } else {
                      favorites.delete(args[0]["channel"]["id"]);
                      this.settings.set("favorite-channels", favorites);
                    }
                    //FIXME: this is just to force the ChannelItem to re-render with its new favorite status
                    let muted = getCurrentChannelSettings(
                      args[0]["channel"]["guild_id"],
                      args[0]["channel"]["id"]
                    ).channel_is_muted;
                    updateChannelOverrideSettings(
                      args[0]["channel"]["guild_id"],
                      args[0]["channel"]["id"],
                      { muted: !muted }
                    );
                    updateChannelOverrideSettings(
                      args[0]["channel"]["guild_id"],
                      args[0]["channel"]["id"],
                      { muted: muted }
                    );
                  },
                })
            )
          )
        );
        return args;
      },
      true
    );

    QuickSwitcher.default.displayName = "QuickSwitcherConnected";
  }

  pluginWillUnload() {
    uninject("quick-switcher-more-channels`");
  }
};

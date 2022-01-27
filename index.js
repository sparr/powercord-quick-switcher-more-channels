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

    if (!(this.settings.get("favorite-channels") instanceof Set))
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
        let ids_in_list = new Set();
        for (let result of res.props.results) {
          // Don't add favorites twice. Unclear if/when this would happen.
          if (result.record.id === "Favorite Channels") return res
          // Keep track of channels already in the list as last/mention/draft/etc
          ids_in_list.add(result.record.id);
        }
        const favorites = this.settings.get("favorite-channels");
        if (favorites && favorites.size > 0) {
          // create a list of favorite channels
          let favorites_results = Array.from(favorites, (id) => {
            let channel = getChannel(id.toString());
            // duplicate entries cause misbehavior in the list view
            if (ids_in_list.has(id)) return undefined
            return {
              comparator: channel.name,
              record: channel,
              score: 0,
              type: "TEXT_CHANNEL",
            };
          });
          // add a header to the top of the list
          favorites_results.unshift({
            record: {
              id: "Favorite Channels",
              text: Messages.QUICKSWITCHER_FAVORITE_CHANNELS,
            },
            score: 0,
            type: "HEADER",
          });
          // remove all the undefined entries
          favorites_results = favorites_results.filter( n => n );
          // add favorites to the bottom of the list
          res.props.results.push(...favorites_results);
        }
        return res;
      }
    );
    QuickSwitcher.default.displayName = "QuickSwitcherConnected";

    
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
                    //FIXME: find another way to re-render the ChannelItem
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
    ChannelItem.default.displayName = 'ChannelItem'
  }

  pluginWillUnload() {
    uninject("quick-switcher-more-channels`");
  }
};

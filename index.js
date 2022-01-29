const { Plugin } = require("powercord/entities");
const { Icon } = require("powercord/components");
const { inject, uninject } = require("powercord/injector");
const {
  React,
  getModule,
  getModuleByDisplayName,
  FluxDispatcher,
  i18n: { Messages },
} = require("powercord/webpack");
const i18n = require("./i18n");
const { getChannel } = getModule(["getMutableGuildChannels"], false);

module.exports = class QuickSwitcherMoreChannels extends Plugin {
  async startPlugin() {
    powercord.api.i18n.loadAllStrings(i18n);

    const QuickSwitcher = getModule(
      (m) => m?.default?.displayName === "QuickSwitcherConnected",
      false
    );

    // add Favorite Channels and Recent Channels to the default quick switcher results
    inject(
      "quick-switcher-more-channels-quickswitcher",
      QuickSwitcher,
      "default",
      (_, res) => {
        if (res.props.query != "") return res;
        let do_favorites = true;
        let do_recents = true;
        let ids_in_list = new Set();
        for (let result of res.props.results) {
          // Don't add categories twice. Unclear if/when this would happen.
          if (result.record.id === "Favorite Channels") do_favorites = false;
          if (result.record.id === "Recent Channels") do_recents = false;
          //TODO: Find a way to include the same channel multiple times in the list without UI problems
          // Keep track of channels already in the list as last/mention/draft/etc
          ids_in_list.add(result.record.id);
        }
        if (do_recents) {
          // Recent Channels replaces Last Channel
          if (
            res.props.results.length > 0 &&
            res.props.results[0].record.id === "Last Channel"
          ) {
            // forget that we tracked the Last Channel as already being in the list
            ids_in_list.delete(res.props.results[1].record.id);
            // remove Last Channel header and channel from the list
            res.props.results.splice(0, 2);
          }
          // load recent channels from settings, minus the one we're in right now
          const recents = this.settings.get("recent-channels", []).slice(1);
          let recent_results = this.list_to_results(
            recents,
            ids_in_list,
            "Recent Channels",
            Messages.QUICKSWITCHER_RECENT_CHANNELS
          );
          // add recents to the top of the list
          res.props.results.unshift(...recent_results);
          // add recents to the channels being tracked as already in the list
          recents.map((id) => ids_in_list.add(id));
        }
        if (do_favorites) {
          const favorites = this.settings.get("favorite-channels", []);
          let favorites_results = this.list_to_results(
            favorites,
            ids_in_list,
            "Favorite Channels",
            Messages.QUICKSWITCHER_FAVORITE_CHANNELS
          );
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
        let favorites = new Set(this.settings.get("favorite-channels", []));
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
                    let favorites = new Set(
                      this.settings.get("favorite-channels", [])
                    );
                    if (!favorited) {
                      favorites.add(args[0]["channel"]["id"]);
                      this.settings.set(
                        "favorite-channels",
                        Array.from(favorites)
                      );
                    } else {
                      favorites.delete(args[0]["channel"]["id"]);
                      this.settings.set(
                        "favorite-channels",
                        Array.from(favorites)
                      );
                    }
                    // FIXME: find another way to re-render the ChannelItem
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
    ChannelItem.default.displayName = "ChannelItem";

    FluxDispatcher.subscribe("CHANNEL_SELECT", this.handleChannelSelect);
  }

  list_to_results(list, existing_result_ids, header_id, header_text) {
    if (list && list.length > 0) {
      // create a list of favorite channels
      let results = Array.from(list, (id) => {
        let channel = getChannel(id.toString());
        // duplicate entries cause misbehavior in the list view
        if (existing_result_ids.has(id)) return undefined;
        return {
          comparator: channel.name,
          record: channel,
          score: 0,
          type: "TEXT_CHANNEL",
        };
      });
      // add a header to the top of the list
      results.unshift({
        record: {
          id: header_id,
          text: header_text,
        },
        score: 0,
        type: "HEADER",
      });
      // remove all the undefined entries
      return results.filter((n) => n);
    }
    return [];
  }

  // When a channel is selected, add it to the recent channels list (queue)
  handleChannelSelect = (arg) => {
    if (arg.channelId) {
      // load the list from settings
      let recents = this.settings.get("recent-channels", []);

      // remove this channel from the list if it's already in there
      let index = recents.indexOf(arg.channelId);
      if (index > -1) {
        recents.splice(index, 1);
      }

      // add this channel to the front of the list
      recents.unshift(arg.channelId);

      // truncate the list if necessary
      if (recents.length > 10) {
        recents.pop();
      }

      // save the list
      this.settings.set("recent-channels", recents);
    }
  };

  pluginWillUnload() {
    uninject("quick-switcher-more-channels-quickswitcher");
    uninject("quick-switcher-more-channels-channelitem");
    FluxDispatcher.unsubscribe("CHANNEL_SELECT", this.handleChannelSelect);
  }
};

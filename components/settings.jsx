const { React, getModule } = require("powercord/webpack");
const { TextInput, SwitchItem } = require("powercord/components/settings");

const { getChannel } = getModule(["getMutableGuildChannels"], false);

function filterInt(value) {
  if (/^[-+]?(\d+|Infinity)$/.test(value)) {
    return Number(value);
  } else {
    return NaN;
  }
}

function filterArray(value) {
  if (value === "") return []; // otherwise the split produces [""] which is not valid
  value = value.split(",");
  for (let id of value) {
    if (!getChannel(id)) return false;
  }
  return value;
}

module.exports = class Settings extends React.PureComponent {
  constructor(props) {
    super(props);

    this._setState(false);
  }

  _setState(update) {
    const state = {
      isChannelCountValid: filterInt(
        this.props.getSetting("recent-channels-count")
      ),
      initialChannelCountValue: filterInt(
        this.props.getSetting("recent-channels-count", 5)
      ),
      isRecentListValid: filterArray(
        this.props.getSetting("recent-channels").join(",")
      ),
      initialRecentListValue: this.props.getSetting("recent-channels", []),
      isFavoriteListValid: filterArray(
        this.props.getSetting("favorite-channels").join(",")
      ),
      initialFavoriteListValue: this.props.getSetting("favorite-channels", []),
    };

    if (update) {
      this.setState(state);
    } else {
      this.state = state;
    }
  }

  render() {
    let { getSetting, updateSetting, toggleSetting } = this.props;

    return (
      <>
        <div>
          <SwitchItem
            value={getSetting("show-favorite-channels", true)}
            onChange={() => toggleSetting("show-favorite-channels")}
          >
            Show Favorite Channels
          </SwitchItem>
          <SwitchItem
            value={getSetting("show-recent-channels", true)}
            onChange={() => toggleSetting("show-recent-channels")}
          >
            Show Recent Channels
          </SwitchItem>
          {getSetting("show-recent-channels", true) && (
            <>
              <TextInput
                onChange={(val) => {
                  val = filterInt(val); // Make sure that it's an integer.
                  if (val && val > 1) {
                    this.setState({ isChannelCountValid: true });
                    updateSetting("recent-channels-count", val);
                  } else {
                    this.setState({ isChannelCountValid: false });
                    updateSetting(
                      "recent-channels-count",
                      this.state.initialChannelCountValue
                    );
                  }
                }}
                defaultValue={getSetting("recent-channels-count", 5)}
                style={
                  !this.state.isChannelCountValid ? { borderColor: "red" } : {}
                }
                note="Maximum number of recent channels to show"
              >
                Recent Channels Count
              </TextInput>
              <TextInput
                onChange={(val) => {
                  val = filterArray(val);
                  if (val !== false) {
                    this.setState({ isRecentListValid: true });
                    updateSetting("recent-channels", val);
                  } else {
                    this.setState({ isRecentListValid: false });
                    updateSetting(
                      "recent-channels",
                      this.state.initialRecentListValue
                    );
                  }
                }}
                defaultValue={getSetting("recent-channels", []).join(",")}
                style={
                  !this.state.isRecentListValid ? { borderColor: "red" } : {}
                }
                note="This list automatically updates as you change channel focus"
              >
                Recent Channels
              </TextInput>
            </>
          )}
          {getSetting("show-favorite-channels", true) && (
            <>
              <TextInput
                onChange={(val) => {
                  val = filterArray(val);
                  if (val !== false) {
                    this.setState({ isFavoriteListValid: true });
                    updateSetting("favorite-channels", val);
                  } else {
                    this.setState({ isFavoriteListValid: false });
                    updateSetting(
                      "favorite-channels",
                      this.state.initialFavoriteListValue
                    );
                  }
                }}
                defaultValue={getSetting("favorite-channels", []).join(",")}
                style={
                  !this.state.isFavoriteListValid ? { borderColor: "red" } : {}
                }
                note="This list can be updated with the star icon beside channel names in the channel list"
              >
                Favorite Channels
              </TextInput>
            </>
          )}
        </div>
      </>
    );
  }
};

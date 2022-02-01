const { React } = require('powercord/webpack');
const { TextInput, SwitchItem } = require('powercord/components/settings');

module.exports = ({ getSetting, updateSetting, toggleSetting }) => (
  <div>
    <SwitchItem
      value={getSetting('show-favorite-channels', true)}
      onChange={() => toggleSetting('show-favorite-channels')}
    >
      Show Favorite Channels
    </SwitchItem>
    <SwitchItem
      value={getSetting('show-recent-channels', true)}
      onChange={() => toggleSetting('show-recent-channels')}
    >
      Show Recent Channels
    </SwitchItem>
    <TextInput
      onChange={val => updateSetting('recent-channels-count', val)}
      defaultValue={getSetting('recent-channels-count', 5)}
      note='Maximum number of recent channels to show'
      >
      Recent Channels Count
    </TextInput>
    <TextInput
      onChange={val => updateSetting('favorite-channels', val.split(','))}
      defaultValue={getSetting('favorite-channels', []).join(',')}
      note='This list can be updated with the star icon beside channel names in the channel list'
      >
      Favorite Channels
    </TextInput>
    <TextInput
      onChange={val => updateSetting('recent-channels', val.split(','))}
      defaultValue={getSetting('recent-channels', []).join(',')}
      note='This list automatically updates as you change channel focus'
      >
      Recent Channels
    </TextInput>
  </div>
);
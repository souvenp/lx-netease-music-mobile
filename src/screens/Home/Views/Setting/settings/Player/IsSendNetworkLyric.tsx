import { updateSetting } from '@/core/common';
import { createStyle } from '@/utils/tools';
import { memo } from 'react';
import { View } from 'react-native';
import { useSettingValue } from '@/store/setting/hook';
import CheckBoxItem from '../../components/CheckBoxItem';
import { toggle as toggleNetworkLyric } from '@/core/networkLyric';

export default memo(() => {
  const isSendNetworkLyric = useSettingValue('player.isSendNetworkLyric');
  const setSendNetworkLyric = (enable: boolean) => {
    updateSetting({ 'player.isSendNetworkLyric': enable });
    toggleNetworkLyric(enable);
  };

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isSendNetworkLyric}
        onChange={setSendNetworkLyric}
        label="啟用網絡歌詞"
        helpDesc="通過局域網 UDP 41234端口發送當前播放的歌詞。需要原生桌面歌詞處於可用狀態才能在後台工作。"
      />
    </View>
  );
});

const styles = createStyle({
  content: {
    marginTop: 5,
  },
});

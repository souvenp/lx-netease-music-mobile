import { memo } from 'react';
import { View } from 'react-native';
import SubTitle from '../../components/SubTitle';
import CheckBox from '@/components/common/CheckBox';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { createStyle } from '@/utils/tools';

const SettingItem = ({ settingKey, label }: { settingKey: keyof LX.AppSetting; label: string }) => {
  const value = useSettingValue(settingKey);
  const handleChange = (newValue: boolean) => {
    updateSetting({ [settingKey]: newValue });
  };

  return (
    <CheckBox
      check={value}
      onChange={handleChange}
      label={label}
    />
  );
};

export default memo(() => {
  const t = useI18n();
  return (
    <SubTitle title="菜单设置">
      <View style={styles.content}>
        <SettingItem settingKey="menu.playLater" label={t('play_later')} />
        <SettingItem settingKey="menu.share" label={t('copy_name')} />
        <SettingItem settingKey="menu.playMV" label={'播放MV'} />
        <SettingItem settingKey="menu.songDetail" label={t('music_source_detail')} />
        <SettingItem settingKey="menu.dislike" label={t('dislike')} />
      </View>
    </SubTitle>
  );
});

const styles = createStyle({
  content: {
    marginTop: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: -25,
  },
});

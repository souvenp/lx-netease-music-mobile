// screens/Home/Views/Setting/settings/List/IsAutoSaveDailyRec.tsx
import { updateSetting } from '@/core/common';
import { useI18n } from '@/lang';
import { createStyle } from '@/utils/tools';
import { memo } from 'react';
import { View } from 'react-native';
import { useSettingValue } from '@/store/setting/hook';
import CheckBoxItem from '../../components/CheckBoxItem';

export default memo(() => {
  const t = useI18n();
  const isAutoSaveDailyRec = useSettingValue('list.isAutoSaveDailyRec');
  const setAutoSaveDailyRec = (enable: boolean) => {
    updateSetting({ 'list.isAutoSaveDailyRec': enable });
  };

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isAutoSaveDailyRec}
        onChange={setAutoSaveDailyRec}
        label={t('setting_list_auto_save_daily_rec')}
        helpDesc={t('setting_list_auto_save_daily_rec_tip')}
      />
    </View>
  );
});

const styles = createStyle({
  content: {
    marginTop: 5,
  },
});

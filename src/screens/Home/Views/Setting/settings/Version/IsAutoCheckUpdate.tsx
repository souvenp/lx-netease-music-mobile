import { updateSetting } from '@/core/common';
import { useI18n } from '@/lang';
import { createStyle } from '@/utils/tools';
import { memo } from 'react';
import { View } from 'react-native';
import { useSettingValue } from '@/store/setting/hook';
import CheckBoxItem from '../../components/CheckBoxItem';

export default memo(() => {
  const t = useI18n();
  const isAutoCheck = useSettingValue('version.autoCheckUpdate');
  const setAutoCheck = (enable: boolean) => {
    updateSetting({ 'version.autoCheckUpdate': enable });
  };

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isAutoCheck}
        onChange={setAutoCheck}
        label={t('setting_version_auto_check_update')}
      />
    </View>
  );
});

const styles = createStyle({
  content: {
    marginTop: 5,
  },
});

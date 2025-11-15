import { memo } from 'react';
import { View } from 'react-native';
import CheckBoxItem from '../../components/CheckBoxItem';
import { createStyle } from '@/utils/tools';
import { useI18n } from '@/lang';
import { updateSetting } from '@/core/common';
import { useSettingValue } from '@/store/setting/hook';

export default memo(() => {
  const t = useI18n();
  const isWriteAlias = useSettingValue('download.writeAlias');
  const isWriteTags = useSettingValue('download.writeMetadata');
  const handleUpdate = (value: boolean) => {
    updateSetting({ 'download.writeAlias': value });
  };

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isWriteAlias}
        onChange={handleUpdate}
        label={t('setting_download_write_alias')}
        disabled={!isWriteTags}
      />
    </View>
  );
});

const styles = createStyle({
  content: {
    marginTop: 5,
  },
});

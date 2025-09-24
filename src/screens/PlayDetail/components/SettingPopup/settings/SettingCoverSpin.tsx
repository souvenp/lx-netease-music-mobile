import { View } from 'react-native';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { useI18n } from '@/lang';
import CheckBox from '@/components/common/CheckBox';
import styles from './style';

export default () => {
  const t = useI18n();
  const isCoverSpin = useSettingValue('playDetail.isCoverSpin');
  const setCoverSpin = (isSpin: boolean) => {
    updateSetting({ 'playDetail.isCoverSpin': isSpin });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <CheckBox
          check={isCoverSpin}
          label={t('play_detail_setting_cover_spin')}
          onChange={setCoverSpin}
        />
      </View>
    </View>
  );
};

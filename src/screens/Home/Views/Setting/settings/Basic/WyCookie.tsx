import { memo, useEffect } from 'react';
import { View } from 'react-native';
import InputItem, { type InputItemProps } from '../../components/InputItem';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { createStyle, toast } from '@/utils/tools';
import Button from '../../components/Button';

export default memo(() => {
  const t = useI18n();
  const cookie = useSettingValue('common.wy_cookie');

  const setCookie = (val: string) => {
    updateSetting({ 'common.wy_cookie': val });
  };

  const handleChanged: InputItemProps['onChanged'] = (text, callback) => {
    callback(text);
    setCookie(text);
  };

  const handleShowLoginModal = () => {
    // 触发全局事件
    global.app_event.emit('showWebLogin');
  };

  useEffect(() => {
    const handleCookieSet = (cookie: string) => {
      setCookie(cookie);
    };

    global.app_event.on('wy-cookie-set', handleCookieSet);
    return () => {
      global.app_event.off('wy-cookie-set', handleCookieSet);
    };
  }, []);

  return (
    <View style={styles.content}>
      <InputItem
        value={cookie}
        label={t('setting_basic_wy_cookie')}
        onChanged={handleChanged}
        placeholder={t('setting_basic_wy_cookie_placeholder')}
      />
      <View style={styles.btnContainer}>
        <Button onPress={handleShowLoginModal}>网页登录</Button>
      </View>
    </View>
  );
});

const styles = createStyle({
  content: {
    marginTop: 10,
  },
  btnContainer: {
    marginTop: 5,
    paddingLeft: 25,
    flexDirection: 'row',
  },
});

import { memo, useEffect } from 'react';
import { View } from 'react-native';
import InputItem, { type InputItemProps } from '../../components/InputItem';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { createStyle, toast } from '@/utils/tools';
import Button from '../../components/Button';
import CookieManager from '@react-native-cookies/cookies';



const syncCookieToNative = async (cookie: string) => {
  const domain = 'https://music.163.com';
  try {
    // 1. 关键步骤：清除该域名的所有原生Cookie，`true` 表示使用共享存储
    await CookieManager.clearAll(true);

    if (cookie) {
      // 2. 将新的Cookie字符串拆分并逐个设置回原生Cookie Jar
      // 这样可以确保原生层也使用最新的Cookie
      const cookiePairs = cookie.split(';').map(pair => pair.trim());
      for (const pair of cookiePairs) {
        const [name, ...valueParts] = pair.split('=');
        if (name && valueParts.length > 0) {
          await CookieManager.set(domain, {
            name: name.trim(),
            value: valueParts.join('=').trim(),
            domain: '.music.163.com',
            path: '/',
          });
        }
      }
    }
    console.log('Native cookie synchronized successfully.');
  } catch (error) {
    console.error('Failed to sync native cookie:', error);
    toast('Cookie 同步失败，部分请求可能异常', 'long');
  }
};

export default memo(() => {
  const t = useI18n();
  const cookie = useSettingValue('common.wy_cookie');

  const setCookie = (val: string) => {
    // 先同步到原生层
    // void syncCookieToNative(val).then(() => {
      // 再更新应用状态
      updateSetting({ 'common.wy_cookie': val });
    // });
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
    // marginTop: 10,
  },
  btnContainer: {
    marginBottom: 5,
    paddingLeft: 20,
    flexDirection: 'row',
  },
});

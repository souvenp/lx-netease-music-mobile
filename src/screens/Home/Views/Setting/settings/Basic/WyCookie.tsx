import { memo } from 'react';
import { View } from 'react-native';
import InputItem, { type InputItemProps } from '../../components/InputItem';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { updateSetting } from '@/core/common';
import { createStyle, toast } from '@/utils/tools';
import Button from '../../components/Button';
// 手动设置与自动续期共用凭据保存流程。
import { setWyCookie } from '@/core/wySession';

export default memo(() => {
  const t = useI18n();
  const cookie = useSettingValue('common.wy_cookie');
  const serpApiKey = useSettingValue('common.wy_serpapi_key');

  const setCookie = (val: string) => {
    // 本地先保存，原生同步失败时保留凭据供应用请求使用。
    void setWyCookie(val).catch(() => {
      toast('Cookie 已保存，网页登录 Cookie 同步失败', 'long');
    });
  };

  const handleChanged: InputItemProps['onChanged'] = (text, callback) => {
    callback(text);
    setCookie(text);
  };

  const handleSerpApiKeyChanged: InputItemProps['onChanged'] = (text, callback) => {
    callback(text);
    updateSetting({ 'common.wy_serpapi_key': text.trim() });
  };

  const handleShowLoginModal = () => {
    // 触发全局事件
    global.app_event.emit('showWebLogin');
  };

  return (
    <View style={styles.content}>
      <InputItem
        value={cookie}
        label={t('setting_basic_wy_cookie')}
        onChanged={handleChanged}
        placeholder={t('setting_basic_wy_cookie_placeholder')}
      />
      <InputItem
        value={serpApiKey}
        label="SerpApi API Key"
        onChanged={handleSerpApiKeyChanged}
        placeholder="用于网易云搜索补充 Google 搜索结果"
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

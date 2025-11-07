import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Modal, { type ModalType } from '@/components/common/Modal';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useTheme } from '@/store/theme/hook';
import { useStatusbarHeight } from '@/store/common/hook';
import { Icon } from '@/components/common/Icon';
import Text from '@/components/common/Text';
import { toast } from '@/utils/tools';
import wyApi from '@/utils/musicSdk/wy/user';

const LOGIN_URL = 'https://music.163.com/#/login';
const SUCCESS_URL_FLAG = 'discover';

export interface WebLoginModalType {
  show: () => void;
}

const Header = ({ onClose }: { onClose: () => void }) => {
  const theme = useTheme();
  const statusBarHeight = useStatusbarHeight();

  return (
    <View style={[styles.header, { height: 50 + statusBarHeight, paddingTop: statusBarHeight, backgroundColor: theme['c-content-background'] }]}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Icon name="chevron-left" size={24} color={theme['c-font']} />
      </TouchableOpacity>
      <Text size={18}>网易云音乐登录</Text>
      <View style={styles.backButton} />
    </View>
  );
};
export default forwardRef<WebLoginModalType, {}>((props, ref) => {
  const modalRef = useRef<ModalType>(null);
  const webViewRef = useRef<WebView>(null);
  const loggedInRef = useRef(false);
  const isCheckingRef = useRef(false);
  const theme = useTheme();

  useImperativeHandle(ref, () => ({
    show() {
      loggedInRef.current = false;
      isCheckingRef.current = false;
      modalRef.current?.setVisible(true);
    },
  }));

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false);
  }, []);

  const stopPolling = () => {
    // 可以在这里停止任何轮询操作
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('Web登录: 页面导航状态变化:', navState.url);
    if (navState.url.includes(SUCCESS_URL_FLAG) || navState.url == 'https://music.163.com/') {
      console.log('Web登录: injecting cookie');
      webViewRef.current?.injectJavaScript('window.ReactNativeWebView.postMessage(document.cookie);');
    }
  };
  const handleMessage = async (event: any) => {
    console.log('Web登录: 收到消息:', event.nativeEvent.data);
    if (loggedInRef.current || isCheckingRef.current) return;

    const cookie = event.nativeEvent.data;
    if (!cookie || !cookie.includes('S_INFO=')) return;

    isCheckingRef.current = true;
    try {
      // 使用 getUid 接口验证 Cookie 有效性
      await wyApi.getUid(cookie);

      // 验证成功
      loggedInRef.current = true;
      global.app_event.emit('wy-cookie-set', cookie);
      toast('登录成功，已自动获取Cookie！');
      handleClose();
    } catch (error) {
      // Cookie 无效，静默处理，等待用户后续操作
      console.log('Web登录: Cookie验证失败:', (error as Error).message);
    } finally {
      isCheckingRef.current = false;
    }
  };

  const injectedJavaScript = `true;`;

  return (
    <Modal ref={modalRef} onHide={stopPolling} statusBarPadding={false} bgHide={false}>
      <View style={[styles.container, { backgroundColor: theme['c-content-background'] }]}>
        <Header onClose={handleClose} />
        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54"
        />
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
    width: 40,
  },
});

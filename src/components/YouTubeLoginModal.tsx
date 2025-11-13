// src/components/YouTubeLoginModal.tsx (新建，基于 WebLoginModal.tsx 修改)

import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Modal, { type ModalType } from '@/components/common/Modal';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useTheme } from '@/store/theme/hook';
import { useStatusbarHeight } from '@/store/common/hook';
import { Icon } from '@/components/common/Icon';
import Text from '@/components/common/Text';
import { toast } from '@/utils/tools';
import theme from "@/core/init/theme.ts";

// [+] 修改登录地址为 YouTube Music
const LOGIN_URL = 'https://music.youtube.com/';
// [+] 修改成功标志
const SUCCESS_URL_FLAG = 'music.youtube.com';

export interface YouTubeLoginModalType {
  show: () => void;
};

const Header = ({ onClose }: { onClose: () => void }) => {
  const theme = useTheme();
  const statusBarHeight = useStatusbarHeight();
  return (
    <View style={[styles.header, { height: 50 + statusBarHeight, paddingTop: statusBarHeight, backgroundColor: theme['c-content-background'] }]}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Icon name="chevron-left" size={24} color={theme['c-font']} />
      </TouchableOpacity>
      {/* [+] 修改标题 */}
      <Text size={18}>YouTube 登录</Text>
      <View style={styles.backButton} />
    </View>
  );
};

export default forwardRef<YouTubeLoginModalType, {}>((props, ref) => {
  const modalRef = useRef<ModalType>(null);
  const webViewRef = useRef<WebView>(null);
  const loggedInRef = useRef(false);

  useImperativeHandle(ref, () => ({
    show() {
      loggedInRef.current = false;
      modalRef.current?.setVisible(true);
    },
  }));

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false);
  }, []);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // console.log('YouTube登录: 页面导航状态变化:', navState.url);
    if (navState.url.includes(SUCCESS_URL_FLAG)) {
      // console.log('YouTube登录: injecting cookie');
      webViewRef.current?.injectJavaScript('window.ReactNativeWebView.postMessage(document.cookie);');
    }
  };

  const handleMessage = async (event: any) => {
    // console.log('YouTube登录: 收到消息:', event.nativeEvent.data);
    if (loggedInRef.current) return;

    const cookie = event.nativeEvent.data;
    // [+] 修改为检查 YouTube 登录所需的关键 Cookie
    if (!cookie || !cookie.includes('SAPISID=')) return;

    loggedInRef.current = true;
    // [+] 触发 yt-cookie-set 事件
    global.app_event.emit('yt-cookie-set', cookie);
    toast('登录成功，已自动获取Cookie！');
    handleClose();
  };

  const injectedJavaScript = `true;`;

  return (
    <Modal ref={modalRef} statusBarPadding={false} bgHide={false}>
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

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
import CookieManager from '@react-native-cookies/cookies';


const LOGIN_URL = 'https://music.163.com/m/login';
const SUCCESS_URL_FLAG = 'music.163.com';

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

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    console.log('Web登录: 页面导航状态变化:', navState.url);
    const url = navState.url;
    const isLoggedIn = url.includes(SUCCESS_URL_FLAG) && !url.includes('/login') && !url.includes('/m/login');
    if (isLoggedIn) {
      console.log('Web登录: extracting cookies via CookieManager');
      try {
        const cookies = await CookieManager.get(navState.url, true);
        const cookieString = Object.values(cookies)
          .map(c => `${c.name}=${c.value}`)
          .join('; ');
        console.log('Web登录: CookieManager captured cookies');
        handleMessage({ nativeEvent: { data: cookieString } });
      } catch (err) {
        console.error('Web登录: CookieManager extraction failed, falling back to document.cookie', err);
        webViewRef.current?.injectJavaScript('window.ReactNativeWebView.postMessage(document.cookie);');
      }
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

  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      if (window.__lxNeteaseLoginTouchPatch) return true;
      window.__lxNeteaseLoginTouchPatch = true;

      var originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        var isCapture = options === true || !!(options && options.capture);
        var isBodyTouchMove = type === 'touchmove' && isCapture && (this === document || this === document.body);
        if (isBodyTouchMove && typeof listener === 'function') {
          var wrappedListener = function(event) {
            var yidun = document.querySelector('.yidun');
            if (yidun && !yidun.contains(event.target)) return;
            return listener.call(this, event);
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      var touchStartX = 0;
      var touchStartY = 0;

      document.addEventListener('touchstart', function(event) {
        if (!event.touches || event.touches.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      }, true);

      document.addEventListener('touchend', function(event) {
        if (!event.changedTouches || event.changedTouches.length !== 1) return;
        var touch = event.changedTouches[0];
        if (Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) return;

        var target = event.target;
        if (!target || !target.closest) return;
        if (target.closest('a[href*="official-terms"]')) return;

        var clickable = target.closest('span,label');
        if (!clickable) return;

        var terms = clickable.parentElement;
        if (
          !terms ||
          !terms.textContent ||
          terms.textContent.indexOf('同意') === -1 ||
          !terms.querySelector('a[href*="official-terms"]')
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        clickable.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      }, true);

      return true;
    })();
  `;
  const injectedJavaScript = `true;`;

  return (
    <Modal ref={modalRef} onHide={stopPolling} statusBarPadding={false} bgHide={false}>
      <View style={[styles.container, { backgroundColor: theme['c-content-background'] }]}>
        <Header onClose={handleClose} />
        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
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

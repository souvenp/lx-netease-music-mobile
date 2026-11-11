import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect, useState } from 'react';
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
// 登录成功后直接持久化，不依赖设置页面是否仍挂载。
import { beginWyWebLogin, setWyCookie } from '@/core/wySession';


const LOGIN_PAGES = {
  mobile: {
    url: 'https://music.163.com/m/login',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
  desktop: {
    url: 'https://music.163.com/#/login',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
  },
};
type LoginMode = keyof typeof LOGIN_PAGES;
const isNeteasePage = (url: string) => /^https:\/\/music\.163\.com(?:[/?#]|$)/i.test(url);

export interface WebLoginModalType {
  show: () => void;
}

const Header = ({ onClose, loginMode, onToggleMode }: {
  onClose: () => void;
  loginMode: LoginMode;
  onToggleMode: () => void;
}) => {
  const theme = useTheme();
  const statusBarHeight = useStatusbarHeight();

  return (
    <View style={[styles.header, { height: 50 + statusBarHeight, paddingTop: statusBarHeight, backgroundColor: theme['c-content-background'] }]}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Icon name="chevron-left" size={24} color={theme['c-font']} />
      </TouchableOpacity>
      <Text size={18} style={styles.title} numberOfLines={1}>网易云音乐登录</Text>
      <TouchableOpacity onPress={onToggleMode} style={styles.loginModeButton} accessibilityRole="button">
        <Text size={13} color={theme['c-primary-font']}>
          {loginMode === 'mobile' ? '网页版登录' : '手机版登录'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default forwardRef<WebLoginModalType, {}>((props, ref) => {
  const modalRef = useRef<ModalType>(null);
  const webViewRef = useRef<WebView>(null);
  const loggedInRef = useRef(false);
  const isCheckingRef = useRef(false);
  const loginSessionRef = useRef<ReturnType<typeof beginWyWebLogin> | null>(null);
  const pageVersionRef = useRef(0);
  const checkedCookieRef = useRef('');
  const cookieCheckedAtRef = useRef(0);
  const cookiePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>('mobile');
  const theme = useTheme();

  const finishLogin = useCallback(() => {
    if (cookiePollRef.current !== null) {
      clearInterval(cookiePollRef.current);
      cookiePollRef.current = null;
    }
    const session = loginSessionRef.current;
    loginSessionRef.current = null;
    session?.finish();
  }, []);
  useEffect(() => finishLogin, [finishLogin]);

  useImperativeHandle(ref, () => ({
    show() {
      pageVersionRef.current += 1;
      checkedCookieRef.current = '';
      setLoginMode('mobile');
      loggedInRef.current = false;
      isCheckingRef.current = false;
      const session = loginSessionRef.current ?? (loginSessionRef.current = beginWyWebLogin());
      void session.ready.then(() => {
        if (loginSessionRef.current !== session) return;
        modalRef.current?.setVisible(true);
        // 网页脚本可能未注入或登录后不跳转，由 App 自己检查原生 Cookie。
        if (cookiePollRef.current === null) {
          cookiePollRef.current = setInterval(() => { void readLoginCookies(); }, 1500);
        }
        void readLoginCookies();
      });
    },
  }));

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false);
  }, []);

  const toggleLoginMode = () => {
    // 重新创建 WebView，使地址和 UA 一起切换，并丢弃旧页面的异步校验结果。
    pageVersionRef.current += 1;
    checkedCookieRef.current = '';
    loggedInRef.current = false;
    isCheckingRef.current = false;
    setLoginMode(mode => mode === 'mobile' ? 'desktop' : 'mobile');
  };

  const readLoginCookies = async () => {
    if (!loginSessionRef.current || loggedInRef.current || isCheckingRef.current) return;
    const pageVersion = pageVersionRef.current;
    try {
      const cookies = await CookieManager.get('https://music.163.com', true);
      if (pageVersion !== pageVersionRef.current) return;
      const cookieString = Object.values(cookies).map(c => `${c.name}=${c.value}`).join('; ');
      // 桌面页登录可能不跳转；限制重复校验，但允许短暂断网后重试。
      if (cookieString === checkedCookieRef.current && Date.now() - cookieCheckedAtRef.current < 15000) return;
      checkedCookieRef.current = cookieString;
      cookieCheckedAtRef.current = Date.now();
      await handleMessage({ nativeEvent: { data: cookieString } });
    } catch {
      // 原生 Cookie 暂不可读时等待下一次页面通知，不输出凭据。
    }
  };

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const url = navState.url;
    const isLoggedIn = isNeteasePage(url) && !url.includes('/login');
    if (isLoggedIn) {
      await readLoginCookies();
    }
  };
  const handleMessage = async (event: any) => {
    // 登录消息包含敏感凭据，不写入日志。
    console.log('Web登录: 收到登录凭据');
    if (loggedInRef.current || isCheckingRef.current) return;

    const cookie = event.nativeEvent.data;
    // 兼容原来的 S_INFO 入口和 MUSIC_U，是否有效仍由账户接口校验。
    if (typeof cookie !== 'string' || !/(?:^|;\s*)(?:MUSIC_U|S_INFO)=[^;]+/.test(cookie)) return;

    isCheckingRef.current = true;
    const session = loginSessionRef.current;
    const pageVersion = pageVersionRef.current;
    try {
      // 使用 getUid 接口验证 Cookie 有效性
      await wyApi.getUid(cookie, 0, true);
      if (!session || loginSessionRef.current !== session || pageVersionRef.current !== pageVersion) return;

      // 验证成功
      loggedInRef.current = true;
      // Cookie 已由网页登录正确写入，保存到应用即可，不能丢弃域和属性后再次覆盖。
      await setWyCookie(cookie, { syncNative: false });
      toast('登录成功，已自动获取Cookie！');
      handleClose();
    } catch (error) {
      // Cookie 无效，静默处理，等待用户后续操作
      console.log('Web登录: Cookie验证失败:', (error as Error).message);
    } finally {
      if (pageVersionRef.current === pageVersion) isCheckingRef.current = false;
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
  // 只通知原生层检查 Cookie；HttpOnly 登录凭据由 CookieManager 读取。
  const injectedJavaScript = loginMode === 'desktop' ? `
    (function() {
      if (window.__lxLoginCookieTimer) return;
      window.__lxLoginCookieTimer = setInterval(function() {
        window.ReactNativeWebView.postMessage('lx-check-login');
      }, 1500);
    })();
    true;
  ` : 'true;';

  return (
    <Modal ref={modalRef} onHide={finishLogin} statusBarPadding={false} bgHide={false}>
      <View style={[styles.container, { backgroundColor: theme['c-content-background'] }]}>
        <Header onClose={handleClose} loginMode={loginMode} onToggleMode={toggleLoginMode} />
        <WebView
          key={loginMode}
          ref={webViewRef}
          source={{ uri: LOGIN_PAGES[loginMode].url }}
          onMessage={event => {
            if (event.nativeEvent.data === 'lx-check-login' && isNeteasePage(event.nativeEvent.url)) {
              void readLoginCookies();
            }
          }}
          injectedJavaScriptBeforeContentLoaded={loginMode === 'mobile' ? injectedJavaScriptBeforeContentLoaded : 'true;'}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent={LOGIN_PAGES[loginMode].userAgent}
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
  title: {
    flex: 1,
    textAlign: 'center',
  },
  loginModeButton: {
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 5,
  },
});

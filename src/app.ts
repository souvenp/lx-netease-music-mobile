import '@/utils/errorHandle'
import { init as initLog } from '@/utils/log'
import { bootLog, getBootLog } from '@/utils/bootLog'
import '@/config/globalData'
import { toast } from '@/utils/tools'
import { getFontSize } from '@/utils/data'
import { exitApp } from './utils/nativeModules/utils'
import { windowSizeTools } from './utils/windowSizeTools'
import { listenLaunchEvent } from './navigation/regLaunchedEvent'
import { tipDialog } from './utils/tools'

// --- START: CONSOLE LOG PATCH (v2) ---
if (__DEV__) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const PREFIX = '###RN_DEBUG_START###';
  const SUFFIX = '###RN_DEBUG_END###';

  /**
   * @param {'log' | 'warn' | 'error'} type
   * @param {any[]} args
   */
  const remoteLog = (type, ...args) => {
    try {
      // 创建一个包含所有参数的结构化对象
      const payload = {
        type: type,
        // 我们直接将参数数组发送过去
        // JSON.stringify 会自动处理大多数JS类型
        payload: args,
      };

      // 将整个结构化对象转换为字符串，并用标记包裹
      // Metro 会将此作为单行日志打印出来
      originalLog(`${PREFIX}${JSON.stringify(payload)}${SUFFIX}`);

    } catch (e) {
      // 如果序列化失败（如循环引用），则回退到原始的 console.log
      originalLog('Logger Patch Error:', e);
      if (type === 'warn') {
        originalWarn.apply(console, args);
      } else if (type === 'error') {
        originalError.apply(console, args);
      } else {
        originalLog.apply(console, args);
      }
    }
  };

  // 覆盖全局 console 对象
  console.log = (...args) => remoteLog('log', ...args);
  console.warn = (...args) => remoteLog('warn', ...args);
  console.error = (...args) => remoteLog('error', ...args);
}
// --- END: CONSOLE LOG PATCH (v2) ---

console.log('starting app...')
listenLaunchEvent()

const getTimeGreeting = () => {
  const now = new Date()
  const hours = now.getHours()

  if (hours >= 0 && hours <= 4) {
    return '深夜，现在的夜，熬得只是还未改变的习惯'
  } else if (hours >= 5 && hours <= 10) {
    return '早安，清晨熹微的阳光，是你在微笑吗'
  } else if (hours >= 11 && hours <= 13) {
    return '午好，伴随着熟悉的乐曲，聆听着动人的旋律'
  } else if (hours >= 14 && hours <= 17) {
    return '夕暮，似清风醉晚霞，不经意间盈笑回眸'
  } else if (hours >= 18 && hours <= 23) {
    return '夜晚，一个安静的角落，静静地聆听夜曲'
  }
  return ''
}

void Promise.all([getFontSize(), windowSizeTools.init()])
  .then(async ([fontSize]) => {
    global.lx.fontSize = fontSize
    bootLog('Font size setting loaded.')

    let isInited = false
    let handlePushedHomeScreen: () => void | Promise<void>

    const tryGetBootLog = () => {
      try {
        return getBootLog()
      } catch (err) {
        return 'Get boot log failed.'
      }
    }

    const handleInit = async () => {
      if (isInited) return
      void initLog()
      const { default: init } = await import('@/core/init')
      try {
        handlePushedHomeScreen = await init()
        toast(getTimeGreeting(), 'long')
      } catch (err: any) {
        void tipDialog({
          title: '初始化失败 (Init Failed)',
          message: `Boot Log:\n${tryGetBootLog()}\n\n${(err.stack ?? err.message) as string}`,
          btnText: 'Exit',
          bgClose: false,
        }).then(() => {
          exitApp()
        })
        return
      }
      isInited ||= true
    }
    const { init: initNavigation, navigations } = await import('@/navigation')

    initNavigation(async () => {
      await handleInit()
      if (!isInited) return

      await navigations
        .pushHomeScreen()
        .then(() => {
          void handlePushedHomeScreen()
        })
        .catch((err: any) => {
          void tipDialog({
            title: 'Error',
            message: err.message,
            btnText: 'Exit',
            bgClose: false,
          }).then(() => {
            exitApp()
          })
        })
    })
  })
  .catch((err) => {
    void tipDialog({
      title: '初始化失败 (Init Failed)',
      message: `Boot Log:\n\n${(err.stack ?? err.message) as string}`,
      btnText: 'Exit',
      bgClose: false,
    }).then(() => {
      exitApp()
    })
  })

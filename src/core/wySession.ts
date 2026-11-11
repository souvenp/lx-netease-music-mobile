import { AppState, Platform } from 'react-native'
import CookieManager from '@react-native-cookies/cookies'
import settingState from '@/store/setting/state'
import { updateSetting } from '@/core/common'
import { getData, saveData } from '@/plugins/storage'
import { toMD5 } from '@/utils/tools'
import wyUserApi from '@/utils/musicSdk/wy/user'
import { parseCookie } from '@/utils/musicSdk/wy/loginCookie'

// 正常每十二小时续期，失败至少等待半小时；时间戳跨应用重启保留。
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000
const RETRY_INTERVAL = 30 * 60 * 1000
const REFRESH_KEY = '@wy_session_refresh_v1'
const COOKIE_URL = 'https://music.163.com'
const MUSIC_COOKIE_NAMES = ['MUSIC_U', '__csrf', '__remember_me']
// 这些父域 Cookie 曾被错误复制到音乐子域，会遮蔽网页登录新签发的 .163.com 会话。
const LEGACY_PARENT_COOKIE_NAMES = ['P_INFO', 'S_INFO', 'NTES_YD_SESS', '_ntes_nnid', '_ntes_nuid']

// 只记录凭据摘要和下次尝试时间，不额外保存明文 Cookie。
interface RefreshRecord {
  cookieHash: string
  nextAttemptAt: number
}

// 合并启动、前台切换和定时检查触发的并发请求。
let pendingRefresh: Promise<void> | null = null
let refreshRecord: RefreshRecord | null = null
let recordLoaded = false
let initialized = false
// 原生 Cookie 写入按顺序执行，避免旧账号的写入覆盖新账号。
let nativeQueue = Promise.resolve()
let webLoginCount = 0

const deleteMusicCookie = async (name: string) => {
  if (Platform.OS === 'android') {
    // 直接传递过期响应头，避免 Cookie 桥接库转换日期后留下空值会话 Cookie。
    await CookieManager.setFromResponse(COOKIE_URL,
      `${name}=; Domain=.music.163.com; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`)
  } else {
    await CookieManager.set(COOKIE_URL, {
      name, value: '', domain: '.music.163.com', path: '/', expires: '2000-01-01T00:00:00.000Z',
    }, true)
  }
}

const clearLegacyParentCookies = async () => {
  for (const name of LEGACY_PARENT_COOKIE_NAMES) {
    // 只删除错误的子域副本，不删除 .163.com 的真实会话，也不清空其他站点。
    await deleteMusicCookie(name)
  }
  if (Platform.OS === 'android') await CookieManager.flush()
}

// 手动登录独占浏览器会话，等已有请求和 Cookie 写入结束后才加载登录页。
export const beginWyWebLogin = () => {
  webLoginCount += 1
  let finished = false
  return {
    ready: Promise.allSettled([pendingRefresh, nativeQueue]).then(async () => {
      nativeQueue = nativeQueue.catch(() => {}).then(clearLegacyParentCookies)
      await nativeQueue.catch(() => { console.warn('网页登录旧 Cookie 清理失败') })
    }),
    finish() {
      if (finished) return
      finished = true
      webLoginCount -= 1
      if (!webLoginCount) void refreshWySession()
    },
  }
}

// 手动导入只同步音乐凭据；Cookie 字符串没有域和属性，不能整体重建浏览器 Cookie。
export const setWyCookie = (cookie: string, { syncNative = true } = {}): Promise<void> => {
  // 先同步更新应用状态，让所有后续请求立即使用新凭据。
  const previous = settingState.setting['common.wy_cookie']
  updateSetting({ 'common.wy_cookie': cookie })
  if (!syncNative) return Promise.resolve()
  nativeQueue = nativeQueue.catch(() => {}).then(async () => {
    if (settingState.setting['common.wy_cookie'] !== cookie) return
    await clearLegacyParentCookies()
    // 新旧名称的并集同时覆盖更新及用户清空凭据的情况。
    const cookies = parseCookie(cookie) as Map<string, string>
    const previousCookies = parseCookie(previous) as Map<string, string>
    const names = MUSIC_COOKIE_NAMES.filter(name => previousCookies.has(name) || cookies.has(name))
    for (const name of names) {
      if (settingState.setting['common.wy_cookie'] !== cookie) return
      if (!cookies.has(name)) {
        await deleteMusicCookie(name)
        continue
      }
      await CookieManager.set(COOKIE_URL, {
        name,
        value: cookies.get(name) || '',
        domain: '.music.163.com',
        path: '/',
        secure: true,
        httpOnly: name === 'MUSIC_U',
      }, true)
    }
    if (Platform.OS === 'android') await CookieManager.flush()
  })
  return nativeQueue
}

// 到期才续期；网络故障、账号失效或服务器拒绝时均保留本地原凭据。
export const refreshWySession = (): Promise<void> => {
  if (webLoginCount) return Promise.resolve()
  if (pendingRefresh) return pendingRefresh
  // 固定本次请求的会话，返回时再检查用户是否切换账号或退出。
  const cookie = settingState.setting['common.wy_cookie']
  if (!parseCookie(cookie).get('MUSIC_U')) return Promise.resolve()
  pendingRefresh = (async () => {
    if (!recordLoaded) {
      refreshRecord = await getData<RefreshRecord>(REFRESH_KEY).catch(() => null)
      recordLoaded = true
    }
    // 异常的未来时间戳不能导致永久停止续期。
    const cookieHash = toMD5(cookie)
    const now = Date.now()
    if (refreshRecord?.cookieHash === cookieHash &&
      refreshRecord.nextAttemptAt > now && refreshRecord.nextAttemptAt <= now + REFRESH_INTERVAL) return
    if (webLoginCount || settingState.setting['common.wy_cookie'] !== cookie) return
    refreshRecord = { cookieHash, nextAttemptAt: now + RETRY_INTERVAL }
    try {
      // 仅使用本次响应返回的新 Cookie，避免读取原生 Cookie 中残留的旧账号。
      const nextCookie = await wyUserApi.refreshLogin(cookie)
      if (webLoginCount || settingState.setting['common.wy_cookie'] !== cookie) return
      refreshRecord = { cookieHash: toMD5(nextCookie), nextAttemptAt: Date.now() + REFRESH_INTERVAL }
      // RN 网络层已按服务器 Set-Cookie 写入同一个 CookieManager，保留真实域、有效期和 HttpOnly。
      await setWyCookie(nextCookie, { syncNative: false })
    } catch {
      // 不输出凭据或服务器原始响应，也不将短暂断网误报为退出登录。
      console.warn('网易云登录暂未续期，将稍后重试')
    }
    await saveData(REFRESH_KEY, refreshRecord).catch(() => {
      console.warn('网易云续期时间保存失败')
    })
  })().finally(() => {
    pendingRefresh = null
    // 请求过程中更换账号后，为当前账号单独检查，旧响应不能覆盖新凭据。
    if (cookie !== settingState.setting['common.wy_cookie']) void refreshWySession()
  })
  return pendingRefresh
}

// 应用进程内只注册一次；后台不主动唤醒，回到前台立即补查。
export const initWySession = () => {
  if (initialized) return
  initialized = true
  AppState.addEventListener('change', state => {
    if (state === 'active') void refreshWySession()
  })
  setInterval(() => {
    if (AppState.currentState === 'active') void refreshWySession()
  }, 15 * 60 * 1000)
  global.state_event.on('configUpdated', keys => {
    if (keys.includes('common.wy_cookie')) void refreshWySession()
  })
}

import type { AppEventTypes } from '@/event/appEvent'
import type { ListEventTypes } from '@/event/listEvent'
import type { DislikeEventTypes } from '@/event/dislikeEvent'
import type { StateEventTypes } from '@/event/stateEvent'
import type { I18n } from '@/lang/i18n'
import type { Buffer as _Buffer } from 'buffer'
import type { SettingScreenIds } from '@/screens/Home/Views/Setting'

// interface Process {
//   env: {
//     NODE_ENV: 'development' | 'production'
//   }
//   versions: {
//     app: string
//   }
// }
interface GlobalData {
  fontSize: number
  gettingUrlId: string

  playerError: boolean;
  // event_app: AppType
  // event_list: ListType

  playerStatus: {
    isInitialized: boolean
    isRegisteredService: boolean
    isIniting: boolean
  }
  restorePlayInfo: LX.Player.SavedPlayInfo | null
  isScreenKeepAwake: boolean
  isPlayedStop: boolean
  isEnableSyncLog: boolean
  isEnableUserApiLog: boolean
  playerTrackId: string

  qualityList: LX.QualityList
  apis: Partial<LX.UserApi.UserApiSources>
  apiInitPromise: [Promise<boolean>, boolean, (success: boolean) => void]

  jumpMyListPosition: boolean

  settingActiveId: SettingScreenIds

  /**
   * 首页是否正在滚动中，用于防止意外误触播放歌曲
   */
  homePagerIdle: boolean

  // windowInfo: {
  //   screenW: number
  //   screenH: number
  //   fontScale: number
  //   pixelRatio: number
  //   screenPxW: number
  //   screenPxH: number
  // }

  // syncKeyInfo: LX.Sync.KeyInfo
}
interface Artist {
  id: string | number;
  name: string;
}
declare global {
  var isDev: boolean
  var lx: GlobalData
  var i18n: I18n
  var app_event: AppEventTypes & {
    showArtistSelector: (artists: Artist[], onSelect: (artist: Artist) => void) => void;
    triggerSearch: (text: string) => void;
    'wy-cookie-set': (cookie: string) => void;
    showWebLogin: () => void;
  }
  var list_event: ListEventTypes
  var dislike_event: DislikeEventTypes
  var state_event: StateEventTypes

  var Buffer: typeof _Buffer

  module NodeJS {
    interface ProcessVersions {
      app: string
    }
  }
  // var process: Process
}

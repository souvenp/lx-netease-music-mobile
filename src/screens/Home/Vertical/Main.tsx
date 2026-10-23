import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import {Keyboard, View} from 'react-native'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import PagerView, {
  type PageScrollStateChangedNativeEvent,
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view'
import { setNavActiveId } from '@/core/common'
import settingState from '@/store/setting/state'
import DailyRec from '../Views/DailyRec'
import MyPlaylist from '../Views/MyPlaylist'
import FollowedArtists from '../Views/FollowedArtists'
import SubscribedAlbums from '../Views/SubscribedAlbums';
import {NAV_MENUS, type NAV_ID_Type} from "@/config/constant.ts";
import {useSettingValue} from "@/store/setting/hook.ts";
import PlayHistory from '../Views/PlayHistory'
import { useTheme } from '@/store/theme/hook'
import OneDrive from '../Views/OneDrive'
import LocalMusic from '../Views/LocalMusic'

const hideKeys = ['list.isShowAlbumName', 'list.isShowInterval', 'theme.fontShadow'] as Readonly<
  Array<keyof LX.AppSetting>
>

const SearchPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_search')
  const component = useMemo(() => <Search />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_search') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}
const SongListPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_songlist')
  const component = useMemo(() => <SongList />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_songlist') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
  // return activeId == 1 || activeId == 0  ? SongList : null
}
const PlayHistoryOverlay = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_play_history')
  const component = useMemo(() => <PlayHistory />, [])
  const theme = useTheme()
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      requestAnimationFrame(() => {
        setVisible(id == 'nav_play_history')
      })
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])

  return visible ? (
    <View style={{ ...styles.historyOverlay, backgroundColor: theme['c-content-background'] }}>
      {component}
    </View>
  ) : null
}

const isMenuVisible = (id: NAV_ID_Type, navStatus: Partial<Record<NAV_ID_Type, boolean>>) => (
  id !== 'nav_play_history' && (id === 'nav_search' || id === 'nav_setting' || (navStatus[id] ?? true))
)
const LeaderboardPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_top')
  const component = useMemo(() => <Leaderboard />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_top') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const DailyRecPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_daily_rec')
  const component = useMemo(() => <DailyRec />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_daily_rec') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const MylistPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_love')
  const component = useMemo(() => <Mylist />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_love') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const MyPlaylistPage = () => {
    const [visible, setVisible] = useState(commonState.navActiveId == 'nav_my_playlist')
    const component = useMemo(() => <MyPlaylist />, [])
    useEffect(() => {
        let currentId: CommonState['navActiveId'] = commonState.navActiveId
          const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
            currentId = id
              if (id == 'nav_my_playlist') {
                requestAnimationFrame(() => {
                    setVisible(true)
                  })
              }
          }
        const handleHide = () => {
            if (currentId != 'nav_setting') return
            setVisible(false)
          }
        const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
            if (keys.some((k) => hideKeys.includes(k))) handleHide()
          }
        global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
        global.state_event.on('themeUpdated', handleHide)
        global.state_event.on('languageChanged', handleHide)
        global.state_event.on('configUpdated', handleConfigUpdated)

        return () => {
            global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
            global.state_event.off('themeUpdated', handleHide)
            global.state_event.off('languageChanged', handleHide)
            global.state_event.on('configUpdated', handleConfigUpdated)
          }
      }, [])

  return visible ? component : null
}

const FollowedArtistsPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_followed_artists')
  const component = useMemo(() => <FollowedArtists />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_followed_artists') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const SubscribedAlbumsPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_subscribed_albums');
  const component = useMemo(() => <SubscribedAlbums />, []);
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId;
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id;
      if (id == 'nav_subscribed_albums') {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      }
    };
    const handleHide = () => {
      if (currentId != 'nav_setting') return;
      setVisible(false);
    };
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.on('configUpdated', handleConfigUpdated)
    }
  }, []);
  return visible ? component : null;
};

const OneDrivePage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_onedrive')
  const component = useMemo(() => <OneDrive />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_onedrive') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some((k) => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}

const SettingPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_setting')
  const component = useMemo(() => <Setting />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'nav_setting') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])
  return visible ? component : null
}

const Main = () => {
  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null);
  const [activeNavId, setActiveNavIdState] = useState(commonState.navActiveId)
  const navStatus = useSettingValue('common.navStatus'); // 获取菜单显示状态

  // 根据 navStatus 动态生成可见的菜单项、viewMap 和 indexMap
  const visibleNavs = useMemo(() => {
    return NAV_MENUS.filter(menu => isMenuVisible(menu.id, navStatus));
  }, [navStatus]);

  const { viewMap, indexMap } = useMemo(() => {
    const viewMap: Partial<Record<NAV_ID_Type, number>> = {};
    const indexMap: NAV_ID_Type[] = [];
    visibleNavs.forEach((nav, index) => {
      viewMap[nav.id] = index;
      indexMap.push(nav.id);
    });
    return { viewMap, indexMap };
  }, [visibleNavs]);

  const activeIndexRef = useRef(viewMap[commonState.navActiveId] ?? 0);

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    activeIndexRef.current = nativeEvent.position;
    const selectedId = indexMap[activeIndexRef.current]
    if (!selectedId) return
    if (selectedId) setActiveNavIdState(selectedId)
    if (activeIndexRef.current !== viewMap[commonState.navActiveId]) {
      setNavActiveId(selectedId);
    }
  }, [indexMap, viewMap]);

  const onPageScrollStateChanged = useCallback(
    ({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
      Keyboard.dismiss();
      const idle = nativeEvent.pageScrollState == 'idle';
      if (global.lx.homePagerIdle != idle) global.lx.homePagerIdle = idle;
    },
    []
  );

  useEffect(() => {
    const handleUpdate = (id: CommonState['navActiveId']) => {
      setActiveNavIdState(id)
      pagerViewRef.current?.setScrollEnabled(!!settingState.setting['common.homePageScroll'] && id !== 'nav_play_history');
      const index = viewMap[id];
      if (index == null || activeIndexRef.current === index) return;
      activeIndexRef.current = index;
      pagerViewRef.current?.setPageWithoutAnimation(index);
    };
    const handleConfigUpdate = (
      keys: Array<keyof LX.AppSetting>,
      setting: Partial<LX.AppSetting>
    ) => {
      if (!keys.includes('common.homePageScroll')) return;
      pagerViewRef.current?.setScrollEnabled(!!setting['common.homePageScroll'] && commonState.navActiveId !== 'nav_play_history');
    };

    global.state_event.on('navActiveIdUpdated', handleUpdate);
    global.state_event.on('configUpdated', handleConfigUpdate);
    return () => {
      global.state_event.off('navActiveIdUpdated', handleUpdate);
      global.state_event.off('configUpdated', handleConfigUpdate);
    };
  }, [viewMap]);

  // 根据 visibleNavs 动态渲染 PagerView 的子组件
  const pages = useMemo(() => {
    const pageComponents: Partial<Record<NAV_ID_Type, ReactNode>> = {
      nav_search: <SearchPage />,
      nav_songlist: <SongListPage />,
      nav_top: <LeaderboardPage />,
      nav_love: <MylistPage />,
      nav_daily_rec: <DailyRecPage />,
      nav_followed_artists: <FollowedArtistsPage />,
      nav_subscribed_albums: <SubscribedAlbumsPage />,
      nav_my_playlist: <MyPlaylistPage />,
      nav_onedrive: <OneDrivePage />,
      nav_local_music: <LocalMusic />,
      nav_setting: <SettingPage />,
    };

    return visibleNavs.map(nav => (
      <View collapsable={false} key={nav.id} style={styles.pageStyle}>
        {pageComponents[nav.id] ?? null}
      </View>
    ));
  }, [visibleNavs]);

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerViewRef}
        initialPage={activeIndexRef.current}
        offscreenPageLimit={1}
        onPageSelected={onPageSelected}
        onPageScrollStateChanged={onPageScrollStateChanged}
        scrollEnabled={settingState.setting['common.homePageScroll'] && activeNavId !== 'nav_play_history'}
        style={styles.pagerView}
      >
        {pages}
      </PagerView>
      <PlayHistoryOverlay />
    </View>
  );
};

const styles = createStyle({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
    overflow: 'hidden',
  },
  historyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    elevation: 1,
  },
  pageStyle: {
    // alignItems: 'center',
    // padding: 20,
  },
})

export default Main

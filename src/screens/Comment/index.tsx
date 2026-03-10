import { memo, useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { View, TouchableOpacity, Alert } from 'react-native'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import Header from './components/Header'
import { Icon } from '@/components/common/Icon'
import CommentHot from './CommentHot'
import CommentNew from './CommentNew'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { COMPONENT_IDS } from '@/config/constant'
import { setComponentId } from '@/core/common'
import PageContent from '@/components/PageContent'
import playerState from '@/store/player/state'
import { scaleSizeH } from '@/utils/pixelRatio'
import { BorderWidths } from '@/theme'
import settingState from '@/store/setting/state'
import userState from '@/store/user/state'
import CommentInput, { type CommentInputType, type ReplyInfo } from './components/CommentInput'
import { sendComment, replyComment, deleteComment, type Comment } from './utils'

type ActiveId = 'hot' | 'new'

const BAR_HEIGHT = scaleSizeH(34)

const HeaderItem = ({
  id,
  label,
  isActive,
  onPress,
}: {
  id: ActiveId
  label: string
  isActive: boolean
  onPress: (id: ActiveId) => void
}) => {
  const theme = useTheme()
  // console.log(theme)
  const components = useMemo(
    () => (
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => {
          !isActive && onPress(id)
        }}
      >
        <Text color={isActive ? theme['c-primary-font-active'] : theme['c-font']}>{label}</Text>
      </TouchableOpacity>
    ),
    [isActive, theme, label, onPress, id]
  )

  return components
}

const HotCommentPage = memo(
  ({
    activeId,
    musicInfo,
    onUpdateTotal,
    actions,
    refreshKey,
  }: {
    activeId: ActiveId
    musicInfo: LX.Music.MusicInfoOnline
    onUpdateTotal: (total: number) => void
    actions?: any
    refreshKey?: number
  }) => {
    const initedRef = useRef(false)
    const comment = useMemo(
      () => <CommentHot musicInfo={musicInfo} onUpdateTotal={onUpdateTotal} actions={actions} refreshKey={refreshKey} />,
      [musicInfo, onUpdateTotal, actions, refreshKey]
    )
    switch (activeId) {
      case 'hot':
        if (!initedRef.current) initedRef.current = true
        return comment
      default:
        return initedRef.current ? comment : null
    }
  }
)

const NewCommentPage = memo(
  ({
    activeId,
    musicInfo,
    onUpdateTotal,
    actions,
    refreshKey,
  }: {
    activeId: ActiveId
    musicInfo: LX.Music.MusicInfoOnline
    onUpdateTotal: (total: number) => void
    actions?: any
    refreshKey?: number
  }) => {
    const initedRef = useRef(false)
    const comment = useMemo(
      () => <CommentNew musicInfo={musicInfo} onUpdateTotal={onUpdateTotal} actions={actions} refreshKey={refreshKey} />,
      [musicInfo, onUpdateTotal, actions, refreshKey]
    )
    switch (activeId) {
      case 'new':
        if (!initedRef.current) initedRef.current = true
        return comment
      default:
        return initedRef.current ? comment : null
    }
  }
)

const TABS = ['hot', 'new'] as const
const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => {
  if (!musicInfo) return null
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}
export default memo(({ componentId }: { componentId: string }) => {
  const pagerViewRef = useRef<PagerView>(null)
  const [activeId, setActiveId] = useState<ActiveId>('hot')
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfo | null>(
    getMusicInfo(playerState.playMusicInfo.musicInfo)
  )
  const t = useI18n()
  const theme = useTheme()
  const [total, setTotal] = useState({ hot: 0, new: 0 })
  const commentInputRef = useRef<CommentInputType>(null)
  const [isSending, setIsSending] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Check if user is logged in to NetEase and the song is from wy source
  const isWyLoggedIn = useMemo(() => {
    const cookie = settingState.setting['common.wy_cookie']
    return !!(cookie && musicInfo && musicInfo.source === 'wy')
  }, [musicInfo])

  const currentUid = useMemo(() => {
    return userState.wy_uid
  }, [])

  useEffect(() => {
    setComponentId(COMPONENT_IDS.comment, componentId)
  }, [])

  const tabs = useMemo(() => {
    return [
      { id: TABS[0], label: t('comment_tab_hot', { total: total.hot ? `(${total.hot})` : '' }) },
      { id: TABS[1], label: t('comment_tab_new', { total: total.new ? `(${total.new})` : '' }) },
    ] as const
  }, [total, t])

  const toggleTab = useCallback((id: ActiveId) => {
    setActiveId(id)
    pagerViewRef.current?.setPage(TABS.findIndex((tab) => tab == id))
  }, [])

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    setActiveId(TABS[nativeEvent.position])
  }, [])

  const refreshComment = useCallback(() => {
    if (!playerState.playMusicInfo.musicInfo) return
    let playerMusicInfo = playerState.playMusicInfo.musicInfo
    if ('progress' in playerMusicInfo) playerMusicInfo = playerMusicInfo.metadata.musicInfo

    if (musicInfo && musicInfo.id == playerMusicInfo.id) {
      toast(t('comment_refresh', { name: musicInfo.name }))
      return
    }
    setMusicInfo(playerMusicInfo)
  }, [musicInfo, t])

  const setHotTotal = useCallback((total: number) => {
    setTotal((totalInfo) => ({ ...totalInfo, hot: total }))
  }, [])
  const setNewTotal = useCallback((total: number) => {
    setTotal((totalInfo) => ({ ...totalInfo, new: total }))
  }, [])

  // Comment action handlers
  const handleReply = useCallback((comment: Comment) => {
    commentInputRef.current?.setReplyInfo({
      commentId: String(comment.id),
      userName: comment.userName,
    })
  }, [])

  const handleDelete = useCallback((comment: Comment) => {
    if (!musicInfo || musicInfo.source !== 'wy') return
    const songmid = String(musicInfo.meta.songId)
    Alert.alert(
      t('comment_delete_confirm_title' as any) as string,
      t('comment_delete_confirm_msg' as any) as string,
      [
        { text: t('cancel') as string, style: 'cancel' },
        {
          text: t('confirm') as string,
          style: 'destructive',
          onPress: () => {
            deleteComment(songmid, String(comment.id))
              .then(() => {
                toast(t('comment_delete_success' as any) as string)
                // Delay refresh to allow server to propagate the deletion
                setTimeout(() => setRefreshKey(k => k + 1), 1500)
              })
              .catch((err: any) => {
                console.error('Delete comment failed:', err)
                toast(t('comment_delete_failed' as any) as string)
              })
          },
        },
      ]
    )
  }, [musicInfo, t])

  const canDeleteComment = useCallback((comment: Comment) => {
    if (!currentUid) return false
    return String(comment.userId) === String(currentUid)
  }, [currentUid])

  const handleSendComment = useCallback((content: string, replyInfo: ReplyInfo | null) => {
    if (!musicInfo || musicInfo.source !== 'wy') return
    const songmid = String(musicInfo.meta.songId)
    setIsSending(true)

    const promise = replyInfo
      ? replyComment(songmid, content, replyInfo.commentId)
      : sendComment(songmid, content)

    promise
      .then(() => {
        toast(t((replyInfo ? 'comment_reply_success' : 'comment_send_success') as any) as string)
        // Delay refresh to allow server to propagate the new comment
        setTimeout(() => setRefreshKey(k => k + 1), 1500)
      })
      .catch((err: any) => {
        console.error('Send comment failed:', err)
        toast(t((replyInfo ? 'comment_reply_failed' : 'comment_send_failed') as any) as string)
      })
      .finally(() => {
        setIsSending(false)
      })
  }, [musicInfo, t])

  const commentActions = useMemo(() => {
    if (!isWyLoggedIn) return undefined
    return {
      showActions: true,
      onReply: handleReply,
      onDelete: handleDelete,
      canDelete: canDeleteComment,
    }
  }, [isWyLoggedIn, handleReply, handleDelete, canDeleteComment])

  const commentComponent = useMemo(() => {
    return (
      <View style={styles.container}>
        <View
          style={{
            ...styles.tabHeader,
            borderBottomColor: theme['c-border-background'],
            height: BAR_HEIGHT,
          }}
        >
          <View style={styles.left}>
            {tabs.map(({ id, label }) => (
              <HeaderItem
                id={id}
                label={label}
                key={id}
                isActive={activeId == id}
                onPress={toggleTab}
              />
            ))}
          </View>
          <View>
            <TouchableOpacity onPress={refreshComment} style={{ ...styles.btn, width: BAR_HEIGHT }}>
              <Icon name="available_updates" size={20} color={theme['c-600']} />
            </TouchableOpacity>
          </View>
        </View>
        <PagerView
          ref={pagerViewRef}
          onPageSelected={onPageSelected}
          // onPageScrollStateChanged={onPageScrollStateChanged}
          style={styles.pagerView}
        >
          <View collapsable={false} style={styles.pageStyle}>
            <HotCommentPage
              activeId={activeId}
              musicInfo={musicInfo as LX.Music.MusicInfoOnline}
              onUpdateTotal={setHotTotal}
              actions={commentActions}
              refreshKey={refreshKey}
            />
          </View>
          <View collapsable={false} style={styles.pageStyle}>
            <NewCommentPage
              activeId={activeId}
              musicInfo={musicInfo as LX.Music.MusicInfoOnline}
              onUpdateTotal={setNewTotal}
              actions={commentActions}
              refreshKey={refreshKey}
            />
          </View>
        </PagerView>
        {isWyLoggedIn ? (
          <CommentInput
            ref={commentInputRef}
            onSend={handleSendComment}
            disabled={isSending}
          />
        ) : null}
      </View>
    )
  }, [
    activeId,
    musicInfo,
    onPageSelected,
    refreshComment,
    refreshKey,
    setHotTotal,
    setNewTotal,
    tabs,
    theme,
    toggleTab,
    isWyLoggedIn,
    handleSendComment,
    isSending,
    commentActions,
  ])

  return (
    <PageContent>
      {musicInfo == null ? null : (
        <>
          <Header musicInfo={musicInfo} />
          {musicInfo.source == 'local' ? (
            <View style={{ ...styles.container, alignItems: 'center', justifyContent: 'center' }}>
              <Text>{t('comment_not support')}</Text>
            </View>
          ) : (
            commentComponent
          )}
        </>
      )}
    </PageContent>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    // paddingLeft: 10,
    paddingRight: 10,
    // justifyContent: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 5,
  },
  tabBtn: {
    // flex: 1,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  btn: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pagerView: {
    flex: 1,
  },
  pageStyle: {
    overflow: 'hidden',
  },
})

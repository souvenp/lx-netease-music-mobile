import { useMemo, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import Text from '@/components/common/Text'
import { useMyList } from '@/store/list/hook'
import ListItem, { styles as listStyles } from './ListItem'
import CreateUserList from './CreateUserList'
import { useWindowSize } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import {useWySubscribedPlaylists, useWyUid} from "@/store/user/hook.ts";

const styles = createStyle({
  list: {
    paddingLeft: 15,
    paddingRight: 2,
    paddingBottom: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // backgroundColor: 'rgba(0,0,0,0.2)'
    // justifyContent: 'center',
  },
})
const MIN_WIDTH = scaleSizeW(150)
const PADDING = styles.list.paddingLeft + styles.list.paddingRight

const EditListItem = ({ itemWidth, playlistType }: { itemWidth: number, playlistType: 'local' | 'online' }) => {
  const [isEdit, setEdit] = useState(false)
  const theme = useTheme()
  const t = useI18n()

  return (
    <View style={{ ...listStyles.listItem, width: itemWidth }}>
      <TouchableOpacity
        style={{
          ...listStyles.button,
          borderColor: theme['c-primary-light-200-alpha-700'],
          borderStyle: 'dashed',
        }}
        onPress={() => {
          setEdit(true)
        }}
      >
        <Text
          style={{ opacity: isEdit ? 0 : 1 }}
          numberOfLines={1}
          size={14}
          color={theme['c-button-font']}
        >
          {t('list_create')}
        </Text>
      </TouchableOpacity>
      {isEdit ? (
        <CreateUserList
          isEdit={isEdit}
          onHide={() => {
            setEdit(false)
          }}
          playlistType={playlistType}
        />
      ) : null}
    </View>
  )
}

export default ({
  musicInfo,
  onPress,
  playlistType,
}: {
  musicInfo: LX.Music.MusicInfo
  onPress: (listInfo: LX.List.MyListInfo) => void
  playlistType: 'local' | 'online'
}) => {
  const windowSize = useWindowSize()

  const localLists = useMyList()
  const onlinePlaylists = useWySubscribedPlaylists()
  const uid = useWyUid()

  const allList = useMemo(() => {
    if (playlistType === 'online') {
      return onlinePlaylists.filter(p => String(p.userId) === String(uid))
    }
    return localLists
  }, [playlistType, localLists, onlinePlaylists, uid])

  const itemWidth = useMemo(() => {
    let w = Math.floor(windowSize.width * 0.9 - PADDING)
    let n = Math.floor(w / MIN_WIDTH)
    if (n > 10) n = 10
    return Math.floor((w - 1) / n)
  }, [windowSize])

  return (
    <ScrollView style={{ flexGrow: 0 }}>
      <View style={styles.list} onStartShouldSetResponder={() => true}>
        {allList.map((info) => (
          <ListItem
            key={info.id}
            listInfo={info}
            musicInfo={musicInfo}
            onPress={onPress}
            width={itemWidth}
          />
        ))}
        <EditListItem itemWidth={itemWidth} playlistType={playlistType} />
      </View>
    </ScrollView>
  )
}

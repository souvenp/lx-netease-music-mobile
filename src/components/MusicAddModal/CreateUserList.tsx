import { useState, useRef, useEffect } from 'react'
import { View } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import { useI18n } from '@/lang'
import { createUserList } from '@/core/list'
import listState from '@/store/list/state'
import wyApi from '@/utils/musicSdk/wy/user'
import { addWySubscribedPlaylist } from '@/store/user/action'
import { useWyUid } from '@/store/user/hook'

export default ({ isEdit, onHide, playlistType }: { isEdit: boolean; onHide: () => void, playlistType: 'local' | 'online' }) => {
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)
  const t = useI18n()
  const uid = useWyUid()

  useEffect(() => {
    if (isEdit) {
      setText('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isEdit])

  const handleSubmitEditing = async () => {
    onHide()
    const name = text.trim()
    if (!name.length) return

    if (playlistType === 'online') {
      if (!uid) {
        toast('请先登录网易云音乐')
        return
      }
      wyApi.createPlaylist(name).then(playlist => {
        toast('创建成功')
        addWySubscribedPlaylist({
          id: playlist.id,
          userId: playlist.userId,
          name: playlist.name,
          coverImgUrl: playlist.coverImgUrl,
          trackCount: playlist.trackCount,
        })
      }).catch(err => {
        toast(`创建失败: ${err.message}`)
      })
    } else {
      if (
        (listState.userList.some((l) => l.name == name) &&
          !(await confirmDialog({
            message: global.i18n.t('list_duplicate_tip'),
          })))
      ) return
      void createUserList(listState.userList.length, [
        { id: `userlist_${Date.now()}`, name, locationUpdateTime: null },
      ])
    }
  }
  return isEdit ? (
    <View style={styles.imputContainer}>
      <Input
        placeholder={t('list_create_input_placeholder')}
        value={text}
        onChangeText={setText}
        ref={inputRef}
        onBlur={handleSubmitEditing}
        onSubmitEditing={handleSubmitEditing}
        style={styles.input}
      />
    </View>
  ) : null
}

const styles = createStyle({
  imputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    paddingBottom: 10,
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  input: {
    flex: 1,
    fontSize: 14,
    borderRadius: 4,
    textAlign: 'center',
    height: '100%',
  },
})

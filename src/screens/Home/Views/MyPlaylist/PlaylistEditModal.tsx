import { useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import Input from '@/components/common/Input'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import wyApi from '@/utils/musicSdk/wy/user'
import { updateWySubscribedPlaylist } from '@/store/user/action'
import {SubscribedPlaylistInfo} from "@/store/user/state.ts";

interface PlaylistInfo {
  id: string
  name: string
  desc: string
}

export interface PlaylistEditModalType {
  show: (info: PlaylistInfo) => void
}

export default forwardRef<PlaylistEditModalType, {}>((props, ref) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const [visible, setVisible] = useState(false)
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    show(info) {
      setPlaylistInfo(info)
      setName(info.name)
      setDesc(info.desc)
      if (visible) {
        alertRef.current?.setVisible(true)
      } else {
        setVisible(true)
        requestAnimationFrame(() => {
          alertRef.current?.setVisible(true)
        })
      }
    },
  }))

  const handleConfirm = useCallback(() => {
    if (!playlistInfo) return
    const finalName = name.trim()
    if (!finalName) {
      toast('歌单名不能为空')
      return
    }

    wyApi.updatePlaylist(playlistInfo.id, finalName, desc).then((result) => {
      const nameResult = result['/api/playlist/update/name']
      const descResult = result['/api/playlist/desc/update']

      const isNameSuccess = nameResult?.code === 200
      const isDescSuccess = descResult?.code === 200

      if (isNameSuccess || isDescSuccess) {
        const updates: Partial<SubscribedPlaylistInfo> = {}
        if (isNameSuccess) updates.name = finalName
        if (isDescSuccess) updates.description = desc
        updateWySubscribedPlaylist(playlistInfo.id, updates)
        alertRef.current?.setVisible(false)
      }

      if (isNameSuccess && isDescSuccess) {
        toast('编辑成功')
      } else {
        if (!isNameSuccess) {
          toast(`名称更新失败: ${nameResult?.message || '未知错误'}`)
        }
        if (!isDescSuccess) {
          toast(`描述更新失败: ${descResult?.message || '未知错误'}`)
        }
      }
    }).catch(err => {
      toast(`编辑失败: ${err.message}`)
    })
  }, [playlistInfo, name, desc])

  return visible ? (
    <ConfirmAlert
      ref={alertRef}
      onConfirm={handleConfirm}
      onHide={() => setVisible(false)}
    >
      <View style={styles.content}>
        <Text style={styles.label}>歌单名</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="请输入歌单名"
          style={{ backgroundColor: theme['c-primary-input-background'] }}
        />
        <Text style={[styles.label, { marginTop: 15 }]}>描述</Text>
        <Input
          value={desc}
          onChangeText={setDesc}
          placeholder="请输入描述"
          multiline
          textAlignVertical="top"
          style={{ height: 100, backgroundColor: theme['c-primary-input-background'] }}
        />
      </View>
    </ConfirmAlert>
  ) : null
})

const styles = createStyle({
  content: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
  },
  label: {
    marginBottom: 5,
  },
})

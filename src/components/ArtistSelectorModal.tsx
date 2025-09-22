import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'

export interface Artist {
  id: string | number;
  name: string
}

export interface ArtistSelectorModalType {
  show: (artists: Artist[], onSelect: (artist: Artist) => void) => void; // <-- 修改 onSelect 签名
}

export default forwardRef<ArtistSelectorModalType, {}>((props, ref) => {
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [artists, setArtists] = useState<Artist[]>([])
  const onSelectRef = useRef<(artist: Artist) => void>(() => {}) // <-- 修改 onSelectRef 类型

  useImperativeHandle(ref, () => ({
    show(artists, onSelect) {
      setArtists(artists)
      onSelectRef.current = onSelect
      if (visible) dialogRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => dialogRef.current?.setVisible(true))
      }
    },
  }))

  const handleSelect = (artist: Artist) => { // <-- 修改 handleSelect 签名
    dialogRef.current?.setVisible(false)
    onSelectRef.current(artist)
  }

  return visible ? (
    <Dialog ref={dialogRef} title="选择艺人">
      <ScrollView>
        {artists.map(artist => (
          <TouchableOpacity key={artist.id} style={styles.item} onPress={() => handleSelect(artist)}>
            <Text>{artist.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Dialog>
  ) : null
})

const styles = createStyle({
  item: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
})

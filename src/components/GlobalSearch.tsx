import { memo, useRef, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

const GlobalSearch = () => {
  const theme = useTheme()
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)

  const handleSearch = () => {
    const searchText = text.trim()
    if (!searchText) return

    // 触发全局搜索事件
    global.app_event.triggerSearch(searchText)
    setText('')
    inputRef.current?.blur()
  }

  return (
    <View style={styles.container}>
      <Input
        ref={inputRef}
        placeholder="搜索..."
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSearch}
        style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
      />
      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <Icon name="search-2" color={theme['c-font-label']} size={18} />
      </TouchableOpacity>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 10,
    maxWidth: 220, // 限制最大宽度
  },
  input: {
    height: 32,
    paddingRight: 30, // 为按钮留出空间
  },
  searchBtn: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
})

export default memo(GlobalSearch)

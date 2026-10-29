import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId } from '@/store/common/hook'
import { useGlobalSearchSuggestions } from './GlobalSearchSuggestions'

const GlobalSearch = () => {
  const theme = useTheme()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<InputType>(null)
  const anchorRef = useRef<View>(null)
  const navId = useNavActiveId()
  const { show, hide } = useGlobalSearchSuggestions()

  const dismiss = useCallback(() => {
    setFocused(false)
    inputRef.current?.blur()
    hide()
  }, [hide])

  const handleSearch = useCallback((value: string) => {
    const searchText = value.trim()
    if (!searchText) return

    dismiss()
    setText('')
    global.app_event.triggerSearch(searchText)
  }, [dismiss])

  useEffect(() => {
    if (focused && anchorRef.current) show({ text, anchor: anchorRef.current, onSelect: handleSearch, onDismiss: dismiss })
    else hide()
    return hide
  }, [text, focused, show, hide, handleSearch, dismiss])

  useEffect(() => { dismiss() }, [navId, dismiss])

  return (
    <View ref={anchorRef} collapsable={false} style={styles.container} onLayout={() => {
      if (focused && anchorRef.current) show({ text, anchor: anchorRef.current, onSelect: handleSearch, onDismiss: dismiss })
    }}>
      <Input
        ref={inputRef}
        placeholder="搜索..."
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={dismiss}
        onSubmitEditing={() => handleSearch(text)}
        style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
      />
      <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(text)}>
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

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { FlatList, Keyboard, Pressable, StyleSheet, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import musicSdk from '@/utils/musicSdk'
import searchState from '@/store/search/state'

interface SearchRequest {
  text: string
  anchor: View
  onSelect: (text: string) => void
  onDismiss: () => void
}

interface SearchPosition extends SearchRequest {
  left: number
  top: number
  width: number
  rootY: number
}

const SearchContext = createContext({ show: (_request: SearchRequest) => {}, hide: () => {} })
export const useGlobalSearchSuggestions = () => useContext(SearchContext)

export default ({ children }: { children: ReactNode }) => {
  const theme = useTheme()
  const rootRef = useRef<View>(null)
  const requestId = useRef(0)
  const [request, setRequest] = useState<SearchPosition | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [height, setHeight] = useState(0)
  const [keyboardTop, setKeyboardTop] = useState(Infinity)

  const hide = useCallback(() => {
    requestId.current++
    setRequest(null)
    setSuggestions([])
  }, [])

  const show = useCallback((next: SearchRequest) => {
    const id = ++requestId.current
    setRequest(null)
    setSuggestions([])
    if (!next.text.trim()) return
    next.anchor.measureInWindow((x, y, width, anchorHeight) => {
      rootRef.current?.measureInWindow((rootX, rootY) => {
        if (id !== requestId.current || !width) return
        setRequest({ ...next, left: x - rootX, top: y - rootY + anchorHeight, width, rootY })
      })
    })
  }, [])

  useEffect(() => {
    if (!request) return
    const id = requestId.current
    let active = true
    const timer = setTimeout(() => {
      void Promise.resolve().then(() => musicSdk[searchState.temp_source].tipSearch.search(request.text.trim()))
        .then(list => { if (active && id === requestId.current) setSuggestions(list) })
        .catch(() => { if (active && id === requestId.current) setSuggestions([]) })
    }, 200)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [request])

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', event => setKeyboardTop(event.endCoordinates.screenY))
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardTop(Infinity)
      hide()
    })
    return () => {
      shown.remove()
      hidden.remove()
      requestId.current++
    }
  }, [hide])

  const dismiss = () => {
    request?.onDismiss()
    hide()
  }
  const availableHeight = request ? Math.max(0, Math.min(height, keyboardTop - request.rootY) - request.top) : 0

  return <SearchContext.Provider value={{ show, hide }}>
    <View ref={rootRef} collapsable={false} style={styles.root} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      {children}
      {request && suggestions.length > 0 && availableHeight > 0 && <View style={[styles.overlay, { top: request.top }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <FlatList
          style={[styles.list, { left: request.left, width: request.width, maxHeight: Math.min(280, availableHeight), backgroundColor: theme['c-content-background'] }]}
          data={suggestions}
          keyboardShouldPersistTaps="always"
          keyExtractor={(item, index) => `${index}-${item}`}
          renderItem={({ item }) => <Pressable style={styles.item} onPress={() => {
            hide()
            request.onSelect(item)
          }}>
            <Text numberOfLines={1}>{item}</Text>
          </Pressable>}
        />
      </View>}
    </View>
  </SearchContext.Provider>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30 },
  list: { position: 'absolute', top: 0, elevation: 4, borderRadius: 4 },
  item: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
})

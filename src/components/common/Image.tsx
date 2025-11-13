import { useTheme } from '@/store/theme/hook'
import { BorderRadius } from '@/theme'
import { createStyle } from '@/utils/tools'
import { type ComponentProps, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, type ViewProps, StyleSheet, Image as FastImage } from 'react-native'
// import FastImage, { type FastImageProps } from 'react-native-fast-image'
import Text from './Text'
import { useLayout } from '@/utils/hooks'
// export type { OnLoadEvent } from 'react-native-fast-image'

export interface ImageProps extends ViewProps {
  style: ComponentProps<typeof FastImage>['style']
  url?: string | number | null
  cache?: boolean
  resizeMode?: ComponentProps<typeof FastImage>['resizeMode']
  onError?: (url: string | number) => void
}

export const defaultHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}

const EmptyPic = memo(
  ({ style, nativeID }: { style: ImageProps['style']; nativeID: ImageProps['nativeID'] }) => {
    const theme = useTheme()
    const { onLayout, width } = useLayout()
    const size = width * 0.36

    return (
      <View
        style={StyleSheet.compose(
          {
            ...styles.emptyPic,
            backgroundColor: theme['c-primary-light-900-alpha-200'],
            gap: size * 0.1,
          },
          style
        )}
        onLayout={onLayout}
        nativeID={nativeID}
      >
        <Text size={size} color={theme['c-primary-light-400-alpha-200']}>
          L
        </Text>
        <Text size={size} color={theme['c-primary-light-400-alpha-200']} style={styles.text}>
          X
        </Text>
      </View>
    )
  }
)

const MAX_RETRIES = 2
const RETRY_DELAY = 200

const Image = memo(
  ({ url, cache, resizeMode = 'cover', style, onError, nativeID }: ImageProps) => {
    const [isError, setError] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const retryTimer = useRef<NodeJS.Timeout | null>(null)

    const handleError = useCallback(() => {
      console.log(`Image load error: ${url}, retry count: ${retryCount}`)
      if (retryTimer.current) clearTimeout(retryTimer.current)

      if (retryCount < MAX_RETRIES) {
        retryTimer.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          setError(false)
        }, RETRY_DELAY)
      } else {
        setError(true)
        onError?.(url!)
      }
    }, [retryCount, onError, url])

    useEffect(() => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
      }
      setError(false)
      setRetryCount(0)
    }, [url])

    useEffect(() => {
      return () => {
        if (retryTimer.current) {
          clearTimeout(retryTimer.current)
        }
      }
    }, [])

    let uri =
      typeof url == 'number'
        ? FastImage.resolveAssetSource(url).uri
        : url?.startsWith('/')
          ? 'file://' + url
          : url

    if (retryCount > 0 && !isError && uri) {
      uri += (uri.includes('?') ? '&' : '?') + `t=${Date.now()}`
    }

    const showDefault = useMemo(() => !uri || isError, [isError, uri])
    return showDefault ? (
      <EmptyPic style={style} nativeID={nativeID} />
    ) : (
      <FastImage
        style={style}
        source={{
          uri: uri!,
          headers: defaultHeaders,
          cache: cache === false ? 'reload' : 'force-cache',
          // priority: FastImage.priority.normal,
          // cache: cache === false ? 'web' : 'immutable',
        }}
        onError={handleError}
        resizeMode={resizeMode}
        nativeID={nativeID}
      />
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.url == nextProps.url &&
      prevProps.style == nextProps.style &&
      prevProps.nativeID == nextProps.nativeID
    )
  }
)

export const getSize = (
  uri: string,
  success: (width: number, height: number) => void,
  failure?: (error: any) => void
) => {
  FastImage.getSize(uri, success, failure)
}
export const clearMemoryCache = async () => {
  // return Promise.all([FastImage.clearMemoryCache(), FastImage.clearDiskCache()])
}
export default Image

const styles = createStyle({
  emptyPic: {
    borderRadius: BorderRadius.normal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    paddingLeft: 2,
  },
})

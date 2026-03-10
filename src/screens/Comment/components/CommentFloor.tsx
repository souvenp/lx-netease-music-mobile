import { memo, useState, useMemo, useCallback } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { BorderWidths } from '@/theme'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type Comment } from '../utils'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useLayout } from '@/utils/hooks'
import { useI18n } from '@/lang'
import Image from '@/components/common/Image'
import CommentImage from './CommentImage'
import CommentText from './CommentText'
const defaultUser = require('@/resources/images/defaultUser.jpg')

const GAP = 12
const avatarWidth = scaleSizeW(36)

export interface CommentFloorActions {
  onReply?: (comment: Comment) => void
  onDelete?: (comment: Comment) => void
  canDelete?: (comment: Comment) => boolean
  showActions?: boolean
}

const CommentFloor = memo(({
  comment,
  isLast,
  onReply,
  onDelete,
  canDelete,
  showActions,
}: {
  comment: Comment
  isLast?: boolean
} & CommentFloorActions) => {
  const theme = useTheme()
  const [isAvatarError, setIsAvatarError] = useState(false)
  const { onLayout, width } = useLayout()
  const t = useI18n()

  const handleAvatarError = useCallback(() => {
    setIsAvatarError(true)
  }, [])

  const handleReply = useCallback(() => {
    onReply?.(comment)
  }, [onReply, comment])

  const handleDelete = useCallback(() => {
    onDelete?.(comment)
  }, [onDelete, comment])

  const replyComments = useMemo(() => {
    if (!comment.reply?.length) return null
    const endIndex = comment.reply.length - 1
    return (
      <View style={{ ...styles.replyFloor, borderTopColor: theme['c-list-header-border-bottom'] }}>
        {comment.reply.map((c, index) => (
          <CommentFloor
            comment={c}
            isLast={index === endIndex}
            key={`${comment.id}_${c.id}`}
            onReply={onReply}
            onDelete={onDelete}
            canDelete={canDelete}
            showActions={showActions}
          />
        ))}
      </View>
    )
  }, [onReply, onDelete, canDelete, showActions])

  const likedCount = useMemo(() => {
    if (comment.likedCount == null) return null
    return (
      <View style={styles.like}>
        <Icon name="thumbs-up" style={{ color: theme['c-450'] }} size={12} />
        <Text style={styles.likedCount} size={12} color={theme['c-450']}>
          {comment.likedCount}
        </Text>
      </View>
    )
  }, [])

  const showDeleteBtn = showActions && canDelete?.(comment)

  return (
    <View
      style={{
        ...styles.container,
        borderBottomColor: theme['c-list-header-border-bottom'],
        borderBottomWidth: isLast ? 0 : BorderWidths.normal,
        paddingBottom: isLast ? 0 : GAP,
      }}
    >
      <View style={styles.comment}>
        <View>
          <Image
            url={comment.avatar && !isAvatarError ? comment.avatar : defaultUser}
            onError={handleAvatarError}
            style={stylesRaw.avatar}
          />
        </View>
        <View style={styles.right}>
          <View style={styles.info}>
            <View>
              <Text selectable numberOfLines={1} size={14}>
                {comment.userName}
              </Text>
              <View style={styles.metaInfo}>
                <Text numberOfLines={1} size={12} color={theme['c-450']}>
                  {comment.timeStr}
                </Text>
                {comment.location ? (
                  <Text numberOfLines={1} style={styles.location} size={12} color={theme['c-450']}>
                    {t('location', { location: comment.location })}
                  </Text>
                ) : null}
              </View>
            </View>
            {likedCount}
          </View>
          <CommentText text={comment.text} />
          {comment.images?.length ? (
            <View style={styles.images} onLayout={onLayout}>
              {comment.images.map((url, index) => (
                <CommentImage key={String(index)} url={url} maxWidth={width} />
              ))}
            </View>
          ) : null}
          {showActions ? (
            <View style={styles.actionBar}>
              <TouchableOpacity onPress={handleReply} style={styles.actionBtn}>
                <Icon name="comment" size={14} color={theme['c-450']} />
                <Text size={12} color={theme['c-450']} style={styles.actionText}>
                  {t('comment_reply' as any)}
                </Text>
              </TouchableOpacity>
              {showDeleteBtn ? (
                <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                  <Icon name="close" size={14} color={theme['c-450']} />
                  <Text size={12} color={theme['c-450']} style={styles.actionText}>
                    {t('comment_delete' as any)}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      {replyComments}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    marginTop: GAP,
    paddingBottom: GAP,
    borderBottomWidth: BorderWidths.normal,
    borderStyle: 'dashed',
  },
  comment: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
  },
  right: {
    flex: 1,
    paddingLeft: 10,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    marginTop: 2,
    flexDirection: 'row',
  },
  location: {
    marginLeft: 10,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likedCount: {
    marginLeft: 2,
  },
  images: {
    paddingTop: 5,
    width: '100%',
    flexDirection: 'row',
  },
  replyFloor: {
    marginTop: GAP,
    marginLeft: 20,
    borderTopWidth: BorderWidths.normal,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
  },
  actionBar: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actionText: {
    marginLeft: 4,
  },
})

const stylesRaw = StyleSheet.create({
  avatar: {
    height: avatarWidth,
    width: avatarWidth,
    borderRadius: 4,
  },
})

export default CommentFloor


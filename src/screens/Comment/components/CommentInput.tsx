import { memo, useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { View, TextInput, TouchableOpacity, Keyboard, Platform } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { BorderWidths } from '@/theme'
import { scaleSizeH } from '@/utils/pixelRatio'

export interface ReplyInfo {
    commentId: string
    userName: string
}

export interface CommentInputType {
    setReplyInfo: (info: ReplyInfo | null) => void
}

export interface CommentInputProps {
    onSend: (content: string, replyInfo: ReplyInfo | null) => void
    disabled?: boolean
}

const INPUT_HEIGHT = scaleSizeH(48)

const CommentInput = forwardRef<CommentInputType, CommentInputProps>(({ onSend, disabled }, ref) => {
    const theme = useTheme()
    const t = useI18n()
    const [text, setText] = useState('')
    const [replyInfo, setReplyInfo] = useState<ReplyInfo | null>(null)
    const inputRef = useRef<TextInput>(null)

    useImperativeHandle(ref, () => ({
        setReplyInfo(info) {
            setReplyInfo(info)
            if (info) {
                setTimeout(() => {
                    inputRef.current?.focus()
                }, 100)
            }
        },
    }))

    const handleSend = useCallback(() => {
        const content = text.trim()
        if (!content) return
        onSend(content, replyInfo)
        setText('')
        setReplyInfo(null)
        Keyboard.dismiss()
    }, [text, replyInfo, onSend])

    const handleCancelReply = useCallback(() => {
        setReplyInfo(null)
    }, [])

    return (
        <View style={{ borderTopColor: theme['c-border-background'], ...styles.wrapper }}>
            {replyInfo ? (
                <View style={{ ...styles.replyBar, backgroundColor: theme['c-primary-background-hover'] }}>
                    <Text size={12} color={theme['c-450']} numberOfLines={1} style={styles.replyText}>
                        {t('comment_reply_to' as any, { name: replyInfo.userName })}
                    </Text>
                    <TouchableOpacity onPress={handleCancelReply} style={styles.cancelReply}>
                        <Icon name="close" size={14} color={theme['c-450']} />
                    </TouchableOpacity>
                </View>
            ) : null}
            <View style={styles.container}>
                <TextInput
                    ref={inputRef}
                    style={{
                        ...styles.input,
                        color: theme['c-font'],
                        backgroundColor: theme['c-primary-background-hover'],
                        borderColor: theme['c-border-background'],
                    }}
                    value={text}
                    onChangeText={setText}
                    placeholder={replyInfo ? t('comment_reply_placeholder' as any, { name: replyInfo.userName }) : t('comment_input_placeholder' as any)}
                    placeholderTextColor={theme['c-450']}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    editable={!disabled}
                />
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={disabled || !text.trim()}
                    style={{
                        ...styles.sendBtn,
                        backgroundColor: theme['c-primary-background-hover'],
                    }}
                >
                    <Icon
                        name="chevron-right"
                        size={18}
                        color={text.trim() ? theme['c-primary-font'] : theme['c-primary-font-active']}
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
})

const styles = createStyle({
    wrapper: {
        borderTopWidth: BorderWidths.normal,
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    replyText: {
        flex: 1,
    },
    cancelReply: {
        padding: 4,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        height: INPUT_HEIGHT,
    },
    input: {
        flex: 1,
        height: '100%',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 0,
        fontSize: 14,
        borderWidth: BorderWidths.normal,
    },
    sendBtn: {
        marginLeft: 8,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

export default memo(CommentInput)

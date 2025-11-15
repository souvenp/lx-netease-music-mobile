import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal, { type ModalType } from '@/components/common/Modal';
import Video, { type VideoRef } from 'react-native-video';

export interface VideoPlayerModalType {
  show: (url: string) => void;
};

export default forwardRef<VideoPlayerModalType, {}>((props, ref) => {
  const videoRef = useRef<VideoRef>(null);
  const modalRef = useRef<ModalType>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useImperativeHandle(ref, () => ({
    show(url) {
      setVideoUrl(url);
      setLoading(true);
      setShowControls(false);
      modalRef.current?.setVisible(true);
    },
  }));

  const handleClose = useCallback(() => {
    modalRef.current?.setVisible(false);
  }, []);

  const handleModalHide = useCallback(() => {
    setVideoUrl('');
    setLoading(true);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls(v => !v);
  }, []);

  return (
    <Modal ref={modalRef} onHide={handleModalHide} statusBarPadding={false} bgHide={true}>
      <View style={styles.container}>
        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            controls={showControls}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onPress={showControls ? toggleControls : undefined}
            onError={(e) => {
              console.error('Video Error:', e);
              handleClose();
            }}
          />
        ) : null}

        {!showControls && (
          <TouchableOpacity
            style={styles.touchableOverlay}
            activeOpacity={1}
            onPress={toggleControls}
          />
        )}

        {loading && (
          <ActivityIndicator style={styles.loading} size="large" color="#FFF" />
        )}
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  loading: {
    position: 'absolute',
  },
  touchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
})

/**
 * Attachment Picker - Redesigned
 * 
 * Premium attachment picker with:
 * - Animated button press
 * - Thumbnail preview with remove button
 * - Smooth animations
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Alert, Image, View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import { spacing, radius, shadows } from '../theme/colors';
import type { PickedImage } from '../types';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Image quality for compression
const IMAGE_QUALITY = 0.7;

interface AttachmentPickerProps {
  onImageSelected: (image: PickedImage) => void;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AttachmentPicker({ onImageSelected, disabled }: AttachmentPickerProps) {
  const { theme, isDark } = useSettings();
  const buttonScale = useSharedValue(1);
  
  const requestPermission = useCallback(async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to select images.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  }, []);
  
  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) return;
    
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: IMAGE_QUALITY,
        base64: true,
        exif: false,
      };
      
      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      
      const asset = result.assets[0];
      
      // Check file size
      const estimatedSize = asset.base64 ? (asset.base64.length * 3) / 4 : 0;
      if (estimatedSize > MAX_FILE_SIZE) {
        Alert.alert(
          'Image Too Large',
          'Please select an image smaller than 10MB.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Determine mime type
      const uri = asset.uri.toLowerCase();
      let mimeType = 'image/jpeg';
      if (uri.endsWith('.png')) mimeType = 'image/png';
      else if (uri.endsWith('.gif')) mimeType = 'image/gif';
      else if (uri.endsWith('.webp')) mimeType = 'image/webp';
      
      const pickedImage: PickedImage = {
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        mimeType,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
      };
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onImageSelected(pickedImage);
      
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [requestPermission, onImageSelected]);
  
  const handlePress = useCallback(() => {
    if (disabled) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Add Image',
      'Choose a source',
      [
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Photo Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [disabled, pickImage]);
  
  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 15 });
  };
  
  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 12 });
  };
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  return (
    <AnimatedTouchable
      style={[
        styles.button,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          borderColor: theme.inputBorder,
        },
        disabled && styles.disabled,
        buttonAnimatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Text style={[styles.icon, { color: disabled ? theme.textMuted : theme.primary }]}>📎</Text>
    </AnimatedTouchable>
  );
}

// Preview component for selected attachment
interface AttachmentPreviewProps {
  image: PickedImage;
  onRemove: () => void;
}

export function AttachmentPreview({ image, onRemove }: AttachmentPreviewProps) {
  const { theme } = useSettings();
  const removeScale = useSharedValue(1);
  
  const handleRemovePressIn = () => {
    removeScale.value = withSpring(0.85, { damping: 15 });
  };
  
  const handleRemovePressOut = () => {
    removeScale.value = withSpring(1, { damping: 12 });
  };
  
  const removeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: removeScale.value }],
  }));
  
  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  };
  
  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.previewContainer, 
        { backgroundColor: theme.surface, borderColor: theme.border },
        shadows.sm,
      ]}
    >
      <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
      <AnimatedPressable
        style={[styles.removeButton, { backgroundColor: theme.error }, removeAnimatedStyle]}
        onPress={handleRemove}
        onPressIn={handleRemovePressIn}
        onPressOut={handleRemovePressOut}
      >
        <Text style={styles.removeText}>×</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 18,
  },
  previewContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
});

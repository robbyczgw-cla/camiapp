/**
 * Attachment picker for images
 * Uses expo-image-picker for camera and gallery access
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Alert, Image, View, Text, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../stores/settings';
import type { PickedImage } from '../types';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Image quality for compression
const IMAGE_QUALITY = 0.7;

// Max dimension for resize
const MAX_DIMENSION = 1280;

interface AttachmentPickerProps {
  onImageSelected: (image: PickedImage) => void;
  disabled?: boolean;
}

export function AttachmentPicker({ onImageSelected, disabled }: AttachmentPickerProps) {
  const { theme } = useSettings();
  
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
      
      // Check file size (estimated from base64 length)
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
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, { color: disabled ? theme.textMuted : theme.primary }]}>📎</Text>
    </TouchableOpacity>
  );
}

// Preview component for selected attachment
interface AttachmentPreviewProps {
  image: PickedImage;
  onRemove: () => void;
}

export function AttachmentPreview({ image, onRemove }: AttachmentPreviewProps) {
  const { theme } = useSettings();
  
  return (
    <View style={[styles.previewContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
      <Pressable
        style={[styles.removeButton, { backgroundColor: theme.error }]}
        onPress={onRemove}
      >
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
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
    width: 60,
    height: 60,
    borderRadius: 8,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

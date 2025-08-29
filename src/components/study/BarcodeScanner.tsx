// src/components/study/BarcodeScanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Camera, CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Button, TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { extractISBN } from '@/lib/studyLogApi';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (isbn: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScanComplete }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setScanned(false);
      setShowManualInput(false);
      setIsbnInput('');
    }
  }, [isOpen]);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    const isbn = extractISBN(data);
    
    if (isbn) {
      onScanComplete(isbn);
      onClose();
    } else {
      Alert.alert(
        'スキャンエラー',
        'ISBNバーコードではありません。もう一度お試しください。',
        [
          { text: 'OK', onPress: () => setScanned(false) }
        ]
      );
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleManualISBN = () => {
    const isbn = extractISBN(isbnInput);
    if (isbn) {
      onScanComplete(isbn);
      setIsbnInput('');
      onClose();
    } else {
      Alert.alert('入力エラー', '正しいISBNを入力してください');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        Alert.alert(
          '手動入力', 
          '画像からISBNを確認して手動で入力してください。',
          [{ text: 'OK', onPress: () => setShowManualInput(true) }]
        );
      }
    } catch (error) {
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // Manual input modal
  if (showManualInput) {
    return (
      <Modal visible={isOpen} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <View style={{ padding: 20 }}>
          <View style={styles.manualContainer}>
          <Text style={styles.title}>ISBN手動入力</Text>
          
          <TextInput
            mode="outlined"
            label="ISBN"
            placeholder="978-4-XXXXXXXXX または 13桁の数字"
            value={isbnInput}
            onChangeText={setIsbnInput}
            style={styles.input}
          />
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={() => setShowManualInput(false)}
              style={styles.cancelButton}
            >
              戻る
            </Button>
            <Button 
              mode="contained" 
              onPress={handleManualISBN}
              disabled={!isbnInput.trim()}
              style={styles.confirmButton}
            >
              確定
            </Button>
          </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission) {
    // Camera permissions are still loading
    return (
      <Modal visible={isOpen} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>カメラ権限を確認中...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <Modal visible={isOpen} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={64} color="#666" style={styles.cameraIcon} />
          <Text style={styles.permissionTitle}>カメラへのアクセス許可が必要です</Text>
          <Text style={styles.permissionText}>
            バーコードをスキャンするためにカメラの使用を許可してください。
          </Text>
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={requestPermission}
              style={styles.permissionButton}
            >
              許可する
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => setShowManualInput(true)}
              style={styles.manualButton}
            >
              手動入力
            </Button>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isOpen} onDismiss={onClose} contentContainerStyle={styles.fullScreenModal}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'code128', 'code39'],
          }}
        >
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlayTop}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={30} color="white" />
              </TouchableOpacity>
            </View>

            {/* Middle section with scanning frame */}
            <View style={styles.overlayMiddle}>
              <View style={styles.scanningFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Bottom overlay */}
            <View style={styles.overlayBottom}>
              <Text style={styles.instructionText}>
                書籍のISBNバーコードをスキャンしてください
              </Text>
              <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={toggleCameraFacing}>
                  <MaterialIcons name="flip-camera-android" size={24} color="white" />
                  <Text style={styles.actionButtonText}>切替</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={pickImageFromLibrary}>
                  <MaterialIcons name="photo-library" size={24} color="white" />
                  <Text style={styles.actionButtonText}>ギャラリー</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowManualInput(true)}>
                  <MaterialIcons name="keyboard" size={24} color="white" />
                  <Text style={styles.actionButtonText}>手動入力</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
  },
  fullScreenModal: {
    flex: 1,
    margin: 0,
  },
  container: {
    flex: 1,
  },
  manualContainer: {
    alignItems: 'stretch',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 20,
  },
  overlayMiddle: {
    flexDirection: 'row',
    flex: 2,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scanningFrame: {
    flex: 1,
    marginHorizontal: 50,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
  },
  actionButtonText: {
    color: 'white',
    marginTop: 4,
    fontSize: 12,
  },
  permissionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  cameraIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  permissionButton: {
    flex: 1,
  },
  manualButton: {
    flex: 1,
  },
});
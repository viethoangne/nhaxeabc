import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '@/constants/api';

// Configure how the app handles notifications while foregrounded
// Using type assertion to handle minor SDK version field name differences
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
});

/**
 * Request permission and fetch Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF5222',
    });
  }

  // Support emulator testing on Android for push (Expo client allows push tokens on emulator)
  const isSupported = Device.isDevice || Platform.OS === 'android' || Platform.OS === 'ios';
  
  if (isSupported) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification - permissions not granted.');
      return null;
    }

    try {
      // Find EA Project ID for SDK 50+ Compatibility
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenResult.data;
      console.log('Successfully fetched Expo Push Token:', token);
    } catch (error: any) {
      console.warn('Warning fetching Expo push token (FCM config may be missing):', error.message || error);
    }
  } else {
    console.warn('Push notification is only supported on a physical device/emulator');
  }

  return token;
}

/**
 * Register push token with NestJS backend
 */
export async function sendTokenToBackend(userId: string, token: string): Promise<void> {
  try {
    const response = await apiClient.post('/notification/token', { userId, token });
    console.log('Successfully registered device token on backend:', response.data);
  } catch (error: any) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.warn('Warning sending push token to backend:', errorDetails);
  }
}

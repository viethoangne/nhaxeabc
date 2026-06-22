import { useEffect, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { Platform } from 'react-native';
import { useAuthStore } from './useAuthStore';

// Đăng ký WebBrowser để xử lý redirect từ Google trở về app
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export function useGoogleAuth() {
  const auth = useAuthStore();

  // Tự động chọn redirectUri đúng theo platform:
  // Trên Native standalone build, ta sử dụng chính package name của app làm scheme `com.zhoang.mobile:/`.
  const redirectUri = Platform.OS === 'web'
    ? makeRedirectUri({ preferLocalhost: false })   // Dùng chính URL hiện tại (ví dụ localtunnel HTTPS)
    : undefined; // Expo tự động sinh redirectUri chuẩn của Google cho Native (iOS: reversed client id, Android: package name)

  // Log để dễ debug / thêm vào Google Console
  if (__DEV__) {
    console.log('[useGoogleAuth] redirectUri =', redirectUri);
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    // Web dùng Token (implicit) để tránh lỗi 400 khi exchange code
    // (code exchange cần client_secret mà chỉ server mới có)
    responseType: Platform.OS === 'web' ? ResponseType.Token : undefined,
  });

  const handleGoogleResponse = useCallback(async () => {
    if (response?.type !== 'success') return;

    const { authentication, params } = response as any;

    // Lấy accessToken: từ authentication object (native) hoặc params (web implicit)
    const accessToken = authentication?.accessToken ?? params?.access_token;

    if (!accessToken) {
      console.warn('[useGoogleAuth] Không nhận được accessToken từ Google');
      return;
    }

    try {
      // Lấy thông tin user từ Google UserInfo API
      const userInfoRes = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!userInfoRes.ok) {
        console.error('[useGoogleAuth] Google UserInfo API lỗi:', userInfoRes.status);
        return;
      }

      const userInfo = await userInfoRes.json();
      const { email, name, picture } = userInfo as {
        email: string;
        name?: string;
        picture?: string;
      };

      if (!email) {
        console.error('[useGoogleAuth] Không lấy được email từ Google');
        return;
      }

      // Gọi backend để tạo/cập nhật user và lấy JWT
      await auth.loginGoogle(email, name, picture);
    } catch (err) {
      console.error('[useGoogleAuth] Lỗi khi xử lý Google Sign-In:', err);
    }
  }, [response, auth]);

  useEffect(() => {
    handleGoogleResponse();
  }, [handleGoogleResponse]);

  const isLoading = auth.isLoading;

  return {
    /** Gọi hàm này khi người dùng nhấn nút Google */
    promptAsync: () => promptAsync(),
    /** True trong khi đang chờ OAuth hoặc backend xử lý */
    loading: isLoading,
    /** True nếu request OAuth đã sẵn sàng */
    ready: !!request,
    /** Redirect URI đang dùng (để debug / thêm vào Google Console) */
    redirectUri,
    response,
  };
}

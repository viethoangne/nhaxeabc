import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Ticket, User, Bell, Search } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { View, Animated, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTranslation } from '@/hooks/useTranslation';

// Highly polished animated tab icon wrapper for symmetry & premium active transitions
function TabIcon({ Icon, focused, colors, badgeCount }: { Icon: any; focused: boolean; colors: any; badgeCount?: number }) {
  const scaleValue = React.useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.12 : 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[
      {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ scale: scaleValue }],
      },
      focused ? {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
        elevation: 5,
      } : {
        backgroundColor: 'transparent',
      }
    ]}>
      <Icon size={20} color={focused ? '#FFFFFF' : colors.textSecondary} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={{
          position: 'absolute',
          top: 2,
          right: 2,
          backgroundColor: '#ef4444',
          borderRadius: 8,
          minWidth: 16,
          height: 16,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 3.5,
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.card,
        }}>
          <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: '900', lineHeight: 10 }}>
            {badgeCount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// Custom Symmetrical TabBar to ensure 100% perfect vertical & horizontal centering
function CustomTabBar({ state, descriptors, navigation, colors, unreadCount }: any) {
  return (
    <View style={{
      position: 'absolute',
      bottom: 18,
      left: 18,
      right: 18,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
    }}>
      {state.routes.map((route: any, index: number) => {
        // Strictly show only the main tabs in the bottom bar
        const ALLOWED_TABS = ['index', 'history', 'notifications', 'loyalty'];
        if (!ALLOWED_TABS.includes(route.name)) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let IconComponent = Home;
        if (route.name === 'history') IconComponent = Ticket;
        else if (route.name === 'notifications') IconComponent = Bell;
        else if (route.name === 'loyalty') IconComponent = User;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.85}
            style={{
              flex: 1,
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TabIcon
              Icon={IconComponent}
              focused={isFocused}
              colors={colors}
              badgeCount={route.name === 'notifications' ? unreadCount : undefined}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const colors = useTheme();
  const { t } = useTranslation();
  const unreadCount = useAuthStore((state) => state.unreadNotificationsCount);
  const fetchUnreadCount = useAuthStore((state) => state.fetchUnreadCount);
  const user = useAuthStore((state) => state.user);

  React.useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // 30s polling
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchUnreadCount]);

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          colors={colors}
          unreadCount={unreadCount}
        />
      )}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 17,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabHistory'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabNotifications'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          title: t('tabAccount'),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="lookup"
        options={{
          href: null,
          title: t('tabLookup'),
          headerTitle: t('tabLookupHeader'),
          tabBarIcon: ({ color, size }) => <Search size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null,
          title: t('tabAccount'),
          headerTitle: t('tabAccount'),
          tabBarIcon: ({ color, size }) => <User size={size || 20} color={color} />,
        }}
      />
    </Tabs>
  );
}

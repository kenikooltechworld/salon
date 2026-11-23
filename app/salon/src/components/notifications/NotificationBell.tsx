import { useEffect } from "react";
import { Badge, Box, Button, HStack, IconButton, Menu, Portal, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuBell } from "react-icons/lu";
import { useNotificationStore } from "@/features/notifications";

export function NotificationBell() {
  const { items, unreadCount, loading, loaded, load, markRead, markAllRead, connectRealtime, disconnectRealtime } =
    useNotificationStore();

  useEffect(() => {
    connectRealtime();
    void load();
    return () => disconnectRealtime();
  }, [connectRealtime, disconnectRealtime, load]);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Box pos="relative">
          <IconButton aria-label="Notifications" variant="ghost" size="sm">
            <LuBell />
          </IconButton>
          {unreadCount > 0 && (
            <Badge
              pos="absolute"
              top="-1"
              right="-1"
              colorPalette="red"
              variant="solid"
              fontSize="2xs"
              minW="5"
              textAlign="center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="320px" maxW="360px">
            <HStack justify="space-between" px="3" py="2" borderBottomWidth="1px">
              <Text fontWeight="semibold" fontSize="sm">Notifications</Text>
              <Button size="xs" variant="ghost" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
                Mark all read
              </Button>
            </HStack>
            <Box maxH="360px" overflowY="auto">
              {loading && !loaded ? (
                <HStack justify="center" py="6"><Spinner size="sm" /></HStack>
              ) : items.length === 0 ? (
                <Text px="3" py="6" fontSize="sm" color="fg.muted" textAlign="center">No notifications</Text>
              ) : (
                <Stack gap="0">
                  {items.map((n) => (
                    <Box
                      key={n.id}
                      px="3"
                      py="2"
                      borderBottomWidth="1px"
                      bg={n.is_read ? "transparent" : "bg.muted"}
                      cursor={n.is_read ? "default" : "pointer"}
                      onClick={() => { if (!n.is_read) void markRead(n.id); }}
                    >
                      <Text fontSize="sm" fontWeight={n.is_read ? "normal" : "semibold"}>{n.title || n.notification_type}</Text>
                      <Text fontSize="xs" color="fg.muted">{n.content}</Text>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

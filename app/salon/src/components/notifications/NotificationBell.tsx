import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  IconButton,
  Portal,
  Skeleton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuBell, LuCalendar, LuCheckCheck, LuCircleAlert, LuFilter, LuScissors, LuWallet } from "react-icons/lu";
import {
  useNotificationStore,
  type NotificationCategory,
  type NotificationItem,
  type NotificationStatusFilter,
} from "@/features/notifications";

const STATUS_FILTERS: { value: NotificationStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const TYPE_FILTERS: { value: NotificationCategory; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "services", label: "Services" },
  { value: "appointments", label: "Appointments" },
  { value: "commissions", label: "Commissions" },
  { value: "system", label: "System" },
];

function typeIcon(type: string) {
  if (type.startsWith("service")) return LuScissors;
  if (type.startsWith("appointment")) return LuCalendar;
  if (type.startsWith("commission")) return LuWallet;
  return LuCircleAlert;
}

function typeLabel(type: string) {
  if (type.startsWith("service")) return "Service";
  if (type.startsWith("appointment")) return "Appointment";
  if (type.startsWith("commission")) return "Commission";
  return "System";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString();
}

function resolveNotificationPath(item: NotificationItem): string | null {
  const data = item.data ?? {};
  const serviceId = data.service_id;
  if (typeof serviceId === "string" && serviceId) return `/services/${serviceId}`;
  const appointmentId = data.appointment_id;
  if (typeof appointmentId === "string" && appointmentId) return `/dashboard`;
  const customerId = data.customer_id;
  if (typeof customerId === "string" && customerId) return `/customers`;
  const t = item.notification_type;
  if (t.startsWith("service")) return "/services";
  if (t.startsWith("appointment")) return "/dashboard";
  if (t.startsWith("commission")) return "/dashboard";
  return null;
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: (item: NotificationItem) => void }) {
  const Icon = typeIcon(item.notification_type);
  return (
    <Box
      as="button"
      w="full"
      textAlign="left"
      px="4"
      py="3"
      borderBottomWidth="1px"
      bg={item.is_read ? "transparent" : "brand.500/5"}
      _hover={{ bg: item.is_read ? "bg.muted" : "brand.500/10" }}
      transition="background 0.15s ease"
      onClick={() => onRead(item)}
    >
      <HStack align="start" gap="3">
        <Flex
          mt="0.5"
          boxSize="8"
          rounded="full"
          align="center"
          justify="center"
          bg={item.is_read ? "bg.muted" : "brand.500/15"}
          color={item.is_read ? "fg.muted" : "brand.600"}
          flexShrink="0"
        >
          <Icon size={15} />
        </Flex>
        <Box flex="1" minW="0">
          <HStack justify="space-between" gap="2" mb="0.5">
            <Text fontSize="sm" fontWeight={item.is_read ? "medium" : "semibold"} lineClamp="1">
              {item.title || typeLabel(item.notification_type)}
            </Text>
            {!item.is_read && <Box boxSize="2" rounded="full" bg="brand.500" flexShrink="0" />}
          </HStack>
          <Text fontSize="xs" color="fg.muted" lineClamp="2" mb="1.5">{item.content}</Text>
          <HStack gap="2" fontSize="xs" color="fg.muted">
            <Badge size="sm" variant="subtle" colorPalette={item.is_read ? "gray" : "blue"}>
              {typeLabel(item.notification_type)}
            </Badge>
            <Text>{formatTime(item.created_at)}</Text>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    items, unreadCount, loading, loadingMore, loaded, hasMore, error, filters,
    load, loadMore, setFilters, markRead, markAllRead,
  } = useNotificationStore();

  useEffect(() => {
    if (open && !loaded) void load({ reset: true });
  }, [open, loaded, load]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) void markRead(item.id);
    const path = resolveNotificationPath(item);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  const unreadLabel = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  return (
    <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="end" size="sm">
      <Drawer.Trigger asChild>
        <Box pos="relative">
          <IconButton aria-label="Open notifications" variant="ghost" size="sm">
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
              pointerEvents="none"
            >
              {unreadLabel}
            </Badge>
          )}
        </Box>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop
          bg="blackAlpha.500"
          data-state="open"
          _open={{ animation: "fade-in 0.25s ease-out" }}
          _closed={{ animation: "fade-out 0.2s ease-in" }}
        />
        <Drawer.Positioner>
          <Drawer.Content
            maxW="430px"
            w="full"
            data-state="open"
            _open={{ animation: "notification-drawer-in 0.38s cubic-bezier(0.22, 1, 0.36, 1)" }}
            _closed={{ animation: "notification-drawer-out 0.24s cubic-bezier(0.4, 0, 1, 1)" }}
          >
            <style>{`
              @keyframes notification-drawer-in {
                from { transform: translateX(100%); opacity: 0.96; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes notification-drawer-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0.96; }
              }
            `}</style>
            <Drawer.Header borderBottomWidth="1px" pr="12">
              <HStack justify="space-between" align="start">
                <Box>
                  <Drawer.Title>Notifications</Drawer.Title>
                  <Text fontSize="xs" color="fg.muted" mt="0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void markAllRead()}
                  disabled={unreadCount === 0}
                >
                  <LuCheckCheck /> Mark all read
                </Button>
              </HStack>
            </Drawer.Header>

            <Box px="4" py="3" borderBottomWidth="1px" bg="bg.panel">
              <HStack gap="2" mb="2" overflowX="auto" pb="1">
                {STATUS_FILTERS.map((f) => {
                  const active = filters.status === f.value;
                  return (
                    <Button
                      key={f.value}
                      size="xs"
                      variant={active ? "solid" : "outline"}
                      colorPalette={active ? "blue" : "gray"}
                      onClick={() => setFilters({ status: f.value })}
                      flexShrink="0"
                    >
                      {f.label}
                    </Button>
                  );
                })}
              </HStack>
              <HStack gap="2" overflowX="auto" pb="1">
                <HStack gap="1" color="fg.muted" fontSize="xs" flexShrink="0" pr="1">
                  <LuFilter /><Text>Type</Text>
                </HStack>
                {TYPE_FILTERS.map((f) => {
                  const active = filters.category === f.value;
                  return (
                    <Button
                      key={f.value}
                      size="xs"
                      variant={active ? "subtle" : "ghost"}
                      colorPalette={active ? "blue" : "gray"}
                      onClick={() => setFilters({ category: f.value })}
                      flexShrink="0"
                    >
                      {f.label}
                    </Button>
                  );
                })}
              </HStack>
            </Box>

            <Drawer.Body p="0" display="flex" flexDirection="column" minH="0">
              <Box flex="1" overflowY="auto">
                {loading && !loaded ? (
                  <Stack gap="0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <HStack key={i} px="4" py="3" gap="3" borderBottomWidth="1px">
                        <Skeleton boxSize="8" rounded="full" />
                        <Stack flex="1" gap="2">
                          <Skeleton h="3" w="60%" />
                          <Skeleton h="3" w="90%" />
                          <Skeleton h="3" w="35%" />
                        </Stack>
                      </HStack>
                    ))}
                  </Stack>
                ) : error ? (
                  <Stack px="4" py="10" align="center" gap="3">
                    <Text fontSize="sm" color="fg.error" textAlign="center">{error}</Text>
                    <Button size="sm" variant="outline" onClick={() => void load({ reset: true })}>Retry</Button>
                  </Stack>
                ) : items.length === 0 ? (
                  <Stack px="6" py="14" align="center" gap="2" textAlign="center">
                    <Flex boxSize="12" rounded="full" bg="bg.muted" align="center" justify="center" color="fg.muted">
                      <LuBell size={22} />
                    </Flex>
                    <Text fontWeight="medium">No notifications</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {filters.status !== "all" || filters.category !== "all"
                        ? "No notifications match the selected filters."
                        : "New activity will appear here."}
                    </Text>
                  </Stack>
                ) : (
                  <>
                    <Stack gap="0">
                      {items.map((n) => (
                        <NotificationRow key={n.id} item={n} onRead={handleNotificationClick} />
                      ))}
                    </Stack>
                    {hasMore && (
                      <Box p="4">
                        <Button w="full" variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                          {loadingMore ? <><Spinner size="xs" /> Loading</> : "Load more"}
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Drawer.Body>

            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" position="absolute" top="3" right="3" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

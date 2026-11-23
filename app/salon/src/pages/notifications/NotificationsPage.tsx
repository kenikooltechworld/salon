import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Container, Flex, Heading, HStack, Skeleton, Spinner, Stack, Text,
} from "@chakra-ui/react";
import { LuBell, LuCalendar, LuCheckCheck, LuCircleAlert, LuFilter, LuScissors, LuWallet } from "react-icons/lu";
import {
  useNotificationStore, type NotificationCategory, type NotificationItem, type NotificationStatusFilter,
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
  return date.toLocaleString();
}

function NotificationRow({ item, onOpen, onRead }: { item: NotificationItem; onOpen: (id: string) => void; onRead: (id: string) => void }) {
  const Icon = typeIcon(item.notification_type);
  return (
    <Box px="4" py="4" borderBottomWidth="1px" bg={item.is_read ? "transparent" : "brand.500/5"} _hover={{ bg: item.is_read ? "bg.muted" : "brand.500/10" }} transition="background 0.15s ease">
      <HStack align="start" gap="4">
        <Flex boxSize="10" rounded="full" align="center" justify="center" bg={item.is_read ? "bg.muted" : "brand.500/15"} color={item.is_read ? "fg.muted" : "brand.600"} flexShrink="0"><Icon size={18} /></Flex>
        <Box flex="1" minW="0" cursor="pointer" onClick={() => onOpen(item.id)}>
          <HStack justify="space-between" gap="3" mb="1">
            <HStack gap="2" minW="0">
              <Text fontWeight={item.is_read ? "medium" : "semibold"} lineClamp="1">{item.title || typeLabel(item.notification_type)}</Text>
              {!item.is_read && <Box boxSize="2" rounded="full" bg="brand.500" />}
            </HStack>
            <Text fontSize="xs" color="fg.muted" flexShrink="0">{formatTime(item.created_at)}</Text>
          </HStack>
          <Text fontSize="sm" color="fg.muted" lineClamp="2" mb="2">{item.content}</Text>
          <HStack gap="2">
            <Badge size="sm" variant="subtle">{typeLabel(item.notification_type)}</Badge>
            <Badge size="sm" variant="outline" colorPalette={item.is_read ? "gray" : "blue"}>{item.is_read ? "Read" : "Unread"}</Badge>
          </HStack>
        </Box>
        {!item.is_read && <Button size="xs" variant="ghost" onClick={() => onRead(item.id)}>Mark read</Button>}
      </HStack>
    </Box>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, loadingMore, loaded, hasMore, error, filters, load, loadMore, setFilters, markRead, markAllRead } = useNotificationStore();
  useEffect(() => { void load({ reset: !loaded }); }, [load, loaded]);

  return (
    <Container maxW="5xl" py="2">
      <Stack gap="6">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="4">
          <Box>
            <Heading size="lg">Notifications</Heading>
            <Text color="fg.muted" mt="1">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}</Text>
          </Box>
          <Button variant="outline" onClick={() => void markAllRead()} disabled={unreadCount === 0}><LuCheckCheck /> Mark all read</Button>
        </Flex>

        <Card.Root>
          <Card.Body p="4" borderBottomWidth="1px">
            <Stack gap="3">
              <HStack gap="2" flexWrap="wrap">
                {STATUS_FILTERS.map((f) => {
                  const active = filters.status === f.value;
                  return <Button key={f.value} size="sm" variant={active ? "solid" : "outline"} colorPalette={active ? "blue" : "gray"} onClick={() => setFilters({ status: f.value })}>{f.label}</Button>;
                })}
              </HStack>
              <HStack gap="2" flexWrap="wrap">
                <HStack gap="1" color="fg.muted" fontSize="sm"><LuFilter /><Text>Type</Text></HStack>
                {TYPE_FILTERS.map((f) => {
                  const active = filters.category === f.value;
                  return <Button key={f.value} size="sm" variant={active ? "subtle" : "ghost"} colorPalette={active ? "blue" : "gray"} onClick={() => setFilters({ category: f.value })}>{f.label}</Button>;
                })}
              </HStack>
            </Stack>
          </Card.Body>
          <Card.Body p="0">
            {loading && !loaded ? (
              <Stack gap="0">{Array.from({ length: 6 }).map((_, i) => (<HStack key={i} px="4" py="4" gap="4" borderBottomWidth="1px"><Skeleton boxSize="10" rounded="full" /><Stack flex="1" gap="2"><Skeleton h="4" w="40%" /><Skeleton h="3" w="90%" /><Skeleton h="3" w="25%" /></Stack></HStack>))}</Stack>
            ) : error ? (
              <Stack px="6" py="16" align="center" gap="3"><Text color="fg.error">{error}</Text><Button variant="outline" onClick={() => void load({ reset: true })}>Retry</Button></Stack>
            ) : items.length === 0 ? (
              <Stack px="6" py="16" align="center" gap="2" textAlign="center">
                <Flex boxSize="14" rounded="full" bg="bg.muted" align="center" justify="center" color="fg.muted"><LuBell size={24} /></Flex>
                <Text fontWeight="medium">No notifications</Text>
                <Text fontSize="sm" color="fg.muted">No notifications match the selected filters.</Text>
              </Stack>
            ) : (
              <>
                <Stack gap="0">{items.map((n) => (<NotificationRow key={n.id} item={n} onOpen={(id) => navigate(`/notifications/${id}`)} onRead={(id) => void markRead(id)} />))}</Stack>
                {hasMore && <Box p="4"><Button w="full" variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? <><Spinner size="xs" /> Loading</> : "Load more"}</Button></Box>}
              </>
            )}
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  );
}

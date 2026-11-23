import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Container, Flex, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft, LuCalendar, LuCheck, LuCircleAlert, LuExternalLink, LuScissors, LuWallet } from "react-icons/lu";
import { useNotificationStore, type NotificationItem } from "@/features/notifications";

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

function resolvePath(item: NotificationItem): string | null {
  const data = item.data ?? {};
  if (typeof data.service_id === "string" && data.service_id) return `/services/${data.service_id}`;
  if (typeof data.appointment_id === "string" && data.appointment_id) return "/dashboard";
  if (typeof data.customer_id === "string" && data.customer_id) return "/customers";
  if (item.notification_type.startsWith("service")) return "/services";
  if (item.notification_type.startsWith("commission")) return "/dashboard";
  return null;
}

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, getById, markRead } = useNotificationStore();
  const local = useMemo(() => items.find((n) => n.id === id) ?? null, [items, id]);
  const [item, setItem] = useState<NotificationItem | null>(local);
  const [loading, setLoading] = useState(!local);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (local) setItem(local);
  }, [local]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(!local);
    setError(null);
    void (async () => {
      const found = await getById(id);
      if (!active) return;
      if (!found) { setError("Notification not found"); setLoading(false); return; }
      setItem(found);
      setLoading(false);
      if (!found.is_read) await markRead(found.id).catch(() => undefined);
    })();
    return () => { active = false; };
  }, [id, getById, markRead, local]);

  if (loading) {
    return <Container maxW="4xl" py="2"><Stack gap="4"><Skeleton h="10" w="40" /><Skeleton h="48" /></Stack></Container>;
  }

  if (error || !item) {
    return (
      <Container maxW="4xl" py="2">
        <Stack gap="4" align="start">
          <Button variant="ghost" onClick={() => navigate("/notifications")}><LuArrowLeft /> Back to notifications</Button>
          <Card.Root w="full"><Card.Body><Text color="fg.error">{error || "Notification not found"}</Text></Card.Body></Card.Root>
        </Stack>
      </Container>
    );
  }

  const Icon = typeIcon(item.notification_type);
  const path = resolvePath(item);
  const dataEntries = Object.entries(item.data ?? {});

  return (
    <Container maxW="4xl" py="2">
      <Stack gap="6">
        <Button variant="ghost" alignSelf="start" onClick={() => navigate("/notifications")}><LuArrowLeft /> Back to notifications</Button>
        <Card.Root>
          <Card.Body>
            <Stack gap="5">
              <HStack align="start" gap="4">
                <Flex boxSize="12" rounded="full" align="center" justify="center" bg="brand.500/15" color="brand.600" flexShrink="0"><Icon size={22} /></Flex>
                <Box flex="1">
                  <HStack gap="2" mb="2" flexWrap="wrap">
                    <Badge variant="subtle">{typeLabel(item.notification_type)}</Badge>
                    <Badge variant="outline" colorPalette={item.is_read ? "gray" : "blue"}>{item.is_read ? "Read" : "Unread"}</Badge>
                  </HStack>
                  <Heading size="lg">{item.title || typeLabel(item.notification_type)}</Heading>
                  <Text color="fg.muted" mt="1">{new Date(item.created_at).toLocaleString()}</Text>
                </Box>
              </HStack>

              <Box borderWidth="1px" rounded="md" p="4" bg="bg.muted/30">
                <Text whiteSpace="pre-wrap">{item.content}</Text>
              </Box>

              {dataEntries.length > 0 && (
                <Box>
                  <Text fontWeight="medium" mb="3">Details</Text>
                  <Stack gap="2">
                    {dataEntries.map(([k, v]) => (
                      <HStack key={k} justify="space-between" align="start" gap="4" borderBottomWidth="1px" pb="2">
                        <Text fontSize="sm" color="fg.muted">{k}</Text>
                        <Text fontSize="sm" textAlign="right" maxW="70%" whiteSpace="pre-wrap">{typeof v === "string" ? v : JSON.stringify(v)}</Text>
                      </HStack>
                    ))}
                  </Stack>
                </Box>
              )}

              <HStack gap="3" flexWrap="wrap">
                {!item.is_read && <Button variant="outline" onClick={() => void markRead(item.id)}><LuCheck /> Mark as read</Button>}
                {path && <Button onClick={() => navigate(path)}><LuExternalLink /> Open related item</Button>}
              </HStack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  );
}

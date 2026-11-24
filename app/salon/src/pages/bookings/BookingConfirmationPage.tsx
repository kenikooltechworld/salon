import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Card, Heading, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { LuCalendarCheck2, LuCircleCheck } from "react-icons/lu";
import { formatNaira } from "@/components/ui/naira";

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = (location.state as any)?.booking;

  useEffect(() => { if (!booking) navigate("/bookings", { replace: true }); }, [booking, navigate]);
  if (!booking) return null;

  const start = booking.start_time ? new Date(booking.start_time) : null;
  const ref = String(booking.id || "").slice(-8).toUpperCase();

  return <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" p="4">
    <Card.Root maxW="lg" w="full"><Card.Body>
      <Stack gap="6" align="center" textAlign="center" py="4">
        <Box color="green.fg" bg="green.subtle" rounded="full" p="4"><Icon fontSize="4xl"><LuCircleCheck /></Icon></Box>
        <Box><Heading size="xl">Booking Confirmed</Heading><Text color="fg.muted" mt="2">The appointment has been successfully scheduled.</Text></Box>
        <Card.Root w="full" variant="subtle"><Card.Body gap="2"><Text fontSize="xs" color="fg.muted">Booking reference</Text><Text fontFamily="mono" fontWeight="bold" fontSize="lg">{ref}</Text></Card.Body></Card.Root>
        <Stack w="full" gap="2" textAlign="left" bg="bg.subtle" rounded="md" p="4" fontSize="sm">
          {start && <HStack justify="space-between"><Text color="fg.muted">Date</Text><Text fontWeight="medium">{start.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</Text></HStack>}
          {start && <HStack justify="space-between"><Text color="fg.muted">Time</Text><Text fontWeight="medium">{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></HStack>}
          <HStack justify="space-between"><Text color="fg.muted">Status</Text><Text fontWeight="medium" textTransform="capitalize">{String(booking.status || "scheduled").replace(/_/g, " ")}</Text></HStack>
          {booking.price != null && <HStack justify="space-between"><Text color="fg.muted">Price</Text><Text fontWeight="medium">{formatNaira(booking.price)}</Text></HStack>}
        </Stack>
        <HStack gap="3" w="full" flexWrap="wrap"><Button flex="1" colorPalette="brand" onClick={() => navigate("/bookings")}><LuCalendarCheck2 /> View All Bookings</Button><Button flex="1" variant="outline" onClick={() => navigate("/bookings/new")}>Create Another</Button></HStack>
      </Stack>
    </Card.Body></Card.Root>
  </Box>;
}

import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Grid, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { customersApi, useCustomer, useCustomerHistory } from "@/features/customers";

export default function AppointmentDetailPage() {
  const { id, appointmentId } = useParams<{ id: string; appointmentId: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: cLoading } = useCustomer(id);
  const historyItemQ = useQuery({
    queryKey: ["customers", "history-item", id, appointmentId],
    queryFn: async () => (await customersApi.getHistoryItem(id!, appointmentId!)).data,
    enabled: !!id && !!appointmentId,
  });
  const { data: historyResp, isLoading: hLoading } = useCustomerHistory(id, { page: 1, page_size: 100 }, { enabled: !historyItemQ.data && !historyItemQ.isLoading });
  const appt = (historyItemQ.data as any) || (historyResp?.history || []).find((h) => h.id === appointmentId || h.appointment_id === appointmentId);

  if (cLoading || historyItemQ.isLoading || (!appt && hLoading)) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="48" /></Stack>;
  if (!customer || !appt) return <Card.Root><Card.Body><Text>Appointment not found</Text><Button mt="3" onClick={() => navigate(`/customers/${id}/appointments`)}>Back</Button></Card.Body></Card.Root>;

  return (
    <Stack gap="6">
      <HStack><Button variant="ghost" onClick={() => navigate(`/customers/${id}/appointments`)}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Appointment Details</Heading><Text color="fg.muted">{customer.first_name} {customer.last_name}</Text></Box></HStack>
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2,1fr)" }} gap="6">
        <Card.Root><Card.Body><Heading size="md" mb="4">Appointment Information</Heading><Stack gap="3">
          <Box><Text fontSize="xs" color="fg.muted">Service</Text><Text>{appt.service_name}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Staff Member</Text><Text>{appt.staff_name}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Date</Text><Text>{appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString() : "-"}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Time</Text><Text>{appt.appointment_time || "-"}</Text></Box>
          {appt.status && <Box><Text fontSize="xs" color="fg.muted">Status</Text><Badge>{appt.status}</Badge></Box>}
        </Stack></Card.Body></Card.Root>
        <Card.Root><Card.Body><Heading size="md" mb="4">Additional Information</Heading><Stack gap="3">
          {appt.notes && <Box><Text fontSize="xs" color="fg.muted">Notes</Text><Text>{appt.notes}</Text></Box>}
          {appt.rating > 0 && <Box><Text fontSize="xs" color="fg.muted">Rating</Text><Badge>{appt.rating}/5</Badge></Box>}
          {appt.feedback && <Box><Text fontSize="xs" color="fg.muted">Feedback</Text><Text>{appt.feedback}</Text></Box>}
          <Box><Text fontSize="xs" color="fg.muted">Appointment ID</Text><Text fontSize="sm" fontFamily="mono">{appt.appointment_id}</Text></Box>
        </Stack></Card.Body></Card.Root>
      </Grid>
    </Stack>
  );
}

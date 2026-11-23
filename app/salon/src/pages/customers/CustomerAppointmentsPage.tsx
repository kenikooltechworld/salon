import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Flex, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { useCustomer, useCustomerHistory } from "@/features/customers";

export default function CustomerAppointmentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: cLoading } = useCustomer(id);
  const { data: historyResp, isLoading: hLoading } = useCustomerHistory(id, { page: 1, page_size: 50 });
  const history = historyResp?.history || [];

  return (
    <Stack gap="6">
      <HStack><Button variant="ghost" onClick={() => navigate(`/customers/${id}`)}><LuArrowLeft /> Back</Button><Box><Heading size="xl">{customer ? `${customer.first_name} ${customer.last_name}` : "Customer"}</Heading><Text color="fg.muted">Appointment History</Text></Box></HStack>
      <Card.Root><Card.Body>
        {cLoading || hLoading ? <Stack gap="3">{[...Array(5)].map((_, i) => <Skeleton key={i} h="14" />)}</Stack> : history.length === 0 ? <Text color="fg.muted">No appointments found</Text> : <Stack gap="3">
          {history.map((a) => (
            <Box key={a.id} p="4" borderWidth="1px" rounded="md" cursor="pointer" _hover={{ bg: "bg.muted" }} onClick={() => navigate(`/customers/${id}/appointments/${a.id}`)}>
              <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
                <Box><Text fontWeight="medium">{a.service_name}</Text><Text fontSize="sm" color="fg.muted">with {a.staff_name}</Text>{a.notes && <Text fontSize="sm" color="fg.muted" mt="1">{a.notes}</Text>}</Box>
                <Box textAlign={{ md: "right" }}><Text fontSize="sm">{a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : "-"}</Text><Text fontSize="xs" color="fg.muted">{a.appointment_time}</Text>{a.rating > 0 && <Badge mt="1">Rating: {a.rating}/5</Badge>}</Box>
              </Flex>
            </Box>
          ))}
        </Stack>}
      </Card.Body></Card.Root>
    </Stack>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, Image, Portal, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { formatNaira } from "@/components/ui/naira";
import { useAuthStore } from "@/features/auth";
import { ImageLightbox } from "@/components/services/ImageLightbox";
import { StaffFormDialog } from "@/components/staff/StaffFormDialog";
import { useDeleteStaff, useStaffActivity, useStaffMember, useStaffMetrics, useStaffPerformance, useStaffReviews } from "@/features/staff";
import { StaffAvailabilityManager } from "./StaffAvailabilityManager";

const canManage = (role?: string) => ["owner", "admin", "manager"].includes((role || "").toLowerCase());
const statusColor = (s: string) => s === "active" ? "green" : s === "inactive" ? "gray" : s === "on_leave" ? "orange" : "red";
const label = (s: string) => s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const role = currentUser?.role;
  const manage = canManage(role);
  const { data: staff, isLoading } = useStaffMember(staffId);
  const metricsQ = useStaffMetrics(staffId);
  const perfQ = useStaffPerformance(staffId);
  const reviewsQ = useStaffReviews(staffId, 10);
  const activityQ = useStaffActivity(staffId, 10);
  const del = useDeleteStaff();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (!staff) return <Card.Root><Card.Body><Text>Staff member not found.</Text><Button mt="3" onClick={() => navigate("/staff")}>Back</Button></Card.Body></Card.Root>;

  const onDelete = async () => {
    try { await del.mutateAsync(staff.id); toaster.create({ title: "Staff deleted", type: "success" }); navigate("/staff"); }
    catch (e: any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Stack gap="6">
    <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
      <HStack align="start"><Button variant="ghost" onClick={() => navigate("/staff")}><LuArrowLeft /> Back</Button>
        <Box><HStack gap="3">{staff.profile_image_url && <Image src={staff.profile_image_url} alt="" boxSize="14" rounded="md" objectFit="cover" cursor="zoom-in" onClick={() => setLightbox(staff.profile_image_url!)} />}<Box><Heading size="xl">{staff.firstName} {staff.lastName}</Heading><Text color="fg.muted">{staff.email}</Text></Box></HStack><Badge mt="2" colorPalette={statusColor(staff.status)}>{label(staff.status)}</Badge></Box>
      </HStack>
      {manage && <HStack><Button variant="outline" onClick={() => setEditOpen(true)}><LuPencil /> Edit</Button><Button colorPalette="red" variant="outline" onClick={() => setDelOpen(true)}><LuTrash2 /> Delete</Button></HStack>}
    </Flex>

    <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
      <Stack gap="6">
        <Card.Root><Card.Body><Heading size="md" mb="4">Profile</Heading><Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
          <Box><Text fontSize="xs" color="fg.muted">Phone</Text><Text>{staff.phone || "N/A"}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Hire Date</Text><Text>{staff.hire_date ? new Date(staff.hire_date).toLocaleDateString() : "N/A"}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Payment</Text><Text>{staff.payment_type === "commission" ? `${Number(staff.payment_rate)}%` : formatNaira(staff.payment_rate)} ({staff.payment_type})</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Public Booking</Text><Badge colorPalette={staff.is_available_for_public_booking ? "green" : "gray"}>{staff.is_available_for_public_booking ? "Enabled" : "Disabled"}</Badge></Box>
        </Grid>{staff.bio && <Box mt="4"><Text fontSize="xs" color="fg.muted">Bio</Text><Text whiteSpace="pre-wrap">{staff.bio}</Text></Box>}</Card.Body></Card.Root>

        <Card.Root><Card.Body><Heading size="md" mb="3">Specialties & Certifications</Heading>
          <Text fontSize="sm" fontWeight="medium" mb="2">Specialties</Text><HStack gap="2" wrap="wrap" mb="4">{(staff.specialties || []).map((s) => <Badge key={s} colorPalette="blue">{s}</Badge>)}{!(staff.specialties || []).length && <Text fontSize="sm" color="fg.muted">None</Text>}</HStack>
          <Text fontSize="sm" fontWeight="medium" mb="2">Certifications</Text><HStack gap="2" wrap="wrap">{(staff.certifications || []).map((s) => <Badge key={s} colorPalette="purple">{s}</Badge>)}{!(staff.certifications || []).length && <Text fontSize="sm" color="fg.muted">None</Text>}</HStack>
        </Card.Body></Card.Root>

        <Card.Root><Card.Body><Heading size="md" mb="3">Performance</Heading>{perfQ.isLoading ? <Skeleton h="24" /> : <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(4,1fr)" }} gap="4">
          <Box><Text fontSize="xs" color="fg.muted">Avg Rating</Text><Heading size="md">{perfQ.data?.averageRating ?? 0}</Heading></Box>
          <Box><Text fontSize="xs" color="fg.muted">Reviews</Text><Heading size="md">{perfQ.data?.totalReviews ?? 0}</Heading></Box>
          <Box><Text fontSize="xs" color="fg.muted">Completed</Text><Heading size="md">{perfQ.data?.appointmentsCompleted ?? 0}</Heading></Box>
          <Box><Text fontSize="xs" color="fg.muted">Earnings</Text><Heading size="md">{formatNaira(perfQ.data?.totalEarnings)}</Heading></Box>
        </Grid>}</Card.Body></Card.Root>

        <Card.Root><Card.Body><Heading size="md" mb="3">Recent Reviews</Heading><Stack gap="3">{(reviewsQ.data?.reviews || []).map((r: any) => <Box key={r.id} borderBottomWidth="1px" pb="3"><Flex justify="space-between"><Text fontWeight="medium">{r.customerName || "Customer"}</Text><Badge>{r.rating}/5</Badge></Flex><Text fontSize="sm" color="fg.muted">{r.feedback || "No feedback"}</Text></Box>)}{!(reviewsQ.data?.reviews || []).length && <Text color="fg.muted">No reviews yet.</Text>}</Stack></Card.Body></Card.Root>
      </Stack>

      <Stack gap="6">
        <Card.Root><Card.Body><Heading size="md" mb="4">Metrics</Heading>{metricsQ.isLoading ? <Skeleton h="24" /> : <Stack gap="3">
          <Flex justify="space-between"><Text color="fg.muted">Today Appointments</Text><Text fontWeight="semibold">{metricsQ.data?.todayAppointments ?? 0}</Text></Flex>
          <Flex justify="space-between"><Text color="fg.muted">Upcoming Shifts</Text><Text fontWeight="semibold">{metricsQ.data?.upcomingShifts ?? 0}</Text></Flex>
          <Flex justify="space-between"><Text color="fg.muted">Pending Time Off</Text><Text fontWeight="semibold">{metricsQ.data?.pendingTimeOff ?? 0}</Text></Flex>
          <Flex justify="space-between"><Text color="fg.muted">This Week Earnings</Text><Text fontWeight="semibold">{formatNaira(metricsQ.data?.earningsSummary?.thisWeek)}</Text></Flex>
        </Stack>}</Card.Body></Card.Root>
        <Card.Root><Card.Body><Heading size="md" mb="4">Activity Feed</Heading><Stack gap="3">{(activityQ.data?.events || []).map((e: any) => <Box key={e.id} borderBottomWidth="1px" pb="2"><Text fontSize="sm" fontWeight="medium">{e.title}</Text><Text fontSize="xs" color="fg.muted">{e.description}</Text></Box>)}{!(activityQ.data?.events || []).length && <Text fontSize="sm" color="fg.muted">No recent activity.</Text>}</Stack></Card.Body></Card.Root>
      </Stack>
    </Grid>

    <StaffAvailabilityManager
      staffId={staff.id}
      canManage={manage || (role?.toLowerCase() === "staff" && staff.user_id === currentUser?.id)}
    />
    <StaffFormDialog open={editOpen} onOpenChange={setEditOpen} initial={staff} />
    <Dialog.Root open={delOpen} onOpenChange={(e) => setDelOpen(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
      <Dialog.Header><Dialog.Title>Delete Staff Member</Dialog.Title></Dialog.Header><Dialog.Body><Text>Delete <b>{staff.firstName} {staff.lastName}</b>? This cannot be undone.</Text></Dialog.Body>
      <Dialog.Footer><Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button><Button colorPalette="red" loading={del.isPending} onClick={onDelete}>Delete</Button></Dialog.Footer>
    </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    {lightbox && <ImageLightbox isOpen={!!lightbox} imageUrl={lightbox} alt={staff.firstName} onClose={() => setLightbox(null)} />}
  </Stack>;
}

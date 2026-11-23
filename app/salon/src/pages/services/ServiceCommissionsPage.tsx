import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Card, Flex, Grid, Heading, HStack, Input, NativeSelect, Skeleton, Stack, Table, Text } from "@chakra-ui/react";
import { LuArrowLeft, LuCheck, LuDollarSign } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useCommissionSummary, useMarkCommissionPaid, useMarkCommissionsPaidBatch, usePendingCommissions, useStaffCommissions } from "@/features/services";
import { apiClient } from "@/lib/api";

const fmt = (v:any) => `₦${Number(v||0).toLocaleString()}`;
const canManage = (role?: string) => ["owner","admin","manager"].includes((role||"").toLowerCase());

export default function ServiceCommissionsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const staffQ = useQuery({ queryKey: ["staff","all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const q = useMemo(() => ({ status: status||undefined, start_date: startDate?`${startDate}T00:00:00Z`:undefined, end_date: endDate?`${endDate}T23:59:59Z`:undefined, page:1, page_size:50 }), [status,startDate,endDate]);
  const listQ = useStaffCommissions(staffId || undefined, q);
  const summaryQ = useCommissionSummary(staffId || undefined, { start_date:q.start_date, end_date:q.end_date });
  const pendingQ = usePendingCommissions(staffId || undefined);
  const markOne = useMarkCommissionPaid();
  const markBatch = useMarkCommissionsPaidBatch();

  const commissions = listQ.data?.commissions || [];
  const summary = summaryQ.data?.summary;
  const pending = pendingQ.data;
  const toggle = (id:string) => setSelected((p)=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const markSelected = async () => {
    if (!staffId || selected.length===0) return;
    try { await markBatch.mutateAsync({ staffId, commissionIds: selected }); setSelected([]); toaster.create({ title:"Commissions marked paid", type:"success" }); }
    catch(e:any){ toaster.create({ title:"Failed", description:e?.response?.data?.detail||e?.message, type:"error" }); }
  };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base:"column", md:"row" }}>
      <HStack><Button variant="ghost" onClick={()=>navigate("/services")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Service Commissions</Heading><Text color="fg.muted">Track, summarize, and mark service commissions paid</Text></Box></HStack>
    </Flex>

    <Card.Root><Card.Body><Grid templateColumns={{ base:"1fr", md:"repeat(4,1fr)" }} gap="4">
      <Box><Text fontSize="sm" mb="1">Staff member</Text><NativeSelect.Root><NativeSelect.Field value={staffId} onChange={(e)=>{setStaffId(e.target.value); setSelected([]);}}><option value="">Select staff</option>{staff.map((s:any)=>{ const name=[s.first_name,s.last_name].filter(Boolean).join(" ") || s.email || s.id; return <option key={s.id} value={s.id}>{name}</option>; })}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
      <Box><Text fontSize="sm" mb="1">Status</Text><NativeSelect.Root><NativeSelect.Field value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All</option><option value="pending">Pending</option><option value="paid">Paid</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
      <Box><Text fontSize="sm" mb="1">Start date</Text><Input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} /></Box>
      <Box><Text fontSize="sm" mb="1">End date</Text><Input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} /></Box>
    </Grid></Card.Body></Card.Root>

    {!staffId ? <Card.Root><Card.Body><Text color="fg.muted">Select a staff member to view commissions.</Text></Card.Body></Card.Root> : <>
      <Grid templateColumns={{ base:"1fr", md:"repeat(4,1fr)" }} gap="4">
        {[["Total earned", summary?.total_earned],["Pending", summary?.total_pending],["Paid", summary?.total_paid],["Services", summary?.total_services]].map(([label,val])=> <Card.Root key={String(label)}><Card.Body><Text fontSize="sm" color="fg.muted">{label}</Text><Heading size="lg">{label==="Services"?Number(val||0):fmt(val)}</Heading></Card.Body></Card.Root>)}
      </Grid>

      <Card.Root><Card.Body>
        <Flex justify="space-between" align="center" mb="4" gap="3" direction={{ base:"column", md:"row" }}>
          <Box><Heading size="md">Commissions</Heading><Text fontSize="sm" color="fg.muted">Pending total: {fmt(pending?.total_pending)} • {pending?.commissions?.length||0} pending entries</Text></Box>
          {manage && <Button colorPalette="brand" disabled={selected.length===0} loading={markBatch.isPending} onClick={markSelected}><LuCheck /> Mark selected paid ({selected.length})</Button>}
        </Flex>
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header><Table.Row><Table.ColumnHeader></Table.ColumnHeader><Table.ColumnHeader>Date</Table.ColumnHeader><Table.ColumnHeader>Service</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Service Price</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Rate</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Commission</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader></Table.ColumnHeader></Table.Row></Table.Header>
            <Table.Body>
              {listQ.isLoading ? <Table.Row><Table.Cell colSpan={8}><Skeleton h="10" /></Table.Cell></Table.Row>
              : commissions.map((c:any) => <Table.Row key={c.id}>
                <Table.Cell><input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggle(c.id)} disabled={c.status!=="pending" || !manage} /></Table.Cell>
                <Table.Cell>{new Date(c.earned_date).toLocaleDateString()}</Table.Cell>
                <Table.Cell><Text fontSize="sm">{c.service_name || c.service_id}</Text></Table.Cell>
                <Table.Cell textAlign="end">{fmt(c.service_price)}</Table.Cell>
                <Table.Cell textAlign="end">{Number(c.commission_percentage)}%</Table.Cell>
                <Table.Cell textAlign="end" fontWeight="medium">{fmt(c.commission_amount)}</Table.Cell>
                <Table.Cell><Badge colorPalette={c.status==="paid"?"green":"yellow"}>{c.status}</Badge></Table.Cell>
                <Table.Cell textAlign="end">{manage && c.status==="pending" && <Button size="xs" variant="outline" loading={markOne.isPending} onClick={async()=>{ try{ await markOne.mutateAsync(c.id); toaster.create({title:"Marked paid", type:"success"});}catch(e:any){toaster.create({title:"Failed", description:e?.response?.data?.detail||e?.message, type:"error"});} }}><LuDollarSign /> Mark paid</Button>}</Table.Cell>
              </Table.Row>)}
              {!listQ.isLoading && commissions.length===0 && <Table.Row><Table.Cell colSpan={8}><Text color="fg.muted" py="4">No commissions found.</Text></Table.Cell></Table.Row>}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card.Body></Card.Root>
    </>}
  </Stack>;
}

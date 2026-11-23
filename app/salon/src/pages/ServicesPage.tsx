import { useEffect, useState } from "react";
import { Box, Button, Heading, HStack, Input, Table, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";

interface Service {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
  category: string;
  is_active: boolean;
}

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", duration_minutes: 30, price: "25.00", category: "General" });
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/services");
      setItems(data.services ?? data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/services", form);
      setForm({ name: "", duration_minutes: 30, price: "25.00", category: "General" });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Create failed");
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/services/${id}`);
    await load();
  };

  return (
    <Box maxW="4xl" mx="auto" mt={8} p={6}>
      <Heading mb={4}>Services</Heading>
      {error && <Text color="red.500">{error}</Text>}
      <form onSubmit={create}>
        <HStack gap={2} mb={4} flexWrap="wrap">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" placeholder="Duration" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          <Input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Button type="submit">Add</Button>
        </HStack>
      </form>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>Duration</Table.ColumnHeader>
            <Table.ColumnHeader>Price</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((s) => (
            <Table.Row key={s.id}>
              <Table.Cell>{s.name}</Table.Cell>
              <Table.Cell>{s.category}</Table.Cell>
              <Table.Cell>{s.duration_minutes}m</Table.Cell>
              <Table.Cell>{s.price}</Table.Cell>
              <Table.Cell>
                <Button size="xs" colorPalette="red" onClick={() => remove(s.id)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

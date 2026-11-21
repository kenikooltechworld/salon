import { useEffect, useState } from "react";
import { Box, Button, Heading, HStack, Input, Table, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/customers");
      setItems(data);
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
      await api.post("/customers", form);
      setForm({ first_name: "", last_name: "", email: "", phone: "" });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Create failed");
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/customers/${id}`);
    await load();
  };

  return (
    <Box maxW="4xl" mx="auto" mt={8} p={6}>
      <Heading mb={4}>Customers</Heading>
      {error && <Text color="red.500">{error}</Text>}
      <form onSubmit={create}>
        <HStack gap={2} mb={4} flexWrap="wrap">
          <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button type="submit">Add</Button>
        </HStack>
      </form>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Email</Table.ColumnHeader>
            <Table.ColumnHeader>Phone</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((c) => (
            <Table.Row key={c.id}>
              <Table.Cell>{c.first_name} {c.last_name}</Table.Cell>
              <Table.Cell>{c.email}</Table.Cell>
              <Table.Cell>{c.phone}</Table.Cell>
              <Table.Cell>
                <Button size="xs" colorPalette="red" onClick={() => remove(c.id)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

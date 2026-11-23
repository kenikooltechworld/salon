import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, HStack, Image, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react";
import { motion } from "motion/react";
import { LuClock, LuMail, LuMapPin, LuPhone, LuSparkles } from "react-icons/lu";
import { Link } from "react-router-dom";
import { usePublicServiceAddons, usePublicServicePackages, usePublicServices, usePublicTenant } from "@/hooks/usePublicTenant";

function money(v: unknown) {
  const n = Number(v || 0);
  return `₦${n.toLocaleString()}`;
}

export default function PublicBookingPage() {
  const tenantQ = usePublicTenant();
  const servicesQ = usePublicServices();
  const packagesQ = usePublicServicePackages();
  const addonsQ = usePublicServiceAddons();
  const tenant = tenantQ.data;
  const services = (servicesQ.data?.services || []).filter((s: any) => s.is_active && s.is_published);
  const packages = (packagesQ.data?.packages || []).filter((p: any) => p.is_active);
  const addons = (addonsQ.data?.addons || []).filter((a: any) => a.is_active);

  if (tenantQ.isLoading) {
    return <Container maxW="7xl" py="10"><Stack gap="4"><Skeleton h="16" /><Skeleton h="64" /><Skeleton h="40" /></Stack></Container>;
  }

  if (tenantQ.isError || !tenant) {
    return (
      <Box minH="100vh" bg="bg.canvas" display="grid" placeItems="center" p="6">
        <Card.Root maxW="lg" w="full"><Card.Body><Stack gap="3" textAlign="center">
          <Heading size="lg">Salon Not Found</Heading>
          <Text color="fg.muted">The salon you are looking for is unavailable or not published.</Text>
        </Stack></Card.Body></Card.Root>
      </Box>
    );
  }

  return (
    <Box bg="bg.canvas" minH="100vh">
      <Box borderBottomWidth="1px" bg="bg.panel" position="sticky" top="0" zIndex="10" backdropFilter="blur(8px)">
        <Container maxW="7xl" py="4">
          <Flex justify="space-between" align="center" gap="4">
            <HStack gap="3">
              {tenant.logo_url ? <Image src={tenant.logo_url} alt={tenant.name} boxSize="10" rounded="lg" objectFit="cover" /> : <Box boxSize="10" rounded="lg" bg="brand.500" />}
              <Box>
                <Heading size="md" lineClamp="1">{tenant.name}</Heading>
                <Text fontSize="xs" color="fg.muted">{tenant.subdomain}.kenikoolsalon.com</Text>
              </Box>
            </HStack>
            <HStack>
              <Button asChild variant="outline"><Link to="/public/login">Sign in</Link></Button>
              <Button asChild colorPalette="brand"><a href="#services">Book now</a></Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={{ base: "10", md: "16" }}>
        <Grid templateColumns={{ base: "1fr", lg: "1.1fr 0.9fr" }} gap="10" alignItems="center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Stack gap="6">
            <Badge w="fit" colorPalette="brand" variant="subtle"><HStack gap="1"><LuSparkles /><Text>Online booking</Text></HStack></Badge>
            <Heading size={{ base: "2xl", md: "4xl" }} lineHeight="1.1">{tenant.description || `Book your next appointment at ${tenant.name}`}</Heading>
            <Text color="fg.muted" fontSize="lg">Browse services, packages, and add-ons. Fast booking, clear pricing, and professional service.</Text>
            <HStack gap="3" flexWrap="wrap">
              <Button asChild size="lg" colorPalette="brand"><a href="#services">Explore services</a></Button>
              {tenant.phone && <Button asChild size="lg" variant="outline"><a href={`tel:${tenant.phone}`}><LuPhone /> Call</a></Button>}
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 3 }} gap="3">
              <Card.Root variant="subtle"><Card.Body><Text fontSize="xs" color="fg.muted">Services</Text><Heading size="lg">{services.length}</Heading></Card.Body></Card.Root>
              <Card.Root variant="subtle"><Card.Body><Text fontSize="xs" color="fg.muted">Packages</Text><Heading size="lg">{packages.length}</Heading></Card.Body></Card.Root>
              <Card.Root variant="subtle"><Card.Body><Text fontSize="xs" color="fg.muted">Add-ons</Text><Heading size="lg">{addons.length}</Heading></Card.Body></Card.Root>
            </SimpleGrid>
          </Stack></motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Card.Root overflow="hidden">
            <Card.Body>
              <Stack gap="4">
                <Heading size="md">Contact & location</Heading>
                {tenant.email && <HStack><LuMail /><Text>{tenant.email}</Text></HStack>}
                {tenant.phone && <HStack><LuPhone /><Text>{tenant.phone}</Text></HStack>}
                <HStack align="start"><LuMapPin /><Text color="fg.muted">Book online and we’ll confirm your appointment details.</Text></HStack>
                <Box borderTopWidth="1px" pt="4">
                  <Text fontSize="sm" color="fg.muted">Public booking is enabled for published services. Online payment/booking flow can be connected to this tenant context.</Text>
                </Box>
              </Stack>
            </Card.Body>
          </Card.Root></motion.div>
        </Grid>
      </Container>

      <Box id="services" py="14">
        <Container maxW="7xl"><Stack gap="6">
          <Box><Heading size="xl">Services</Heading><Text color="fg.muted">Choose from available services.</Text></Box>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
            {services.map((s: any) => (
              <motion.div key={s.id} whileHover={{ y: -3 }}><Card.Root variant="outline">
                <Card.Body><Stack gap="3">
                  <Flex justify="space-between" gap="3"><Heading size="md" lineClamp="1">{s.name}</Heading><Badge colorPalette="green">{money(s.price)}</Badge></Flex>
                  <Text color="fg.muted" fontSize="sm" lineClamp="3">{s.public_description || s.description || "Professional salon service."}</Text>
                  <HStack fontSize="sm" color="fg.muted"><LuClock /><Text>{s.duration_minutes} min</Text></HStack>
                  <Button colorPalette="brand" variant="outline" disabled={!s.allow_public_booking}>{s.allow_public_booking ? "Book this service" : "Booking unavailable"}</Button>
                </Stack></Card.Body>
              </Card.Root></motion.div>
            ))}
            {services.length === 0 && <Card.Root><Card.Body><Text color="fg.muted">No published services yet.</Text></Card.Body></Card.Root>}
          </SimpleGrid>
        </Stack></Container>
      </Box>

      <Box py="14" bg="bg.subtle">
        <Container maxW="7xl"><Stack gap="6">
          <Box><Heading size="xl">Packages</Heading><Text color="fg.muted">Value bundles for frequent clients.</Text></Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            {packages.map((p: any) => (
              <Card.Root key={p.id} variant="outline"><Card.Body><Stack gap="3">
                <Flex justify="space-between"><Heading size="md">{p.name}</Heading>{p.is_featured && <Badge colorPalette="purple">Featured</Badge>}</Flex>
                <Text color="fg.muted" fontSize="sm">{p.description}</Text>
                <HStack justify="space-between"><Text fontWeight="bold">{money(p.package_price)}</Text><Text fontSize="sm" color="fg.muted">Save {money(p.discount_amount)}</Text></HStack>
                <Text fontSize="xs" color="fg.muted">{p.total_duration_minutes} min · {p.services?.length || 0} services</Text>
              </Stack></Card.Body></Card.Root>
            ))}
            {packages.length === 0 && <Card.Root><Card.Body><Text color="fg.muted">No packages available.</Text></Card.Body></Card.Root>}
          </SimpleGrid>
        </Stack></Container>
      </Box>
    </Box>
  );
}

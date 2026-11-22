import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "motion/react";
import { Box, Button, Container, Flex, Grid, Heading, HStack, Text, VStack, Badge } from "@chakra-ui/react";
import { SparklesIcon } from "@/components/icons";
import bgImage from "@/assets/bg.jpg";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const staggerContainerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
const scaleInVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } } };

function AnimatedCounter({ end, duration = 2, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  useEffect(() => {
    if (prefersReducedMotion) { setCount(end); return; }
    const animate = (t: number) => {
      if (startTimeRef.current === null) startTimeRef.current = t;
      const p = Math.min((t - startTimeRef.current) / (duration * 1000), 1);
      setCount(Math.floor(end * p));
      if (p < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [end, duration, prefersReducedMotion]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

function StatisticsSection() {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIsInView(true); obs.unobserve(e.target); } }, { threshold: 0.1, rootMargin: "-100px" });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const stats = [
    { label: "Active Salons", value: 500, suffix: "+" },
    { label: "Bookings Processed", value: 10000, suffix: "+" },
    { label: "Happy Customers", value: 50000, suffix: "+" },
  ];
  return (
    <motion.div ref={ref} variants={staggerContainerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      <Grid templateColumns="repeat(3, 1fr)" gap={{ base: 4, sm: 6, md: 8 }} mt={{ base: 12, sm: 16 }} px={2}>
        {stats.map((stat, index) => (
          <motion.div key={index} variants={fadeInUpVariants}>
            <VStack gap={2}>
              <Text fontSize={{ base: "2xl", sm: "3xl", md: "4xl" }} fontWeight="bold" color="purple.300">
                {isInView && <AnimatedCounter end={stat.value} duration={2} suffix={stat.suffix} />}
              </Text>
              <Text fontSize={{ base: "xs", sm: "sm" }} color="whiteAlpha.800">{stat.label}</Text>
            </VStack>
          </motion.div>
        ))}
      </Grid>
    </motion.div>
  );
}

export function HeroSection() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return (
    <Box as="section" position="relative" minH={{ base: "100vh", sm: "600px", md: "700px", lg: "100vh" }} py={{ base: 16, sm: 20, md: 24, lg: 32 }} px={{ base: 4, sm: 6 }} overflow="hidden" pt={24} display="flex" alignItems="center" justifyContent="center">
      <Box position="absolute" inset="0" zIndex={0} bgImage={`url(${bgImage})`} bgSize="cover" bgPos="center" />
      <Box position="absolute" inset="0" zIndex={0} bg="blackAlpha.600" />
      {!prefersReducedMotion && (
        <>
          <motion.div animate={{ y: [0, 40, 0], x: [0, 25, 0] }} transition={{ duration: 8, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }} style={{ position: "absolute", top: "2.5rem", right: "1.25rem", width: "10rem", height: "10rem", borderRadius: "9999px", background: "var(--chakra-colors-purple-500)", opacity: 0.1, filter: "blur(48px)" }} />
          <motion.div animate={{ y: [0, -40, 0], x: [0, -25, 0] }} transition={{ duration: 10, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }} style={{ position: "absolute", bottom: "2.5rem", left: "1.25rem", width: "12rem", height: "12rem", borderRadius: "9999px", background: "var(--chakra-colors-pink-500)", opacity: 0.1, filter: "blur(48px)" }} />
        </>
      )}
      <Container maxW="4xl" textAlign="center" position="relative" zIndex={10}>
        <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible">
          <Badge colorPalette="purple" variant="subtle" px={3} py={1} mb={{ base: 4, sm: 6 }} bg="whiteAlpha.200" color="white">
            <HStack gap={2}><SparklesIcon size={14} /><Text fontSize={{ base: "xs", sm: "sm" }}>Trusted by 10,000+ salons across Africa</Text></HStack>
          </Badge>
        </motion.div>
        <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
          <Heading fontSize={{ base: "4xl", sm: "5xl", md: "6xl", lg: "7xl" }} mb={{ base: 4, sm: 6 }} color="white" lineHeight="1.1">
            Manage Your Salon with Ease
          </Heading>
        </motion.div>
        <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <Text fontSize={{ base: "md", sm: "lg", md: "xl", lg: "2xl" }} color="whiteAlpha.900" mb={{ base: 8, sm: 10 }} maxW="3xl" mx="auto" px={2}>
            Complete salon management platform with POS, bookings, inventory, staff management, and powerful analytics. Built for Nigerian businesses with Naira pricing.
          </Text>
        </motion.div>
        <motion.div variants={staggerContainerVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
          <Flex direction={{ base: "column", sm: "row" }} gap={{ base: 4, sm: 6 }} justify="center" mb={8} px={2}>
            <motion.div variants={scaleInVariants}>
              <Button asChild size="lg" w={{ base: "full", sm: "auto" }}>
                <RouterLink to="/register">Sign Up</RouterLink>
              </Button>
            </motion.div>
            <motion.div variants={scaleInVariants}>
              <Button asChild size="lg" variant="outline" w={{ base: "full", sm: "auto" }} color="white" borderColor="whiteAlpha.500" _hover={{ bg: "whiteAlpha.200" }}>
                <RouterLink to="/login">Sign In</RouterLink>
              </Button>
            </motion.div>
          </Flex>
        </motion.div>
        <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
          <Text fontSize={{ base: "xs", sm: "sm" }} color="whiteAlpha.800" px={2}>No credit card required • Free 30-day trial • Cancel anytime</Text>
        </motion.div>
        <StatisticsSection />
      </Container>
    </Box>
  );
}
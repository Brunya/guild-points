import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  List,
  ListItem,
  Flex,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";

function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    points: 0,
    recentEvents: [],
  });

  const eventSourceRef = useRef(null);

  const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  `;

  const fadeInAnimation = `${fadeIn} 0.5s ease-in`;

  const connectToEventsFeed = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = api.createEventSource();

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "event") {
        const cleanEvent = { ...data.data };
        // Remove numbered properties
        Object.keys(cleanEvent).forEach((key) => {
          if (!isNaN(key)) {
            delete cleanEvent[key];
          }
        });

        setStats((prevStats) => ({
          ...prevStats,
          recentEvents: Array.isArray(prevStats.recentEvents)
            ? [cleanEvent, ...prevStats.recentEvents].slice(0, 20)
            : [cleanEvent],
        }));
      } else if (data.type === "stats") {
        setStats((prevStats) => ({
          ...prevStats,
          users: data.data.users,
          events: data.data.events,
          points: data.data.points,
        }));
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
      setTimeout(connectToEventsFeed, 5000);
    };

    eventSourceRef.current = eventSource;
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Only fetch recent events initially
        const eventsResponse = await api.getEvents({ limit: 20 });
        const events = eventsResponse.data || [];

        // Clean up event objects
        const cleanedEvents = Array.isArray(events)
          ? events.map((event) => {
              const cleanEvent = { ...event };
              Object.keys(cleanEvent).forEach((key) => {
                if (!isNaN(key)) {
                  delete cleanEvent[key];
                }
              });
              return cleanEvent;
            })
          : [];

        setStats((prevStats) => ({
          ...prevStats,
          recentEvents: cleanedEvents,
        }));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
    connectToEventsFeed();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectToEventsFeed]);

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Total Points</StatLabel>
          <StatNumber>{stats.points}</StatNumber>
          <StatHelpText>Active point types</StatHelpText>
        </Stat>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Total Users</StatLabel>
          <StatNumber>{stats.users}</StatNumber>
          <StatHelpText>Users with points</StatHelpText>
        </Stat>
        <Stat bg="white" p={4} rounded="lg" shadow="sm">
          <StatLabel>Total Events</StatLabel>
          <StatNumber>{stats.events}</StatNumber>
          <StatHelpText>All activities</StatHelpText>
        </Stat>
      </SimpleGrid>

      <Box bg="white" p={6} rounded="lg" shadow="sm">
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          Recent Activity
          <Text as="span" fontSize="sm" color="gray.500" ml={2}>
            (Last 10 events)
          </Text>
        </Text>

        <List spacing={4}>
          {stats.recentEvents?.slice(0, 10).map((event, index) => (
            <ListItem
              key={event.id || `${event.timestamp}-${index}`}
              p={4}
              bg="gray.50"
              rounded="lg"
              borderLeft="4px"
              borderLeftColor={event.type === "add" ? "green.400" : "red.400"}
              transition="all 0.2s"
              _hover={{ transform: "translateX(2px)" }}
              sx={{
                animation: index === 0 ? fadeInAnimation : "none",
              }}
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Flex align="center" gap={2}>
                    <Text fontSize="lg" fontWeight="medium" color={event.type === "add" ? "green.500" : "red.500"}>
                      {event.type === "add" ? "+" : "-"}
                      {event.amount}
                    </Text>
                    <Text color="gray.600">points for {event.userId}</Text>
                  </Flex>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Point Type: {event.pointId || "N/A"}
                  </Text>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="sm" color="gray.600">
                    {event.timestamp ? new Date(Number(event.timestamp)).toLocaleTimeString() : "N/A"}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {event.timestamp ? new Date(Number(event.timestamp)).toLocaleDateString() : "N/A"}
                  </Text>
                </Box>
              </Flex>
            </ListItem>
          ))}

          {(!stats.recentEvents || stats.recentEvents.length === 0) && (
            <Box p={8} textAlign="center" color="gray.500" bg="gray.50" rounded="lg">
              <Text>No recent activity</Text>
            </Box>
          )}
        </List>
      </Box>
    </Box>
  );
}

export default Dashboard;

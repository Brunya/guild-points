import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  List,
  ListItem,
  Text,
  Spinner,
  Center,
  Flex,
  Select,
  ButtonGroup,
  IconButton,
  SimpleGrid,
  Grid,
  HStack,
  Tag,
  Skeleton,
  SkeletonText,
  Icon,
  TagCloseButton,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "@chakra-ui/icons";
import { FiMoreVertical, FiEdit2, FiTrash2, FiExternalLink } from "react-icons/fi";
import api from "../services/api";
import debounce from "lodash/debounce";

// Then declare the Points function component
function Points() {
  const [points, setPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [newPoint, setNewPoint] = useState({
    pointId: "",
    name: "",
    creator: "",
    imageUrl: "",
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const initRef = useRef(false);
  const [leaderboardLimit, setLeaderboardLimit] = useState(100);
  const [leaderboardSort, setLeaderboardSort] = useState("desc");
  const [eventFilters, setEventFilters] = useState({
    userId: "",
    type: "",
  });
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardOffset, setLeaderboardOffset] = useState(0);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);

  const fetchPoints = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPoints({ limit: 100 });
      setPoints(response.data.points || []);
    } catch (error) {
      toast({
        title: "Error fetching points",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const pointIdParam = params.get("pointId");
      if (pointIdParam) {
        setSearchQuery(pointIdParam);
      }
      fetchPoints();
    }
  }, []);

  useEffect(() => {
    const filtered = points.filter(
      (point) =>
        point.pointId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPoints(filtered);
  }, [points, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.addEvent(newPoint);
      toast({
        title: "Point created successfully",
        status: "success",
        duration: 3000,
      });
      onClose();
      fetchPoints();
    } catch (error) {
      toast({
        title: "Error creating point",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleViewDetails = async (point) => {
    setSelectedPoint(point);
    onOpen();
    setEvents([]);
    setLeaderboard([]);
    setLeaderboardOffset(0);
    setIsLoadingEvents(true);
    setIsLoadingLeaderboard(true);

    try {
      const [eventsResult, leaderboardResult] = await Promise.allSettled([
        api.getPointEvents(point.pointId),
        api.getPointLeaderboard(point.pointId, 100, 0, leaderboardSort),
      ]);

      if (leaderboardResult.status === "fulfilled") {
        setLeaderboard(leaderboardResult.value?.data?.leaderboard ?? []);
        setLeaderboardTotal(leaderboardResult.value?.data?.total ?? 0);
      } else {
        toast({
          title: "Error fetching leaderboard",
          description: leaderboardResult.reason?.message,
          status: "error",
          duration: 3000,
        });
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value?.data?.events ?? []);
        setEventsTotal(eventsResult.value?.data?.total ?? 0);
      } else {
        toast({
          title: "Error fetching events",
          description: eventsResult.reason?.message,
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error fetching point details",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoadingEvents(false);
      setIsLoadingLeaderboard(false);
    }
  };

  const handleDelete = async (pointId) => {
    if (window.confirm("Are you sure you want to delete this point? This action cannot be undone.")) {
      try {
        await api.deletePoint(pointId);
        toast({
          title: "Point deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        fetchPoints(); // Refresh the list
      } catch (error) {
        toast({
          title: "Error deleting point",
          description: error.message || "Failed to delete point",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const getPointDisplay = (point) => {
    if (point.imageUrl) {
      return (
        <Box
          as="img"
          src={point.imageUrl}
          alt={point.name}
          boxSize="50px"
          objectFit="contain"
          borderRadius="md"
          fallback={
            <Center boxSize="50px" bg="purple.50" borderRadius="md">
              <Text fontSize="2xl">🎯</Text>
            </Center>
          }
        />
      );
    }
    return (
      <Center boxSize="50px" bg="purple.50" borderRadius="md">
        <Text fontSize="2xl">{point.name.charAt(0)}</Text>
      </Center>
    );
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split("\n").filter((row) => row.trim());
        let successCount = 0;

        const processedPoints = rows
          .map((row, index) => {
            //if (index >= 100) return null; // Optional: limit to first 100 rows for safety

            try {
              // Find the position of the metadata JSON
              const metadataStartIndex = row.indexOf('{"');
              const metadataEndIndex = row.lastIndexOf('"}') + 2;

              if (metadataStartIndex === -1 || metadataEndIndex === -1) {
                console.error("Invalid metadata format in row:", row);
                return null;
              }

              // Extract metadata string
              const metadata = row.substring(metadataStartIndex, metadataEndIndex);

              // Split the non-metadata parts
              const parts = [
                ...row.substring(0, metadataStartIndex).split(",").filter(Boolean),
                ...row
                  .substring(metadataEndIndex + 1)
                  .split(",")
                  .filter(Boolean),
              ];

              const [pointId, guildId, , , , , , name, urlName, imageUrl] = parts;

              // Clean and parse the metadata
              const cleanMetadata = metadata
                .replace(/\\"/g, '"') // Handle escaped quotes
                .replace(/"{2,}/g, '"') // Handle multiple quotes
                .replace(/^"|"$/g, ""); // Remove outer quotes

              const parsedMetadata = JSON.parse(cleanMetadata);

              // Validate required fields
              if (!parsedMetadata.name) {
                console.error("Missing name in metadata:", parsedMetadata);
                return null;
              }

              // imageurl only if pianata but '' if not
              const image = parsedMetadata.imageUrl
                ? parsedMetadata.imageUrl
                : imageUrl?.trim().startsWith("/guildLogos/")
                ? ""
                : imageUrl?.trim();

              return {
                pointId: pointId?.trim(),
                name: parsedMetadata.name,
                creator: "https://guild.xyz/" + urlName?.trim(),
                imageUrl: image,
                guildId: guildId?.trim(),
              };
            } catch (err) {
              console.error("Error processing row:", row, err);
              return null;
            }
          })
          .filter((point) => point !== null);

        // Create points sequentially without individual toasts
        for (const point of processedPoints) {
          try {
            await api.addEvent(point);
            successCount++;
          } catch (error) {
            console.error(`Failed to create point: ${point.name}`, error);
          }
        }

        // Fetch points only after all imports are complete
        await fetchPoints();

        // Single completion toast
        toast({
          title: "CSV Import Completed",
          description: `Successfully processed ${successCount} points`,
          status: "success",
          duration: 5000,
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: error.message,
          status: "error",
          duration: 5000,
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsText(file);
  };

  const handleCardClick = (point) => {
    handleViewDetails(point);
  };

  const handleLoadMoreLeaderboard = async () => {
    try {
      setIsLoadingLeaderboard(true);
      const response = await api.getPointLeaderboard(
        selectedPoint.pointId,
        100,
        leaderboardOffset + 100,
        leaderboardSort
      );

      // Append new entries to existing leaderboard
      setLeaderboard((prev) => [...prev, ...response.data.leaderboard]);
      setLeaderboardOffset(leaderboardOffset + 100);
    } catch (error) {
      toast({
        title: "Error loading more leaderboard entries",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const debouncedFetchEvents = useCallback(
    debounce(async (pointId, options = {}) => {
      setIsLoadingEvents(true);
      try {
        const response = await api.getPointEvents(pointId, {
          limit: eventsLimit,
          offset: options.offset || 0,
          ...(eventFilters.userId && { userId: eventFilters.userId }),
          ...(eventFilters.type && { type: eventFilters.type }),
        });

        setEvents((prev) => (options.offset ? [...prev, ...response.data.events] : response.data.events));
        setEventsTotal(response.data.total || 0);
        setEventsOffset(options.offset || 0);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast({
          title: "Error fetching events",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsLoadingEvents(false);
      }
    }, 300),
    [eventFilters, eventsLimit]
  );

  const handleEventFilter = useCallback(async () => {
    if (!selectedPoint) return;

    setIsLoadingEvents(true);
    setEventsOffset(0);

    try {
      const response = await api.getPointEvents(selectedPoint.pointId, {
        limit: eventsLimit,
        offset: 0,
        ...(eventFilters.userId && { userId: eventFilters.userId }),
        ...(eventFilters.type && { type: eventFilters.type }),
      });

      setEvents(response?.data?.events || []);
      setEventsTotal(response?.data?.total || 0);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error fetching events",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedPoint, eventFilters, eventsLimit]);

  const handleUserClick = useCallback(
    (userId) => {
      // Prevent re-triggering if the same user is selected
      if (eventFilters.userId === userId) return;

      setEventFilters((prev) => ({ ...prev, userId }));
      // Reset pagination
      setEventsOffset(0);
    },
    [eventFilters.userId]
  );

  // Separate fetch function to handle all event loading
  const fetchFilteredEvents = useCallback(async () => {
    if (!selectedPoint?.pointId) return;

    setIsLoadingEvents(true);
    try {
      const response = await api.getPointEvents(selectedPoint.pointId, {
        limit: eventsLimit,
        offset: eventsOffset,
        ...eventFilters,
      });

      setEvents(response?.data?.events || []);
      setEventsTotal(response?.data?.total || 0);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error fetching events",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedPoint?.pointId, eventFilters, eventsLimit, eventsOffset]);

  // Update useEffect to handle filter changes
  useEffect(() => {
    if (selectedPoint?.pointId) {
      fetchFilteredEvents();
    }
  }, [selectedPoint?.pointId, eventFilters, fetchFilteredEvents]);

  const clearFilter = useCallback((filterKey) => {
    setEventFilters((prev) => ({ ...prev, [filterKey]: "" }));
    setEventsOffset(0);
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Update URL with search param
    const newUrl = value ? `${window.location.pathname}?pointId=${value}` : window.location.pathname;
    window.history.pushState({}, "", newUrl);
  };

  const LeaderboardSkeleton = () => (
    <VStack spacing={2} w="full">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} height="50px" w="full" rounded="md" />
      ))}
    </VStack>
  );

  const EventsSkeleton = () => (
    <VStack spacing={2} w="full">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} height="70px" w="full" rounded="md" />
      ))}
    </VStack>
  );

  const EmptyState = ({ title, message }) => (
    <VStack spacing={3} py={8} px={4} textAlign="center">
      <Icon as={InfoIcon} boxSize={10} color="gray.400" />
      <Text fontWeight="medium" fontSize="lg">
        {title}
      </Text>
      <Text color="gray.500">{message}</Text>
    </VStack>
  );

  const LeaderboardSection = () => {
    // Add ref for scroll container
    const leaderboardRef = useRef(null);

    // Add function to preserve scroll position when loading more
    const handleLoadMoreWithScroll = async () => {
      const scrollContainer = leaderboardRef.current;
      const scrollPosition = scrollContainer?.scrollTop;

      await handleLoadMoreLeaderboard();

      // Restore scroll position after state update
      if (scrollContainer && scrollPosition) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollPosition;
        });
      }
    };

    return (
      <Box ref={leaderboardRef} flex="1" overflowY="auto" px={4} pb={4}>
        {isLoadingLeaderboard && leaderboard.length === 0 ? (
          <LeaderboardSkeleton />
        ) : leaderboard.length === 0 ? (
          <EmptyState
            title="No Leaderboard Data"
            message="No users have earned points yet. Points earned will appear here."
          />
        ) : (
          <List spacing={2}>
            {leaderboard.map((entry, index) => (
              <ListItem
                key={entry.userId}
                p={2}
                bg="gray.50"
                rounded="md"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack spacing={2}>
                  <Text>#{index + 1}</Text>
                  <Button variant="link" colorScheme="blue" onClick={() => handleUserClick(entry.userId)} fontSize="md">
                    {entry.userId}
                  </Button>
                </HStack>
                <Text fontWeight="bold">{entry.points}</Text>
              </ListItem>
            ))}
            {!isLoadingLeaderboard && leaderboard.length % 100 === 0 && (
              <Button
                mt={4}
                onClick={handleLoadMoreWithScroll} // Changed from handleLoadMoreLeaderboard
                size="sm"
                w="full"
                variant="outline"
                isLoading={isLoadingLeaderboard}
              >
                Load More
              </Button>
            )}
          </List>
        )}
      </Box>
    );
  };

  // Update the AddEventForm to accept onUserClick prop
  const AddEventForm = ({ selectedPoint, onEventAdded, initialUserId }) => {
    const [newEvent, setNewEvent] = useState({
      type: "add",
      userId: initialUserId || "",
      amount: "",
    });
    const toast = useToast();

    // Add useEffect to update userId when initialUserId changes
    useEffect(() => {
      if (initialUserId) {
        setNewEvent((prev) => ({
          ...prev,
          userId: initialUserId,
        }));
      }
    }, [initialUserId]);

    const handleEventInputChange = (field, value) => {
      setNewEvent((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

    const handleEventSubmit = async (e) => {
      e.preventDefault();

      if (!selectedPoint?.pointId || !newEvent.userId || !newEvent.amount) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields",
          status: "error",
          duration: 3000,
        });
        return;
      }

      try {
        const eventData = {
          pointId: selectedPoint.pointId,
          userId: newEvent.userId.trim(),
          type: newEvent.type,
          amount: parseInt(newEvent.amount, 10),
        };

        await api.addEvent(eventData);

        // Reset form
        setNewEvent({ type: "add", userId: "", amount: "" });

        // Refresh both events and leaderboard
        await Promise.all([
          fetchFilteredEvents(),
          api.getPointLeaderboard(selectedPoint.pointId, 100, 0, leaderboardSort).then((response) => {
            setLeaderboard(response?.data?.leaderboard ?? []);
            setLeaderboardTotal(response?.data?.total ?? 0);
            setLeaderboardOffset(0);
          }),
        ]);

        toast({
          title: "Event created successfully",
          status: "success",
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: "Error creating event",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      }
    };

    return (
      <Box p={3} bg="gray.50" rounded="md" borderWidth="1px">
        <form onSubmit={handleEventSubmit}>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} alignItems="end">
            <Select value={newEvent.type} onChange={(e) => handleEventInputChange("type", e.target.value)} isRequired>
              <option value="add">Add Points</option>
              <option value="remove">Remove Points</option>
            </Select>
            <Input
              placeholder="User ID"
              value={newEvent.userId}
              onChange={(e) => handleEventInputChange("userId", e.target.value)}
              isRequired
            />
            <Input
              placeholder="Amount"
              type="number"
              value={newEvent.amount}
              onChange={(e) => handleEventInputChange("amount", e.target.value)}
              isRequired
            />
            <Button
              type="submit"
              colorScheme="blue"
              w={{ base: "full", md: "auto" }}
              isDisabled={!newEvent.userId || !newEvent.amount}
            >
              Add Event
            </Button>
          </SimpleGrid>
        </form>
      </Box>
    );
  };

  // Separate component for event filtering
  const EventFilters = ({ eventFilters, setEventFilters, onFilter, clearFilter }) => {
    const hasFilters = Object.values(eventFilters).some((value) => value !== "");

    return (
      <VStack spacing={3} align="stretch">
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <Input
            size="sm"
            placeholder="Filter by User ID"
            value={eventFilters.userId}
            onChange={(e) => handleFilterChange("userId", e.target.value)}
          />
          <Select size="sm" value={eventFilters.type} onChange={(e) => handleFilterChange("type", e.target.value)}>
            <option value="">All Types</option>
            <option value="add">Add Points</option>
            <option value="remove">Remove Points</option>
          </Select>
        </SimpleGrid>

        {hasFilters && (
          <HStack spacing={2} flexWrap="wrap" justify={{ base: "center", sm: "flex-start" }}>
            {eventFilters.userId && (
              <Tag size="md" colorScheme="blue" borderRadius="full">
                User: {eventFilters.userId}
                <TagCloseButton
                  onClick={() => {
                    clearFilter("userId");
                    onFilter();
                  }}
                />
              </Tag>
            )}
            {eventFilters.type && (
              <Tag size="md" colorScheme="purple" borderRadius="full">
                Type: {eventFilters.type}
                <TagCloseButton
                  onClick={() => {
                    clearFilter("type");
                    onFilter();
                  }}
                />
              </Tag>
            )}
          </HStack>
        )}

        <ButtonGroup
          size="sm"
          spacing={2}
          width="full"
          display="flex"
          justifyContent={{ base: "stretch", sm: "flex-end" }}
        >
          <Button
            variant="outline"
            flex={{ base: 1, sm: "initial" }}
            onClick={() => {
              setEventFilters({ userId: "", type: "" });
              setEventsOffset(0);
              fetchFilteredEvents();
            }}
            isDisabled={!eventFilters.userId && !eventFilters.type}
          >
            Clear All
          </Button>
          <Button
            colorScheme="blue"
            flex={{ base: 1, sm: "initial" }}
            onClick={() => {
              setEventsOffset(0);
              fetchFilteredEvents();
            }}
          >
            Apply
          </Button>
        </ButtonGroup>
      </VStack>
    );
  };

  // Update the EventsSection component
  const EventsSection = () => {
    const [selectedUserId, setSelectedUserId] = useState("");

    // Add event handlers
    const handleUserClick = (userId) => {
      setSelectedUserId(userId);
      setEventFilters((prev) => ({ ...prev, userId }));
    };

    const handleFilterChange = (field, value) => {
      setEventFilters((prev) => ({ ...prev, [field]: value }));
      setEventsOffset(0);
    };

    const clearFilter = (field) => {
      setEventFilters((prev) => ({ ...prev, [field]: "" }));
      setEventsOffset(0);
    };

    return (
      <Box flex="1" overflowY="auto">
        <VStack spacing={4} align="stretch">
          {/* Add Event Form */}
          <AddEventForm
            selectedPoint={selectedPoint}
            onEventAdded={fetchFilteredEvents}
            initialUserId={selectedUserId}
          />

          {/* Event Filters - Compact Version */}
          <Box p={3} bg="gray.50" rounded="md" borderWidth="1px">
            <HStack spacing={4} width="full" align="flex-end">
              {/* User ID Filter */}
              <FormControl maxW="200px">
                <Input
                  size="sm"
                  placeholder="Filter by User ID"
                  value={eventFilters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                  pr={eventFilters.userId ? "60px" : "8px"}
                />
                {eventFilters.userId && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => clearFilter("userId")}
                    position="absolute"
                    right="2"
                    bottom="1.5"
                    color="gray.500"
                  >
                    Clear
                  </Button>
                )}
              </FormControl>

              {/* Type Filter */}
              <FormControl maxW="150px">
                <Select
                  size="sm"
                  value={eventFilters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="add">Add Points</option>
                  <option value="remove">Remove Points</option>
                </Select>
              </FormControl>

              {/* Filter Actions */}
              <ButtonGroup size="sm" spacing={2}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEventFilters({ userId: "", type: "" });
                    setEventsOffset(0);
                    fetchFilteredEvents();
                  }}
                  isDisabled={!eventFilters.userId && !eventFilters.type}
                >
                  Clear All
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => {
                    setEventsOffset(0);
                    fetchFilteredEvents();
                  }}
                >
                  Apply
                </Button>
              </ButtonGroup>
            </HStack>
          </Box>

          {/* Events List */}
          {isLoadingEvents ? (
            <Center p={4}>
              <Spinner />
            </Center>
          ) : events.length === 0 ? (
            <Center p={8}>
              <VStack spacing={2}>
                <Text>No events found</Text>
                {(eventFilters.userId || eventFilters.type) && (
                  <Text fontSize="sm" color="gray.500">
                    Try adjusting your filters
                  </Text>
                )}
              </VStack>
            </Center>
          ) : (
            <List spacing={2}>
              {events.map((event, index) => (
                <ListItem
                  key={`${event.userId}-${event.timestamp}-${index}`}
                  p={3}
                  bg="gray.50"
                  rounded="md"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <HStack spacing={4}>
                    <Tag colorScheme={event.type === "add" ? "green" : "red"} size="md">
                      {event.type === "add" ? "+" : "-"}
                      {event.amount}
                    </Tag>
                    <Button
                      variant="link"
                      color="blue.500"
                      onClick={() => handleUserClick(event.userId)}
                      _hover={{ textDecoration: "underline" }}
                    >
                      {event.userId}
                    </Button>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(event.timestamp).toLocaleString()}
                    </Text>
                    <Menu>
                      <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                      <MenuList>
                        <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteEvent(event)} color="red.500">
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </ListItem>
              ))}
            </List>
          )}
        </VStack>
      </Box>
    );
  };

  const handleModalClose = useCallback(() => {
    setEventFilters({
      userId: "",
      type: "",
    });
    setEventsOffset(0);
    setEvents([]);
    onClose();
  }, [onClose]);

  const modalContent = useMemo(() => {
    if (!isOpen) return null;

    return selectedPoint ? (
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={4} h="full" overflow={{ base: "auto", lg: "hidden" }}>
        {/* Left Column - Info & Leaderboard */}
        <VStack spacing={4} h={{ base: "auto", lg: "full" }} overflow="hidden">
          {/* Point Info Section */}
          <Box w="full" p={4} bg="gray.50" rounded="md" flexShrink={0}>
            <Flex
              gap={4}
              align="center"
              direction={{ base: "column", sm: "row" }}
              textAlign={{ base: "center", sm: "left" }}
            >
              {selectedPoint.imageUrl ? (
                <Box
                  as="img"
                  src={selectedPoint.imageUrl}
                  alt={selectedPoint.name}
                  w="100px"
                  h="100px"
                  objectFit="cover"
                  rounded="md"
                  fallback={<Text fontSize="2xl">🎯</Text>}
                />
              ) : (
                <Box
                  w="100px"
                  h="100px"
                  bg="gray.200"
                  rounded="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="2xl">🎯</Text>
                </Box>
              )}
              <VStack align={{ base: "center", sm: "stretch" }} spacing={2} flex="1" w={{ base: "full", sm: "auto" }}>
                <Text fontWeight="bold">Point ID: {selectedPoint.pointId}</Text>
                <Text fontWeight="bold">Name: {selectedPoint.name}</Text>
                <Text fontWeight="bold">
                  Creator:{" "}
                  <Link
                    href={selectedPoint.creator}
                    isExternal
                    color="blue.500"
                    _hover={{ textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedPoint.creator}
                  </Link>
                </Text>
              </VStack>
            </Flex>
          </Box>

          {/* Leaderboard Section */}
          <Box
            w="full"
            flex="1"
            minH={{ base: "300px", lg: "0" }}
            bg="white"
            rounded="md"
            shadow="sm"
            borderWidth="1px"
            display="flex"
            flexDirection="column"
            overflow="hidden"
          >
            <Flex
              justify="space-between"
              align="center"
              p={4}
              flexShrink={0}
              borderBottomWidth="1px"
              borderBottomColor="gray.100"
            >
              <Text fontSize="lg" fontWeight="bold">
                Leaderboard
              </Text>
              <Tag size="md" colorScheme="purple" borderRadius="full">
                {isLoadingLeaderboard ? <Spinner size="xs" mr={2} /> : `Total: ${leaderboardTotal.toLocaleString()}`}
              </Tag>
            </Flex>
            <LeaderboardSection />
          </Box>
        </VStack>

        {/* Right Column - Events */}
        <Box
          display="flex"
          flexDirection="column"
          h={{ base: "auto", lg: "full" }}
          minH={{ base: "400px", lg: "0" }}
          bg="white"
          rounded="md"
          shadow="sm"
          borderWidth="1px"
          overflow="hidden"
        >
          <VStack spacing={4} h="full" align="stretch" p={4}>
            <Text fontSize="lg" fontWeight="bold" flexShrink={0}>
              Events
            </Text>

            {/* Events List */}
            <EventsSection />
          </VStack>
        </Box>
      </Grid>
    ) : (
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Point ID</FormLabel>
            <Input value={newPoint.pointId} onChange={(e) => setNewPoint({ ...newPoint, pointId: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input value={newPoint.name} onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Creator</FormLabel>
            <Input value={newPoint.creator} onChange={(e) => setNewPoint({ ...newPoint, creator: e.target.value })} />
          </FormControl>
          <FormControl>
            <FormLabel>Image URL (Optional)</FormLabel>
            <Input
              value={newPoint.imageUrl || ""}
              onChange={(e) => setNewPoint({ ...newPoint, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </FormControl>
        </VStack>
      </form>
    );
  }, [
    isOpen,
    selectedPoint,
    events,
    leaderboard,
    eventFilters,
    isLoadingEvents,
    isLoadingLeaderboard,
    leaderboardTotal,
  ]);

  // Inside the Points component, add this function before the EventsSection component
  const handleDeleteEvent = async (event) => {
    try {
      await api.deleteEvent(event.id);

      toast({
        title: "Event deleted successfully",
        status: "success",
        duration: 3000,
      });

      // Refresh both events and leaderboard data
      await Promise.all([
        fetchFilteredEvents(),
        api.getPointLeaderboard(selectedPoint.pointId, 100, 0, leaderboardSort).then((response) => {
          setLeaderboard(response?.data?.leaderboard ?? []);
          setLeaderboardTotal(response?.data?.total ?? 0);
          setLeaderboardOffset(0);
        }),
      ]);
    } catch (error) {
      toast({
        title: "Error deleting event",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box>
      <Box mb={4} display="flex" gap={4}>
        <Input placeholder="Search points by ID or name..." value={searchQuery} onChange={handleSearch} width="300px" />
        <Button
          colorScheme="blue"
          onClick={() => {
            setSelectedPoint(null);
            setNewPoint({ pointId: "", name: "", creator: "", imageUrl: "" });
            onOpen();
          }}
        >
          Create New Point
        </Button>

        <Box position="relative" display="inline-block">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            ref={fileInputRef}
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: "0",
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              border: "0",
            }}
          />
          <Button
            colorScheme="green"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            loadingText="Importing..."
          >
            Import CSV
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Center p={8}>
          <Spinner size="xl" />
        </Center>
      ) : (
        <SimpleGrid columns={[1, 2, 3, 4]} spacing={6} px={4} py={6}>
          {filteredPoints.map((point) => (
            <Box
              key={point.pointId}
              p={5}
              bg="white"
              shadow="sm"
              rounded="xl"
              transition="all 0.2s"
              position="relative"
              borderWidth="1px"
              borderColor="gray.100"
              _hover={{
                shadow: "lg",
                transform: "translateY(-2px)",
                cursor: "pointer",
                borderColor: "purple.200",
              }}
              onClick={() => handleCardClick(point)}
            >
              {/* User Count Badge */}
              <Tag
                size="sm"
                variant="subtle"
                colorScheme="purple"
                position="absolute"
                top={3}
                right={3}
                px={2}
                py={1}
                borderRadius="full"
              >
                {point.userCount || 0} users
              </Tag>

              <VStack spacing={4} align="stretch">
                {/* Image/Icon Container */}
                <Center p={4} bg="gray.50" rounded="lg" transition="all 0.2s" _hover={{ bg: "gray.100" }}>
                  {getPointDisplay(point)}
                </Center>

                {/* Content Container */}
                <VStack spacing={2} align="start" px={1}>
                  <Text fontWeight="bold" fontSize="lg" noOfLines={1} title={point.name}>
                    {point.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500" fontFamily="mono" noOfLines={1}>
                    {point.pointId}
                  </Text>
                </VStack>

                {/* Optional: Add creation date or other metadata */}
                <Text fontSize="xs" color="gray.400" mt="auto" px={1}>
                  Created by{" "}
                  <Link
                    href={point.creator}
                    isExternal
                    color="blue.500"
                    _hover={{ textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {point.creator || "Unknown"}
                  </Link>
                </Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isOpen} onClose={handleModalClose} size={{ base: "full", lg: "6xl" }} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent
          maxW={{ base: "100vw", lg: "90vw" }}
          h={{ base: "100vh", lg: "90vh" }}
          m={{ base: 0, lg: "auto" }}
          rounded={{ base: 0, lg: "md" }}
        >
          <ModalHeader>{selectedPoint ? `Point Details: ${selectedPoint.name}` : "Create New Point"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="hidden" pb={6}>
            {modalContent}
          </ModalBody>
          <ModalFooter>
            {selectedPoint ? (
              <Button
                colorScheme="red"
                onClick={() => {
                  handleDelete(selectedPoint.pointId);
                  onClose();
                }}
              >
                Delete Point
              </Button>
            ) : (
              <Button colorScheme="blue" onClick={handleSubmit}>
                Create
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Points;

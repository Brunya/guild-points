import { useState, useEffect } from "react";
import {
  Box,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Select,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  Text,
  Tag,
  Image,
  Link,
  ButtonGroup,
  IconButton,
  Flex,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, EditIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import api from "../services/api";

function Users() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [pointAction, setPointAction] = useState({
    type: "add",
    amount: 0,
    pointId: "",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    userId: "",
  });
  const [pointTypes, setPointTypes] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUserEvent, setNewUserEvent] = useState({
    type: "add",
    amount: 0,
    pointId: "",
  });
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const generateUniqueKey = (event, index) => {
    if (event.id) return event.id;
    const baseKey = `${event.timestamp}-${event.pointId}-${event.amount}-${index}`;
    return baseKey.replace(/[^a-zA-Z0-9-]/g, "");
  };

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error fetching users",
        status: "error",
        duration: 3000,
      });
    }
  };

  const fetchUserEvents = async (userId) => {
    try {
      const response = await api.getUserEvents(userId);
      setUserEvents(response.data.events);
    } catch (error) {
      console.error("Error fetching user events:", error);
    }
  };

  const fetchPointTypes = async () => {
    try {
      const response = await api.getPointInfo();
      setPointTypes(response.data || {}); // Changed from response.name to response.data
    } catch (error) {
      console.error("Error fetching point types:", error);
    }
  };

  const handlePointAction = async (e) => {
    e.preventDefault();

    if (!pointAction.pointId || !pointAction.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await api.addEvent({
        type: pointAction.type,
        amount: parseInt(pointAction.amount),
        userId: selectedUser.userId,
        pointId: pointAction.pointId,
      });

      // Reset the form
      setPointAction({
        type: "add",
        amount: 0,
        pointId: "",
      });

      // Refresh data
      await Promise.all([fetchUsers(), fetchUserEvents(selectedUser.userId)]);

      toast({
        title: "Event added successfully",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error adding event",
        description: error.response?.data?.message || "An error occurred",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    await fetchUserEvents(user.userId);
    onOpen();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const userResponse = await api.createUser(newUser);

      // If initial event is specified, create it
      if (newUserEvent.amount > 0 && newUserEvent.pointId) {
        await api.modifyPoints({
          type: newUserEvent.type,
          amount: parseInt(newUserEvent.amount),
          userId: newUser.userId,
          pointId: newUserEvent.pointId,
        });
      }

      await fetchUsers();
      setIsCreateModalOpen(false);
      setNewUser({ name: "", userId: "" });
      setNewUserEvent({ type: "add", amount: 0, pointId: "" });

      toast({
        title: "User created successfully",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error creating user",
        description: error.response?.data?.message || "An error occurred",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.deleteEvent(eventId);
      toast({
        title: "Event deleted successfully",
        status: "success",
        duration: 3000,
      });
      await fetchUserEvents(selectedUser.userId);
    } catch (error) {
      toast({
        title: "Error deleting event",
        description: error.response?.data?.message || "An error occurred",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    try {
      await api.updateEvent(editingEvent.id, {
        type: editingEvent.type,
        amount: parseInt(editingEvent.amount),
        pointId: editingEvent.pointId,
        userId: selectedUser.userId,
      });

      toast({
        title: "Event updated successfully",
        status: "success",
        duration: 3000,
      });

      setIsEditModalOpen(false);
      await fetchUserEvents(selectedUser.userId);
      await fetchUsers(); // Refresh user points
    } catch (error) {
      toast({
        title: "Error updating event",
        description: error.response?.data?.message || "An error occurred",
        status: "error",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPointTypes();
  }, []);

  const UserCard = ({ user }) => (
    <Box
      p={4}
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
      cursor="pointer"
      onClick={() => handleUserSelect(user)}
    >
      <Box mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          {user.userId}
        </Text>
      </Box>

      <Box>
        {user.points &&
          Object.entries(user.points).map(([pointId, amount]) => (
            <Box key={`${user.userId}-${pointId}`} display="flex" alignItems="center" mb={2}>
              {pointTypes[pointId]?.image && (
                <Image src={pointTypes[pointId].image} alt={pointTypes[pointId].name} boxSize="24px" mr={2} />
              )}
              <Text fontWeight="medium">
                {pointTypes[pointId]?.name || pointId}: {amount}
              </Text>
              {pointTypes[pointId]?.url && (
                <Link href={pointTypes[pointId].url} isExternal ml={2}>
                  <ExternalLinkIcon />
                </Link>
              )}
            </Box>
          ))}
      </Box>
    </Box>
  );

  return (
    <Box p={6}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Users
        </Text>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={() => setIsCreateModalOpen(true)}>
          Create User
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {users.map((user, index) => (
          <UserCard key={user.userId || index} user={user} />
        ))}
      </SimpleGrid>

      {/* User Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex alignItems="center">
              <Text>User Details: {selectedUser?.userId}</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs variant="soft-rounded" colorScheme="blue">
              <TabList mb={4}>
                <Tab>Points</Tab>
                <Tab>History</Tab>
                <Tab>Add Event</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <SimpleGrid columns={2} spacing={4}>
                    {selectedUser?.points &&
                      Object.entries(selectedUser.points).map(([pointId, amount]) => (
                        <Box key={pointId} p={4} borderRadius="md" bg="gray.50">
                          <Flex alignItems="center">
                            {pointTypes[pointId]?.image && (
                              <Image
                                src={pointTypes[pointId].image}
                                alt={pointTypes[pointId].name}
                                boxSize="32px"
                                mr={3}
                              />
                            )}
                            <Box>
                              <Text fontWeight="bold">{pointTypes[pointId]?.name || pointId}</Text>
                              <Text fontSize="xl">{amount}</Text>
                            </Box>
                          </Flex>
                        </Box>
                      ))}
                  </SimpleGrid>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {userEvents.map((event, index) => (
                      <Box
                        key={generateUniqueKey(event, index)}
                        p={4}
                        borderRadius="md"
                        bg="gray.50"
                        position="relative"
                      >
                        <Flex justifyContent="space-between" alignItems="center">
                          <Box>
                            <Text fontWeight="bold">
                              {event.type === "add" ? "+" : "-"}
                              {event.amount} {pointTypes[event.pointId]?.name || event.pointId}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {new Date(event.timestamp).toLocaleString()}
                            </Text>
                          </Box>
                          <ButtonGroup size="sm">
                            <IconButton
                              icon={<EditIcon />}
                              onClick={() => {
                                setEditingEvent(event);
                                setIsEditModalOpen(true);
                              }}
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              colorScheme="red"
                              onClick={() => handleDeleteEvent(event.id)}
                            />
                          </ButtonGroup>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <form onSubmit={handlePointAction}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Action Type</FormLabel>
                        <Select
                          value={pointAction.type}
                          onChange={(e) => setPointAction({ ...pointAction, type: e.target.value })}
                        >
                          <option value="add">Add Points</option>
                          <option value="subtract">Subtract Points</option>
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Point Type</FormLabel>
                        <Select
                          value={pointAction.pointId}
                          onChange={(e) => setPointAction({ ...pointAction, pointId: e.target.value })}
                        >
                          <option value="">Select Point Type</option>
                          {Object.entries(pointTypes).map(([id, point]) => (
                            <option key={id} value={id}>
                              {point.name || id}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Amount</FormLabel>
                        <NumberInput min={0}>
                          <NumberInputField
                            value={pointAction.amount}
                            onChange={(e) => setPointAction({ ...pointAction, amount: e.target.value })}
                          />
                        </NumberInput>
                      </FormControl>

                      <Button
                        mt={4}
                        colorScheme="blue"
                        type="submit"
                        isDisabled={!pointAction.pointId || !pointAction.amount}
                      >
                        Add Event
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Keep existing Create User Modal and Edit Event Modal */}
    </Box>
  );
}

export default Users;

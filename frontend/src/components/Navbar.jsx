import { Box, Flex, Link, Heading } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

function Navbar() {
  return (
    <Box bg="white" px={4} shadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Heading size="md">Guild Points Admin</Heading>
        <Flex gap={4}>
          <Link as={RouterLink} to="/" fontWeight="medium">
            Dashboard
          </Link>
          <Link as={RouterLink} to="/points" fontWeight="medium">
            Points
          </Link>
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;

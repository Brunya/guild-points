import { Box, Container, ChakraProvider } from "@chakra-ui/react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Points from "./pages/Points";

// Add any global contexts or providers here
const AppProviders = ({ children }) => <ChakraProvider>{children}</ChakraProvider>;

function App() {
  return (
    <AppProviders>
      <Box minH="100vh" bg="gray.50">
        <Navbar />
        <Container maxW="container.xl" py={8}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/points" element={<Points />} />
          </Routes>
        </Container>
      </Box>
    </AppProviders>
  );
}

export default App;

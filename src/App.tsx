import Home from "@/pages/home";
import { MantineProvider } from "@mantine/core";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import "./index.css";

const paths = [
  {
    path: "/",
    element: <Home />,
  },
];

const BrowserRouter = createBrowserRouter(paths);

const App = () => {
  return (
    <MantineProvider>
      <RouterProvider router={BrowserRouter}></RouterProvider>
    </MantineProvider>
  );
};

export default App;

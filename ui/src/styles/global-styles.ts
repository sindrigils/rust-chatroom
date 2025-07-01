import { createGlobalStyle } from "styled-components";
import { theme } from "@styles/theme";

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
  }


  body {
    background-color: ${theme.colors.background}; 
    color: ${theme.colors.textPrimary};
    font-family: Arial, sans-serif;
  }
`;

import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  /* CSS Reset and Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* HTML and Body */
  html {
    font-size: 16px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${props => props.theme.typography.fonts.sans};
    font-size: ${props => props.theme.typography.sizes.base};
    font-weight: ${props => props.theme.typography.weights.normal};
    line-height: ${props => props.theme.typography.lineHeights.normal};
    color: ${props => props.theme.colors.text.primary};
    background-color: ${props => props.theme.colors.background};
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${props => props.theme.typography.fonts.heading};
    font-weight: ${props => props.theme.typography.weights.semibold};
    line-height: ${props => props.theme.typography.lineHeights.tight};
    color: ${props => props.theme.colors.text.primary};
    margin-bottom: ${props => props.theme.spacing.md};
  }

  h1 {
    font-size: ${props => props.theme.typography.sizes['3xl']};
    font-weight: ${props => props.theme.typography.weights.bold};
  }

  h2 {
    font-size: ${props => props.theme.typography.sizes['2xl']};
  }

  h3 {
    font-size: ${props => props.theme.typography.sizes.xl};
  }

  h4 {
    font-size: ${props => props.theme.typography.sizes.lg};
  }

  h5 {
    font-size: ${props => props.theme.typography.sizes.base};
  }

  h6 {
    font-size: ${props => props.theme.typography.sizes.sm};
  }

  /* Paragraphs and Text */
  p {
    margin-bottom: ${props => props.theme.spacing.md};
    color: ${props => props.theme.colors.text.primary};
  }

  /* Links */
  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
    
    &:hover {
      color: ${props => props.theme.colors.primaryHover};
      text-decoration: underline;
    }

    &:focus {
      outline: 2px solid ${props => props.theme.colors.borderFocus};
      outline-offset: 2px;
      border-radius: ${props => props.theme.borderRadius.sm};
    }
  }

  /* Form Elements */
  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  input, select, textarea {
    width: 100%;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.md};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text.primary};
    transition: border-color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.borderFocus};
      box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
    }
    
    &:disabled {
      background-color: ${props => props.theme.colors.background};
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    &::placeholder {
      color: ${props => props.theme.colors.text.muted};
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  /* Lists */
  ul, ol {
    padding-left: ${props => props.theme.spacing.lg};
    margin-bottom: ${props => props.theme.spacing.md};
  }

  li {
    margin-bottom: ${props => props.theme.spacing.xs};
  }

  /* Code */
  code, pre {
    font-family: ${props => props.theme.typography.fonts.mono};
    font-size: ${props => props.theme.typography.sizes.sm};
  }

  code {
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.borderRadius.sm};
    border: 1px solid ${props => props.theme.colors.border};
  }

  pre {
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.borderRadius.md};
    border: 1px solid ${props => props.theme.colors.border};
    overflow-x: auto;
    margin-bottom: ${props => props.theme.spacing.md};
    
    code {
      background: none;
      padding: 0;
      border: none;
    }
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: ${props => props.theme.spacing.md};
  }

  th, td {
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }

  th {
    font-weight: ${props => props.theme.typography.weights.semibold};
    color: ${props => props.theme.colors.text.primary};
    background-color: ${props => props.theme.colors.background};
  }

  /* Scrollbars */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.full};
    
    &:hover {
      background: ${props => props.theme.colors.borderHover};
    }
  }

  /* Selection */
  ::selection {
    background-color: ${props => props.theme.colors.primary}30;
    color: ${props => props.theme.colors.text.primary};
  }

  /* Focus Visible */
  :focus-visible {
    outline: 2px solid ${props => props.theme.colors.borderFocus};
    outline-offset: 2px;
  }

  /* Utilities */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Print Styles */
  @media print {
    * {
      background: transparent !important;
      color: black !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    
    a, a:visited {
      text-decoration: underline;
    }
    
    @page {
      margin: 0.5in;
    }
  }
`;

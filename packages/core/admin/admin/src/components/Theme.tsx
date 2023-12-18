import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { createGlobalStyle } from 'styled-components';

import { useThemeToggle } from '../contexts/themeToggle';

const loadCss = async () => {
  await import(/* webpackChunkName: "fontawesome-css" */ 'font-awesome/css/font-awesome.min.css');
  await import(
    /* webpackChunkName: "fontawesome-css-all" */ '@fortawesome/fontawesome-free/css/all.css'
  );
  await import(/* webpackChunkName: "fontawesome-js" */ '@fortawesome/fontawesome-free/js/all.min');
};

loadCss();

interface ThemeProps {
  children: React.ReactNode;
}

const Theme = ({ children }: ThemeProps) => {
  const { currentTheme, themes, systemTheme } = useThemeToggle();
  const { locale } = useIntl();

  const computedThemeName = currentTheme === 'system' ? systemTheme : currentTheme;

  return (
    <DesignSystemProvider
      locale={locale}
      /**
       * TODO: could we make this neater i.e. by setting up the context to throw
       * if it can't find it, that way the type is always fully defined and we're
       * not checking it all the time...
       */
      theme={themes?.[computedThemeName || 'light']}
    >
      {children}
      <GlobalStyle />
    </DesignSystemProvider>
  );
};

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

export { Theme };

import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: () => new Promise(() => { }),
    },
  }),
}));

test('renders MATB-II Simulation title', () => {
  render(<App />);
  const titleElement = screen.getByText('mainMenu.title');
  expect(titleElement).toBeInTheDocument();
});

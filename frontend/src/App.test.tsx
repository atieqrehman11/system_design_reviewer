import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SystemDesignMentor title', () => {
  render(<App />);
  const titleElement = screen.getByText(/SystemDesignMentor/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders description text', () => {
  render(<App />);
  const descriptionElement = screen.getByText(/AI-powered architecture analysis and recommendations/i);
  expect(descriptionElement).toBeInTheDocument();
});

test('renders ready message', () => {
  render(<App />);
  const readyElement = screen.getByText(/Frontend application is ready for development/i);
  expect(readyElement).toBeInTheDocument();
});
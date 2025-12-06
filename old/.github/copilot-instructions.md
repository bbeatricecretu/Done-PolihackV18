# Copilot Instructions for NoAIUsed Project

## Project Architecture
This workspace contains two distinct applications sharing a similar design language:
- **Frontend (`/frontend`)**: A Web application built with React, Vite, and Tailwind CSS.
- **Mobile (`/mobile`)**: A Mobile application built with React Native and Expo.

## Frontend (`/frontend`)
- **Tech Stack**: React 18+, Vite, Tailwind CSS, Lucide React.
- **Styling**: Utility-first CSS with Tailwind. Global styles in `src/styles/globals.css`.
- **Navigation**: Currently uses simple state-based navigation (`currentPage` in `App.tsx`).
- **Components**: Located in `src/components`. UI primitives in `src/components/ui` (shadcn/ui-like structure).
- **Icons**: `lucide-react`.

## Mobile (`/mobile`)
- **Tech Stack**: React Native, Expo, TypeScript.
- **Styling**: `StyleSheet.create` and `expo-linear-gradient`.
- **Navigation**: State-based navigation (`currentPage` in `App.tsx`).
- **Icons**: `lucide-react-native`.
- **Layout**: Uses `SafeAreaProvider` and `SafeAreaView` from `react-native-safe-area-context`.

## Shared Patterns
- **State Management**: Local state (`useState`) is currently used for navigation and simple data.
- **Component Structure**: Both apps mirror each other's component structure (`HomePage`, `Navbar`, `ChatBoxPage`, `TasksPage`, `SettingsPage`).
- **Design System**: Consistent color palette (gradients of blue, purple, pink) and rounded aesthetics.

## Development Workflow
- **Frontend**: Run `npm run dev` in `frontend/`.
- **Mobile**: Run `npx expo start` in `mobile/`.
- **Windows**: Use `run_app.bat` to start the frontend.

## Coding Conventions
- **React**: Functional components with hooks.
- **Types**: Use TypeScript interfaces for props.
- **File Naming**: PascalCase for components (`App.tsx`, `Navbar.tsx`).
- **Imports**: Group imports by library, then local components.

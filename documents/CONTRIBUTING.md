# Contributing to SwitchCV

## Development Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/switchCV.git
   cd switchCV
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up Firebase (see [Installation Guide](./INSTALL.md))

5. Start development server:

   ```bash
   npm run dev
   ```

## Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments to functions and components
- Follow React best practices and hooks guidelines

## Testing

### Running Tests

- Run the full test suite:

  ```bash
  npm test
  ```

- Run tests with coverage report:

  ```bash
  npm test -- --coverage
  ```

- Run specific test file:
  ```bash
  npm test -- --testPathPatterns="component-name.test.tsx"
  ```

### Testing Guidelines

- Write unit tests for all new components and hooks
- Write integration tests for complex user flows
- Aim for 80%+ test coverage
- Mock external dependencies (Firebase, APIs)
- Test error states and edge cases
- Use React Testing Library for component testing

### Test Structure

```
src/__tests__/
├── app/                 # Page component tests
├── components/          # UI component tests
├── hooks/              # Custom hook tests
├── lib/                # Utility function tests
└── types/              # Type definition tests
```

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Refactor, etc.)
- Keep first line under 50 characters
- Reference issue numbers when applicable

## Pull Request Process

1. Ensure all tests pass and coverage is maintained
2. Update documentation if needed
3. Add screenshots for UI changes
4. The PR will be merged once reviewed and approved
5. All PRs require at least one approval before merging

## Branch Naming

- Feature branches: `feature/description-of-feature`
- Bug fixes: `fix/description-of-bug`
- Documentation: `docs/description-of-docs`

## Code Review Checklist

- [ ] Tests pass and coverage maintained
- [ ] Code follows TypeScript and React best practices
- [ ] No ESLint errors or warnings
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] No sensitive information exposed

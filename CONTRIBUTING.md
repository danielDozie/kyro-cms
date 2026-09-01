# Contributing to Kyro CMS

Thank you for your interest in contributing to Kyro CMS! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/danielDozie/kyro-cms.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
pnpm install

# Build the core package
pnpm run build

# Run tests
pnpm run test

# Start development
cd admin && pnpm run dev
```

## Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass: `pnpm run test`
4. Update the CHANGELOG.md if applicable
5. Submit your PR with a clear description

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Reporting Bugs

Please use the [GitHub Issues](https://github.com/danielDozie/kyro-cms/issues) to report bugs. Include:

- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node version, OS, database type)

## Feature Requests

Feature requests are welcome! Please include:

- Clear description of the feature
- Use case or problem it solves
- Any alternative solutions considered

## License

By contributing, you agree that your contributions will be licensed under the project's license.

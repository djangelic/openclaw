# Contributing to TransparentClaw

We love contributions! TransparentClaw is all about transparency, and that includes our development process. Whether you're fixing bugs, adding features, or improving documentation, we want to make contributing as easy and transparent as possible.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### 🐛 Reporting Bugs

Found a bug? Help us improve by reporting it:

1. **Check existing issues** first to avoid duplicates
2. **Use our bug report template** when creating a new issue
3. **Provide detailed information**:
   - TransparentClaw version (`tclaw --version`)
   - Operating system and version
   - Docker/Docker Compose versions
   - Complete error messages
   - Steps to reproduce the issue
   - Expected vs actual behavior

### 💡 Suggesting Features

Have an idea for a new feature?

1. **Check the roadmap** in README.md to see if it's already planned
2. **Open a feature request** using our template
3. **Describe the use case** - why would this be valuable?
4. **Propose implementation** if you have technical ideas
5. **Be patient** - we'll discuss feasibility and priority

### 🔧 Contributing Code

Ready to write some code? Great!

#### First-Time Contributors

Look for issues labeled `good first issue` or `help wanted`. These are specifically chosen to be approachable for newcomers.

#### Development Process

1. **Fork** the repository
2. **Create a branch** for your changes
3. **Make your changes** following our guidelines
4. **Test thoroughly** (see testing section below)
5. **Submit a pull request**

## Development Setup

### Prerequisites

- **Node.js** 18+ 
- **Docker** and **Docker Compose**
- **Git**
- A code editor (VS Code recommended)

### Local Development

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/transparentclaw.git
   cd transparentclaw
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development services**:
   ```bash
   npm run dev
   ```

This will:
- Start the CLI in development mode
- Launch Docker services for testing
- Set up file watchers for automatic rebuilds

### Project Structure

```
transparentclaw/
├── cli/                    # Command-line interface
│   ├── src/
│   │   ├── commands/       # CLI command implementations
│   │   ├── installers/     # AI-guided installation logic
│   │   ├── templates/      # Docker/config templates
│   │   └── utils/          # Shared utilities
│   └── tests/
├── bridge/                 # OpenClaw ↔ n8n bridge service
│   ├── src/
│   │   ├── sync/           # Data synchronization
│   │   ├── api/            # API endpoints
│   │   └── models/         # Data models
│   └── tests/
├── docker/                 # Docker configurations
│   ├── n8n/                # n8n customizations
│   ├── postgres/           # Database setup
│   └── compose/            # Docker Compose templates
├── templates/              # Workflow and config templates
│   ├── workflows/          # n8n workflow templates
│   ├── data-tables/        # Initial data table schemas
│   └── configs/            # Default configurations
└── docs/                   # Documentation
```

### Code Style

We use consistent code style across the project:

#### TypeScript/JavaScript

- **ESLint + Prettier** for formatting
- **Strict TypeScript** configuration
- **2 spaces** for indentation
- **Semicolons** required
- **Single quotes** for strings

Run code formatting:
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Prettier formatting
```

#### Best Practices

1. **Use TypeScript** for all new code
2. **Write JSDoc comments** for public APIs
3. **Handle errors gracefully** with meaningful messages
4. **Use async/await** instead of promises/callbacks
5. **Validate all inputs** to prevent runtime errors
6. **Add unit tests** for new functions
7. **Use descriptive variable names**
8. **Keep functions small and focused**

#### Example Code Style

```typescript
/**
 * Validates and parses CLI arguments for skill creation
 * @param args Raw command line arguments
 * @returns Parsed and validated skill configuration
 */
export async function parseSkillArgs(args: string[]): Promise<SkillConfig> {
  const config: SkillConfig = {
    name: '',
    description: '',
    category: 'utility',
    parameters: []
  };
  
  // Validate required arguments
  if (!args.includes('--name')) {
    throw new Error('Skill name is required (--name)');
  }
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--name':
        config.name = args[i + 1];
        if (!config.name) {
          throw new Error('Skill name cannot be empty');
        }
        break;
        
      case '--description':
        config.description = args[i + 1] || '';
        break;
        
      case '--category':
        config.category = validateCategory(args[i + 1]);
        break;
    }
  }
  
  return config;
}
```

## Testing

We maintain high test coverage to ensure reliability:

### Test Types

1. **Unit Tests** - Individual functions and modules
2. **Integration Tests** - Component interactions  
3. **End-to-End Tests** - Full workflow testing
4. **Installation Tests** - CLI installer validation

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # End-to-end tests
npm run test:install     # Installation tests

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

#### Unit Tests

Use Jest with these patterns:

```typescript
import { parseSkillArgs } from '../src/skills/parser';

describe('parseSkillArgs', () => {
  it('should parse basic skill arguments', async () => {
    const args = ['--name', 'test-skill', '--description', 'A test skill'];
    const result = await parseSkillArgs(args);
    
    expect(result.name).toBe('test-skill');
    expect(result.description).toBe('A test skill');
    expect(result.category).toBe('utility'); // default
  });
  
  it('should throw error when name is missing', async () => {
    const args = ['--description', 'Missing name'];
    
    await expect(parseSkillArgs(args)).rejects.toThrow('Skill name is required');
  });
});
```

#### Integration Tests

Test component interactions:

```typescript
import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/test-env';
import { BridgeService } from '../src/bridge/service';
import { DataTableSync } from '../src/sync/data-tables';

describe('Bridge Service Integration', () => {
  let bridge: BridgeService;
  
  beforeEach(async () => {
    await setupTestEnvironment();
    bridge = new BridgeService({
      n8nUrl: process.env.TEST_N8N_URL,
      dbUrl: process.env.TEST_DB_URL
    });
  });
  
  afterEach(async () => {
    await teardownTestEnvironment();
  });
  
  it('should sync memory data between OpenClaw and n8n', async () => {
    // Test implementation
  });
});
```

### Test Requirements

- **All new features** must include tests
- **Bug fixes** should include regression tests
- **Maintain 80%+ code coverage**
- **Tests must pass** before merge
- **Integration tests** for external dependencies

## Documentation

Good documentation is crucial for user adoption:

### Documentation Types

1. **API Documentation** - Generated from JSDoc comments
2. **User Guides** - Step-by-step tutorials in `/docs`
3. **Architecture Docs** - Technical deep dives
4. **Code Comments** - Inline explanations for complex logic

### Writing Guidelines

- **Clear and concise** language
- **Step-by-step instructions** with code examples
- **Screenshots** for UI-heavy processes
- **Common troubleshooting** scenarios
- **Up-to-date** with current features

### Documentation Structure

```markdown
# Feature Name

Brief description of what this feature does and why it's useful.

## Prerequisites

- List required setup
- Dependencies needed
- Permissions required

## Usage

### Basic Usage

```bash
# Show command example
tclaw command --option value
```

### Advanced Usage

More complex examples with explanations.

## Configuration

Explain configuration options.

## Troubleshooting

Common issues and solutions.

## Examples

Real-world usage examples.
```

## Pull Request Process

### Before Submitting

1. **Test your changes** thoroughly
2. **Update documentation** if needed  
3. **Add/update tests** for new functionality
4. **Run the full test suite** and ensure it passes
5. **Check code style** with linting tools
6. **Verify installation** works with your changes

### PR Guidelines

1. **Use our PR template** - provides structure and checklist
2. **Clear title** - describe what the PR does
3. **Detailed description** - explain the changes and why
4. **Link related issues** - use "Fixes #123" syntax
5. **Request reviews** from relevant maintainers
6. **Be responsive** to feedback and suggestions

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)  
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Installation tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No new warnings or errors

## Screenshots (if applicable)
Include before/after screenshots for UI changes.
```

### Review Process

1. **Automated checks** run first (tests, linting, build)
2. **Code review** by at least one maintainer
3. **Testing** on multiple environments if significant
4. **Documentation review** for user-facing changes
5. **Final approval** and merge

## Issue Templates

### Bug Report

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen.

## Actual Behavior  
What actually happens.

## Environment
- TransparentClaw version:
- OS:
- Docker version:
- n8n version:

## Additional Context
Screenshots, logs, or other relevant information.
```

### Feature Request

```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How do you envision this working?

## Alternative Solutions
Other approaches you've considered.

## Additional Context
Any other relevant information.
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Release Steps

1. **Update version numbers** in package.json files
2. **Update CHANGELOG.md** with new features and fixes
3. **Create release branch** from main
4. **Run full test suite** on multiple environments
5. **Build and test installation** packages
6. **Create GitHub release** with detailed notes
7. **Publish to npm** registry
8. **Update documentation** website
9. **Announce** on community channels

## Community

### Getting Help

- **GitHub Discussions** - Questions and community chat
- **GitHub Issues** - Bug reports and feature requests  
- **Discord Server** - Real-time community support
- **Documentation** - Comprehensive guides and references

### Staying Updated

- **Watch** the repository for notifications
- **Follow** the project on social media
- **Subscribe** to release announcements
- **Join** our Discord community

## Recognition

We appreciate all contributors! Your contributions will be:
- **Listed** in our CONTRIBUTORS.md file
- **Mentioned** in release notes
- **Highlighted** in community updates
- **Credited** in documentation you help create

## Questions?

Don't hesitate to ask questions:
- **Open an issue** for project-related questions
- **Start a discussion** for broader topics
- **Join Discord** for real-time help
- **Email maintainers** for private matters

---

**Thank you for contributing to TransparentClaw!** Together, we're building the future of transparent AI agents. 🚀
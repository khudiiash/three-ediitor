# Contributing Guide

Thank you for your interest in contributing to the Three.js ECS Game Engine!

## 🏗️ Project Structure

```
three-engine/
├── engine/          # TypeScript/Three.js engine
├── editor/          # Rust editor
├── examples/        # Example projects (future)
└── docs/           # Documentation (future)
```

## 🚀 Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ and Cargo
- **Git**

### Engine Setup

```bash
cd engine
npm install
npm run dev      # Start dev server
npm run build    # Build for production
npm test         # Run tests
```

### Editor Setup

```bash
cd editor
cargo build      # Build editor
cargo run        # Run editor
cargo test       # Run tests
```

## 📝 Code Style

### TypeScript (Engine)

- Use **modern ES6+** syntax
- Prefer `const` and `let` over `var`
- Use **arrow functions** for callbacks
- Add **JSDoc comments** for public APIs
- Use **TypeScript types** everywhere

```typescript
/**
 * Example component with proper documentation.
 */
export class ExampleComponent extends Component {
  static readonly componentId = 'Example';

  /**
   * Example property.
   */
  value: number = 0;

  /**
   * Example method.
   */
  doSomething(): void {
    // Implementation
  }
}
```

### Rust (Editor)

- Follow **Rust conventions**
- Use `cargo fmt` before committing
- Use `cargo clippy` to catch issues
- Add documentation comments for public APIs

```rust
/// Example struct with proper documentation.
pub struct Example {
    /// Example field.
    pub value: i32,
}

impl Example {
    /// Creates a new Example.
    pub fn new(value: i32) -> Self {
        Self { value }
    }
}
```

## 🧪 Testing

### Engine Tests

```bash
cd engine
npm test
```

Write tests for:
- ECS core functionality
- Component serialization
- System execution
- World management

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { Entity } from './Entity';
import { TransformComponent } from '../components/TransformComponent';

describe('Entity', () => {
  it('should add and retrieve components', () => {
    const entity = new Entity('Test');
    const transform = new TransformComponent();
    
    entity.addComponent(transform);
    
    expect(entity.hasComponent(TransformComponent)).toBe(true);
    expect(entity.getComponent(TransformComponent)).toBe(transform);
  });
});
```

### Editor Tests

```bash
cd editor
cargo test
```

## 🔄 Git Workflow

1. **Fork** the repository
2. **Clone** your fork
3. Create a **feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```
4. **Commit** your changes
   ```bash
   git commit -m "Add: my feature description"
   ```
5. **Push** to your fork
   ```bash
   git push origin feature/my-feature
   ```
6. Create a **Pull Request**

### Commit Message Format

Use conventional commits:

- `Add: new feature`
- `Fix: bug description`
- `Update: change description`
- `Remove: removed feature`
- `Refactor: code improvement`
- `Docs: documentation update`
- `Test: test addition/update`

## 📦 Adding New Features

### Adding a Component

1. Create component file in `engine/src/components/`
2. Extend `Component` base class
3. Add `componentId` static property
4. Implement `toJSON()` and `fromJSON()`
5. Export from `components/index.ts`
6. Add tests

Example:

```typescript
// engine/src/components/MyComponent.ts
import { Component } from '../ecs/Component';

export class MyComponent extends Component {
  static readonly componentId = 'My';

  value: number = 0;

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      value: this.value,
    };
  }

  fromJSON(data: Record<string, any>): void {
    super.fromJSON(data);
    if (data.value !== undefined) this.value = data.value;
  }
}
```

### Adding a System

1. Create system file in `engine/src/systems/`
2. Extend `System` base class
3. Define `requiredComponents`
4. Implement `update()` method
5. Add lifecycle hooks if needed
6. Export from `systems/index.ts`
7. Add tests

Example:

```typescript
// engine/src/systems/MySystem.ts
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { MyComponent } from '../components/MyComponent';

export class MySystem extends System {
  readonly requiredComponents = [MyComponent];

  update(entity: Entity, deltaTime: number): void {
    const my = entity.getComponent(MyComponent)!;
    my.value += deltaTime;
  }
}
```

## 🐛 Reporting Bugs

When reporting bugs, include:

1. **Description** of the issue
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment** (OS, browser, versions)
6. **Screenshots** if applicable

## 💡 Feature Requests

When requesting features:

1. **Describe the feature** clearly
2. **Explain the use case**
3. **Provide examples** if possible
4. **Consider alternatives**

## 📚 Documentation

- Add JSDoc/rustdoc comments for all public APIs
- Update README.md if needed
- Add examples for new features
- Update ROADMAP.md for major features

## ✅ Pull Request Checklist

Before submitting a PR:

- [ ] Code follows style guidelines
- [ ] Tests pass (`npm test` / `cargo test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Commits follow convention
- [ ] PR description is clear

## 🎯 Areas to Contribute

### Easy (Good First Issues)
- Add new geometry types to MeshComponent
- Add new light types to LightComponent
- Improve demo application
- Write documentation
- Add examples

### Medium
- Implement input system
- Add scene serialization
- Create new systems (audio, particles)
- Improve editor UI
- Add editor features

### Hard
- Physics integration
- Advanced rendering features
- Editor-engine communication
- Performance optimizations
- Networking support

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Every contribution, no matter how small, is valuable and appreciated!


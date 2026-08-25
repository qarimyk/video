# Contributing to VORTEX

Thank you for your interest in contributing to **VORTEX**! We appreciate your support in maintaining this high-performance offline media engine.

## 🎯 Code of Conduct & Design Standards

### 1. Design System: Nothing OS / CMF Aesthetic
- **Monochrome Palette**: Rely strictly on high-contrast black, white, and subtle cool neutral grays (`#f7f7f9`, `#e5e5e5`, `#737373`, `#0a0a0a`).
- **Typography**: Industrial sans-serif paired with monospace for metadata, timers, codecs, and telemetry chips.
- **Pill-shaped Containers & Generous Curves**: Use `rounded-full`, `rounded-[28px]`, and `rounded-[32px]`.
- **Anti-Slop**: No arbitrary purple/cyan gradients, no glowing drop shadows, and no cluttered multi-colored badges.

### 2. TypeScript & Code Quality
- All components and functions must be strictly typed.
- Avoid using `any`; define explicit interfaces in `src/types.ts`.
- Keep business logic isolated in `src/services/`.

## 🛠️ Development Workflow

1. **Clone & Install**:
   ```bash
   git clone https://github.com/your-org/vortex-media.git
   cd vortex-media
   npm install
   ```

2. **Branch Naming**:
   - `feature/description` for new capabilities
   - `fix/issue-description` for bug fixes
   - `perf/optimization` for performance enhancements

3. **Verify Builds**:
   ```bash
   npm run lint
   npm run build
   ```

4. **Pull Requests**:
   - Provide a clear summary of the problem solved.
   - Attach screenshots or GIFs for UI modifications.

Thank you for building with us!

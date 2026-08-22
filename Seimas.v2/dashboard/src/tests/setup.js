// The vitest entrypoint, not the bare one: it registers the matchers against
// vitest's expect rather than jest's. Pairs with the tsconfig `types` entry
// that makes them visible to the typechecker.
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'

// Simple test component
function SimpleComponent() {
  return <div>Hello Testing World!</div>
}

describe('Simple Component Test', () => {
  it('renders correctly', () => {
    render(<SimpleComponent />)
    expect(screen.getByText('Hello Testing World!')).toBeInTheDocument()
  })

  it('demonstrates Jest is working', () => {
    expect(2 + 2).toBe(4)
    expect('hello').toBe('hello')
  })
})
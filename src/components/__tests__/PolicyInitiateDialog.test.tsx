import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">+</div>,
  Send: () => <div data-testid="send-icon">→</div>,
  Loader2: () => <div data-testid="loader-icon">⟳</div>,
  X: () => <div data-testid="x-icon">×</div>,
}))

// Mock the UI components that cause issues
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) => render({ field: { onChange: jest.fn(), value: '' } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <div>{children}</div>,
  FormDescription: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}))

// Mock the hooks
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com', role: 'staff' },
    isAuthenticated: true,
    isLoading: false
  })
}))

import { PolicyInitiateDialog } from '../dialogs/PolicyInitiateDialog'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PolicyInitiateDialog', () => {
  const mockOnPolicyCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock packages API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 'standard',
          name: 'Seguro Estándar',
          price: 2000,
          description: 'Standard insurance package'
        },
        {
          id: 'premium',
          name: 'Fortaleza Premium',
          price: 3500,
          description: 'Premium insurance package'
        }
      ])
    })
  })

  it('renders the dialog trigger button', () => {
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    expect(triggerButton).toBeInTheDocument()
  })

  it('opens dialog when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/crear nueva aplicación de póliza/i)).toBeInTheDocument()
  })

  it('loads packages when dialog opens', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/packages')
    })
  })

  it('displays form fields correctly', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    // Wait for dialog to be fully loaded
    await waitFor(() => {
      expect(screen.getByLabelText(/email del inquilino/i)).toBeInTheDocument()
    })
    
    // Check form fields
    expect(screen.getByLabelText(/email del inquilino/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/teléfono del inquilino/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre del inquilino/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tarifa de investigación/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/% pago inquilino/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/% pago propietario/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duración del contrato/i)).toBeInTheDocument()
  })

  it('auto-calculates landlord percentage when tenant percentage changes', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/% pago inquilino/i)).toBeInTheDocument()
    })
    
    const tenantPercentInput = screen.getByLabelText(/% pago inquilino/i)
    const landlordPercentInput = screen.getByLabelText(/% pago propietario/i)
    
    // Change tenant percentage to 70%
    await user.clear(tenantPercentInput)
    await user.type(tenantPercentInput, '70')
    
    await waitFor(() => {
      expect(landlordPercentInput).toHaveValue(30)
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /crear y enviar/i })).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: /crear y enviar/i })
    await user.click(submitButton)
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('updates price when package is selected', async () => {
    const user = userEvent.setup()
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    // Wait for packages to load
    await waitFor(() => {
      expect(screen.getByText(/selecciona un paquete/i)).toBeInTheDocument()
    })
    
    // Select a package
    const packageSelect = screen.getByRole('combobox')
    await user.click(packageSelect)
    
    const premiumOption = screen.getByText(/fortaleza premium - \$3500 mxn/i)
    await user.click(premiumOption)
    
    // Check if price field is updated
    const priceInput = screen.getByLabelText(/precio/i)
    await waitFor(() => {
      expect(priceInput).toHaveValue(3500)
    })
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    
    // Mock successful policy creation
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 'standard', name: 'Seguro Estándar', price: 2000 }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          policy: { id: 'new-policy-id' },
          emailSent: true
        })
      })
    
    render(<PolicyInitiateDialog onPolicyCreated={mockOnPolicyCreated} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear nueva póliza/i })
    await user.click(triggerButton)
    
    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText(/email del inquilino/i)).toBeInTheDocument()
    })
    
    await user.type(screen.getByLabelText(/email del inquilino/i), 'tenant@example.com')
    await user.type(screen.getByLabelText(/teléfono del inquilino/i), '+1234567890')
    await user.type(screen.getByLabelText(/tarifa de investigación/i), '500')
    
    // Select package
    const packageSelect = screen.getByRole('combobox')
    await user.click(packageSelect)
    await user.click(screen.getByText(/seguro estándar - \$2000 mxn/i))
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /crear y enviar/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/policies/initiate', 
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('tenant@example.com')
        })
      )
    })
    
    expect(mockOnPolicyCreated).toHaveBeenCalled()
  })
})
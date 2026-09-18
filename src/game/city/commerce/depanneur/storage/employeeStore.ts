/**
 * employeeStore.ts
 * Gestion des employés du dépanneur
 */
import { create } from 'zustand'

export interface Employee {
  id: string
  name: string
  role: 'manager' | 'cashier' | 'stock_clerk'
  pin: string
  active: boolean
}

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp_mgr_01', name: 'Gérant Principal', role: 'manager', pin: '1234', active: true },
  { id: 'emp_csh_01', name: 'Caissier Couche-Tard', role: 'cashier', pin: '0000', active: true },
  { id: 'emp_stk_01', name: 'Commis d\'entrepôt', role: 'stock_clerk', pin: '1111', active: true },
]

interface EmployeeStoreState {
  employees: Employee[]
  getEmployee: (id: string) => Employee | undefined
  validatePin: (employeeId: string, pin: string) => boolean
}

export const useEmployeeStore = create<EmployeeStoreState>((set, get) => ({
  employees: DEFAULT_EMPLOYEES,
  getEmployee: (id) => get().employees.find((e) => e.id === id),
  validatePin: (employeeId, pin) => {
    const emp = get().employees.find((e) => e.id === employeeId)
    if (!emp) return false
    return emp.pin === pin
  },
}))

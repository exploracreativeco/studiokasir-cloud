import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function generateBookingNumber(count: number): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(count + 1).padStart(4, '0')
  return `BK-${yy}${mm}${dd}-${seq}`
}

export function generateInvoiceNumber(count: number): string {
  const now = new Date()
  const year = String(now.getFullYear()).slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const seq = String(count + 1).padStart(4, '0')
  return `INV-${year}${month}${day}-${seq}`
}

export function getMonthSheetName(date: Date | string): string {
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const d = new Date(date)
  return `${MONTHS[d.getMonth()]}_${d.getFullYear()}`
}

export const CATEGORY_LABELS: Record<string, string> = {
  GRADUATION: 'Graduation',
  FAMILY: 'Family',
  COUPLE: 'Couple',
  GROUP: 'Group',
  PRODUCT: 'Product',
  MATERNITY: 'Maternity',
  PHOTOBOOTH: 'Photobooth',
  VIDEO360: 'Video360',
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Listrik',
  PROPERTY: 'Properti',
  PRINT: 'Print',
  TRANSPORT: 'Transport',
  MAINTENANCE: 'Perawatan',
  MARKETING: 'Marketing',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
}

export const SYNC_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SYNCING: 'Syncing',
  SYNCED: 'Synced',
  FAILED: 'Failed',
  QUEUED: 'Queue',
}

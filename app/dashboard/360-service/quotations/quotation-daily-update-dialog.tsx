'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { getForecastCustomers } from '@/app/actions/central-service-forecast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'Outstanding', label: 'Outstanding' },
  { value: 'Service', label: 'Service' },
  { value: 'Repair', label: 'Repair' },
  { value: 'Retread', label: 'Retread' },
] as const

interface QuotationDailyUpdateDialogProps {
  subTotal: number
  poNumber: string
}

export function QuotationDailyUpdateDialog({ subTotal, poNumber }: QuotationDailyUpdateDialogProps) {
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Outstanding')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open && customers.length === 0) {
      getForecastCustomers()
        .then(setCustomers)
        .catch(() => toast.error('Failed to load customers'))
    }
  }, [open, customers.length])

  const handleContinue = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    const params = new URLSearchParams({
      valueNonVat: String(subTotal),
      poNumber: poNumber || '',
      customer: selectedCustomer,
      category: selectedCategory,
    })
    router.push(`/dashboard/central-service/forecast/daily?${params.toString()}`)
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        title="Daily Update (CS Forecast)"
        onClick={() => setOpen(true)}
      >
        <TrendingUp className="h-4 w-4 text-orange-600" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Daily Update (CS Forecast)
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Customer</Label>
              <Combobox
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                options={customers}
                placeholder="Pilih customer..."
                emptyText="No customers found."
                allowCustom={false}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted rounded-md p-3 text-sm">
              <p className="text-muted-foreground">Value (Non VAT): <span className="font-semibold text-foreground">{subTotal.toLocaleString('id-ID')}</span></p>
              <p className="text-muted-foreground">PO Number: <span className="font-semibold text-foreground">{poNumber || '-'}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleContinue} disabled={loading}>
              Continue to Daily Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

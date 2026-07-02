"use client"

import { Button } from "@/components/ui/button"
import { useTransition } from "react"
import { deleteCustomer } from "@/app/actions/service360"
import { toast } from "sonner"

export function DeleteCustomerButton({ customerId }: { customerId: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button 
      variant="destructive" 
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this customer?")) {
          startTransition(async () => {
            const result = await deleteCustomer(customerId)
            if (result?.error) {
              toast.error(result.error)
            } else {
              toast.success("Customer deleted successfully")
            }
          })
        }
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  )
}

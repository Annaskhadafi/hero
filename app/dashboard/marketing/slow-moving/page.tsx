import { getCosmeticTires } from "@/app/actions/cosmetic-tires"
import { getProducts } from "@/app/actions/product"
import { getSetting } from "@/app/actions/settings"
import { getSellingOutByMonth, getSlowMovingProducts } from "@/app/actions/slow-moving-products"
import { getStocksFromSapForSlowMoving } from "@/app/actions/stock-sap"
import { SlowMovingTabs } from "./_components/slow-moving-tabs"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Slow Moving",
}

export default async function SlowMovingPage() {
    const permission = await getCurrentMenuPermission('marketing_slow_moving')
    if (!permission.canView) redirect('/dashboard')

    const [stocks, savedRate, savedProducts, cosmeticTires, products] = await Promise.all([
        getStocksFromSapForSlowMoving(),
        getSetting("manual_usd_rate"),
        getSlowMovingProducts(),
        getCosmeticTires(),
        getProducts(),
    ])

    const materialKeys = savedProducts.map((p: any) => p.materialKey)
    const sellingOutByMonth = await getSellingOutByMonth(materialKeys)

    return (
        <SlowMovingTabs
            stocks={stocks}
            defaultRate={savedRate || "1"}
            savedProducts={savedProducts}
            cosmeticTires={cosmeticTires}
            products={products}
            sellingOutByMonth={sellingOutByMonth}
        />
    )
}
describe('Service360 Quotation Flat Price Calculation', () => {
  const PRORATE_CATEGORIES = ["Labour Cost", "Rental & Tools", "Rental", "Tools"]
  const isProrateEligible = (cat: string) => {
    if (!cat) return true
    return PRORATE_CATEGORIES.map(c => c.toLowerCase()).includes(cat.toLowerCase().trim())
  }

  function getCalculatedRowPrice({
    category,
    price,
    quantity,
    isFlatPrice,
    prorateFactor = 0.5,
  }: {
    category: string
    price: number
    quantity: number
    isFlatPrice: boolean
    prorateFactor?: number
  }) {
    if (isFlatPrice) {
      return price * quantity
    }
    if (isProrateEligible(category)) {
      return prorateFactor * price * quantity
    }
    return price * quantity
  }

  function getCalculatedBackupPrice({
    category,
    backupPrice,
    quantity,
    isBackup,
    isFlatPrice,
    backupProrateFactor = 0.3,
  }: {
    category: string
    backupPrice: number
    quantity: number
    isBackup: boolean
    isFlatPrice: boolean
    backupProrateFactor?: number
  }) {
    if (!isBackup) return 0
    if (isFlatPrice) {
      return backupPrice * quantity
    }
    if (isProrateEligible(category)) {
      return backupProrateFactor * backupPrice * quantity
    }
    return 0
  }

  it('calculates full price (price * quantity) without prorate when isFlatPrice is true for Labour Cost', () => {
    const price = 15000000
    const quantity = 2
    const flatResult = getCalculatedRowPrice({
      category: 'Labour Cost',
      price,
      quantity,
      isFlatPrice: true,
      prorateFactor: 0.5, // 15 days out of 30
    })

    expect(flatResult).toBe(30000000)
  })

  it('prorates price when isFlatPrice is false for Labour Cost', () => {
    const price = 15000000
    const quantity = 2
    const prorateResult = getCalculatedRowPrice({
      category: 'Labour Cost',
      price,
      quantity,
      isFlatPrice: false,
      prorateFactor: 0.5,
    })

    expect(prorateResult).toBe(15000000)
  })

  it('calculates backup price without prorate when isFlatPrice is true', () => {
    const backupPrice = 12000000
    const quantity = 1
    const flatBackup = getCalculatedBackupPrice({
      category: 'Labour Cost',
      backupPrice,
      quantity,
      isBackup: true,
      isFlatPrice: true,
      backupProrateFactor: 0.33,
    })

    expect(flatBackup).toBe(12000000)
  })

  it('prorates backup price when isFlatPrice is false', () => {
    const backupPrice = 12000000
    const quantity = 1
    const proratedBackup = getCalculatedBackupPrice({
      category: 'Labour Cost',
      backupPrice,
      quantity,
      isBackup: true,
      isFlatPrice: false,
      backupProrateFactor: 0.5,
    })

    expect(proratedBackup).toBe(6000000)
  })
})

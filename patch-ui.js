const fs = require('fs');
const file = 'd:/[01] PROJECT/HERO/components/scheduling-timesheet-workspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetHelper = `  function updateSiteConfig<Key extends keyof SiteSchedulingConfig>(`;

const newHelper = `  function updateOvertimeConfig(
    dayKey: keyof SiteOvertimeConfigMap,
    shiftKey: 'dayShift' | 'nightShift' | 'totalOt',
    index: number | null,
    field: keyof SiteOvertimeShiftTime | null,
    value: string | number
  ) {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return

    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      const currentOt = currentConfig.overtimeConfig ?? defaultSiteConfig.overtimeConfig!
      
      const updatedOt = { ...currentOt }
      const updatedDay = { ...updatedOt[dayKey] }
      
      if (shiftKey === 'totalOt') {
        updatedDay.totalOt = Number(value)
      } else if (index !== null && field !== null) {
        const updatedShiftArr = [...updatedDay[shiftKey]]
        updatedShiftArr[index] = { ...updatedShiftArr[index], [field]: value }
        updatedDay[shiftKey] = updatedShiftArr as any
      }
      updatedOt[dayKey] = updatedDay

      return {
        ...current,
        [siteId]: { ...currentConfig, overtimeConfig: updatedOt },
      }
    })
  }

  function updateSiteConfig<Key extends keyof SiteSchedulingConfig>(`;

if (content.includes(targetHelper)) {
  content = content.replace(targetHelper, newHelper);
  console.log('Success Helper');
}

const targetUI = `                {/* Tunjangan Lokasi Khusus */}`;

const newUI = `                {!isJktOrBpn && siteConfig.overtimeConfig ? (
                  <div className="border-border/40 border-t bg-surface-container-low/30">
                    <div className="border-border/20 border-b px-4 py-3">
                      <p className="font-display text-foreground text-sm font-semibold">
                        Section Overtime (OT)
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Konfigurasi jam lembur spesifik untuk Site di luar Balikpapan dan Jakarta
                      </p>
                    </div>
                    <div className="grid gap-6 p-4 xl:grid-cols-3">
                      {(['hariBiasa', 'hariLibur', 'hariKe6'] as const).map((dayKey) => {
                        const dayLabel = 
                          dayKey === 'hariBiasa' ? 'Hari Biasa' : 
                          dayKey === 'hariLibur' ? 'Hari Libur / Tanggal Merah' : 'Hari Ke-6 Sebelum Off'
                        const dayData = siteConfig.overtimeConfig![dayKey]
                        return (
                          <div key={dayKey} className="bg-surface-container-low rounded-xl border border-border/40 p-4">
                            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                              <span className="font-semibold text-sm">{dayLabel}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Total OT:</span>
                                <Input 
                                  type="number" 
                                  className="h-7 w-16 px-2 text-right" 
                                  value={dayData.totalOt}
                                  onChange={(e) => updateOvertimeConfig(dayKey, 'totalOt', null, null, e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Day Shift</p>
                                <div className="space-y-2">
                                  {dayData.dayShift.map((shift, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Input type="time" className="h-8 flex-1" value={shift.start} onChange={(e) => updateOvertimeConfig(dayKey, 'dayShift', idx, 'start', e.target.value)} />
                                      <span className="text-muted-foreground">-</span>
                                      <Input type="time" className="h-8 flex-1" value={shift.end} onChange={(e) => updateOvertimeConfig(dayKey, 'dayShift', idx, 'end', e.target.value)} />
                                      <Input type="number" className="h-8 w-16" value={shift.hours} onChange={(e) => updateOvertimeConfig(dayKey, 'dayShift', idx, 'hours', Number(e.target.value))} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Night Shift</p>
                                <div className="space-y-2">
                                  {dayData.nightShift.map((shift, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Input type="time" className="h-8 flex-1" value={shift.start} onChange={(e) => updateOvertimeConfig(dayKey, 'nightShift', idx, 'start', e.target.value)} />
                                      <span className="text-muted-foreground">-</span>
                                      <Input type="time" className="h-8 flex-1" value={shift.end} onChange={(e) => updateOvertimeConfig(dayKey, 'nightShift', idx, 'end', e.target.value)} />
                                      <Input type="number" className="h-8 w-16" value={shift.hours} onChange={(e) => updateOvertimeConfig(dayKey, 'nightShift', idx, 'hours', Number(e.target.value))} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Tunjangan Lokasi Khusus */}`;

if (content.includes(targetUI)) {
  content = content.replace(targetUI, newUI);
  console.log('Success UI');
}

fs.writeFileSync(file, content);

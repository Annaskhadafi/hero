export const ROAD_CONDITION_RESOURCE = 'hse_road_condition_analysis'

export type RoadConditionCategoryKey = 'haulroad' | 'loading_point' | 'disposal'

export type RoadConditionCriterion = {
  id: string
  title: string
  titleEn: string
  prompt: string
  ratings: Record<1 | 2 | 3 | 4 | 5, string>
}

export type RoadConditionCategory = {
  key: RoadConditionCategoryKey
  label: string
  reportLabel: string
  color: string
  criteria: RoadConditionCriterion[]
}

export type RoadConditionScore = 1 | 2 | 3 | 4 | 5

export type RoadConditionAssessmentTemplate = {
  criterionId: string
  score: RoadConditionScore
  description: string
  recommendation: string
}

const spillageRatings = {
  1: 'Tumpahan material sangat banyak dan tidak mungkin dihindari unit; berpotensi menyebabkan kegagalan BAN dalam waktu singkat.',
  2: 'Tumpahan material banyak dan sulit dihindari unit; berpotensi menyebabkan kerusakan BAN serius.',
  3: 'Tumpahan material cukup signifikan, namun masih memungkinkan dihindari dan segera dibersihkan.',
  4: 'Tumpahan material kecil dan tidak berpotensi merusak atau mengancam BAN.',
  5: 'Tidak ada tumpahan material.',
} satisfies RoadConditionCriterion['ratings']

const undulationRatings = {
  1: 'Undulasi tidak bisa dihindari dalam jumlah banyak dan memberi beban kejut parah pada BAN.',
  2: 'Undulasi tidak bisa dihindari dalam jumlah lebih sedikit dan memberi beban kejut baik saat kosong maupun bermuatan.',
  3: 'Undulasi dapat dihindari dan memberi pengaruh kecil terhadap BAN.',
  4: 'Undulasi dapat dihindari dan memberi pengaruh sangat kecil atau tidak ada pengaruh terhadap BAN.',
  5: 'Tidak ada undulasi.',
} satisfies RoadConditionCriterion['ratings']

const firmnessRatings = {
  1: 'Kondisi sangat buruk: genangan luas, lumpur dalam, tanah tidak stabil, berpotensi spin, sidewall cuts, dan kembangan terpotong.',
  2: 'Kondisi buruk: spot genangan cukup banyak, lumpur dalam, tanah tidak stabil, memberi kontribusi terhadap spin dan sidewall cuts.',
  3: 'Kondisi cukup buruk: beberapa genangan, lumpur, dan tanah tidak stabil yang masih berkontribusi terhadap kerusakan BAN.',
  4: 'Kepadatan cukup baik, jejak ban masih jelas dan pengaruh ke area tapak kecil.',
  5: 'Kepadatan ideal, hampir tidak ada jejak ban dan BAN bisa menapak sempurna.',
} satisfies RoadConditionCriterion['ratings']

const supportEquipmentRatings = {
  1: 'Peralatan pendukung tidak terlihat dan kondisi area tidak bagus.',
  2: 'Peralatan pendukung terlihat ada tetapi tidak bekerja dan kondisi area tidak bagus.',
  3: 'Peralatan pendukung ada dan bekerja, namun kurang efektif sehingga tumpahan atau undulasi masih dominan.',
  4: 'Peralatan pendukung ada dan bekerja cukup efektif, tumpahan atau undulasi tersisa kecil.',
  5: 'Peralatan pendukung bekerja sangat efektif sehingga area hampir bersih atau kondisi sudah baik.',
} satisfies RoadConditionCriterion['ratings']

export const ROAD_CONDITION_CATEGORIES: Record<RoadConditionCategoryKey, RoadConditionCategory> = {
  loading_point: {
    key: 'loading_point',
    label: 'Loading Point',
    reportLabel: 'LOADING POINT',
    color: '#0f4c75',
    criteria: [
      {
        id: 'spillage',
        title: 'Tumpahan / Spillage',
        titleEn: 'Spillage',
        prompt: 'Tumpahan material di sekitar titik pemuatan harus bisa dihindari dan cepat dibersihkan.',
        ratings: spillageRatings,
      },
      {
        id: 'loading_point',
        title: 'Titik Pemuatan / Loading Point',
        titleEn: 'Loading Point',
        prompt: 'Titik pemuatan ideal bagi BAN harus bersih dari puing material atau batu, dan cukup luas untuk manuver alat angkut.',
        ratings: {
          1: 'Area pemuatan sangat tidak ideal: sangat sempit, BAN selalu terlihat menginjak batu atau tanggul.',
          2: 'Area pemuatan tidak ideal: sempit, BAN sering menginjak batu atau tanggul.',
          3: 'Area pemuatan cukup bagus: cukup luas untuk manuver, BAN jarang menginjak batu atau tanggul.',
          4: 'Area pemuatan ideal: luas untuk manuver, BAN jarang sekali menginjak batu atau menaiki tanggul.',
          5: 'Area pemuatan sangat ideal: sangat luas untuk manuver, tidak terlihat BAN menginjak batu atau menaiki tanggul.',
        },
      },
      {
        id: 'undulation',
        title: 'Undulasi / Undulation',
        titleEn: 'Undulation',
        prompt: 'Jalan bergelombang menimbulkan ayunan BAN dan beban tarik lebih besar akibat beban kejut.',
        ratings: undulationRatings,
      },
      {
        id: 'area_firmness',
        title: 'Kepadatan Area / Area Firmness',
        titleEn: 'Area Firmness',
        prompt: 'Kepadatan loading area dipengaruhi kondisi jalan, kubangan air, lumpur, dan stabilitas tanah.',
        ratings: firmnessRatings,
      },
      {
        id: 'support_equipment',
        title: 'Alat Pendukung / Support Equipment',
        titleEn: 'Support Equipment',
        prompt: 'Ketersediaan dan utilisasi dozer atau wheel dozer menjaga area loading tetap bersih dan rata.',
        ratings: supportEquipmentRatings,
      },
    ],
  },
  haulroad: {
    key: 'haulroad',
    label: 'Haulroad',
    reportLabel: 'HAULROAD',
    color: '#1a365d',
    criteria: [
      {
        id: 'spillage',
        title: 'Tumpahan / Spillage',
        titleEn: 'Spillage',
        prompt: 'Tumpahan material di sepanjang hauling road harus bisa dihindari karena memicu kerusakan BAN.',
        ratings: spillageRatings,
      },
      {
        id: 'cross_fall',
        title: 'Kemiringan Jalan / Cross Fall',
        titleEn: 'Cross Fall',
        prompt: 'Desain cross fall harus mengalirkan air tanpa memberi beban radial berlebih pada BAN.',
        ratings: {
          1: 'Cross fall lebih dari 3%, penampang tidak rata, dan memberi beban berlebih pada semua BAN.',
          2: 'Cross fall buruk atau tidak konsisten sehingga air tidak mengalir baik dan beban BAN meningkat.',
          3: 'Cross fall lebih dari 0% sampai kurang dari atau sama dengan 1%, penampang tidak rata dan memberi beban berlebih.',
          4: 'Cross fall mendekati ideal, penampang cukup rata, beban tambahan terhadap BAN kecil.',
          5: 'Cross fall lebih dari 1% sampai kurang dari atau sama dengan 3%, penampang rata dan tidak memberi beban berlebih.',
        },
      },
      {
        id: 'gradient',
        title: 'Tanjakan / Gradient',
        titleEn: 'Gradient',
        prompt: 'Semakin besar gradient, semakin tinggi potensi penurunan umur BAN saat unit bermuatan.',
        ratings: {
          1: 'Desain kemiringan tanjakan lebih dari 12%.',
          2: 'Desain kemiringan tanjakan antara 10% hingga 12%.',
          3: 'Desain kemiringan tanjakan antara 8% hingga 10%.',
          4: 'Desain kemiringan tanjakan sama dengan 8%.',
          5: 'Desain kemiringan tanjakan konsisten kurang dari 8%.',
        },
      },
      {
        id: 'corner_condition',
        title: 'Kondisi Tikungan / Corner Condition',
        titleEn: 'Corner Condition',
        prompt: 'Superelevasi tikungan dan rambu kecepatan harus sesuai agar tidak menambah beban BAN.',
        ratings: {
          1: 'Superelevasi terbalik di dua sisi dan menyebabkan beban berlebih pada BAN.',
          2: 'Superelevasi terbalik di salah satu sisi dan menyebabkan beban berlebih pada BAN.',
          3: 'Superelevasi sesuai arah tikungan dan tidak menyebabkan beban berlebih pada BAN.',
          4: 'Superelevasi sesuai arah tikungan dan terdapat rambu petunjuk kecepatan.',
          5: 'Superelevasi sesuai, tidak bergelombang, ada rambu kecepatan, ada ban pelindung, dan bersih dari tumpahan.',
        },
      },
      {
        id: 'road_firmness',
        title: 'Kepadatan Jalan / Road Firmness',
        titleEn: 'Road Firmness',
        prompt: 'Kepadatan haul road dipengaruhi kubangan air, lumpur, dan stabilitas tanah.',
        ratings: firmnessRatings,
      },
      {
        id: 'undulation',
        title: 'Undulasi / Undulation',
        titleEn: 'Undulation',
        prompt: 'Undulasi haul road meningkatkan ayunan dan beban kejut pada BAN.',
        ratings: undulationRatings,
      },
      {
        id: 'support_equipment',
        title: 'Alat Pendukung / Support Equipment',
        titleEn: 'Support Equipment',
        prompt: 'Grader atau dozer harus bekerja efektif menjaga haul road bersih dan rata.',
        ratings: supportEquipmentRatings,
      },
      {
        id: 'road_width',
        title: 'Lebar Jalan / Width Road',
        titleEn: 'Road Width',
        prompt: 'Lebar jalan harus memadai terhadap unit terbesar yang beroperasi di area tersebut.',
        ratings: {
          1: 'Lebar jalan kurang dari 3 kali lebar unit terbesar yang beroperasi.',
          2: 'Lebar jalan kurang memadai dan manuver atau passing berisiko.',
          3: 'Lebar jalan 3 sampai 3.5 kali lebar unit terbesar yang beroperasi.',
          4: 'Lebar jalan memadai dengan ruang manuver cukup.',
          5: 'Lebar jalan lebih dari 3.5 kali lebar unit terbesar yang beroperasi.',
        },
      },
    ],
  },
  disposal: {
    key: 'disposal',
    label: 'Disposal',
    reportLabel: 'DISPOSAL',
    color: '#1a4731',
    criteria: [
      {
        id: 'spillage',
        title: 'Tumpahan / Spillage',
        titleEn: 'Spillage',
        prompt: 'Tumpahan material di sekitar dumping point harus bisa dihindari dan cepat dibersihkan.',
        ratings: spillageRatings,
      },
      {
        id: 'dumping_point',
        title: 'Titik Pembuangan / Dumping Point',
        titleEn: 'Dumping Point',
        prompt: 'Titik pembuangan ideal harus bersih dari puing material atau batu dan cukup luas untuk manuver.',
        ratings: {
          1: 'Area pembuangan sangat tidak ideal: sangat sempit, BAN selalu terlihat menginjak batu atau tanggul.',
          2: 'Area pembuangan tidak ideal: sempit, BAN sering menginjak batu atau tanggul.',
          3: 'Area pembuangan cukup bagus: cukup luas untuk manuver, BAN jarang menginjak batu atau tanggul.',
          4: 'Area pembuangan ideal: luas untuk manuver, BAN jarang sekali menginjak batu atau menaiki tanggul.',
          5: 'Area pembuangan sangat ideal: sangat luas untuk manuver, tidak terlihat BAN menginjak batu atau menaiki tanggul.',
        },
      },
      {
        id: 'undulation',
        title: 'Undulasi / Undulation',
        titleEn: 'Undulation',
        prompt: 'Undulasi di dumping area meningkatkan ayunan dan beban kejut pada BAN.',
        ratings: undulationRatings,
      },
      {
        id: 'area_firmness',
        title: 'Kepadatan Area / Area Firmness',
        titleEn: 'Area Firmness',
        prompt: 'Kepadatan dumping area dipengaruhi kubangan air, lumpur, dan stabilitas tanah.',
        ratings: firmnessRatings,
      },
      {
        id: 'windrow',
        title: 'Material Pembatas / Windrow',
        titleEn: 'Windrow',
        prompt: 'Windrow mengarahkan unit ke titik pembuangan dan harus terlihat jelas serta rapi.',
        ratings: {
          1: 'Tidak ada material pembatas di jalan dumping yang luas atau tanggul pada dumping kecil.',
          2: 'Material pembatas ada tetapi sangat tidak jelas, rusak, atau tidak membantu arah unit.',
          3: 'Material pembatas ada tetapi tidak rapi dan putus-putus.',
          4: 'Material pembatas cukup terlihat dan cukup rapi, namun masih perlu perapihan.',
          5: 'Material pembatas terlihat jelas, rapi, dan membantu arah unit.',
        },
      },
      {
        id: 'support_equipment',
        title: 'Alat Pendukung / Support Equipment',
        titleEn: 'Support Equipment',
        prompt: 'Dozer atau wheel dozer harus optimal menjaga dumping area tetap baik.',
        ratings: supportEquipmentRatings,
      },
    ],
  },
}

export const ROAD_CONDITION_CATEGORY_OPTIONS = Object.values(ROAD_CONDITION_CATEGORIES || {}).map(
  ({ key, label }) => ({ value: key, label })
)

const ROAD_CONDITION_SCORE_RECOMMENDATIONS: Record<RoadConditionScore, string> = {
  1: 'Segera lakukan perbaikan prioritas tinggi pada parameter ini dan amankan area sebelum operasi dilanjutkan.',
  2: 'Lakukan tindakan korektif prioritas tinggi dan selesaikan sesegera mungkin.',
  3: 'Masukkan ke perbaikan terjadwal dan pantau ulang setelah tindakan selesai.',
  4: 'Pertahankan kondisi saat ini dan lakukan monitoring rutin.',
  5: 'Pertahankan kondisi baik ini sebagai standar operasi.',
}

export function normalizeRoadConditionScore(value: number): RoadConditionScore {
  const score = Math.round(Number(value))
  if (!Number.isFinite(score)) return 3
  return Math.max(1, Math.min(5, score)) as RoadConditionScore
}

export function getRoadConditionAssessmentTemplate(
  categoryKey: RoadConditionCategoryKey,
  criterionId: string,
  score: number
): RoadConditionAssessmentTemplate {
  const category = ROAD_CONDITION_CATEGORIES[categoryKey]
  const criterion = category.criteria.find((item) => item.id === criterionId) ?? category.criteria[0]
  const normalizedScore = normalizeRoadConditionScore(score)

  return {
    criterionId: criterion?.id ?? criterionId,
    score: normalizedScore,
    description: criterion?.ratings[normalizedScore] ?? '-',
    recommendation: `${criterion?.title ?? 'Parameter'}: ${ROAD_CONDITION_SCORE_RECOMMENDATIONS[normalizedScore]}`,
  }
}

export function getRoadConditionOverallScore(assessments: Array<{ score: number }>) {
  if (!assessments.length) return 3
  const average = assessments.reduce((total, item) => total + normalizeRoadConditionScore(item.score), 0) / assessments.length
  return normalizeRoadConditionScore(average)
}

export function getRoadConditionCategory(key: string): RoadConditionCategory | null {
  return ROAD_CONDITION_CATEGORIES[key as RoadConditionCategoryKey] ?? null
}

export function buildRoadConditionRubricPrompt(categoryKey: RoadConditionCategoryKey) {
  const category = ROAD_CONDITION_CATEGORIES[categoryKey]

  return category.criteria
    .map((criterion) => {
      const ratings = ([1, 2, 3, 4, 5] as const)
        .map((rating) => `${rating}: ${criterion.ratings[rating]}`)
        .join('\n')

      return `PARAMETER ${criterion.id} - ${criterion.title}
Konteks: ${criterion.prompt}
Skala:
${ratings}`
    })
    .join('\n\n')
}

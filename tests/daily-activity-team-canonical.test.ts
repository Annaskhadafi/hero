import assert from 'node:assert/strict'
import test from 'node:test'
import { formatActivityTeamGroups, canonicalizeTeamMembers } from '../lib/activity-team-format'

test('canonicalizeTeamMembers sorts and deduplicates names cleanly', () => {
  const result = canonicalizeTeamMembers('Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan; Muhammad Irpan\nFerry Saputra')
  assert.equal(
    result,
    'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan'
  )
})

test('formatActivityTeamGroups unifies identical team members with different permutations into a single team (PPA BIB case)', () => {
  // Case from PPA BIB session DAS-20261008-76793-145:
  // Items 1, 3, 11, 12 had: Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Ferry Saputra, Muhammad Irpan
  // Items 2, 5, 6, 7, 8, 9, 10 had: Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan
  // Item 4 had: Dedy Darmawan, Ferry Saputra, Ahyar Rifani, Ahmad Magfirah, Muhammad Irpan
  const items = [
    { id: 1, itemTeamMembersSummary: 'Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Ferry Saputra, Muhammad Irpan' },
    { id: 2, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 3, itemTeamMembersSummary: 'Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Ferry Saputra, Muhammad Irpan' },
    { id: 4, itemTeamMembersSummary: 'Dedy Darmawan, Ferry Saputra, Ahyar Rifani, Ahmad Magfirah, Muhammad Irpan' },
    { id: 5, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 6, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 7, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 8, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 9, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 10, itemTeamMembersSummary: 'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan' },
    { id: 11, itemTeamMembersSummary: 'Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Ferry Saputra, Muhammad Irpan' },
    { id: 12, itemTeamMembersSummary: 'Dedy Darmawan, Ahmad Magfirah, Ahyar Rifani, Ferry Saputra, Muhammad Irpan' },
  ]

  const sessionSummary = 'Muhammad Irpan, Dedy Darmawan, Ferry Saputra, Ahmad Magfirah, Ahyar Rifani'
  const result = formatActivityTeamGroups(items, sessionSummary)

  assert.equal(result.hasTeams, true, 'hasTeams must be true')
  assert.equal(result.isSingleTeam, true, 'Must evaluate to singleTeam because all items share the same 5 members')
  assert.equal(
    result.singleTeamText,
    'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan',
    'singleTeamText must be clean, canonical, and sorted'
  )
  assert.equal(result.groups.length, 1)
  assert.equal(
    result.groups[0].fullDisplay,
    'Ahmad Magfirah, Ahyar Rifani, Dedy Darmawan, Ferry Saputra, Muhammad Irpan',
    'Must not have prefix numbers like 1) 2) 3) ...'
  )
})

test('formatActivityTeamGroups properly groups different team compositions per activity', () => {
  const items = [
    { id: 1, itemTeamMembersSummary: 'Budi, Ahmad' },
    { id: 2, itemTeamMembersSummary: 'Ahmad, Budi' }, // same team, different order
    { id: 3, itemTeamMembersSummary: 'Cici, Doni' },   // different team
  ]

  const result = formatActivityTeamGroups(items)

  assert.equal(result.hasTeams, true)
  assert.equal(result.isSingleTeam, false)
  assert.equal(result.groups.length, 2)
  assert.deepEqual(result.groups[0].activityNumbers, [1, 2])
  assert.equal(result.groups[0].prefixLabel, '1) 2)')
  assert.equal(result.groups[0].teamMembers, 'Ahmad, Budi')

  assert.deepEqual(result.groups[1].activityNumbers, [3])
  assert.equal(result.groups[1].prefixLabel, '3)')
  assert.equal(result.groups[1].teamMembers, 'Cici, Doni')
})

test('formatActivityTeamGroups returns hasTeams: false when no team members exist', () => {
  const items = [
    { id: 1, itemTeamMembersSummary: null },
    { id: 2, itemTeamMembersSummary: '' },
  ]
  const result = formatActivityTeamGroups(items, null)
  assert.equal(result.hasTeams, false)
  assert.equal(result.isSingleTeam, false)
  assert.equal(result.groups.length, 0)
})

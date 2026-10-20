export interface TeamGroup {
  activityNumbers: number[];
  prefixLabel: string;
  teamMembers: string;
  fullDisplay: string;
}

export interface ActivityTeamResult {
  hasTeams: boolean;
  isSingleTeam: boolean;
  singleTeamText: string;
  groups: TeamGroup[];
}

/**
 * Formats daily activity team members according to standard business rules:
 * 1. If no team members exist in the session or items: returns hasTeams: false (UI row should be hidden).
 * 2. If all items share the exact same team (1 team composition): returns isSingleTeam: true with plain text 'nama, nama2, nama3' (no numbering/duplication).
 * 3. If there are multiple different team compositions per activity: groups by identical team and formats prefix as '1) 3) 4) nama, nama2' (no duplicates).
 */
export function formatActivityTeamGroups(
  items: any[] | undefined | null,
  rawSessionTeam?: string | null
): ActivityTeamResult {
  const normalize = (val: string | null | undefined): string => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return '';
    }
    const members = trimmed
      .split(/[,;\n]+/)
      .map((m) => m.trim())
      .filter((m) => m && m !== '-' && m.toLowerCase() !== 'null');
    return members.join(', ');
  };

  const safeItems = Array.isArray(items) ? items : [];
  const cleanSessionTeam = normalize(rawSessionTeam);

  // Check if any item has explicit itemTeamMembersSummary
  const hasItemSpecificTeam = safeItems.some(
    (it) => Boolean(normalize(it?.itemTeamMembersSummary || it?.teamMembersSummary))
  );

  const itemTeamPairs: { index: number; team: string }[] = safeItems.map((it, idx) => {
    const itemSpecific = normalize(it?.itemTeamMembersSummary || it?.teamMembersSummary);
    const resolvedTeam = hasItemSpecificTeam ? itemSpecific : cleanSessionTeam;
    return {
      index: idx + 1,
      team: resolvedTeam,
    };
  });

  const itemsWithTeam = itemTeamPairs.filter((p) => Boolean(p.team));

  if (itemsWithTeam.length === 0) {
    if (safeItems.length === 0 && cleanSessionTeam) {
      return {
        hasTeams: true,
        isSingleTeam: true,
        singleTeamText: cleanSessionTeam,
        groups: [
          {
            activityNumbers: [1],
            prefixLabel: '1)',
            teamMembers: cleanSessionTeam,
            fullDisplay: cleanSessionTeam,
          },
        ],
      };
    }

    return {
      hasTeams: false,
      isSingleTeam: false,
      singleTeamText: '',
      groups: [],
    };
  }

  // Group activity numbers by identical team string
  const groupMap = new Map<string, number[]>();
  for (const pair of itemsWithTeam) {
    const existing = groupMap.get(pair.team) || [];
    existing.push(pair.index);
    groupMap.set(pair.team, existing);
  }

  const uniqueTeamsCount = groupMap.size;
  // If only 1 unique team composition exists across all items with team,
  // AND either all items have that team OR no specific item team distinction was made:
  const isSingleTeam =
    uniqueTeamsCount === 1 &&
    (!hasItemSpecificTeam || itemsWithTeam.length === safeItems.length);

  if (isSingleTeam) {
    const [singleTeam] = Array.from(groupMap.keys());
    return {
      hasTeams: true,
      isSingleTeam: true,
      singleTeamText: singleTeam,
      groups: [
        {
          activityNumbers: groupMap.get(singleTeam) || [],
          prefixLabel: (groupMap.get(singleTeam) || []).map((n) => `${n})`).join(' '),
          teamMembers: singleTeam,
          fullDisplay: singleTeam,
        },
      ],
    };
  }

  const groups: TeamGroup[] = [];
  for (const [team, numbers] of groupMap.entries()) {
    const prefixLabel = numbers.map((n) => `${n})`).join(' ');
    groups.push({
      activityNumbers: numbers,
      prefixLabel,
      teamMembers: team,
      fullDisplay: `${prefixLabel} ${team}`,
    });
  }

  return {
    hasTeams: true,
    isSingleTeam: false,
    singleTeamText: groups.map((g) => g.fullDisplay).join(' | '),
    groups,
  };
}

export const pointsProfile = {
  name: "-",
  role: "-",
  currentLevel: "-",
  totalPoints: 0,
  nextLevel: "-",
  nextLevelTarget: 0,
  pointsToNextLevel: 0,
  streakDays: 0,
  badgesEarned: 0,
  monthlyRank: 0,
};

type PointsSource = {
  label: string;
  points: string;
  note: string;
  category: string;
};

type BadgeCollectionItem = {
  name: string;
  description: string;
  status: string;
};

type SiteLeaderboardEntry = {
  rank: number;
  name: string;
  role: string;
  points: number;
  trend: string;
};

type RewardTrackerItem = {
  title: string;
  target: string;
  progress: string;
  status: string;
};

export const pointsSources: PointsSource[] = [];

export const badgeCollection: BadgeCollectionItem[] = [];

export const siteLeaderboard: SiteLeaderboardEntry[] = [];

export const rewardTracker: RewardTrackerItem[] = [];
